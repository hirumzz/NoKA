package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"time"

	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/services"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
	"gorm.io/gorm"
)

type CreateAlertRuleRequest struct {
	Name            string         `json:"name" binding:"required"`
	Description     string         `json:"description"`
	Enabled         *bool          `json:"enabled"`
	Severity        string         `json:"severity"`
	Source          string         `json:"source"`
	MatchLogic      string         `json:"match_logic"`
	ConditionType   string         `json:"condition_type"`
	ConditionConfig datatypes.JSON `json:"condition_config"`
	ConditionRules  datatypes.JSON `json:"condition_rules"`
	CustomTemplate  string         `json:"custom_template"`
	Channels        datatypes.JSON `json:"channels"`
	CooldownMinutes int            `json:"cooldown_minutes"`
}

type UpdateAlertRuleRequest struct {
	Name            string         `json:"name"`
	Description     string         `json:"description"`
	Enabled         *bool          `json:"enabled"`
	Severity        string         `json:"severity"`
	Source          string         `json:"source"`
	MatchLogic      string         `json:"match_logic"`
	ConditionType   string         `json:"condition_type"`
	ConditionConfig datatypes.JSON `json:"condition_config"`
	ConditionRules  datatypes.JSON `json:"condition_rules"`
	CustomTemplate  string         `json:"custom_template"`
	Channels        datatypes.JSON `json:"channels"`
	CooldownMinutes int            `json:"cooldown_minutes"`
}

type TestAlertRuleRequest struct {
	ID              *uint          `json:"id"`
	RuleID          *uint          `json:"rule_id"`
	Name            string         `json:"name"`
	Description     string         `json:"description"`
	Severity        string         `json:"severity"`
	Source          string         `json:"source"`
	MatchLogic      string         `json:"match_logic"`
	ConditionType   string         `json:"condition_type"`
	ConditionConfig datatypes.JSON `json:"condition_config"`
	ConditionRules  datatypes.JSON `json:"condition_rules"`
	CustomTemplate  string         `json:"custom_template"`
	Channels        datatypes.JSON `json:"channels"`
}

// GetAlertRules retrieves all configured alerting rules
func GetAlertRules(c *gin.Context) {
	var rules []models.KongaAlertRule
	if err := db.DB.Order("id DESC").Find(&rules).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch alert rules", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, rules)
}

// CreateAlertRule creates a new alerting rule, recording audit log and notification
func CreateAlertRule(c *gin.Context) {
	var req CreateAlertRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request fields", "error": err.Error()})
		return
	}

	username := "anonymous"
	var userID *uint
	if userVal, exists := c.Get("user"); exists {
		if u, ok := userVal.(*models.User); ok {
			userID = &u.ID
			username = u.Username
		}
	}

	enabled := true
	if req.Enabled != nil {
		enabled = *req.Enabled
	}

	severity := req.Severity
	if severity == "" {
		severity = "warning"
	}

	source := req.Source
	if source == "" {
		if req.ConditionType != "" {
			source = req.ConditionType
		} else {
			source = "custom"
		}
	}

	matchLogic := req.MatchLogic
	if matchLogic == "" {
		matchLogic = "ALL"
	}

	cooldown := req.CooldownMinutes
	if cooldown <= 0 {
		cooldown = 5
	}

	conditionConfig := req.ConditionConfig
	if len(conditionConfig) == 0 {
		conditionConfig = datatypes.JSON("{}")
	}

	conditionRules := req.ConditionRules
	if len(conditionRules) == 0 {
		conditionRules = datatypes.JSON("[]")
	} else {
		var rules []services.ConditionRuleItem
		if err := json.Unmarshal(conditionRules, &rules); err == nil {
			for _, cond := range rules {
				op := cond.Operator
				if op == "regex" || op == "regex_match" {
					if len(cond.Value) > 250 {
						c.JSON(http.StatusBadRequest, gin.H{"message": "Regular expression exceeds maximum allowed length of 250 characters"})
						return
					}
					if _, err := regexp.Compile(cond.Value); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"message": "invalid regular expression: " + err.Error()})
						return
					}
				}
			}
		}
	}

	channels := req.Channels
	if len(channels) == 0 {
		channels = datatypes.JSON(`["in_app"]`)
	}

	customTemplate := req.CustomTemplate
	if customTemplate == "" && len(conditionConfig) > 0 {
		var cfg map[string]interface{}
		if json.Unmarshal(conditionConfig, &cfg) == nil {
			if t, ok := cfg["custom_template"].(string); ok && t != "" {
				customTemplate = t
			}
		}
	}

	now := time.Now()
	rule := models.KongaAlertRule{
		Name:            req.Name,
		Description:     req.Description,
		Enabled:         enabled,
		Severity:        severity,
		Source:          source,
		MatchLogic:      matchLogic,
		ConditionType:   req.ConditionType,
		ConditionConfig: conditionConfig,
		ConditionRules:  conditionRules,
		CustomTemplate:  customTemplate,
		Channels:        channels,
		CooldownMinutes: cooldown,
		CreatedBy:       username,
		UpdatedBy:       username,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if err := db.DB.Create(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create alert rule", "error": err.Error()})
		return
	}

	// Record Audit Log and Notification
	recordAlertAuditAndNotify(c, userID, username, "POST", "alert_rules", "/api/alerts/rules",
		rule.Name, "Alert rule created: "+rule.Name, "mdi-bell-plus-outline", req)

	c.JSON(http.StatusCreated, rule)
}

