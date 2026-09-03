package services

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm/clause"
	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/utils"
)

func StartReachabilityCron() {
	// Run in background to avoid blocking main thread on startup
	go func() {
		// Run immediately once
		RunReachabilityCheck()

		// Then run every 1 hour
		ticker := time.NewTicker(1 * time.Hour)
		for {
			<-ticker.C
			RunReachabilityCheck()
		}
	}()
}
func RunReachabilityCheck() {
	var nodes []models.KongNode
	if err := db.DB.Where("active = ?", true).Find(&nodes).Error; err != nil || len(nodes) == 0 {
		// Fallback to the first connection if none is explicitly active (same as UI middleware)
		var firstNode models.KongNode
		if err := db.DB.First(&firstNode).Error; err == nil {
			nodes = append(nodes, firstNode)
		}
	}

	for _, node := range nodes {
		// Let's use simple HTTP requests to the Kong Admin URL for this node
		if node.KongAdminURL == "" {
			continue
		}

		client := &http.Client{Timeout: 10 * time.Second}
		
		// 1. Fetch all services
		services, err := fetchKongEntities(client, node, "/services?size=1000")
		if err == nil {
			var wg sync.WaitGroup
			sem := make(chan struct{}, 10) // Concurrency limit of 10 workers
			for _, svc := range services {
				wg.Add(1)
				go func(s KongEntity) {
					defer wg.Done()
					sem <- struct{}{}
					defer func() { <-sem }()
					status, msg, code := checkEntityReachability(s)
					UpsertReachabilityStatus(s.ID, "service", status, msg, code)
				}(svc)
			}
			wg.Wait()
		} else {
			log.Printf("ReachabilityCron: failed to fetch services for node %s: %v", node.Name, err)
		}

		// 2. Fetch all routes
		routes, err := fetchKongEntities(client, node, "/routes?size=1000")
		if err == nil {
			var wg sync.WaitGroup
			sem := make(chan struct{}, 10)
			for _, route := range routes {
				wg.Add(1)
				go func(r KongEntity) {
					defer wg.Done()
					sem <- struct{}{}
					defer func() { <-sem }()
					status, msg, code := checkRouteReachability(r, node.KongProxyURL)
					UpsertReachabilityStatus(r.ID, "route", status, msg, code)
				}(route)
			}
			wg.Wait()
		} else {
			log.Printf("ReachabilityCron: failed to fetch routes for node %s: %v", node.Name, err)
		}
	}
}

type KongEntity struct {
	ID        string   `json:"id"`
	Name      string   `json:"name"`
	Host      string   `json:"host"`
	Port      int      `json:"port"`
	Protocol  string   `json:"protocol"`
	Path      string   `json:"path"`
	Paths     []string `json:"paths"`
	Protocols []string `json:"protocols"`
	Tags      []string `json:"tags"`
}

func fetchKongEntities(client *http.Client, node models.KongNode, endpoint string) ([]KongEntity, error) {
	req, err := http.NewRequest("GET", strings.TrimSuffix(node.KongAdminURL, "/")+endpoint+"?size=1000", nil)
	if err != nil {
		return nil, err
	}

	switch node.Type {
	case "key_auth":
		req.Header.Set("apikey", node.KongAPIKey)
	case "jwt":
		token, err := utils.IssueKongConnectionToken(node.JWTKey, node.JWTSecret)
		if err == nil {
			req.Header.Set("Authorization", "Bearer "+token)
		}
	case "basic_auth":
		importBase64 := true // handled by imports
		_ = importBase64
		// I will just add encoding/base64 to imports and use base64.StdEncoding.EncodeToString([]byte(auth))
		auth := node.Username + ":" + node.Password
		encoded := base64.StdEncoding.EncodeToString([]byte(auth))
		req.Header.Set("Authorization", "Basic "+encoded)
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	var result struct {
		Data []KongEntity `json:"data"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, err
	}
	return result.Data, nil
}

func checkEntityReachability(service KongEntity) (string, string, int) {
	allowInternal := os.Getenv("ALLOW_INTERNAL_SSRF") == "true"
	if !allowInternal && service.Host != "" {
		ips, err := net.LookupIP(service.Host)
		if err == nil {
			for _, ip := range ips {
				if utils.IsPrivateIP(ip) {
					return "unreachable", "Service is unreachable: access to internal IP addresses is blocked by security policy", 403
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

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Head(targetURL)
	if err != nil {
		resp, err = client.Get(targetURL)
	}

	if err != nil {
		return "unreachable", "Failed to connect to upstream: " + err.Error(), 0
	}
	defer resp.Body.Close()

	// Any HTTP response (even 4xx/5xx) means the server is online and reachable!
	return "reachable", "Service is reachable", resp.StatusCode
}

func checkRouteReachability(route KongEntity, proxyURL string) (string, string, int) {
	if proxyURL == "" {
		return "unreachable", "Kong Proxy URL not configured for this node", 0
	}
	if len(route.Protocols) > 0 && route.Protocols[0] != "http" && route.Protocols[0] != "https" {
		return "unreachable", "Reachability check only supports http/https protocols", 0
	}

	targetURL := strings.TrimSuffix(proxyURL, "/")
	var path string
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

	client := &http.Client{Timeout: 3 * time.Second}
	resp, err := client.Head(targetURL)
	if err != nil {
		resp, err = client.Get(targetURL)
	}

	if err != nil {
		return "unreachable", "Failed to connect to proxy: " + err.Error(), 0
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 500 {
		errMsg := fmt.Sprintf("Service Error (HTTP %d)", resp.StatusCode)
		if resp.StatusCode == http.StatusBadGateway {
			errMsg = "Bad Gateway (HTTP 502)"
		} else if resp.StatusCode == http.StatusGatewayTimeout {
			errMsg = "Gateway Timeout (HTTP 504)"
		}
		return "unreachable", errMsg, resp.StatusCode
	}

	return "reachable", "Route is reachable", resp.StatusCode
}

func UpsertReachabilityStatus(entityID, entityType, status, message string, statusCode int) {
	rs := models.ReachabilityStatus{
		EntityID:   entityID,
		EntityType: entityType,
		Status:     status,
		Message:    message,
		StatusCode: statusCode,
		UpdatedAt:  time.Now(),
	}

	err := db.DB.Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "entity_id"}, {Name: "entity_type"}},
		DoUpdates: clause.AssignmentColumns([]string{"status", "message", "status_code", "updated_at"}),
	}).Create(&rs).Error

	if err != nil {
		log.Printf("UpsertReachabilityStatus failed for %s %s: %v", entityType, entityID, err)
	}
}
