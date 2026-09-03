package handlers

import (
	"bufio"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/services"
	"konga-backend/utils"

	"github.com/gin-gonic/gin"
)

type KongHandler struct {
	kongService services.KongProxyService
}

func NewKongHandler(svc services.KongProxyService) *KongHandler {
	return &KongHandler{kongService: svc}
}

func (h *KongHandler) ProxyKong(c *gin.Context) {
	nodeVal, exists := c.Get("kongNode")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"message": "No active Kong connection found"})
		return
	}
	node := nodeVal.(*models.KongNode)

	proxyPath := c.Param("proxyPath")
	trimmedPath := strings.TrimPrefix(proxyPath, "/")
	if trimmedPath == "enriched-plugins" {
		h.GetEnrichedPlugins(c)
		return
	}
	if trimmedPath == "prometheus-metrics" {
		h.GetPrometheusMetrics(c)
		return
	}
	if trimmedPath == "error-details" {
		h.GetErrorDetails(c)
		return
	}
	
	// e.g. /api/kong/services/:id/check-reachability
	if strings.HasSuffix(proxyPath, "/check-reachability") && strings.HasPrefix(strings.TrimPrefix(proxyPath, "/"), "services/") {
		h.CheckServiceReachability(c)
		return
	}
	
	if strings.HasSuffix(proxyPath, "/check-reachability") && strings.HasPrefix(strings.TrimPrefix(proxyPath, "/"), "routes/") {
		h.CheckRouteReachability(c)
		return
	}
	
	method := c.Request.Method
	rawQuery := c.Request.URL.RawQuery

	var bodyBytes []byte
	if c.Request.Body != nil {
		var err error
		bodyBytes, err = io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Failed to read request body"})
			return
		}
	}

	var user *models.User
	userVal, userExists := c.Get("user")
	if userExists {
		u, ok := userVal.(*models.User)
		if ok {
			user = u
		}
	}

	clientIP := c.ClientIP()
	customFields := c.GetHeader("X-Noka-Changed-Fields")

	statusCode, header, respBytes, err := h.kongService.ForwardRequest(node, method, proxyPath, rawQuery, bodyBytes, clientIP, user, customFields)
	if err != nil {
		if strings.Contains(err.Error(), "Failed to reach") {
			c.JSON(http.StatusBadGateway, gin.H{"message": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		}
		return
	}

	for k, vv := range header {
		if k == "Connection" || k == "Keep-Alive" || k == "Proxy-Authenticate" || k == "Transfer-Encoding" {
			continue
		}
		for _, v := range vv {
			c.Header(k, v)
		}
	}

	c.Data(statusCode, header.Get("Content-Type"), respBytes)
}

type TopHit struct {
	Endpoint string  `json:"endpoint"`
	Hits     float64 `json:"hits"`
}

type SlowestEndpoint struct {
	Endpoint   string  `json:"endpoint"`
	AvgLatency float64 `json:"avgLatency"`
	Count      float64 `json:"count"`
}

type ErrorEndpoint struct {
	Endpoint string  `json:"endpoint"`
	Count    float64 `json:"count"`
}

type ErrorRouteDetail struct {
	Route string  `json:"route"`
	Code  string  `json:"code"`
	Count float64 `json:"count"`
}

type ErrorPathDetail struct {
	Paths []string `json:"paths"`
	Code  string   `json:"code"`
	Count float64  `json:"count"`
}

type PrometheusCacheEntry struct {
	TotalRequests    float64                       `json:"totalRequests"`
	TopHits          []TopHit                      `json:"topHits"`
	SlowestEndpoints []SlowestEndpoint             `json:"slowestEndpoints"`
	StatusCodes      map[string]float64            `json:"statusCodes"`
	Top4xxEndpoints  []ErrorEndpoint               `json:"top4xxEndpoints"`
	Top5xxEndpoints  []ErrorEndpoint               `json:"top5xxEndpoints"`
	ErrorDetails4xx  map[string][]ErrorRouteDetail `json:"errorDetails4xx"`
	ErrorDetails5xx  map[string][]ErrorRouteDetail `json:"errorDetails5xx"`
	UpdatedAt        time.Time                     `json:"updatedAt"`
}

var (
	promCacheMu    sync.RWMutex
	promCacheStore = make(map[uint]*PrometheusCacheEntry)

	// Dedicated HTTP client for metrics: longer timeout, no audit log overhead
	metricsHTTPClient = &http.Client{Timeout: 90 * time.Second}
)

// StartPrometheusMetricsCollector starts a background goroutine that pre-warms
// and keeps the Prometheus metrics cache fresh every 30 seconds for all active nodes.
func (h *KongHandler) StartPrometheusMetricsCollector() {
	// Run immediately on startup, then on interval
	h.collectAllActiveNodeMetrics()

	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for range ticker.C {
		h.collectAllActiveNodeMetrics()
	}
}

func (h *KongHandler) collectAllActiveNodeMetrics() {
	var nodes []struct {
		ID           uint
		KongAdminURL string
		Type         string
		KongAPIKey   string
	}

	// Only fetch active nodes directly from DB
	if err := db.DB.
		Table("konga_kong_nodes").
		Select("id, kong_admin_url, type, kong_api_key").
		Where("active = ?", true).
		Scan(&nodes).Error; err != nil {
		return
	}

	for _, n := range nodes {
		go func(nodeID uint, adminURL, nodeType, apiKey string) {
			adminURL = strings.TrimSuffix(adminURL, "/")
			targetURL := adminURL + "/metrics"

			req, err := http.NewRequest("GET", targetURL, nil)
			if err != nil {
				return
			}
			if nodeType == "key_auth" && apiKey != "" {
				req.Header.Set("apikey", apiKey)
			}

			resp, err := metricsHTTPClient.Do(req)
			if err != nil || resp.StatusCode != http.StatusOK {
				if resp != nil {
					resp.Body.Close()
				}
				return
			}
			defer resp.Body.Close()

			bodyBytes, err := io.ReadAll(resp.Body)
			if err != nil {
				return
			}

			totalRequests, topHits, slowestEndpoints, statusCodes, top4xx, top5xx, errDetails4xx, errDetails5xx :=
				parsePrometheusMetricsFast(string(bodyBytes))

			entry := &PrometheusCacheEntry{
				TotalRequests:    totalRequests,
				TopHits:          topHits,
				SlowestEndpoints: slowestEndpoints,
				StatusCodes:      statusCodes,
				Top4xxEndpoints:  top4xx,
				Top5xxEndpoints:  top5xx,
				ErrorDetails4xx:  errDetails4xx,
				ErrorDetails5xx:  errDetails5xx,
				UpdatedAt:        time.Now(),
			}

			promCacheMu.Lock()
			promCacheStore[nodeID] = entry
			promCacheMu.Unlock()
		}(n.ID, n.KongAdminURL, n.Type, n.KongAPIKey)
	}
}

func extractLabel(labels, key string) string {
	idx := strings.Index(labels, key+`="`)
	if idx == -1 {
		return ""
	}
	start := idx + len(key) + 2
	end := strings.Index(labels[start:], `"`)
	if end == -1 {
		return ""
	}
	return labels[start : start+end]
}

func parsePrometheusMetricsFast(metricsData string) (float64, []TopHit, []SlowestEndpoint, map[string]float64, []ErrorEndpoint, []ErrorEndpoint, map[string][]ErrorRouteDetail, map[string][]ErrorRouteDetail) {
	var totalRequests float64
	hitsByEndpoint := make(map[string]float64)
	latencySumByEndpoint := make(map[string]float64)
	latencyCountByEndpoint := make(map[string]float64)
	errorsByEndpoint4xx := make(map[string]float64)
	errorsByEndpoint5xx := make(map[string]float64)
	errDetailRaw4xx := make(map[string]map[string]*ErrorRouteDetail)
	errDetailRaw5xx := make(map[string]map[string]*ErrorRouteDetail)

	statusCodes := map[string]float64{
		"2xx": 0,
		"3xx": 0,
		"4xx": 0,
		"5xx": 0,
	}

	scanner := bufio.NewScanner(strings.NewReader(metricsData))
	// Allocate buffer for long lines
	buf := make([]byte, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || line[0] == '#' {
			continue
		}

		if strings.HasPrefix(line, "kong_http_requests_total") {
			// e.g. kong_http_requests_total{code="200",route="...",service="..."} 123
			braceOpen := strings.IndexByte(line, '{')
			braceClose := strings.LastIndexByte(line, '}')
			
			var labels string
			var valStr string
			if braceOpen != -1 && braceClose > braceOpen {
				labels = line[braceOpen+1 : braceClose]
				valStr = strings.TrimSpace(line[braceClose+1:])
			} else {
				parts := strings.Fields(line)
				if len(parts) >= 2 {
					valStr = parts[1]
				}
			}

			val, err := strconv.ParseFloat(valStr, 64)
			if err == nil {
				totalRequests += val

				service := extractLabel(labels, "service")
				route := extractLabel(labels, "route")
				endpoint := service
				if endpoint == "" {
					endpoint = route
				}
				if endpoint != "" {
					hitsByEndpoint[endpoint] += val
				}

				code := extractLabel(labels, "code")
				if len(code) > 0 {
					if code[0] == '2' {
						statusCodes["2xx"] += val
					} else if code[0] == '3' {
						statusCodes["3xx"] += val
					} else if code[0] == '4' {
						statusCodes["4xx"] += val
						if endpoint != "" {
							errorsByEndpoint4xx[endpoint] += val
							routeLabel := route
							if routeLabel == "" {
								routeLabel = endpoint
							}
							key := routeLabel + ":" + code
							if errDetailRaw4xx[endpoint] == nil {
								errDetailRaw4xx[endpoint] = make(map[string]*ErrorRouteDetail)
							}
							if errDetailRaw4xx[endpoint][key] == nil {
								errDetailRaw4xx[endpoint][key] = &ErrorRouteDetail{Route: routeLabel, Code: code}
							}
							errDetailRaw4xx[endpoint][key].Count += val
						}
					} else if code[0] == '5' {
						statusCodes["5xx"] += val
						if endpoint != "" {
							errorsByEndpoint5xx[endpoint] += val
							routeLabel := route
							if routeLabel == "" {
								routeLabel = endpoint
							}
							key := routeLabel + ":" + code
							if errDetailRaw5xx[endpoint] == nil {
								errDetailRaw5xx[endpoint] = make(map[string]*ErrorRouteDetail)
							}
							if errDetailRaw5xx[endpoint][key] == nil {
								errDetailRaw5xx[endpoint][key] = &ErrorRouteDetail{Route: routeLabel, Code: code}
							}
							errDetailRaw5xx[endpoint][key].Count += val
						}
					}
				}
			}
		} else if strings.HasPrefix(line, "kong_request_latency_ms_sum") {
			braceOpen := strings.IndexByte(line, '{')
			braceClose := strings.LastIndexByte(line, '}')
			if braceOpen != -1 && braceClose > braceOpen {
				labels := line[braceOpen+1 : braceClose]
				valStr := strings.TrimSpace(line[braceClose+1:])
				val, err := strconv.ParseFloat(valStr, 64)
				if err == nil {
					service := extractLabel(labels, "service")
					endpoint := service
					if endpoint == "" {
						endpoint = extractLabel(labels, "route")
					}
					if endpoint != "" {
						latencySumByEndpoint[endpoint] += val
					}
				}
			}
		} else if strings.HasPrefix(line, "kong_request_latency_ms_count") {
			braceOpen := strings.IndexByte(line, '{')
			braceClose := strings.LastIndexByte(line, '}')
			if braceOpen != -1 && braceClose > braceOpen {
				labels := line[braceOpen+1 : braceClose]
				valStr := strings.TrimSpace(line[braceClose+1:])
				val, err := strconv.ParseFloat(valStr, 64)
				if err == nil {
					service := extractLabel(labels, "service")
					endpoint := service
					if endpoint == "" {
						endpoint = extractLabel(labels, "route")
					}
					if endpoint != "" {
						latencyCountByEndpoint[endpoint] += val
					}
				}
			}
		}
	}

	var topHits []TopHit
	for ep, hits := range hitsByEndpoint {
		topHits = append(topHits, TopHit{Endpoint: ep, Hits: hits})
	}
	sort.Slice(topHits, func(i, j int) bool {
		if topHits[i].Hits == topHits[j].Hits {
			return topHits[i].Endpoint < topHits[j].Endpoint
		}
		return topHits[i].Hits > topHits[j].Hits
	})
	if len(topHits) > 10 {
		topHits = topHits[:10]
	}

	var slowestEndpoints []SlowestEndpoint
	for ep, count := range latencyCountByEndpoint {
		if count > 0 {
			sum := latencySumByEndpoint[ep]
			avg := sum / count
			slowestEndpoints = append(slowestEndpoints, SlowestEndpoint{
				Endpoint:   ep,
				AvgLatency: avg,
				Count:      count,
			})
		}
	}
	sort.Slice(slowestEndpoints, func(i, j int) bool {
		if slowestEndpoints[i].AvgLatency == slowestEndpoints[j].AvgLatency {
			return slowestEndpoints[i].Endpoint < slowestEndpoints[j].Endpoint
		}
		return slowestEndpoints[i].AvgLatency > slowestEndpoints[j].AvgLatency
	})
	if len(slowestEndpoints) > 10 {
		slowestEndpoints = slowestEndpoints[:10]
	}

	var top4xxEndpoints []ErrorEndpoint
	for ep, count := range errorsByEndpoint4xx {
		top4xxEndpoints = append(top4xxEndpoints, ErrorEndpoint{Endpoint: ep, Count: count})
	}
	sort.Slice(top4xxEndpoints, func(i, j int) bool {
		if top4xxEndpoints[i].Count == top4xxEndpoints[j].Count {
			return top4xxEndpoints[i].Endpoint < top4xxEndpoints[j].Endpoint
		}
		return top4xxEndpoints[i].Count > top4xxEndpoints[j].Count
	})
	if len(top4xxEndpoints) > 10 {
		top4xxEndpoints = top4xxEndpoints[:10]
	}

	var top5xxEndpoints []ErrorEndpoint
	for ep, count := range errorsByEndpoint5xx {
		top5xxEndpoints = append(top5xxEndpoints, ErrorEndpoint{Endpoint: ep, Count: count})
	}
	sort.Slice(top5xxEndpoints, func(i, j int) bool {
		if top5xxEndpoints[i].Count == top5xxEndpoints[j].Count {
			return top5xxEndpoints[i].Endpoint < top5xxEndpoints[j].Endpoint
		}
		return top5xxEndpoints[i].Count > top5xxEndpoints[j].Count
	})
	if len(top5xxEndpoints) > 10 {
		top5xxEndpoints = top5xxEndpoints[:10]
	}

	// Flatten error details maps
	errorDetails4xx := make(map[string][]ErrorRouteDetail)
	for svc, routeMap := range errDetailRaw4xx {
		for _, d := range routeMap {
			errorDetails4xx[svc] = append(errorDetails4xx[svc], *d)
		}
		sort.Slice(errorDetails4xx[svc], func(i, j int) bool {
			return errorDetails4xx[svc][i].Count > errorDetails4xx[svc][j].Count
		})
	}
	errorDetails5xx := make(map[string][]ErrorRouteDetail)
	for svc, routeMap := range errDetailRaw5xx {
		for _, d := range routeMap {
			errorDetails5xx[svc] = append(errorDetails5xx[svc], *d)
		}
		sort.Slice(errorDetails5xx[svc], func(i, j int) bool {
			return errorDetails5xx[svc][i].Count > errorDetails5xx[svc][j].Count
		})
	}

	return totalRequests, topHits, slowestEndpoints, statusCodes, top4xxEndpoints, top5xxEndpoints, errorDetails4xx, errorDetails5xx
}

func (h *KongHandler) GetPrometheusMetrics(c *gin.Context) {
	nodeVal, exists := c.Get("kongNode")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "No active Kong connection found"})
		return
	}
	node := nodeVal.(*models.KongNode)

	// Check in-memory cache first (valid for 30s)
	promCacheMu.RLock()
	cached, hasCache := promCacheStore[node.ID]
	promCacheMu.RUnlock()

	if hasCache && cached != nil && time.Since(cached.UpdatedAt) < 30*time.Second {
		c.JSON(http.StatusOK, gin.H{
			"success":          true,
			"totalRequests":    cached.TotalRequests,
			"topHits":          cached.TopHits,
			"slowestEndpoints": cached.SlowestEndpoints,
			"statusCodes":      cached.StatusCodes,
			"top4xxEndpoints":  cached.Top4xxEndpoints,
			"top5xxEndpoints":  cached.Top5xxEndpoints,
			"errorDetails4xx":  cached.ErrorDetails4xx,
			"errorDetails5xx":  cached.ErrorDetails5xx,
			"cached":           true,
		})
		return
	}

	var user *models.User
	userVal, userExists := c.Get("user")
	if userExists {
		u, ok := userVal.(*models.User)
		if ok {
			user = u
		}
	}

	clientIP := c.ClientIP()

	statusCode, _, respBytes, err := h.kongService.ForwardRequest(node, "GET", "/metrics", "", nil, clientIP, user, "")
	if err != nil || statusCode != http.StatusOK {
		// If fetch fails but we have older cache, serve older cache gracefully
		if hasCache && cached != nil {
			c.JSON(http.StatusOK, gin.H{
				"success":          true,
				"totalRequests":    cached.TotalRequests,
				"topHits":          cached.TopHits,
				"slowestEndpoints": cached.SlowestEndpoints,
				"statusCodes":      cached.StatusCodes,
				"top4xxEndpoints":  cached.Top4xxEndpoints,
				"top5xxEndpoints":  cached.Top5xxEndpoints,
				"errorDetails4xx":  cached.ErrorDetails4xx,
				"errorDetails5xx":  cached.ErrorDetails5xx,
				"stale":            true,
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Prometheus plugin is not enabled or not reachable on this node",
		})
		return
	}

	totalRequests, topHits, slowestEndpoints, statusCodes, top4xxEndpoints, top5xxEndpoints, errorDetails4xx, errorDetails5xx := parsePrometheusMetricsFast(string(respBytes))

	entry := &PrometheusCacheEntry{
		TotalRequests:    totalRequests,
		TopHits:          topHits,
		SlowestEndpoints: slowestEndpoints,
		StatusCodes:      statusCodes,
		Top4xxEndpoints:  top4xxEndpoints,
		Top5xxEndpoints:  top5xxEndpoints,
		ErrorDetails4xx:  errorDetails4xx,
		ErrorDetails5xx:  errorDetails5xx,
		UpdatedAt:        time.Now(),
	}

	promCacheMu.Lock()
	promCacheStore[node.ID] = entry
	promCacheMu.Unlock()

	c.JSON(http.StatusOK, gin.H{
		"success":          true,
		"totalRequests":    totalRequests,
		"topHits":          topHits,
		"slowestEndpoints": slowestEndpoints,
		"statusCodes":      statusCodes,
		"top4xxEndpoints":  top4xxEndpoints,
		"top5xxEndpoints":  top5xxEndpoints,
		"errorDetails4xx":  errorDetails4xx,
		"errorDetails5xx":  errorDetails5xx,
	})
}