// UpdateAlertRule updates an existing alerting rule
func UpdateAlertRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid alert rule ID"})
		return
	}

	var rule models.KongaAlertRule
	if err := db.DB.First(&rule, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Alert rule not found"})
		return
	}

	var req UpdateAlertRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request fields", "error": err.Error()})
		return
	}

	username := "anonymous"
	var userID *uint
	if userVal, exists := c.Get("user"); exists {
		if u, ok := userVal.(*models.User); ok {
			userID = &u.ID
			username = u.Username
		}
	}

	if req.Name != "" {
		rule.Name = req.Name
	}
	rule.Description = req.Description
	if req.Enabled != nil {
		rule.Enabled = *req.Enabled
	}
	if req.Severity != "" {
		rule.Severity = req.Severity
	}
	if req.Source != "" {
		rule.Source = req.Source
	}
	if req.MatchLogic != "" {
		rule.MatchLogic = req.MatchLogic
	}
	if req.ConditionType != "" {
		rule.ConditionType = req.ConditionType
	}
	if len(req.ConditionConfig) > 0 {
		rule.ConditionConfig = req.ConditionConfig
	}
	if len(req.ConditionRules) > 0 {
		var rules []services.ConditionRuleItem
		if err := json.Unmarshal(req.ConditionRules, &rules); err == nil {
			for _, cond := range rules {
				op := cond.Operator
				if op == "regex" || op == "regex_match" {
					if len(cond.Value) > 250 {
						c.JSON(http.StatusBadRequest, gin.H{"message": "Regular expression exceeds maximum allowed length of 250 characters"})
						return
					}
					if _, err := regexp.Compile(cond.Value); err != nil {
						c.JSON(http.StatusBadRequest, gin.H{"message": "invalid regular expression: " + err.Error()})
						return
					}
				}
			}
		}
		rule.ConditionRules = req.ConditionRules
	}
	if req.CustomTemplate != "" {
		rule.CustomTemplate = req.CustomTemplate
	} else if len(req.ConditionConfig) > 0 {
		var cfg map[string]interface{}
		if json.Unmarshal(req.ConditionConfig, &cfg) == nil {
			if t, ok := cfg["custom_template"].(string); ok && t != "" {
				rule.CustomTemplate = t
			}
		}
	}
	if len(req.Channels) > 0 {
		rule.Channels = req.Channels
	}
	if req.CooldownMinutes > 0 {
		rule.CooldownMinutes = req.CooldownMinutes
	}
	rule.UpdatedBy = username
	rule.UpdatedAt = time.Now()

	if err := db.DB.Save(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to update alert rule", "error": err.Error()})
		return
	}

	recordAlertAuditAndNotify(c, userID, username, "PUT", "alert_rules", fmt.Sprintf("/api/alerts/rules/%d", rule.ID),
		rule.Name, "Alert rule updated: "+rule.Name, "mdi-bell-cog-outline", req)

	c.JSON(http.StatusOK, rule)
}

