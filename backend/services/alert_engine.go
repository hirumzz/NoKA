package services

import (
	"crypto/x509"
	"encoding/json"
	"encoding/pem"
	"fmt"
	"log"
	"net/http"
	"os"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"gorm.io/datatypes"
	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/utils"
)

// ConditionRuleItem represents a single condition item inside a rule
type ConditionRuleItem struct {
	Field    string `json:"field"`
	Operator string `json:"operator"`
	Value    string `json:"value"`
}

// matchOperator evaluates actualVal against ruleVal using the given operator
func matchOperator(actualVal interface{}, operator, ruleVal string) bool {
	actualStr := ""
	if actualVal != nil {
		actualStr = fmt.Sprintf("%v", actualVal)
	}

	op := strings.ToLower(strings.TrimSpace(operator))
	ruleValTrim := strings.TrimSpace(ruleVal)

	switch op {
	case "equals", "eq", "==", "=":
		actFloat, actErr := strconv.ParseFloat(strings.TrimSpace(actualStr), 64)
		ruleFloat, ruleErr := strconv.ParseFloat(ruleValTrim, 64)
		if actErr == nil && ruleErr == nil {
			return actFloat == ruleFloat
		}
		return strings.EqualFold(strings.TrimSpace(actualStr), ruleValTrim)

	case "not_equals", "neq", "!=":
		actFloat, actErr := strconv.ParseFloat(strings.TrimSpace(actualStr), 64)
		ruleFloat, ruleErr := strconv.ParseFloat(ruleValTrim, 64)
		if actErr == nil && ruleErr == nil {
			return actFloat != ruleFloat
		}
		return !strings.EqualFold(strings.TrimSpace(actualStr), ruleValTrim)

	case "greater_than", "gt", ">":
		actFloat, actErr := strconv.ParseFloat(strings.TrimSpace(actualStr), 64)
		ruleFloat, ruleErr := strconv.ParseFloat(ruleValTrim, 64)
		if actErr != nil || ruleErr != nil {
			return false
		}
		return actFloat > ruleFloat

	case "less_than", "lt", "<":
		actFloat, actErr := strconv.ParseFloat(strings.TrimSpace(actualStr), 64)
		ruleFloat, ruleErr := strconv.ParseFloat(ruleValTrim, 64)
		if actErr != nil || ruleErr != nil {
			return false
		}
		return actFloat < ruleFloat

	case "greater_equal", "gte", ">=":
		actFloat, actErr := strconv.ParseFloat(strings.TrimSpace(actualStr), 64)
		ruleFloat, ruleErr := strconv.ParseFloat(ruleValTrim, 64)
		if actErr != nil || ruleErr != nil {
			return false
		}
		return actFloat >= ruleFloat

	case "less_equal", "lte", "<=":
		actFloat, actErr := strconv.ParseFloat(strings.TrimSpace(actualStr), 64)
		ruleFloat, ruleErr := strconv.ParseFloat(ruleValTrim, 64)
		if actErr != nil || ruleErr != nil {
			return false
		}
		return actFloat <= ruleFloat

	case "contains":
		return strings.Contains(strings.ToLower(actualStr), strings.ToLower(ruleValTrim))

	case "not_contains":
		return !strings.Contains(strings.ToLower(actualStr), strings.ToLower(ruleValTrim))

	case "in_list", "in":
		parts := strings.Split(ruleValTrim, ",")
		for _, p := range parts {
			part := strings.TrimSpace(p)
			if part == "" {
				continue
			}
			actFloat, actErr := strconv.ParseFloat(strings.TrimSpace(actualStr), 64)
			partFloat, partErr := strconv.ParseFloat(part, 64)
			if actErr == nil && partErr == nil && actFloat == partFloat {
				return true
			}
			if strings.EqualFold(strings.TrimSpace(actualStr), part) {
				return true
			}
		}
		return false

	case "regex_match", "regex":
		matched, err := regexp.MatchString(ruleValTrim, actualStr)
		if err != nil {
			log.Printf("[AlertEngine] Invalid regex '%s' in condition match: %v", ruleValTrim, err)
			return false
		}
		return matched

	default:
		return strings.EqualFold(strings.TrimSpace(actualStr), ruleValTrim)
	}
}