func (h *KongHandler) GetErrorDetails(c *gin.Context) {
	service := c.Query("service")
	category := c.Query("category") // "4xx" or "5xx"
	if service == "" || category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Missing service or category query parameter"})
		return
	}

	nodeVal, exists := c.Get("kongNode")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "No active Kong connection found"})
		return
	}
	node := nodeVal.(*models.KongNode)

	var user *models.User
	userVal, userExists := c.Get("user")
	if userExists {
		u, ok := userVal.(*models.User)
		if ok {
			user = u
		}
	}

	clientIP := c.ClientIP()

	// 1. Fetch metrics
	statusCode, _, respBytes, err := h.kongService.ForwardRequest(node, "GET", "/metrics", "", nil, clientIP, user, "")
	if err != nil || statusCode != http.StatusOK {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Prometheus plugin is not enabled or not reachable on this node"})
		return
	}

	// 2. Parse metrics to get route+code+count for the specific service
	// map[route:code] -> count
	routeCodeCountMap := make(map[string]float64)
	prefixMatch := "5"
	if category == "4xx" {
		prefixMatch = "4"
	}

	scanner := bufio.NewScanner(strings.NewReader(string(respBytes)))
	buf := make([]byte, 64*1024)
	scanner.Buffer(buf, 1024*1024)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || line[0] == '#' {
			continue
		}
		if strings.HasPrefix(line, "kong_http_requests_total") {
			braceOpen := strings.IndexByte(line, '{')
			braceClose := strings.LastIndexByte(line, '}')
			if braceOpen != -1 && braceClose > braceOpen {
				labels := line[braceOpen+1 : braceClose]
				valStr := strings.TrimSpace(line[braceClose+1:])
				val, err := strconv.ParseFloat(valStr, 64)
				if err == nil {
					svcEp := extractLabel(labels, "service")
					if svcEp == "" {
						svcEp = extractLabel(labels, "route")
					}
					if svcEp == service {
						code := extractLabel(labels, "code")
						if strings.HasPrefix(code, prefixMatch) {
							routeLabel := extractLabel(labels, "route")
							if routeLabel == "" {
								routeLabel = svcEp
							}
							key := routeLabel + ":" + code
							routeCodeCountMap[key] += val
						}
					}
				}
			}
		}
	}

	// 3. Fetch /routes from Kong to build routeName -> paths mapping
	var routesResp struct {
		Data []struct {
			Name  string   `json:"name"`
			Paths []string `json:"paths"`
		} `json:"data"`
	}
	routePathMap := make(map[string][]string)
	
	rStatusCode, _, rRespBytes, rErr := h.kongService.ForwardRequest(node, "GET", "/routes?size=1000", "", nil, clientIP, user, "")
	if rErr == nil && rStatusCode == http.StatusOK {
		if jsonErr := json.Unmarshal(rRespBytes, &routesResp); jsonErr == nil {
			for _, r := range routesResp.Data {
				if r.Name != "" && len(r.Paths) > 0 {
					routePathMap[r.Name] = r.Paths
				}
			}
		}
	}

	// 4. Build response array
	var details []ErrorPathDetail
	for key, count := range routeCodeCountMap {
		parts := strings.SplitN(key, ":", 2)
		routeName := parts[0]
		code := "unknown"
		if len(parts) > 1 {
			code = parts[1]
		}
		paths, ok := routePathMap[routeName]
		if !ok || len(paths) == 0 {
			// fallback to route name if paths not found
			paths = []string{routeName}
		}
		details = append(details, ErrorPathDetail{
			Paths: paths,
			Code:  code,
			Count: count,
		})
	}

	// Sort by count descending
	sort.Slice(details, func(i, j int) bool {
		return details[i].Count > details[j].Count
	})

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"details": details,
	})
}