// DeleteAlertRule removes an alert rule
func DeleteAlertRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid alert rule ID"})
		return
	}

	var rule models.KongaAlertRule
	if err := db.DB.First(&rule, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Alert rule not found"})
		return
	}

	if err := db.DB.Delete(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to delete alert rule", "error": err.Error()})
		return
	}

	username := "anonymous"
	var userID *uint
	if userVal, exists := c.Get("user"); exists {
		if u, ok := userVal.(*models.User); ok {
			userID = &u.ID
			username = u.Username
		}
	}

	recordAlertAuditAndNotify(c, userID, username, "DELETE", "alert_rules", fmt.Sprintf("/api/alerts/rules/%d", rule.ID),
		rule.Name, "Alert rule deleted: "+rule.Name, "mdi-bell-remove-outline", gin.H{"id": rule.ID, "name": rule.Name})

	c.JSON(http.StatusOK, gin.H{"message": "Alert rule deleted successfully"})
}

// ToggleAlertRule flips the enabled status of an alert rule
func ToggleAlertRule(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid alert rule ID"})
		return
	}

	var rule models.KongaAlertRule
	if err := db.DB.First(&rule, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Alert rule not found"})
		return
	}

	username := "anonymous"
	var userID *uint
	if userVal, exists := c.Get("user"); exists {
		if u, ok := userVal.(*models.User); ok {
			userID = &u.ID
			username = u.Username
		}
	}

	rule.Enabled = !rule.Enabled
	rule.UpdatedBy = username
	rule.UpdatedAt = time.Now()

	if err := db.DB.Save(&rule).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to toggle alert rule", "error": err.Error()})
		return
	}

	statusStr := "disabled"
	if rule.Enabled {
		statusStr = "enabled"
	}

	recordAlertAuditAndNotify(c, userID, username, "PATCH", "alert_rules", fmt.Sprintf("/api/alerts/rules/%d/toggle", rule.ID),
		rule.Name, fmt.Sprintf("Alert rule '%s' %s", rule.Name, statusStr), "mdi-bell-outline", gin.H{"enabled": rule.Enabled})

	c.JSON(http.StatusOK, rule)
}

