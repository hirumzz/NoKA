package handlers

import (
	"net/http"

	"konga-backend/db"
	"konga-backend/models"

	"github.com/gin-gonic/gin"
)

// GetAuditLogs fetches audit logs sorted descending by creation date
func GetAuditLogs(c *gin.Context) {
	var logs []models.AuditLog

	// Load logs sorted by createdAt descending
	if err := db.DB.Order("\"createdAt\" DESC").Limit(100).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch audit logs", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, logs)
}