// EvaluateRuleConditions checks if eventData satisfies the condition rules of the given alert rule
func EvaluateRuleConditions(rule models.KongaAlertRule, eventData map[string]interface{}) bool {
	if len(rule.ConditionRules) == 0 {
		return true
	}

	var rules []ConditionRuleItem
	if err := json.Unmarshal(rule.ConditionRules, &rules); err != nil || len(rules) == 0 {
		return true
	}

	isAnyLogic := strings.EqualFold(rule.MatchLogic, "ANY")

	for _, cond := range rules {
		fieldName := strings.ToLower(strings.TrimSpace(cond.Field))
		if fieldName == "" {
			continue
		}

		// Lookup field in eventData (case-insensitive key search and alias resolution)
		var actualVal interface{}
		var found bool

		for k, v := range eventData {
			if strings.EqualFold(k, fieldName) {
				actualVal = v
				found = true
				break
			}
		}

		// Common field aliases if direct lookup fails
		if !found {
			switch fieldName {
			case "target":
				if v, ok := eventData["entity_id"]; ok {
					actualVal = v
					found = true
				} else if v, ok := eventData["node_name"]; ok {
					actualVal = v
					found = true
				} else if v, ok := eventData["plugin_name"]; ok {
					actualVal = v
					found = true
				} else if v, ok := eventData["snis"]; ok {
					actualVal = v
					found = true
				}
			case "actor":
				if v, ok := eventData["username"]; ok {
					actualVal = v
					found = true
				} else if v, ok := eventData["user"]; ok {
					actualVal = v
					found = true
				}
			case "status_code", "status":
				if v, ok := eventData["status_code"]; ok {
					actualVal = v
					found = true
				} else if v, ok := eventData["status"]; ok {
					actualVal = v
					found = true
				}
			}
		}

		matched := matchOperator(actualVal, cond.Operator, cond.Value)
		if isAnyLogic && matched {
			return true
		}
		if !isAnyLogic && !matched {
			return false
		}
	}

	if isAnyLogic {
		return false
	}
	return true
}

