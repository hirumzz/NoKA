package middleware

import (
	"crypto/rand"
	"encoding/hex"
	"net/http"

	"github.com/gin-gonic/gin"
)

// CSRFProtection implements a Double-Submit Cookie CSRF defense.
func CSRFProtection() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. Ensure the user has a CSRF cookie.
		cookieToken, err := c.Cookie("konga_csrf")
		if err != nil || cookieToken == "" {
			// Generate a new 32-byte secure token
			b := make([]byte, 32)
			if _, err := rand.Read(b); err == nil {
				cookieToken = hex.EncodeToString(b)
				
				// SameSite=Lax prevents cross-site POSTs naturally in modern browsers.
				c.SetSameSite(http.SameSiteLaxMode)
				
				// Secure flag if connection is HTTPS or behind a proxy doing TLS termination
				secure := c.Request.TLS != nil || c.Request.Header.Get("X-Forwarded-Proto") == "https"
				
				// NOTE: HttpOnly is FALSE here because the frontend JavaScript needs to read it
				// to send it back in the X-CSRF-Token header.
				c.SetCookie("konga_csrf", cookieToken, 28800, "/", "", secure, false)
			}
		}

		// 2. State-changing requests (POST, PUT, PATCH, DELETE) MUST have a matching header.
		method := c.Request.Method
		if method == "GET" || method == "HEAD" || method == "OPTIONS" {
			c.Next()
			return
		}

		headerToken := c.GetHeader("X-CSRF-Token")
		if headerToken == "" || headerToken != cookieToken {
			c.JSON(http.StatusForbidden, gin.H{
				"message": "Invalid or missing CSRF token",
				"error":   "CSRF token verification failed",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
