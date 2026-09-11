package handlers

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/services"
	"konga-backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

type SaveSettingsRequest struct {
	Settings map[string]interface{} `json:"settings"`
}

type TestIntegrationRequest struct {
	Channel string                 `json:"channel"`
	Config  map[string]interface{} `json:"config"`
	Message string                 `json:"message"`
}

var sensitiveKeys = map[string]bool{
	"botToken":      true,
	"apiKey":        true,
	"webhookUrl":    true,
	"smtp_password": true,
	"password":      true,
	"secret":        true,
	"auth_token":    true,
	"key":           true,
	"token":         true,
}

// MaskSensitiveData recursively masks sensitive field values with "******"
func MaskSensitiveData(val interface{}) interface{} {
	switch v := val.(type) {
	case map[string]interface{}:
		res := make(map[string]interface{})
		for k, item := range v {
			if _, ok := item.(string); ok && sensitiveKeys[k] {
				res[k] = "******"
			} else {
				res[k] = MaskSensitiveData(item)
			}
		}
		return res
	case []interface{}:
		res := make([]interface{}, len(v))
		for i, item := range v {
			res[i] = MaskSensitiveData(item)
		}
		return res
	default:
		return val
	}
}

// EncryptSensitiveData recursively inspects maps and slices and encrypts sensitive field values
func EncryptSensitiveData(val interface{}) interface{} {
	switch v := val.(type) {
	case map[string]interface{}:
		res := make(map[string]interface{})
		for k, item := range v {
			if strVal, ok := item.(string); ok && sensitiveKeys[k] {
				if encrypted, err := utils.Encrypt(strVal); err == nil {
					res[k] = encrypted
				} else {
					res[k] = strVal
				}
			} else {
				res[k] = EncryptSensitiveData(item)
			}
		}
		return res
	case []interface{}:
		res := make([]interface{}, len(v))
		for i, item := range v {
			res[i] = EncryptSensitiveData(item)
		}
		return res
	default:
		return val
	}
}

// DecryptSensitiveData recursively inspects maps and slices and decrypts sensitive field values
func DecryptSensitiveData(val interface{}) interface{} {
	switch v := val.(type) {
	case map[string]interface{}:
		res := make(map[string]interface{})
		for k, item := range v {
			if strVal, ok := item.(string); ok && (sensitiveKeys[k] || strings.HasPrefix(strVal, "enc_v1:")) {
				if decrypted, err := utils.Decrypt(strVal); err == nil {
					res[k] = decrypted
				} else {
					res[k] = strVal
				}
			} else {
				res[k] = DecryptSensitiveData(item)
			}
		}
		return res
	case []interface{}:
		res := make([]interface{}, len(v))
		for i, item := range v {
			res[i] = DecryptSensitiveData(item)
		}
		return res
	case string:
		if strings.HasPrefix(v, "enc_v1:") {
			if decrypted, err := utils.Decrypt(v); err == nil {
				return decrypted
			}
		}
		return v
	default:
		return val
	}
}

// GetSystemSettings retrieves all stored system and 3rd-party integration settings from DB
func GetSystemSettings(c *gin.Context) {
	var settingsList []models.KongaSetting
	if err := db.DB.Find(&settingsList).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to retrieve settings", "error": err.Error()})
		return
	}

	result := make(map[string]interface{})
	for _, s := range settingsList {
		var parsed interface{}
		if err := json.Unmarshal(s.Data, &parsed); err == nil {
			result[s.Key] = DecryptSensitiveData(parsed)
		} else {
			rawStr := string(s.Data)
			if strings.HasPrefix(rawStr, "enc_v1:") {
				if dec, err := utils.Decrypt(rawStr); err == nil {
					rawStr = dec
				}
			}
			result[s.Key] = rawStr
		}
	}

	c.JSON(http.StatusOK, gin.H{"data": result})
}

// SaveSystemSettings handles saving global system settings into PostgreSQL DB and recording audit logs
func SaveSystemSettings(c *gin.Context) {
	var req SaveSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request fields", "error": err.Error()})
		return
	}

	// Persist each setting key to konga_settings table with sensitive data encrypted
	now := time.Now()
	for key, val := range req.Settings {
		encryptedVal := EncryptSensitiveData(val)
		valBytes, err := json.Marshal(encryptedVal)
		if err != nil {
			continue
		}

		var setting models.KongaSetting
		if err := db.DB.Where("key = ?", key).First(&setting).Error; err == nil {
			// Update existing
			setting.Data = datatypes.JSON(valBytes)
			setting.UpdatedAt = now
			db.DB.Save(&setting)
		} else {
			// Create new
			newSetting := models.KongaSetting{
				Key:       key,
				Data:      datatypes.JSON(valBytes),
				CreatedAt: now,
				UpdatedAt: now,
			}
			db.DB.Create(&newSetting)
		}
	}

	// Record Audit Log and Notification
	var userID *uint
	var username string = "anonymous"
	if userVal, exists := c.Get("user"); exists {
		if u, ok := userVal.(*models.User); ok {
			userID = &u.ID
			username = u.Username
		}
	}

	maskedSettings := MaskSensitiveData(req.Settings)
	payloadBytes, _ := json.Marshal(maskedSettings)

	audit := models.AuditLog{
		IPAddress:    c.ClientIP(),
		UserID:       userID,
		Username:     username,
		Action:       "POST",
		Entity:       "settings",
		URL:          "/api/settings",
		Payload:      datatypes.JSON(payloadBytes),
		KongNodeName: "system",
	}
	db.DB.Create(&audit)

	notif := models.KongaNotification{
		Message:     "System settings updated",
		Icon:        "mdi-cog-outline",
		State:       "settings",
		StateParams: datatypes.JSON("{}"),
		UserID:      userID,
	}
	db.DB.Create(&notif)

	c.JSON(http.StatusOK, gin.H{"message": "System settings saved and persisted to database successfully"})
}

