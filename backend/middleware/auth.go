package middleware

import (
	"net/http"
	"strings"

	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/utils"

	"github.com/gin-gonic/gin"
)

// AuthRequired is the middleware that validates JWT and loads user context
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenStr := ""

		// Check Cookie first
		tokenStr, err := c.Cookie("konga_token")
		if err != nil || tokenStr == "" {
			// Fallback to Authorization Header
			authHeader := c.GetHeader("Authorization")
			if authHeader != "" {
				parts := strings.Split(authHeader, " ")
				if len(parts) == 2 && strings.ToLower(parts[0]) == "bearer" {
					tokenStr = parts[1]
				}
			}
		}

		if tokenStr == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "No authorization header was found"})
			c.Abort()
			return
		}

		// Verify token
		userID, jti, err := utils.VerifyToken(tokenStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid token", "error": err.Error()})
			c.Abort()
			return
		}

		// Check if token is blacklisted
		if jti != "" {
			var bt models.BlacklistedToken
			if err := db.DB.Where("jti = ?", jti).First(&bt).Error; err == nil {
				// Token found in blacklist
				c.JSON(http.StatusUnauthorized, gin.H{"message": "Session has been logged out"})
				c.Abort()
				return
			}
		}

		// Load user
		var user models.User
		if err := db.DB.First(&user, userID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "User not found"})
			c.Abort()
			return
		}

		if !user.Active {
			c.JSON(http.StatusForbidden, gin.H{"message": "User is inactive"})
			c.Abort()
			return
		}

		// Save user to context
		c.Set("user", &user)
		c.Set("userID", user.ID)

		c.Next()
	}
}

// AdminRequired restricts access to admin role only
func AdminRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		userVal, exists := c.Get("user")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			c.Abort()
			return
		}

		user := userVal.(*models.User)
		if !user.Admin && user.Role != "admin" && user.Role != "superadmin" {
			c.JSON(http.StatusForbidden, gin.H{"message": "Admin privileges required"})
			c.Abort()
			return
		}

		c.Next()
	}
}
