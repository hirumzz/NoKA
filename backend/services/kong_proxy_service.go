package services

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"
	"time"
	"gorm.io/datatypes"

	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/utils"
)

type KongProxyService interface {
	ForwardRequest(node *models.KongNode, method, path, rawQuery string, bodyBytes []byte, clientIP string, user *models.User, customFields string) (int, http.Header, []byte, error)
}

type kongProxyService struct {}

func NewKongProxyService() KongProxyService {
	return &kongProxyService{}
}

func (s *kongProxyService) ForwardRequest(node *models.KongNode, method, path, rawQuery string, bodyBytes []byte, clientIP string, user *models.User, customFields string) (int, http.Header, []byte, error) {
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
	
	var entityNameFromDelete string
	if method == "DELETE" {
		getReq, _ := http.NewRequest("GET", targetURL, nil)
		getReq.Header = req.Header.Clone()
		if getResp, err := client.Do(getReq); err == nil {
			if getBody, err := io.ReadAll(getResp.Body); err == nil {
				var data map[string]interface{}
				if json.Unmarshal(getBody, &data) == nil {
					if n, ok := data["name"].(string); ok && n != "" {
						entityNameFromDelete = n
					} else if u, ok := data["username"].(string); ok && u != "" {
						entityNameFromDelete = u
					}
				}
			}
			getResp.Body.Close()
		}
	}

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

		entityName := ""
		if method == "DELETE" {
			entityName = entityNameFromDelete
		}
		
		var changedFields []string
		if customFields != "" {
			for _, f := range strings.Split(customFields, ",") {
				changedFields = append(changedFields, strings.TrimSpace(f))
			}
		}
		
		if method == "POST" || method == "PATCH" || method == "PUT" {
			var dataReq map[string]interface{}
			if err := json.Unmarshal(bodyBytes, &dataReq); err == nil {
				if customFields == "" {
					for k := range dataReq {
						changedFields = append(changedFields, k)
					}
				}
				if n, ok := dataReq["name"].(string); ok && n != "" {
					entityName = n
				} else if u, ok := dataReq["username"].(string); ok && u != "" {
					entityName = u
				}
			}

			if entityName == "" {
				var data map[string]interface{}
				if err := json.Unmarshal(respBytes, &data); err == nil {
					if n, ok := data["name"].(string); ok && n != "" {
						entityName = n
					} else if u, ok := data["username"].(string); ok && u != "" {
						entityName = u
					}
				}
			}
		}

		auditPath := path
		entityDisplayName := entity
		if entityName != "" {
			auditPath = fmt.Sprintf("%s (%s)", path, entityName)
			entityDisplayName = fmt.Sprintf("%s (%s)", entity, entityName)
		}

		actionStr := method
		if len(changedFields) > 0 && method == "PATCH" {
			actionStr = fmt.Sprintf("PATCH [%s]", strings.Join(changedFields, ", "))
		}

		now := time.Now()
		auditLog := &models.AuditLog{
			IPAddress:    clientIP,
			UserID:       userID,
			Username:     username,
			Action:       actionStr,
			Entity:       entity,
			URL:          auditPath,
			Payload:      datatypes.JSON(payloadStr),
			KongNodeName: node.Name,
			CreatedAt:    now,
			UpdatedAt:    now,
		}

		// I'll fix c.Request.URL.Path inside the service

		// Import db and create a system notification for the change
		icon := "mdi-message-outline"
		state := ""

		// Build entity ID from path segments (e.g. /services/{id} → services/{id})
		entityID := ""
		if len(segments) > 1 && segments[1] != "" {
			entityID = segments[1]
		}

		if entity == "services" {
			icon = "mdi-cloud"
			if entityID != "" {
				state = "services/" + entityID
			} else {
				state = "services"
			}
		} else if entity == "routes" {
			icon = "mdi-git"
			if entityID != "" {
				state = "routes/" + entityID
			} else {
				state = "routes"
			}
		} else if entity == "consumers" {
			icon = "mdi-account"
			if entityID != "" {
				state = "consumers/" + entityID
			} else {
				state = "consumers"
			}
		} else if entity == "plugins" {
			icon = "mdi-power"
			state = "plugins"
		} else if entity == "upstreams" {
			icon = "mdi-cloud-upload"
			if entityID != "" {
				state = "upstreams/" + entityID
			} else {
				state = "upstreams"
			}
		} else if entity == "certificates" {
			icon = "mdi-certificate"
			if entityID != "" {
				state = "certificates/" + entityID
			} else {
				state = "certificates"
			}
		}


		notificationMessage := fmt.Sprintf("%s %s %s on connection '%s'", username, actionStr, entityDisplayName, node.Name)
		notif := &models.KongaNotification{
			Message:     notificationMessage,
			Icon:        icon,
			State:       state,
			StateParams: datatypes.JSON("{}"),
			UserID:      userID,
			CreatedAt:   now,
			UpdatedAt:   now,
		}

		if err := db.DB.Create(notif).Error; err != nil {
			log.Printf("Failed to write notification: %v", err)
		}

		// ponytail: Use db.DB directly instead of repository
		if err := db.DB.Create(auditLog).Error; err != nil {
			log.Printf("Failed to write audit log: %v", err)
		} else {
			log.Printf("Audit log written: %s %s by %s from %s", method, entity, username, clientIP)
		}
	}

	return resp.StatusCode, resp.Header, respBytes, nil
}
