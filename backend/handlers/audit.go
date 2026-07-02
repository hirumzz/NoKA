package handlers

import (
	"net/http"

	"konga-backend/db"
	"konga-backend/models"

	"github.com/gin-gonic/gin"
)

// GetAuditLogs retrieves the 100 most recent audit logs
func GetAuditLogs(c *gin.Context) {
	// ponytail: removed 4-layer repository abstraction for a simple select query
	var logs []models.AuditLog
	if err := db.DB.Order("\"createdAt\" DESC").Limit(100).Find(&logs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch audit logs", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}