// CheckServiceReachability checks if a service's upstream domain is reachable
func (h *KongHandler) CheckServiceReachability(c *gin.Context) {
	nodeVal, exists := c.Get("kongNode")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"message": "No active Kong connection found"})
		return
	}
	node := nodeVal.(*models.KongNode)
	
	var user *models.User
	userVal, userExists := c.Get("user")
	if userExists {
		if u, ok := userVal.(*models.User); ok {
			user = u
		}
	}
	clientIP := c.ClientIP()

	proxyPath := c.Param("proxyPath")
	// e.g. /services/b5608d82-xxxx-xxxx-xxxx/check-reachability
	parts := strings.Split(strings.TrimPrefix(proxyPath, "/"), "/")
	if len(parts) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid service check path"})
		return
	}
	serviceID := parts[1]

	// Fetch service details from Kong Admin API
	statusCode, _, respBytes, err := h.kongService.ForwardRequest(node, "GET", "/services/"+serviceID, "", nil, clientIP, user, "")
	if err != nil || statusCode != http.StatusOK {
		c.JSON(http.StatusBadGateway, gin.H{"message": "Failed to fetch service details from Kong Admin API"})
		return
	}

	var service struct {
		Host     string `json:"host"`
		Port     int    `json:"port"`
		Protocol string `json:"protocol"`
		Path     string `json:"path"`
	}
	if err := json.Unmarshal(respBytes, &service); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to parse service details"})
		return
	}

	// SSRF Mitigation (M6): Check if the upstream host resolves to a private IP
	allowInternal := os.Getenv("ALLOW_INTERNAL_SSRF") == "true"
	if !allowInternal {
		ips, err := net.LookupIP(service.Host)
		if err == nil {
			for _, ip := range ips {
				if utils.IsPrivateIP(ip) {
					c.JSON(http.StatusForbidden, gin.H{
						"success":   true,
						"reachable": false,
						"message":   "Service is unreachable: access to internal IP addresses is blocked by security policy",
					})
					return
				}
			}
		}
	}

	targetURL := service.Protocol + "://" + service.Host
	if service.Port > 0 && !(service.Protocol == "http" && service.Port == 80) && !(service.Protocol == "https" && service.Port == 443) {
		targetURL += ":" + strconv.Itoa(service.Port)
	}
	if service.Path != "" {
		if !strings.HasPrefix(service.Path, "/") {
			targetURL += "/"
		}
		targetURL += service.Path
	}

	// Make a quick HEAD request with a short timeout
	client := &http.Client{
		Timeout: 5 * time.Second,
	}
	
	resp, err := client.Head(targetURL)
	if err != nil {
		// If HEAD is not supported or rejected, try GET
		resp, err = client.Get(targetURL)
	}
	
	if err != nil {
		services.UpsertReachabilityStatus(serviceID, "service", "unreachable", "Service is unreachable: "+err.Error(), 0)
		c.JSON(http.StatusOK, gin.H{
			"success":   true,
			"reachable": false,
			"message":   "Service is unreachable: " + err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	// Any HTTP response (even 4xx/5xx) means the server is online and reachable!
	services.UpsertReachabilityStatus(serviceID, "service", "reachable", "Service is reachable", resp.StatusCode)
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"reachable":  true,
		"statusCode": resp.StatusCode,
		"message":    "Service is reachable",
	})
}