// TestIntegrationChannel handles testing notifications for third-party channels
func TestIntegrationChannel(c *gin.Context) {
	var req TestIntegrationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Invalid request payload: " + err.Error()})
		return
	}

	// Decrypt sensitive config fields if encrypted
	decryptedConfig, ok := DecryptSensitiveData(req.Config).(map[string]interface{})
	if !ok {
		decryptedConfig = req.Config
	}

	// Build default notification message
	testTime := time.Now().Format("2006-01-02 15:04:05 MST")
	messageText := req.Message
	if strings.TrimSpace(messageText) == "" {
		messageText = fmt.Sprintf("🔔 *[NOKA Gateway Alert]* Real-time 3rd-Party Integration Test\n*Channel:* %s\n*Timestamp:* %s\n*Status:* Connection Verified Successfully!", strings.ToUpper(req.Channel), testTime)
	}

	getString := func(m map[string]interface{}, key string) string {
		if v, ok := m[key]; ok && v != nil {
			return fmt.Sprintf("%v", v)
		}
		return ""
	}

	validateURLSSRF := func(targetURL string) error {
		if targetURL == "" {
			return nil
		}
		if os.Getenv("ALLOW_INTERNAL_SSRF") == "true" {
			return nil
		}
		parsed, err := url.Parse(targetURL)
		if err != nil {
			return fmt.Errorf("invalid target URL: %w", err)
		}
		host := parsed.Hostname()
		if host == "" {
			return nil
		}
		ips, err := net.LookupIP(host)
		if err == nil {
			for _, ip := range ips {
				if utils.IsPrivateIP(ip) {
					return fmt.Errorf("access to internal IP addresses is blocked by security policy")
				}
			}
		}
		return nil
	}

	var err error
	switch strings.ToLower(req.Channel) {
	case "telegram":
		botToken := getString(decryptedConfig, "botToken")
		chatId := getString(decryptedConfig, "chatId")
		topicId := getString(decryptedConfig, "topicId")
		err = services.SendTelegramNotification(botToken, chatId, topicId, messageText)

	case "whatsapp":
		serverUrl := getString(decryptedConfig, "serverUrl")
		apiKey := getString(decryptedConfig, "apiKey")
		recipient := getString(decryptedConfig, "recipient")
		session := getString(decryptedConfig, "session")
		if err = validateURLSSRF(serverUrl); err == nil {
			err = services.SendWhatsAppNotification(serverUrl, apiKey, recipient, session, messageText)
		}

	case "webhook":
		webhookUrl := getString(decryptedConfig, "url")
		if webhookUrl == "" {
			webhookUrl = getString(decryptedConfig, "webhookUrl")
		}
		method := getString(decryptedConfig, "method")
		if method == "" {
			method = "POST"
		}
		if err = validateURLSSRF(webhookUrl); err == nil {
			customHeaders := make(map[string]string)
			if headersRaw, exists := decryptedConfig["customHeaders"]; exists {
				if hMap, ok := headersRaw.(map[string]interface{}); ok {
					for k, v := range hMap {
						customHeaders[k] = fmt.Sprintf("%v", v)
					}
				}
			}
			payload := map[string]interface{}{
				"event":     "integration_test",
				"channel":   "webhook",
				"message":   messageText,
				"timestamp": testTime,
			}
			err = services.SendWebhookNotification(webhookUrl, method, customHeaders, payload)
		}

	case "slack":
		webhookUrl := getString(decryptedConfig, "webhookUrl")
		if webhookUrl == "" {
			webhookUrl = getString(decryptedConfig, "url")
		}
		channel := getString(decryptedConfig, "channel")
		username := getString(decryptedConfig, "username")
		if username == "" {
			username = "NOKA Alert Bot"
		}
		if err = validateURLSSRF(webhookUrl); err == nil {
			err = services.SendSlackNotification(webhookUrl, channel, username, messageText)
		}

	case "discord":
		webhookUrl := getString(decryptedConfig, "webhookUrl")
		if webhookUrl == "" {
			webhookUrl = getString(decryptedConfig, "url")
		}
		username := getString(decryptedConfig, "username")
		if username == "" {
			username = "NOKA Alert Bot"
		}
		if err = validateURLSSRF(webhookUrl); err == nil {
			err = services.SendDiscordNotification(webhookUrl, username, messageText)
		}

	default:
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": fmt.Sprintf("Unsupported integration channel: %s", req.Channel)})
		return
	}

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "Failed to send notification: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "message": "Test notification sent successfully!"})
}
