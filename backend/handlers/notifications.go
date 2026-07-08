package handlers

import (
	"net/http"
	"strconv"
	"time"

	"konga-backend/db"
	"konga-backend/models"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
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
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch notifications"})
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
		StateParams: datatypes.JSON(req.StateParams),
		UserID:      userID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if notification.Icon == "" {
		notification.Icon = "mdi-message-outline"
	}
	if len(notification.StateParams) == 0 {
		notification.StateParams = datatypes.JSON("{}")
	}

	if err := db.DB.Create(&notification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to save notification"})
		return
	}

	c.JSON(http.StatusCreated, notification)
}

// DeleteNotification removes a notification (admins or owners can delete)
func DeleteNotification(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid notification ID"})
		return
	}

	var notification models.KongaNotification
	if err := db.DB.First(&notification, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Notification not found"})
		return
	}

	userVal, exists := c.Get("user")
	if exists {
		currentUser := userVal.(*models.User)
		isAdmin := currentUser.Admin || currentUser.Role == "admin" || currentUser.Role == "superadmin"
		if !isAdmin && notification.UserID != nil && *notification.UserID != currentUser.ID {
			c.JSON(http.StatusForbidden, gin.H{"message": "Forbidden"})
			return
		}
	}

	if err := db.DB.Delete(&notification).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to delete notification"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Notification dismissed successfully"})
}