// TestAlertRule triggers an immediate channel delivery test for an alert rule (dry-run or existing)
func TestAlertRule(c *gin.Context) {
	var req TestAlertRuleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid alert rule test payload", "error": err.Error()})
		return
	}

	targetRuleID := req.ID
	if targetRuleID == nil {
		targetRuleID = req.RuleID
	}

	var rule models.KongaAlertRule
	if targetRuleID != nil && *targetRuleID > 0 {
		if err := db.DB.First(&rule, *targetRuleID).Error; err == nil {
			// Found existing rule, overlay payload fields if provided
			if req.Name != "" {
				rule.Name = req.Name
			}
			if req.Severity != "" {
				rule.Severity = req.Severity
			}
			if req.Source != "" {
				rule.Source = req.Source
			}
			if req.MatchLogic != "" {
				rule.MatchLogic = req.MatchLogic
			}
			if req.ConditionType != "" {
				rule.ConditionType = req.ConditionType
			}
			if len(req.ConditionRules) > 0 {
				rule.ConditionRules = req.ConditionRules
			}
			if req.CustomTemplate != "" {
				rule.CustomTemplate = req.CustomTemplate
			} else if len(req.ConditionConfig) > 0 {
				var cfg map[string]interface{}
				if json.Unmarshal(req.ConditionConfig, &cfg) == nil {
					if t, ok := cfg["custom_template"].(string); ok && t != "" {
						rule.CustomTemplate = t
					}
				}
			}
			if len(req.Channels) > 0 {
				rule.Channels = req.Channels
			}
		}
	}

	if rule.ID == 0 {
		// Construct dry-run rule
		rule.Name = req.Name
		rule.Description = req.Description
		rule.Severity = req.Severity
		rule.Source = req.Source
		rule.MatchLogic = req.MatchLogic
		rule.ConditionType = req.ConditionType
		rule.ConditionConfig = req.ConditionConfig
		rule.ConditionRules = req.ConditionRules
		rule.CustomTemplate = req.CustomTemplate
		if rule.CustomTemplate == "" && len(req.ConditionConfig) > 0 {
			var cfg map[string]interface{}
			if json.Unmarshal(req.ConditionConfig, &cfg) == nil {
				if t, ok := cfg["custom_template"].(string); ok && t != "" {
					rule.CustomTemplate = t
				}
			}
		}
		rule.Channels = req.Channels
	}

	if rule.Name == "" {
		rule.Name = "Test Rule"
	}
	if rule.Source == "" {
		rule.Source = "custom"
	}
	if rule.ConditionType == "" {
		rule.ConditionType = rule.Source
	}
	if rule.Severity == "" {
		rule.Severity = "warning"
	}

	results, err := services.TriggerTestAlertRule(rule)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Failed to trigger test alert", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Test alert dispatched to configured channels",
		"results": results,
	})
}

// GetAlertHistory retrieves the log history of triggered alerts
func GetAlertHistory(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "100")
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 || limit > 500 {
		limit = 100
	}

	var history []models.KongaAlertHistory
	if err := db.DB.Order("created_at DESC").Limit(limit).Find(&history).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch alert history", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, history)
}

// ClearAlertHistory deletes all alert history records
func ClearAlertHistory(c *gin.Context) {
	if err := db.DB.Session(&gorm.Session{AllowGlobalUpdate: true}).Delete(&models.KongaAlertHistory{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to clear alert history", "error": err.Error()})
		return
	}

	username := "anonymous"
	var userID *uint
	if userVal, exists := c.Get("user"); exists {
		if u, ok := userVal.(*models.User); ok {
			userID = &u.ID
			username = u.Username
		}
	}

	payloadBytes, _ := json.Marshal(gin.H{"action": "clear_all"})
	audit := models.AuditLog{
		IPAddress:    c.ClientIP(),
		UserID:       userID,
		Username:     username,
		Action:       "DELETE",
		Entity:       "alert_history",
		URL:          "/api/alerts/history",
		Payload:      datatypes.JSON(payloadBytes),
		KongNodeName: "system",
	}
	db.DB.Create(&audit)

	notif := models.KongaNotification{
		Message:     fmt.Sprintf("%s cleared all alert history records", username),
		Icon:        "mdi-delete-sweep-outline",
		State:       "alerts",
		StateParams: datatypes.JSON([]byte(`{"entity":"alert_history","url":"/api/alerts/history"}`)),
		UserID:      userID,
	}
	db.DB.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "Alert history cleared successfully"})
}

func recordAlertAuditAndNotify(c *gin.Context, userID *uint, username, action, entity, url, nodeName, message, icon string, payload interface{}) {
	payloadBytes, _ := json.Marshal(payload)

	audit := models.AuditLog{
		IPAddress:    c.ClientIP(),
		UserID:       userID,
		Username:     username,
		Action:       action,
		Entity:       entity,
		URL:          url,
		Payload:      datatypes.JSON(payloadBytes),
		KongNodeName: "system",
	}
	db.DB.Create(&audit)

	notif := models.KongaNotification{
		Message:     message,
		Icon:        icon,
		State:       "alerts",
		StateParams: datatypes.JSON([]byte(fmt.Sprintf(`{"entity":"%s","url":"%s"}`, entity, url))),
		UserID:      userID,
	}
	db.DB.Create(&notif)
}