// CheckRouteReachability checks if a route is reachable via kong proxy url
func (h *KongHandler) CheckRouteReachability(c *gin.Context) {
	nodeVal, exists := c.Get("kongNode")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"message": "No active Kong connection found"})
		return
	}
	node := nodeVal.(*models.KongNode)
	
	var user *models.User
	userVal, userExists := c.Get("user")
	if userExists {
		if u, ok := userVal.(*models.User); ok {
			user = u
		}
	}
	clientIP := c.ClientIP()

	proxyUrl := c.Query("proxyUrl")
	// SSRF Protection: Only admins can supply an arbitrary proxy URL for pinging
	if proxyUrl != "" && (user == nil || (user.Role != "admin" && user.Role != "superadmin")) {
		proxyUrl = node.KongProxyURL // Fallback to safe node setting
	} else if proxyUrl == "" {
		proxyUrl = node.KongProxyURL
	}

	if proxyUrl == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Kong Proxy URL is not configured in settings or connection"})
		return
	}

	proxyPath := c.Param("proxyPath")
	// e.g. /routes/b5608d82-xxxx-xxxx-xxxx/check-reachability
	parts := strings.Split(strings.TrimPrefix(proxyPath, "/"), "/")
	if len(parts) < 3 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid route check path"})
		return
	}
	routeID := parts[1]

	// Fetch route details from Kong Admin API
	statusCode, _, respBytes, err := h.kongService.ForwardRequest(node, "GET", "/routes/"+routeID, "", nil, clientIP, user, "")
	if err != nil || statusCode != http.StatusOK {
		c.JSON(http.StatusBadGateway, gin.H{"message": "Failed to fetch route details from Kong Admin API"})
		return
	}

	var route struct {
		Paths []string `json:"paths"`
		Tags  []string `json:"tags"`
	}
	if err := json.Unmarshal(respBytes, &route); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to parse route details"})
		return
	}

	targetURL := strings.TrimRight(proxyUrl, "/")
	var path string
	// Check if custom healthcheck path tag exists (e.g. noka-health-path:/healthz)
	for _, t := range route.Tags {
		if strings.HasPrefix(t, "noka-health-path:") {
			path = strings.TrimPrefix(t, "noka-health-path:")
			break
		}
	}

	if path == "" {
		if len(route.Paths) > 0 {
			path = route.Paths[0]
		} else {
			path = "/"
		}
	}

	if !strings.HasPrefix(path, "/") {
		targetURL += "/"
	}
	targetURL += path

	client := &http.Client{
		Timeout: 5 * time.Second,
	}
	
	resp, err := client.Head(targetURL)
	if err != nil {
		resp, err = client.Get(targetURL)
	}
	
	if err != nil {
		services.UpsertReachabilityStatus(routeID, "route", "unreachable", "Route is unreachable via proxy: "+err.Error(), 0)
		c.JSON(http.StatusOK, gin.H{
			"success":   true,
			"reachable": false,
			"message":   "Route is unreachable via proxy: " + err.Error(),
		})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		errMsg := fmt.Sprintf("Service Error (HTTP %d)", resp.StatusCode)
		if resp.StatusCode == http.StatusBadGateway {
			errMsg = "Bad Gateway (HTTP 502)"
		} else if resp.StatusCode == http.StatusGatewayTimeout {
			errMsg = "Gateway Timeout (HTTP 504)"
		}
		services.UpsertReachabilityStatus(routeID, "route", "unreachable", errMsg, resp.StatusCode)
		c.JSON(http.StatusOK, gin.H{
			"success":    true,
			"reachable":  false,
			"statusCode": resp.StatusCode,
			"message":    errMsg,
		})
		return
	}

	services.UpsertReachabilityStatus(routeID, "route", "reachable", "Route is reachable", resp.StatusCode)
	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"reachable":  true,
		"statusCode": resp.StatusCode,
		"message":    "Route is reachable",
	})
}