// InterpolateTemplate substitutes {{field}} or {{ field }} placeholders using data key-values
func InterpolateTemplate(template string, defaultMsg string, data map[string]interface{}) string {
	if strings.TrimSpace(template) == "" {
		return defaultMsg
	}

	result := template

	// Pre-populate common aliases if missing in data
	resolvedData := make(map[string]interface{})
	for k, v := range data {
		resolvedData[k] = v
	}

	if _, ok := resolvedData["target"]; !ok {
		if v, ok := resolvedData["plugin_name"]; ok && fmt.Sprintf("%v", v) != "" {
			resolvedData["target"] = v
		} else if v, ok := resolvedData["entity_id"]; ok && fmt.Sprintf("%v", v) != "" {
			resolvedData["target"] = v
		} else if v, ok := resolvedData["node_name"]; ok && fmt.Sprintf("%v", v) != "" {
			resolvedData["target"] = v
		} else if v, ok := resolvedData["snis"]; ok && fmt.Sprintf("%v", v) != "" {
			resolvedData["target"] = v
		} else {
			resolvedData["target"] = "gateway"
		}
	}

	// Always ensure severity is uppercase (e.g. WARNING, CRITICAL, INFO, ERROR)
	if sev, ok := resolvedData["severity"]; ok {
		resolvedData["severity"] = strings.ToUpper(fmt.Sprintf("%v", sev))
	}

	if _, ok := resolvedData["actor"]; !ok {
		if v, ok := resolvedData["username"]; ok {
			resolvedData["actor"] = v
		} else if v, ok := resolvedData["user"]; ok {
			resolvedData["actor"] = v
		} else {
			resolvedData["actor"] = "system"
		}
	}

	if _, ok := resolvedData["message"]; !ok {
		resolvedData["message"] = defaultMsg
	}

	if _, ok := resolvedData["title"]; !ok {
		if v, ok := resolvedData["name"]; ok {
			resolvedData["title"] = v
		} else {
			resolvedData["title"] = "Gateway Alert"
		}
	}

	if _, ok := resolvedData["node_name"]; !ok {
		if v, ok := resolvedData["node"]; ok {
			resolvedData["node_name"] = v
		} else {
			resolvedData["node_name"] = "kong-node"
		}
	}

	if _, ok := resolvedData["node_id"]; !ok {
		if v, ok := resolvedData["nodeId"]; ok {
			resolvedData["node_id"] = v
		} else {
			resolvedData["node_id"] = "1"
		}
	}

	if _, ok := resolvedData["status_code"]; !ok {
		if v, ok := resolvedData["statusCode"]; ok {
			resolvedData["status_code"] = v
		} else {
			resolvedData["status_code"] = "200"
		}
	}

	if _, ok := resolvedData["plugin_name"]; !ok {
		if v, ok := resolvedData["plugin"]; ok {
			resolvedData["plugin_name"] = v
		} else {
			resolvedData["plugin_name"] = resolvedData["target"]
		}
	}

	if _, ok := resolvedData["event"]; !ok {
		resolvedData["event"] = "gateway_alert"
	}

	if _, ok := resolvedData["event_type"]; !ok {
		resolvedData["event_type"] = "gateway_alert"
	}

	if _, ok := resolvedData["resource_name"]; !ok {
		resolvedData["resource_name"] = resolvedData["target"]
	}

	if _, ok := resolvedData["namespace_or_service"]; !ok {
		resolvedData["namespace_or_service"] = resolvedData["node_name"]
	}

	if _, ok := resolvedData["cluster_or_workspace"]; !ok {
		resolvedData["cluster_or_workspace"] = "default"
	}

	if _, ok := resolvedData["timestamp"]; !ok {
		resolvedData["timestamp"] = time.Now().UTC().Format("2006-01-02 15:04:05 UTC")
	} else if tsStr, ok := resolvedData["timestamp"].(string); ok {
		// If timestamp was given in RFC3339, format nicely to YYYY-MM-DD HH:MM:SS UTC
		if parsedT, err := time.Parse(time.RFC3339, tsStr); err == nil {
			resolvedData["timestamp"] = parsedT.UTC().Format("2006-01-02 15:04:05 UTC")
		}
	}

	if _, ok := resolvedData["kong_url"]; !ok {
		if v, ok := resolvedData["admin_url"]; ok && fmt.Sprintf("%v", v) != "" {
			resolvedData["kong_url"] = v
		} else if v, ok := resolvedData["node_url"]; ok && fmt.Sprintf("%v", v) != "" {
			resolvedData["kong_url"] = v
		} else {
			kongEnv := os.Getenv("KONG_ADMIN_URL")
			if kongEnv == "" {
				kongEnv = "http://localhost:8081"
			}
			resolvedData["kong_url"] = kongEnv
		}
	}

	if _, ok := resolvedData["noka_url"]; !ok {
		nokaEnv := os.Getenv("NOKA_URL")
		if nokaEnv == "" {
			nokaEnv = os.Getenv("APP_URL")
		}
		if nokaEnv == "" {
			port := os.Getenv("PORT")
			if port == "" {
				port = "1337"
			}
			nokaEnv = fmt.Sprintf("http://localhost:%s", port)
		}
		resolvedData["noka_url"] = nokaEnv
	}

	for k, v := range resolvedData {
		valStr := fmt.Sprintf("%v", v)
		patterns := []string{
			fmt.Sprintf("{{%s}}", k),
			fmt.Sprintf("{{ %s }}", k),
			fmt.Sprintf("{{%s}}", strings.ToLower(k)),
			fmt.Sprintf("{{ %s }}", strings.ToLower(k)),
			fmt.Sprintf("{{%s}}", strings.ToUpper(k)),
			fmt.Sprintf("{{ %s }}", strings.ToUpper(k)),
		}
		for _, p := range patterns {
			result = strings.ReplaceAll(result, p, valStr)
		}
	}

	return result
}

func normalizeSourceAndCondition(sourceOrCondition string) (string, string) {
	switch sourceOrCondition {
	case "gateway_node_down", "gateway_node":
		return "gateway_node", "gateway_node_down"
	case "plugin_security_anomaly", "plugin_registry":
		return "plugin_registry", "plugin_security_anomaly"
	case "cert_expiring", "ssl_cert":
		return "ssl_cert", "cert_expiring"
	case "ping_5xx_failure", "reachability_ping":
		return "reachability_ping", "ping_5xx_failure"
	case "critical_config_mutation", "audit_mutation":
		return "audit_mutation", "critical_config_mutation"
	case "http_5xx_rate", "metrics":
		return "metrics", "http_5xx_rate"
	default:
		return sourceOrCondition, sourceOrCondition
	}
}

