package handlers

import (
	"bytes"
	"encoding/base64"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/utils"

	"github.com/gin-gonic/gin"
)

// ProxyKong forwards client requests to the active Kong Admin API, enforces RBAC, and logs modifications
func ProxyKong(c *gin.Context) {
	nodeVal, exists := c.Get("kongNode")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"message": "No active Kong connection found"})
		return
	}
	node := nodeVal.(*models.KongNode)

	// Clean trailing slash of admin URL
	adminURL := strings.TrimSuffix(node.KongAdminURL, "/")

	// Extract proxy path (everything after /kong or /api/kong)
	proxyPath := c.Param("proxyPath")
	if !strings.HasPrefix(proxyPath, "/") {
		proxyPath = "/" + proxyPath
	}

	targetURL := adminURL + proxyPath
	if c.Request.URL.RawQuery != "" {
		targetURL = targetURL + "?" + c.Request.URL.RawQuery
	}

	method := strings.ToUpper(c.Request.Method)
	// Map PUT to PATCH for Kong compatibility
	if method == "PUT" {
		method = "PATCH"
	}

	// Read and cache request body for forwarding and logging
	var bodyBytes []byte
	if c.Request.Body != nil {
		var err error
		bodyBytes, err = io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Failed to read request body"})
			return
		}
		// Reset body reader so it can be read again
		c.Request.Body = io.NopCloser(bytes.NewBuffer(bodyBytes))
	}

	// Create request to Kong Admin API
	req, err := http.NewRequest(method, targetURL, bytes.NewReader(bodyBytes))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create backend request", "error": err.Error()})
		return
	}

	// Setup Headers
	req.Header.Set("Content-Type", "application/json")

	// Set Kong auth headers depending on node type
	switch node.Type {
	case "key_auth":
		req.Header.Set("apikey", node.KongAPIKey)
	case "jwt":
		token, err := utils.IssueKongConnectionToken(node.JWTKey, node.JWTSecret)
		if err == nil {
			req.Header.Set("Authorization", "Bearer "+token)
		} else {
			log.Printf("ProxyKong: failed to sign Kong connection JWT: %v", err)
		}
	case "basic_auth":
		auth := node.Username + ":" + node.Password
		encoded := base64.StdEncoding.EncodeToString([]byte(auth))
		req.Header.Set("Authorization", "Basic "+encoded)
	}

	// Forward client request
	client := &http.Client{
		Timeout: 30 * time.Second,
	}
	resp, err := client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": "Failed to reach Kong Admin API", "error": err.Error()})
		return
	}
	defer resp.Body.Close()

	// Read response body
	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to read response from Kong Admin API"})
		return
	}

	// Save Audit Log for successful write operations (HTTP 2xx on POST, PUT, PATCH, DELETE)
	if method != "GET" && resp.StatusCode >= 200 && resp.StatusCode < 300 {
		clientIP := c.ClientIP()
		username := "anonymous"
		var userID *uint

		userVal, userExists := c.Get("user")
		if userExists {
			u := userVal.(*models.User)
			userID = &u.ID
			if u.Username != "" {
				username = u.Username
			} else {
				username = u.Email
			}
		}

		// Extract entity (first URL segment)
		segments := strings.Split(strings.TrimPrefix(proxyPath, "/"), "/")
		entity := "unknown"
		if len(segments) > 0 && segments[0] != "" {
			entity = segments[0]
		}

		// Log payload details
		payloadStr := string(bodyBytes)
		if payloadStr == "" {
			payloadStr = "null"
		}

		now := time.Now()
		auditLog := models.AuditLog{
			IPAddress:    clientIP,
			UserID:       userID,
			Username:     username,
			Action:       method,
			Entity:       entity,
			URL:          c.Request.URL.Path,
			Payload:      payloadStr,
			KongNodeName: node.Name,
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		if err := db.DB.Create(&auditLog).Error; err != nil {
			log.Printf("Failed to write audit log: %v", err)
		} else {
			log.Printf("Audit log written: %s %s by %s from %s", method, entity, username, clientIP)
		}
	}

	// Forward response headers (except standard hop-by-hop headers)
	for k, vv := range resp.Header {
		if k == "Connection" || k == "Keep-Alive" || k == "Proxy-Authenticate" || k == "Transfer-Encoding" {
			continue
		}
		for _, v := range vv {
			c.Header(k, v)
		}
	}

	c.Data(resp.StatusCode, resp.Header.Get("Content-Type"), respBytes)
}