// GetReachabilityStatuses returns all reachability status records from the DB
func (h *KongHandler) GetReachabilityStatuses(c *gin.Context) {
	var statuses []models.ReachabilityStatus
	if err := db.DB.Find(&statuses).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to query reachability statuses"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": statuses,
	})
}

// EntityAuthorResponse represents the enriched entity author with creator/updater full names
type EntityAuthorResponse struct {
	ID                uint      `json:"id"`
	EntityID          string    `json:"entity_id"`
	EntityType        string    `json:"entity_type"`
	CreatedByUserID   *uint     `json:"created_by_user_id"`
	CreatedByUsername string    `json:"created_by_username"`
	CreatedByFullName string    `json:"created_by_full_name"`
	CreatedByEmail    string    `json:"created_by_email"`
	UpdatedByUserID   *uint     `json:"updated_by_user_id"`
	UpdatedByUsername string    `json:"updated_by_username"`
	UpdatedByFullName string    `json:"updated_by_full_name"`
	UpdatedByEmail    string    `json:"updated_by_email"`
	CreatedAt         time.Time `json:"createdAt"`
	UpdatedAt         time.Time `json:"updatedAt"`
}

// GetEntityAuthors returns all entity authors with resolved full names as a map[string]EntityAuthorResponse
func (h *KongHandler) GetEntityAuthors(c *gin.Context) {
	var authors []models.EntityAuthor
	if err := db.DB.Find(&authors).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to query entity authors"})
		return
	}

	// Fetch all users to resolve full names
	var users []models.User
	userMap := make(map[string]models.User)
	userByIDMap := make(map[uint]models.User)
	if err := db.DB.Find(&users).Error; err == nil {
		for _, u := range users {
			userMap[strings.ToLower(u.Username)] = u
			userByIDMap[u.ID] = u
		}
	}

	resolveFullName := func(userID *uint, username string) (string, string) {
		if userID != nil {
			if u, exists := userByIDMap[*userID]; exists {
				fullName := strings.TrimSpace(u.FirstName + " " + u.LastName)
				if fullName == "" {
					fullName = u.Username
				}
				return fullName, u.Email
			}
		}
		if username != "" && username != "-" {
			if u, exists := userMap[strings.ToLower(username)]; exists {
				fullName := strings.TrimSpace(u.FirstName + " " + u.LastName)
				if fullName == "" {
					fullName = u.Username
				}
				return fullName, u.Email
			}
			return username, ""
		}
		return "-", ""
	}

	authorMap := make(map[string]EntityAuthorResponse)
	var enrichedList []EntityAuthorResponse

	for _, a := range authors {
		createdFullName, createdEmail := resolveFullName(a.CreatedByUserID, a.CreatedByUsername)
		updatedFullName, updatedEmail := resolveFullName(a.UpdatedByUserID, a.UpdatedByUsername)

		resp := EntityAuthorResponse{
			ID:                a.ID,
			EntityID:          a.EntityID,
			EntityType:        a.EntityType,
			CreatedByUserID:   a.CreatedByUserID,
			CreatedByUsername: a.CreatedByUsername,
			CreatedByFullName: createdFullName,
			CreatedByEmail:    createdEmail,
			UpdatedByUserID:   a.UpdatedByUserID,
			UpdatedByUsername: a.UpdatedByUsername,
			UpdatedByFullName: updatedFullName,
			UpdatedByEmail:    updatedEmail,
			CreatedAt:         a.CreatedAt,
			UpdatedAt:         a.UpdatedAt,
		}

		authorMap[a.EntityID] = resp
		enrichedList = append(enrichedList, resp)
	}

	c.JSON(http.StatusOK, gin.H{
		"data": authorMap,
		"list": enrichedList,
	})
}

