package middleware

import (
	"net/http"
	"strings"

	"konga-backend/models"

	"github.com/gin-gonic/gin"
)

// KongRBAC enforces role-based access control (RBAC) on Kong write operations
func KongRBAC() gin.HandlerFunc {
	return func(c *gin.Context) {
		method := strings.ToUpper(c.Request.Method)

		// Allow all GET/read requests
		if method == "GET" || method == "OPTIONS" {
			c.Next()
			return
		}

		userVal, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized - User context missing"})
			c.Abort()
			return
		}

		user := userVal.(*models.User)
		role := user.Role
		if role == "" {
			if user.Admin {
				role = "admin"
			} else {
				role = "viewer"
			}
		}

		// Viewers and commenters cannot perform any write operations (POST, PUT, PATCH, DELETE)
		if role == "viewer" || role == "commenter" {
			c.JSON(http.StatusForbidden, gin.H{
				"message": "Forbidden - You do not have permission to perform this action.",
			})
			c.Abort()
			return
		}

		// Developers can create and update, but cannot delete
		if role == "developer" && method == "DELETE" {
			c.JSON(http.StatusForbidden, gin.H{
				"message": "Forbidden - Developers cannot delete resources.",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
