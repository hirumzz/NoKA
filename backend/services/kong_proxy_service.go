package services

import (
	"bytes"
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"

	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/repositories"
	"konga-backend/utils"
)

type KongProxyService interface {
	ForwardRequest(node *models.KongNode, method, path, rawQuery string, bodyBytes []byte, clientIP string, user *models.User) (int, http.Header, []byte, error)
}

type kongProxyService struct {
	auditRepo repositories.AuditRepository
}

func NewKongProxyService(auditRepo repositories.AuditRepository) KongProxyService {
	return &kongProxyService{auditRepo: auditRepo}
}

func (s *kongProxyService) ForwardRequest(node *models.KongNode, method, path, rawQuery string, bodyBytes []byte, clientIP string, user *models.User) (int, http.Header, []byte, error) {
	adminURL := strings.TrimSuffix(node.KongAdminURL, "/")
	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}

	targetURL := adminURL + path
	if rawQuery != "" {
		targetURL = targetURL + "?" + rawQuery
	}

	method = strings.ToUpper(method)
	if method == "PUT" {
		method = "PATCH"
	}

	req, err := http.NewRequest(method, targetURL, bytes.NewReader(bodyBytes))
	if err != nil {
		return 0, nil, nil, err
	}

	req.Header.Set("Content-Type", "application/json")

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

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return 0, nil, nil, errors.New("Failed to reach Kong Admin API: " + err.Error())
	}
	defer resp.Body.Close()

	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return 0, nil, nil, errors.New("Failed to read response from Kong Admin API")
	}

	if method != "GET" && resp.StatusCode >= 200 && resp.StatusCode < 300 {
		username := "anonymous"
		var userID *uint

		if user != nil {
			userID = &user.ID
			if user.Username != "" {
				username = user.Username
			} else {
				username = user.Email
			}
		}

		segments := strings.Split(strings.TrimPrefix(path, "/"), "/")
		entity := "unknown"
		if len(segments) > 0 && segments[0] != "" {
			entity = segments[0]
		}

		payloadStr := string(bodyBytes)
		if payloadStr == "" {
			payloadStr = "null"
		}

		now := time.Now()
		auditLog := &models.AuditLog{
			IPAddress:    clientIP,
			UserID:       userID,
			Username:     username,
			Action:       method,
			Entity:       entity,
			URL:          path,
			Payload:      payloadStr,
			KongNodeName: node.Name,
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		// I'll fix c.Request.URL.Path inside the service

		// Import db and create a system notification for the change
		icon := "mdi-message-outline"
		state := ""
		if entity == "services" {
			icon = "mdi-cloud"
			state = "services"
		} else if entity == "routes" {
			icon = "mdi-git"
			state = "routes"
		} else if entity == "consumers" {
			icon = "mdi-account"
			state = "consumers"
		} else if entity == "plugins" {
			icon = "mdi-power"
			state = "plugins"
		}

		notificationMessage := fmt.Sprintf("%s %s %s on connection '%s'", username, method, entity, node.Name)
		notif := &models.KongaNotification{
			Message:     notificationMessage,
			Icon:        icon,
			State:       state,
			StateParams: "{}",
			UserID:      userID,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		if err := db.DB.Create(notif).Error; err != nil {
			log.Printf("Failed to write notification: %v", err)
		}

		if err := s.auditRepo.CreateLog(auditLog); err != nil {
			log.Printf("Failed to write audit log: %v", err)
		} else {
			log.Printf("Audit log written: %s %s by %s from %s", method, entity, username, clientIP)
		}
	}

	return resp.StatusCode, resp.Header, respBytes, nil
}
