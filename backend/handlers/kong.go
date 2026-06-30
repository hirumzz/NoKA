package handlers

import (
	"encoding/json"
	"io"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"konga-backend/models"
	"konga-backend/services"

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
	if strings.TrimPrefix(proxyPath, "/") == "prometheus-metrics" {
		h.GetPrometheusMetrics(c)
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

	statusCode, header, respBytes, err := h.kongService.ForwardRequest(node, method, proxyPath, rawQuery, bodyBytes, clientIP, user)
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

var (
	requestsTotalRegex = regexp.MustCompile(`^kong_http_requests_total(?:\{([^}]+)\})?\s+([0-9eE.+-]+)`)
	latencySumRegex    = regexp.MustCompile(`^kong_request_latency_ms_sum(?:\{([^}]+)\})?\s+([0-9eE.+-]+)`)
	latencyCountRegex  = regexp.MustCompile(`^kong_request_latency_ms_count(?:\{([^}]+)\})?\s+([0-9eE.+-]+)`)

	serviceLabelRegex = regexp.MustCompile(`service="([^"]*)"`)
	routeLabelRegex   = regexp.MustCompile(`route="([^"]*)"`)
	codeLabelRegex    = regexp.MustCompile(`code="([^"]*)"`)
)

func getEndpoint(labels string) string {
	var service, route string
	if serviceMatch := serviceLabelRegex.FindStringSubmatch(labels); len(serviceMatch) > 1 {
		service = serviceMatch[1]
	}
	if routeMatch := routeLabelRegex.FindStringSubmatch(labels); len(routeMatch) > 1 {
		route = routeMatch[1]
	}
	if service != "" {
		return service
	}
	return route
}

func parsePrometheusMetrics(metricsData string) (float64, []TopHit, []SlowestEndpoint, map[string]float64, []ErrorEndpoint, []ErrorEndpoint, map[string][]ErrorRouteDetail, map[string][]ErrorRouteDetail) {
	var totalRequests float64
	hitsByEndpoint := make(map[string]float64)
	latencySumByEndpoint := make(map[string]float64)
	latencyCountByEndpoint := make(map[string]float64)
	errorsByEndpoint4xx := make(map[string]float64)
	errorsByEndpoint5xx := make(map[string]float64)
	// map[service][route+":"+code] -> *ErrorRouteDetail
	errDetailRaw4xx := make(map[string]map[string]*ErrorRouteDetail)
	errDetailRaw5xx := make(map[string]map[string]*ErrorRouteDetail)

	statusCodes := map[string]float64{
		"2xx": 0,
		"3xx": 0,
		"4xx": 0,
		"5xx": 0,
	}

	lines := strings.Split(metricsData, "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		if match := requestsTotalRegex.FindStringSubmatch(line); len(match) > 2 {
			labels := match[1]
			valStr := match[2]
			val, err := strconv.ParseFloat(valStr, 64)
			if err == nil {
				totalRequests += val

				// Sum hits by endpoint
				endpoint := getEndpoint(labels)
				if endpoint != "" {
					hitsByEndpoint[endpoint] += val
				}

				// Status code distribution
				if codeMatch := codeLabelRegex.FindStringSubmatch(labels); len(codeMatch) > 1 {
					code := codeMatch[1]
					if strings.HasPrefix(code, "2") {
						statusCodes["2xx"] += val
					} else if strings.HasPrefix(code, "3") {
						statusCodes["3xx"] += val
					} else if strings.HasPrefix(code, "4") {
						statusCodes["4xx"] += val
						svcEp := getEndpoint(labels)
						if svcEp != "" {
							errorsByEndpoint4xx[svcEp] += val
							var routeLabel string
							if rm := routeLabelRegex.FindStringSubmatch(labels); len(rm) > 1 {
								routeLabel = rm[1]
							}
							if routeLabel == "" {
								routeLabel = svcEp
							}
							key := routeLabel + ":" + code
							if errDetailRaw4xx[svcEp] == nil {
								errDetailRaw4xx[svcEp] = make(map[string]*ErrorRouteDetail)
							}
							if errDetailRaw4xx[svcEp][key] == nil {
								errDetailRaw4xx[svcEp][key] = &ErrorRouteDetail{Route: routeLabel, Code: code}
							}
							errDetailRaw4xx[svcEp][key].Count += val
						}
					} else if strings.HasPrefix(code, "5") {
						statusCodes["5xx"] += val
						svcEp := getEndpoint(labels)
						if svcEp != "" {
							errorsByEndpoint5xx[svcEp] += val
							var routeLabel string
							if rm := routeLabelRegex.FindStringSubmatch(labels); len(rm) > 1 {
								routeLabel = rm[1]
							}
							if routeLabel == "" {
								routeLabel = svcEp
							}
							key := routeLabel + ":" + code
							if errDetailRaw5xx[svcEp] == nil {
								errDetailRaw5xx[svcEp] = make(map[string]*ErrorRouteDetail)
							}
							if errDetailRaw5xx[svcEp][key] == nil {
								errDetailRaw5xx[svcEp][key] = &ErrorRouteDetail{Route: routeLabel, Code: code}
							}
							errDetailRaw5xx[svcEp][key].Count += val
						}
					}
				}
			}
		} else if match := latencySumRegex.FindStringSubmatch(line); len(match) > 2 {
			labels := match[1]
			valStr := match[2]
			val, err := strconv.ParseFloat(valStr, 64)
			if err == nil {
				endpoint := getEndpoint(labels)
				if endpoint != "" {
					latencySumByEndpoint[endpoint] += val
				}
			}
		} else if match := latencyCountRegex.FindStringSubmatch(line); len(match) > 2 {
			labels := match[1]
			valStr := match[2]
			val, err := strconv.ParseFloat(valStr, 64)
			if err == nil {
				endpoint := getEndpoint(labels)
				if endpoint != "" {
					latencyCountByEndpoint[endpoint] += val
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

	var user *models.User
	userVal, userExists := c.Get("user")
	if userExists {
		u, ok := userVal.(*models.User)
		if ok {
			user = u
		}
	}

	clientIP := c.ClientIP()

	statusCode, _, respBytes, err := h.kongService.ForwardRequest(node, "GET", "/metrics", "", nil, clientIP, user)
	if err != nil || statusCode != http.StatusOK {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Prometheus plugin is not enabled or not reachable on this node",
		})
		return
	}

	totalRequests, topHits, slowestEndpoints, statusCodes, top4xxEndpoints, top5xxEndpoints, errorDetails4xx, errorDetails5xx := parsePrometheusMetrics(string(respBytes))

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
	statusCode, _, respBytes, err := h.kongService.ForwardRequest(node, "GET", "/metrics", "", nil, clientIP, user)
	if err != nil || statusCode != http.StatusOK {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Prometheus plugin is not enabled or not reachable on this node"})
		return
	}

	// 2. Parse metrics to get route+code+count for the specific service
	// map[route:code] -> count
	routeCodeCountMap := make(map[string]float64)
	lines := strings.Split(string(respBytes), "\n")
	prefixMatch := "5"
	if category == "4xx" {
		prefixMatch = "4"
	}
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		if match := requestsTotalRegex.FindStringSubmatch(line); len(match) > 2 {
			labels := match[1]
			valStr := match[2]
			val, err := strconv.ParseFloat(valStr, 64)
			if err == nil {
				svcEp := getEndpoint(labels)
				if svcEp == service {
					var code string
					if codeMatch := codeLabelRegex.FindStringSubmatch(labels); len(codeMatch) > 1 {
						code = codeMatch[1]
					}
					if strings.HasPrefix(code, prefixMatch) {
						var routeLabel string
						if rm := routeLabelRegex.FindStringSubmatch(labels); len(rm) > 1 {
							routeLabel = rm[1]
						}
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

	// 3. Fetch /routes from Kong to build routeName -> paths mapping
	var routesResp struct {
		Data []struct {
			Name  string   `json:"name"`
			Paths []string `json:"paths"`
		} `json:"data"`
	}
	routePathMap := make(map[string][]string)
	
	rStatusCode, _, rRespBytes, rErr := h.kongService.ForwardRequest(node, "GET", "/routes?size=1000", "", nil, clientIP, user)
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