// StartAlertEvaluationEngine starts the background alerting rule evaluator running every 60s
func StartAlertEvaluationEngine() {
	go func() {
		// Run initial check after a brief startup delay (10s)
		time.Sleep(10 * time.Second)
		evaluateAlertRules()

		ticker := time.NewTicker(60 * time.Second)
		defer ticker.Stop()

		for range ticker.C {
			evaluateAlertRules()
		}
	}()
}

// evaluateAlertRules runs periodic health & anomaly scans against active Kong nodes
func evaluateAlertRules() {
	var activeRules []models.KongaAlertRule
	if err := db.DB.Where("enabled = ?", true).Find(&activeRules).Error; err != nil || len(activeRules) == 0 {
		return
	}

	// Check which conditions need active background scanning
	hasNodeDownRule := false
	hasPluginAnomalyRule := false
	hasCertExpiringRule := false

	for _, r := range activeRules {
		switch r.Source {
		case "gateway_node":
			hasNodeDownRule = true
		case "plugin_registry":
			hasPluginAnomalyRule = true
		case "ssl_cert":
			hasCertExpiringRule = true
		}
		switch r.ConditionType {
		case "gateway_node_down":
			hasNodeDownRule = true
		case "plugin_security_anomaly":
			hasPluginAnomalyRule = true
		case "cert_expiring":
			hasCertExpiringRule = true
		}
	}

	var nodes []models.KongNode
	if err := db.DB.Where("active = ?", true).Find(&nodes).Error; err != nil || len(nodes) == 0 {
		var firstNode models.KongNode
		if err := db.DB.First(&firstNode).Error; err == nil {
			nodes = append(nodes, firstNode)
		}
	}

	client := &http.Client{Timeout: 8 * time.Second}

	for _, node := range nodes {
		if node.KongAdminURL == "" {
			continue
		}

		adminURL := strings.TrimRight(node.KongAdminURL, "/")

		// 1. Gateway Node Down Evaluation
		if hasNodeDownRule {
			statusReq, err := createKongNodeRequest(node, "GET", adminURL+"/status")
			if err == nil {
				resp, reqErr := client.Do(statusReq)
				if reqErr != nil || (resp != nil && resp.StatusCode >= 500) {
					errMsg := "Connection refused or timed out"
					statusCode := 0
					if resp != nil {
						statusCode = resp.StatusCode
						errMsg = fmt.Sprintf("Kong Admin API returned status HTTP %d", resp.StatusCode)
						resp.Body.Close()
					} else if reqErr != nil {
						errMsg = reqErr.Error()
					}
					DispatchAlertEvent("gateway_node_down", "critical",
						fmt.Sprintf("Kong Gateway Node '%s' Unreachable", node.Name),
						fmt.Sprintf("Kong Gateway Node '%s' (%s) is offline or failing health check: %s", node.Name, adminURL, errMsg),
						map[string]interface{}{
							"node_id":     node.ID,
							"node_name":   node.Name,
							"admin_url":   adminURL,
							"status_code": statusCode,
							"error":       errMsg,
						},
					)
				} else if resp != nil {
					resp.Body.Close()
				}
			}
		}

		// 2. Plugin Security Anomaly Evaluation (e.g. pre-function, post-function, unauthorized plugins)
		if hasPluginAnomalyRule {
			pluginsReq, err := createKongNodeRequest(node, "GET", adminURL+"/plugins?size=1000")
			if err == nil {
				resp, reqErr := client.Do(pluginsReq)
				if reqErr == nil && resp.StatusCode == 200 {
					var result struct {
						Data []struct {
							ID      string                 `json:"id"`
							Name    string                 `json:"name"`
							Enabled bool                   `json:"enabled"`
							Config  map[string]interface{} `json:"config"`
						} `json:"data"`
					}
					if json.NewDecoder(resp.Body).Decode(&result) == nil {
						for _, p := range result.Data {
							if !p.Enabled {
								continue
							}
							if p.Name == "pre-function" || p.Name == "post-function" {
								DispatchAlertEvent("plugin_security_anomaly", "warning",
									fmt.Sprintf("Arbitrary Code Plugin Active: '%s'", p.Name),
									fmt.Sprintf("Plugin '%s' (ID: %s) allows dynamic Lua code execution on Gateway Node '%s'. Verify security authorization.", p.Name, p.ID, node.Name),
									map[string]interface{}{
										"node_id":     node.ID,
										"node_name":   node.Name,
										"plugin_id":   p.ID,
										"plugin_name": p.Name,
									},
								)
							}
						}
					}
					resp.Body.Close()
				} else if resp != nil {
					resp.Body.Close()
				}
			}
		}

		// 3. SSL Certificate Expiry Evaluation (Certificates expiring within 30 days)
		if hasCertExpiringRule {
			certsReq, err := createKongNodeRequest(node, "GET", adminURL+"/certificates?size=1000")
			if err == nil {
				resp, reqErr := client.Do(certsReq)
				if reqErr == nil && resp.StatusCode == 200 {
					var certResult struct {
						Data []struct {
							ID    string   `json:"id"`
							Cert  string   `json:"cert"`
							SNIs  []string `json:"snis"`
							Tags  []string `json:"tags"`
						} `json:"data"`
					}
					if json.NewDecoder(resp.Body).Decode(&certResult) == nil {
						for _, c := range certResult.Data {
							if c.Cert == "" {
								continue
							}
							block, _ := pem.Decode([]byte(c.Cert))
							if block != nil {
								x509Cert, parseErr := x509.ParseCertificate(block.Bytes)
								if parseErr == nil {
									daysRemaining := int(time.Until(x509Cert.NotAfter).Hours() / 24)
									if daysRemaining <= 30 {
										sniList := strings.Join(c.SNIs, ", ")
										if sniList == "" {
											sniList = x509Cert.Subject.CommonName
										}
										if sniList == "" {
											sniList = c.ID
										}

										sev := "warning"
										if daysRemaining <= 7 {
											sev = "critical"
										}

										DispatchAlertEvent("cert_expiring", sev,
											fmt.Sprintf("SSL Certificate Expiring in %d Days", daysRemaining),
											fmt.Sprintf("Certificate for SNIs [%s] on node '%s' will expire on %s (%d days remaining).", sniList, node.Name, x509Cert.NotAfter.Format("2006-01-02"), daysRemaining),
											map[string]interface{}{
												"certificate_id": c.ID,
												"snis":           c.SNIs,
												"expires_at":     x509Cert.NotAfter.Format(time.RFC3339),
												"days_remaining": daysRemaining,
												"node_name":      node.Name,
											},
										)
									}
								}
							}
						}
					}
					resp.Body.Close()
				} else if resp != nil {
					resp.Body.Close()
				}
			}
		}
	}
}

