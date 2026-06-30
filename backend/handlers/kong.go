package handlers

import (
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

func parsePrometheusMetrics(metricsData string) (float64, []TopHit, []SlowestEndpoint, map[string]float64) {
	var totalRequests float64
	hitsByEndpoint := make(map[string]float64)
	latencySumByEndpoint := make(map[string]float64)
	latencyCountByEndpoint := make(map[string]float64)

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
					} else if strings.HasPrefix(code, "5") {
						statusCodes["5xx"] += val
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

	return totalRequests, topHits, slowestEndpoints, statusCodes
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

	totalRequests, topHits, slowestEndpoints, statusCodes := parsePrometheusMetrics(string(respBytes))

	c.JSON(http.StatusOK, gin.H{
		"success":          true,
		"totalRequests":    totalRequests,
		"topHits":          topHits,
		"slowestEndpoints": slowestEndpoints,
		"statusCodes":      statusCodes,
	})
}
