package main

import (
	"log"
	"net/http"
	"os"

	"konga-backend/db"
	"konga-backend/handlers"
	"konga-backend/middleware"
	"konga-backend/models"

	"github.com/gin-gonic/gin"
)

func main() {
	log.Println("Starting Konga revamped backend...")

	// Initialize DB
	database := db.InitDB()
	sqlDB, err := database.DB()
	if err != nil {
		log.Fatalf("Failed to get database instance: %v", err)
	}
	defer sqlDB.Close()

	// Initialize Gin router
	r := gin.Default()

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, connection-id")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// Public routes
	r.POST("/login", handlers.Login)
	r.POST("/register", handlers.RegisterFirstAdmin)
	r.POST("/auth/signup", handlers.Signup)

	// API Group with Authentication Required
	api := r.Group("/api")
	api.Use(middleware.AuthRequired())
	{
		api.GET("/me", func(c *gin.Context) {
			user, _ := c.Get("user")
			c.JSON(http.StatusOK, user)
		})

		// Audit Logs list endpoint
		api.GET("/auditlogs", handlers.GetAuditLogs)

		// A helper to test auth
		api.GET("/users", func(c *gin.Context) {
			var users []models.User
			if err := db.DB.Find(&users).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
				return
			}
			c.JSON(http.StatusOK, users)
		})
	}

	// Kong Proxy routes (authenticated, node-resolved, and RBAC protected)
	kongGroup := r.Group("")
	kongGroup.Use(middleware.AuthRequired(), middleware.ResolveKongNode(), middleware.KongRBAC())
	{
		kongGroup.Any("/kong/*proxyPath", handlers.ProxyKong)
		kongGroup.Any("/api/kong/*proxyPath", handlers.ProxyKong)
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "1337" // Standard Konga port
	}

	log.Printf("Backend listening on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