// createKongNodeRequest builds an authenticated HTTP request for a Kong node
func createKongNodeRequest(node models.KongNode, method, url string) (*http.Request, error) {
	req, err := http.NewRequest(method, url, nil)
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
		req.SetBasicAuth(node.Username, node.Password)
	}

	return req, nil
}

// DispatchAlertEvent processes an incoming alert event against active alert rules and dispatches to channels
func DispatchAlertEvent(sourceOrConditionType string, severity string, title string, message string, details map[string]interface{}) {
	var rules []models.KongaAlertRule
	if err := db.DB.Where("enabled = ?", true).Find(&rules).Error; err != nil || len(rules) == 0 {
		return
	}

	now := time.Now()
	integrationsMap := getDecryptedIntegrationsConfig()

	normSource, normCondition := normalizeSourceAndCondition(sourceOrConditionType)

	for _, rule := range rules {
		ruleSource := strings.ToLower(strings.TrimSpace(rule.Source))
		ruleCond := strings.ToLower(strings.TrimSpace(rule.ConditionType))

		sourceMatches := (ruleSource == "" || ruleSource == "custom" || ruleSource == "all" ||
			ruleSource == normSource || ruleSource == normCondition || ruleSource == strings.ToLower(sourceOrConditionType))
		condMatches := (ruleCond == "" || ruleCond == "all" ||
			ruleCond == normCondition || ruleCond == normSource || ruleCond == strings.ToLower(sourceOrConditionType))

		if !sourceMatches && !condMatches {
			continue
		}

		// Cooldown verification
		if rule.CooldownMinutes > 0 && rule.LastTriggeredAt != nil {
			cooldownDuration := time.Duration(rule.CooldownMinutes) * time.Minute
			if now.Sub(*rule.LastTriggeredAt) < cooldownDuration {
				continue
			}
		}

		// Build eventData for condition evaluation and templating
		eventData := make(map[string]interface{})
		for k, v := range details {
			eventData[k] = v
		}
		eventData["source"] = normSource
		eventData["condition_type"] = normCondition
		eventData["severity"] = severity
		eventData["title"] = title
		eventData["message"] = message
		eventData["timestamp"] = now.Format(time.RFC3339)

		// Evaluate composable conditions
		if !EvaluateRuleConditions(rule, eventData) {
			continue
		}

		// Determine severity
		alertSeverity := severity
		if rule.Severity != "" {
			alertSeverity = rule.Severity
		}
		eventData["severity"] = alertSeverity

		// Render template message
		tmpl := rule.CustomTemplate
		if strings.TrimSpace(tmpl) == "" && len(rule.ConditionConfig) > 0 {
			var cfg map[string]interface{}
			if json.Unmarshal(rule.ConditionConfig, &cfg) == nil {
				if t, ok := cfg["custom_template"].(string); ok && strings.TrimSpace(t) != "" {
					tmpl = t
				}
			}
		}
		finalMessage := InterpolateTemplate(tmpl, message, eventData)

		// Parse configured channels
		var channels []string
		if len(rule.Channels) > 0 {
			_ = json.Unmarshal(rule.Channels, &channels)
		}
		if len(channels) == 0 {
			channels = []string{"in_app"}
		}

		detailsBytes, _ := json.Marshal(details)
		channelsSentBytes, _ := json.Marshal(channels)

		// 1. Create KongaAlertHistory record
		history := models.KongaAlertHistory{
			RuleID:        &rule.ID,
			RuleName:      rule.Name,
			Severity:      alertSeverity,
			Title:         title,
			Message:       finalMessage,
			ConditionType: normCondition,
			Details:       datatypes.JSON(detailsBytes),
			ChannelsSent:  datatypes.JSON(channelsSentBytes),
			CreatedAt:     now,
		}
		db.DB.Create(&history)

		// 2. Create in-app KongaNotification record
		icon := "mdi-alert-outline"
		switch strings.ToLower(alertSeverity) {
		case "critical":
			icon = "mdi-alert-octagon-outline"
		case "error":
			icon = "mdi-alert-circle-outline"
		case "warning":
			icon = "mdi-alert-outline"
		case "info":
			icon = "mdi-information-outline"
		}

		notif := models.KongaNotification{
			Message:     fmt.Sprintf("[%s] %s: %s", strings.ToUpper(alertSeverity), title, finalMessage),
			Icon:        icon,
			State:       "alerts",
			StateParams: datatypes.JSON(detailsBytes),
			CreatedAt:   now,
			UpdatedAt:   now,
		}
		db.DB.Create(&notif)

		// 3. Dispatch to requested channels
		dispatchDetails := make(map[string]interface{})
		for k, v := range details {
			dispatchDetails[k] = v
		}
		if len(rule.ConditionConfig) > 0 {
			var cfg map[string]interface{}
			if json.Unmarshal(rule.ConditionConfig, &cfg) == nil {
				if whTmpl, ok := cfg["webhook_payload_template"].(string); ok && strings.TrimSpace(whTmpl) != "" {
					dispatchDetails["webhook_payload_template"] = whTmpl
				}
			}
		}
		go dispatchToChannels(channels, alertSeverity, title, finalMessage, dispatchDetails, integrationsMap)

		// 4. Update LastTriggeredAt
		db.DB.Model(&models.KongaAlertRule{}).Where("id = ?", rule.ID).Update("last_triggered_at", now)
	}
}

