package handlers

import (
	"reflect"
	"testing"
)

func TestParsePrometheusMetrics(t *testing.T) {
	metricsData := `# HELP kong_http_requests_total Total number of HTTP requests
# TYPE kong_http_requests_total counter
kong_http_requests_total{code="200",route="route-a",service="service-x"} 10.0
kong_http_requests_total{code="200",route="route-a",service="service-x"} 5.0
kong_http_requests_total{code="404",route="route-b",service=""} 3.0
kong_http_requests_total{code="500",route="",service="service-y"} 2.0

# HELP kong_request_latency_ms_sum Latency sum
# TYPE kong_request_latency_ms_sum counter
kong_request_latency_ms_sum{route="route-a",service="service-x"} 1500.0
kong_request_latency_ms_sum{route="route-b",service=""} 600.0
kong_request_latency_ms_sum{route="",service="service-y"} 1000.0

# HELP kong_request_latency_ms_count Latency count
# TYPE kong_request_latency_ms_count counter
kong_request_latency_ms_count{route="route-a",service="service-x"} 15.0
kong_request_latency_ms_count{route="route-b",service=""} 3.0
kong_request_latency_ms_count{route="",service="service-y"} 2.0
`

	totalRequests, topHits, slowestEndpoints, statusCodes := parsePrometheusMetrics(metricsData)

	if totalRequests != 20.0 {
		t.Errorf("expected totalRequests to be 20.0, got %f", totalRequests)
	}

	expectedStatusCodes := map[string]float64{
		"2xx": 15.0,
		"3xx": 0.0,
		"4xx": 3.0,
		"5xx": 2.0,
	}

	if !reflect.DeepEqual(statusCodes, expectedStatusCodes) {
		t.Errorf("expected statusCodes to be %v, got %v", expectedStatusCodes, statusCodes)
	}

	// topHits should be:
	// service-x: 15.0 (hits)
	// route-b: 3.0 (hits)
	// service-y: 2.0 (hits)
	expectedTopHits := []TopHit{
		{Endpoint: "service-x", Hits: 15.0},
		{Endpoint: "route-b", Hits: 3.0},
		{Endpoint: "service-y", Hits: 2.0},
	}
	if !reflect.DeepEqual(topHits, expectedTopHits) {
		t.Errorf("expected topHits to be %v, got %v", expectedTopHits, topHits)
	}

	// slowestEndpoints should be:
	// service-y: avgLatency = 1000 / 2 = 500.0, count = 2
	// service-x: avgLatency = 1500 / 15 = 100.0, count = 15
	// route-b: avgLatency = 600 / 3 = 200.0, count = 3
	// Sorted by avg latency descending:
	// 1. service-y (500.0)
	// 2. route-b (200.0)
	// 3. service-x (100.0)
	expectedSlowest := []SlowestEndpoint{
		{Endpoint: "service-y", AvgLatency: 500.0, Count: 2.0},
		{Endpoint: "route-b", AvgLatency: 200.0, Count: 3.0},
		{Endpoint: "service-x", AvgLatency: 100.0, Count: 15.0},
	}
	if !reflect.DeepEqual(slowestEndpoints, expectedSlowest) {
		t.Errorf("expected slowestEndpoints to be %v, got %v", expectedSlowest, slowestEndpoints)
	}
}