// GetEnrichedPlugins returns all plugins along with their resolved services and routes in a single ultra-fast response
func (h *KongHandler) GetEnrichedPlugins(c *gin.Context) {
	nodeVal, exists := c.Get("kongNode")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"message": "No active Kong connection found"})
		return
	}
	node := nodeVal.(*models.KongNode)

	var user *models.User
	userVal, userExists := c.Get("user")
	if userExists {
		u, ok := userVal.(*models.User)
		if ok {
			user = u
		}
	}
	clientIP := c.ClientIP()

	// Concurrently fetch plugins, services, routes via Kong Admin API
	type fetchRes struct {
		data []byte
		err  error
	}
	pluginsCh := make(chan fetchRes, 1)
	servicesCh := make(chan fetchRes, 1)
	routesCh := make(chan fetchRes, 1)

	go func() {
		_, _, b, err := h.kongService.ForwardRequest(node, "GET", "/plugins?size=1000", "", nil, clientIP, user, "")
		pluginsCh <- fetchRes{data: b, err: err}
	}()

	go func() {
		_, _, b, err := h.kongService.ForwardRequest(node, "GET", "/services?size=1000", "", nil, clientIP, user, "")
		servicesCh <- fetchRes{data: b, err: err}
	}()

	go func() {
		_, _, b, err := h.kongService.ForwardRequest(node, "GET", "/routes?size=1000", "", nil, clientIP, user, "")
		routesCh <- fetchRes{data: b, err: err}
	}()

	pRes := <-pluginsCh
	sRes := <-servicesCh
	rRes := <-routesCh

	var pData struct {
		Data []interface{} `json:"data"`
	}
	var sData struct {
		Data []interface{} `json:"data"`
	}
	var rData struct {
		Data []interface{} `json:"data"`
	}

	if pRes.err == nil && pRes.data != nil {
		json.Unmarshal(pRes.data, &pData)
	}
	if sRes.err == nil && sRes.data != nil {
		json.Unmarshal(sRes.data, &sData)
	}
	if rRes.err == nil && rRes.data != nil {
		json.Unmarshal(rRes.data, &rData)
	}

	c.JSON(http.StatusOK, gin.H{
		"plugins":  pData.Data,
		"services": sData.Data,
		"routes":   rData.Data,
	})
}

// TriggerReachabilityCheck triggers a concurrent reachability check for all entities
func (h *KongHandler) TriggerReachabilityCheck(c *gin.Context) {
	services.RunReachabilityCheck()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Reachability statuses refreshed successfully",
	})
}