// TriggerTestAlertRule triggers an immediate test alert for a specific rule and returns channel delivery results
func TriggerTestAlertRule(rule models.KongaAlertRule) (map[string]bool, error) {
	var channels []string
	if len(rule.Channels) > 0 {
		_ = json.Unmarshal(rule.Channels, &channels)
	}

	if len(channels) == 0 {
		return map[string]bool{"in_app": true}, nil
	}

	integrationsMap := getDecryptedIntegrationsConfig()

	testData := map[string]interface{}{
		"test":           true,
		"rule_id":        rule.ID,
		"rule_name":      rule.Name,
		"source":         rule.Source,
		"condition_type": rule.ConditionType,
		"severity":       rule.Severity,
		"target":         "sample-gateway-service",
		"status_code":    502,
		"actor":          "admin",
		"details":        "Simulated test event trigger",
		"timestamp":      time.Now().UTC().Format("2006-01-02 15:04:05 UTC"),
	}

	if len(rule.ConditionConfig) > 0 {
		var cfg map[string]interface{}
		if json.Unmarshal(rule.ConditionConfig, &cfg) == nil {
			if whTmpl, ok := cfg["webhook_payload_template"].(string); ok && strings.TrimSpace(whTmpl) != "" {
				testData["webhook_payload_template"] = whTmpl
			}
		}
	}

	testTitle := fmt.Sprintf("Test Alert: %s", rule.Name)
	defaultMsg := fmt.Sprintf("This is a test notification for rule '%s' (Source: %s, Severity: %s).", rule.Name, rule.Source, rule.Severity)
	tmpl := rule.CustomTemplate
	if strings.TrimSpace(tmpl) == "" && len(rule.ConditionConfig) > 0 {
		var cfg map[string]interface{}
		if json.Unmarshal(rule.ConditionConfig, &cfg) == nil {
			if t, ok := cfg["custom_template"].(string); ok && strings.TrimSpace(t) != "" {
				tmpl = t
			}
		}
	}
	testMessage := InterpolateTemplate(tmpl, defaultMsg, testData)

	results := make(map[string]bool)
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, ch := range channels {
		channel := strings.ToLower(strings.TrimSpace(ch))
		if channel == "" || channel == "in_app" {
			results["in_app"] = true
			continue
		}

		wg.Add(1)
		go func(cName string) {
			defer wg.Done()
			err := sendChannelNotification(cName, rule.Severity, testTitle, testMessage, testData, integrationsMap)
			mu.Lock()
			results[cName] = (err == nil)
			mu.Unlock()
			if err != nil {
				log.Printf("[AlertEngine] Test alert failed for channel '%s': %v", cName, err)
			}
		}(channel)
	}

	wg.Wait()
	return results, nil
}

