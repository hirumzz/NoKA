package services

import (
	"encoding/base64"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"gorm.io/datatypes"

	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/utils"
)

type HealthCheckDetails struct {
	IsHealthy      bool      `json:"isHealthy"`
	LastChecked    time.Time `json:"lastChecked"`
	FirstSucceeded time.Time `json:"firstSucceeded"`
}

func StartConnectionHealthChecker() {
	go func() {
		for {
			var nodes []models.KongNode
			if err := db.DB.Where("active = ?", true).Find(&nodes).Error; err != nil {
				log.Printf("HealthCheck: failed to query nodes: %v", err)
			} else {
				client := &http.Client{Timeout: 5 * time.Second}
				for _, node := range nodes {
					if !node.HealthChecks {
						continue
					}

					var details HealthCheckDetails
					if len(node.HealthCheckDetails) > 0 {
						_ = json.Unmarshal(node.HealthCheckDetails, &details)
					}

					healthy := false
					if node.KongAdminURL != "" {
						req, err := http.NewRequest("GET", node.KongAdminURL, nil)
						if err == nil {
							// Inject proper headers based on node auth type
							switch node.Type {
							case "key_auth":
								req.Header.Set("apikey", node.KongAPIKey)
							case "jwt":
								token, err := utils.IssueKongConnectionToken(node.JWTKey, node.JWTSecret)
								if err == nil {
									req.Header.Set("Authorization", "Bearer "+token)
								}
							case "basic_auth":
								auth := node.Username + ":" + node.Password
								encoded := base64.StdEncoding.EncodeToString([]byte(auth))
								req.Header.Set("Authorization", "Basic "+encoded)
							}

							resp, err := client.Do(req)
							if err == nil {
								if resp.StatusCode >= 200 && resp.StatusCode < 400 {
									healthy = true
								}
								resp.Body.Close()
							}
						}
					}

					now := time.Now()
					if healthy {
						if !details.IsHealthy {
							details.FirstSucceeded = now
						}
					}
					details.IsHealthy = healthy
					details.LastChecked = now

					b, _ := json.Marshal(details)
					db.DB.Model(&node).Update("health_check_details", datatypes.JSON(b))
				}
			}
			time.Sleep(60 * time.Second)
		}
	}()
}
