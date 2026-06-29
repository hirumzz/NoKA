package handlers

import (
	"net/http"
	"time"

	"konga-backend/db"
	"konga-backend/models"

	"github.com/gin-gonic/gin"
)

type CreateNotificationRequest struct {
	Message     string `json:"message" binding:"required"`
	Icon        string `json:"icon"`
	State       string `json:"state"`
	StateParams string `json:"stateParams"` // Expects JSON string or payload
}

// GetNotifications gets recent system/console notifications
func GetNotifications(c *gin.Context) {
	var notifications []models.KongaNotification
	if err := db.DB.Preload("User").Order("\"createdAt\" DESC").Limit(50).Find(&notifications).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch notifications", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, notifications)
}

// CreateNotification adds a broadcast notification
func CreateNotification(c *gin.Context) {
	userVal, exists := c.Get("user")
	var userID *uint
	if exists {
		u := userVal.(*models.User)
		userID = &u.ID
	}

	var req CreateNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request fields", "error": err.Error()})
		return
	}

	now := time.Now()
	notification := models.KongaNotification{
		Message:     req.Message,
		Icon:        req.Icon,
		State:       req.State,
		StateParams: req.StateParams,
		UserID:      userID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if notification.Icon == "" {
		notification.Icon = "mdi-message-outline"
	}
	if notification.StateParams == "" {
		notification.StateParams = "{}"
	}

	if err := db.DB.Create(&notification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to save notification", "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, notification)
}