// dispatchToChannels delivers notification messages concurrently to third-party endpoints
func dispatchToChannels(channels []string, severity, title, message string, details map[string]interface{}, integrationsMap map[string]interface{}) {
	for _, ch := range channels {
		channel := strings.ToLower(strings.TrimSpace(ch))
		if channel == "" || channel == "in_app" {
			continue
		}

		go func(cName string) {
			err := sendChannelNotification(cName, severity, title, message, details, integrationsMap)
			if err != nil {
				log.Printf("[AlertEngine] Failed to dispatch alert to channel '%s': %v", cName, err)
			}
		}(channel)
	}
}

// sendChannelNotification sends formatted message to a single channel
func sendChannelNotification(channel, severity, title, message string, details map[string]interface{}, integrations map[string]interface{}) error {
	formattedTime := time.Now().Format("2006-01-02 15:04:05 MST")
	formattedText := message
	// If message is empty or doesn't have custom formatting, wrap in standard structured alert
	if strings.TrimSpace(message) == "" {
		formattedText = fmt.Sprintf("🚨 *[NOKA Gateway Alert]*\n*Severity:* %s\n*Title:* %s\n*Timestamp:* %s",
			strings.ToUpper(severity), title, formattedTime)
	}

	getChannelConfig := func(key string) map[string]interface{} {
		if raw, ok := integrations[key]; ok {
			if cfg, ok := raw.(map[string]interface{}); ok {
				return cfg
			}
		}
		return map[string]interface{}{}
	}

	getString := func(m map[string]interface{}, key string) string {
		if v, ok := m[key]; ok && v != nil {
			return fmt.Sprintf("%v", v)
		}
		return ""
	}

	switch channel {
	case "telegram":
		cfg := getChannelConfig("telegram")
		botToken := getString(cfg, "botToken")
		chatId := getString(cfg, "chatId")
		topicId := getString(cfg, "topicId")
		if topicId == "" {
			topicId = getString(cfg, "threadId")
		}
		return SendTelegramNotification(botToken, chatId, topicId, formattedText)

	case "whatsapp":
		cfg := getChannelConfig("whatsapp")
		serverUrl := getString(cfg, "serverUrl")
		apiKey := getString(cfg, "apiKey")
		recipient := getString(cfg, "recipient")
		session := getString(cfg, "session")
		return SendWhatsAppNotification(serverUrl, apiKey, recipient, session, formattedText)

	case "slack":
		cfg := getChannelConfig("slack")
		webhookUrl := getString(cfg, "webhookUrl")
		if webhookUrl == "" {
			webhookUrl = getString(cfg, "url")
		}
		slackChannel := getString(cfg, "channel")
		username := getString(cfg, "username")
		if username == "" {
			username = "NOKA Alert Bot"
		}
		return SendSlackNotification(webhookUrl, slackChannel, username, formattedText)

	case "discord":
		cfg := getChannelConfig("discord")
		webhookUrl := getString(cfg, "webhookUrl")
		if webhookUrl == "" {
			webhookUrl = getString(cfg, "url")
		}
		username := getString(cfg, "username")
		if username == "" {
			username = "NOKA Alert Bot"
		}
		return SendDiscordNotification(webhookUrl, username, formattedText)

	case "webhook":
		cfg := getChannelConfig("webhook")
		webhookUrl := getString(cfg, "url")
		if webhookUrl == "" {
			webhookUrl = getString(cfg, "webhookUrl")
		}
		method := getString(cfg, "method")
		if method == "" {
			method = "POST"
		}
		customHeaders := map[string]string{
			"Content-Type": "application/json",
		}
		if rawHeaders, ok := cfg["customHeaders"]; ok {
			if hMap, ok := rawHeaders.(map[string]interface{}); ok {
				for k, v := range hMap {
					customHeaders[k] = fmt.Sprintf("%v", v)
				}
			}
		}
		if hJson := getString(cfg, "headersJson"); strings.TrimSpace(hJson) != "" {
			var parsedHeaders map[string]interface{}
			if json.Unmarshal([]byte(hJson), &parsedHeaders) == nil {
				for k, v := range parsedHeaders {
					customHeaders[k] = fmt.Sprintf("%v", v)
				}
			}
		}

		// Check if a custom webhook JSON payload template was provided
		var finalPayload interface{}
		customWebhookTmpl := getString(details, "webhook_payload_template")
		if strings.TrimSpace(customWebhookTmpl) != "" {
			interpolatedJson := InterpolateTemplate(customWebhookTmpl, message, details)
			var parsedJson interface{}
			if err := json.Unmarshal([]byte(interpolatedJson), &parsedJson); err == nil {
				finalPayload = parsedJson
			} else {
				finalPayload = []byte(interpolatedJson)
			}
		} else {
			finalPayload = map[string]interface{}{
				"event":     "gateway_alert",
				"severity":  severity,
				"title":     title,
				"message":   message,
				"details":   details,
				"timestamp": formattedTime,
			}
		}

		return SendWebhookNotification(webhookUrl, method, customHeaders, finalPayload)

	default:
		return fmt.Errorf("unsupported alert channel: %s", channel)
	}
}

// getDecryptedIntegrationsConfig retrieves and decrypts the integrations_config stored in konga_settings
func getDecryptedIntegrationsConfig() map[string]interface{} {
	var setting models.KongaSetting
	if err := db.DB.Where("key = ?", "integrations_config").First(&setting).Error; err != nil {
		return map[string]interface{}{}
	}

	var raw map[string]interface{}
	if err := json.Unmarshal(setting.Data, &raw); err != nil {
		return map[string]interface{}{}
	}

	return decryptMapValues(raw)
}

// decryptMapValues recursively decrypts any encrypted string values
func decryptMapValues(data map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{})
	for k, v := range data {
		switch val := v.(type) {
		case string:
			if dec, err := utils.Decrypt(val); err == nil {
				result[k] = dec
			} else {
				result[k] = val
			}
		case map[string]interface{}:
			result[k] = decryptMapValues(val)
		default:
			result[k] = val
		}
	}
	return result
}
