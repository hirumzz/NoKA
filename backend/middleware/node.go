package middleware

import (
	"net/http"
	"strconv"

	"konga-backend/db"
	"konga-backend/models"

	"github.com/gin-gonic/gin"
)

// ResolveKongNode extracts the active Kong node config and injects it into context
func ResolveKongNode() gin.HandlerFunc {
	return func(c *gin.Context) {
		var nodeIDStr string

		// 1. Check header
		nodeIDStr = c.GetHeader("connection-id")

		// 2. Check query param
		if nodeIDStr == "" {
			nodeIDStr = c.Query("connection_id")
		}

		var nodeID uint64
		var err error

		if nodeIDStr != "" {
			nodeID, err = strconv.ParseUint(nodeIDStr, 10, 32)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid connection-id value"})
				c.Abort()
				return
			}
		}

		var node models.KongNode

		if nodeID > 0 {
			// Find connection by ID
			if err := db.DB.First(&node, uint(nodeID)).Error; err != nil {
				c.JSON(http.StatusNotFound, gin.H{"message": "Connection node not found"})
				c.Abort()
				return
			}
		} else {
			// Load globally active node
			if err := db.DB.Where("active = ?", true).First(&node).Error; err != nil {
				// Fallback to first available connection node
				if err := db.DB.First(&node).Error; err != nil {
					c.JSON(http.StatusBadRequest, gin.H{
						"message": "No connection is selected. Please activate a connection in settings",
					})
					c.Abort()
					return
				}
			}
		}

		// Inject node config into context
		c.Set("kongNode", &node)
		c.Next()
	}
}
