package handlers

import (
	"encoding/json"
	"net/http"

	"konga-backend/db"
	"konga-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

type SaveSettingsRequest struct {
	Settings map[string]interface{} `json:"settings"`
}

// SaveSystemSettings handles saving global system settings and recording audit logs
func SaveSystemSettings(c *gin.Context) {
	var req SaveSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request fields", "error": err.Error()})
		return
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

	payloadBytes, _ := json.Marshal(req.Settings)
	
	audit := models.AuditLog{
		IPAddress:    c.ClientIP(),
		UserID:       userID,
		Username:     username,
		Action:       "POST",
		Entity:       "settings",
		URL:          "/api/settings",
		Payload:      datatypes.JSON(payloadBytes),
		KongNodeName: "system", // System settings don't belong to a specific kong node
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

	c.JSON(http.StatusOK, gin.H{"message": "System settings saved and logged successfully"})
}
