package main

import (
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"time"

	"konga-backend/db"
	"konga-backend/handlers"
	"konga-backend/middleware"
	"konga-backend/models"
	"konga-backend/repositories"
	"konga-backend/services"

	"github.com/gin-gonic/gin"
)

// --- Simple in-memory per-IP rate limiter for login ---
type rateLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
}

func newRateLimiter() *rateLimiter {
	return &rateLimiter{attempts: make(map[string][]time.Time)}
}

func (r *rateLimiter) Allow(ip string, limit int, window time.Duration) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	now := time.Now()
	cutoff := now.Add(-window)

	// Filter only recent attempts
	recent := r.attempts[ip][:0]
	for _, t := range r.attempts[ip] {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}
	r.attempts[ip] = recent

	if len(recent) >= limit {
		return false
	}

	r.attempts[ip] = append(r.attempts[ip], now)
	return true
}

func loginRateLimitMiddleware(rl *rateLimiter) gin.HandlerFunc {
	return func(c *gin.Context) {
		ip := c.ClientIP()
		if !rl.Allow(ip, 5, time.Minute) {
			c.JSON(http.StatusTooManyRequests, gin.H{"message": "Too many login attempts. Please try again later."})
			c.Abort()
			return
		}
		c.Next()
	}
}

// securityHeaders adds important HTTP security headers to all responses
func securityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("X-XSS-Protection", "1; mode=block")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data: blob:;")
		c.Next()
	}
}

func main() {
	log.Println("Starting NoKA backend...")

	// Initialize DB
	database := db.InitDB()
	sqlDB, err := database.DB()
	if err != nil {
		log.Fatalf("Failed to get database instance: %v", err)
	}
	defer sqlDB.Close()

	// Initialize Repositories
	userRepo := repositories.NewUserRepository(database)
	nodeRepo := repositories.NewNodeRepository(database)
	auditRepo := repositories.NewAuditRepository(database)
	_ = nodeRepo

	// Initialize Services
	authService := services.NewAuthService(userRepo)
	kongProxyService := services.NewKongProxyService(auditRepo)
	auditService := services.NewAuditService(auditRepo)

	// Initialize Handlers
	authHandler := handlers.NewAuthHandler(authService)
	kongHandler := handlers.NewKongHandler(kongProxyService)
	auditHandler := handlers.NewAuditHandler(auditService)

	// Rate limiter for login
	loginRL := newRateLimiter()

	// Use gin.New() instead of gin.Default() — avoids logging sensitive request data
	r := gin.New()
	r.Use(gin.Recovery())

	// Security headers on all responses
	r.Use(securityHeaders())

	// CORS middleware — restrict to configured origin
	allowedOrigin := os.Getenv("ALLOWED_ORIGIN")
	if allowedOrigin == "" {
		allowedOrigin = "http://localhost:13337"
		log.Println("[SECURITY WARNING] ALLOWED_ORIGIN not set. Defaulting to http://localhost:13337. Set this in production!")
	}

	r.Use(func(c *gin.Context) {
		origin := c.Request.Header.Get("Origin")
		// Only reflect origin if it matches the allowed origin
		if origin == allowedOrigin {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
			c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		}
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, connection-id")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// Public routes
	r.POST("/login", loginRateLimitMiddleware(loginRL), authHandler.Login)
	r.POST("/register", authHandler.RegisterFirstAdmin) // Only works if 0 users exist

	r.GET("/info", func(c *gin.Context) {
		signupEnabled := os.Getenv("SIGNUP_ENABLED") == "true"
		c.JSON(http.StatusOK, gin.H{"signup_enabled": signupEnabled})
	})

	// API Group with Authentication Required
	api := r.Group("/api")
	api.Use(middleware.AuthRequired())
	{
		api.GET("/me", func(c *gin.Context) {
			user, _ := c.Get("user")
			c.JSON(http.StatusOK, user)
		})

		// Admin-only: create new users
		api.POST("/auth/signup", middleware.AdminRequired(), authHandler.Signup)

		// Audit Logs list endpoint
		api.GET("/auditlogs", auditHandler.GetAuditLogs)

		// Connections (Nodes) management
		api.GET("/connections", handlers.GetConnections)
		api.POST("/connections", handlers.CreateConnection)
		api.PUT("/connections/:id", handlers.UpdateConnection)
		api.DELETE("/connections/:id", handlers.DeleteConnection)
		api.POST("/connections/:id/activate", handlers.ActivateConnection)

		// Comments management
		api.GET("/comments", handlers.GetComments)
		api.POST("/comments", handlers.CreateComment)
		api.PUT("/comments/:id", handlers.UpdateComment)
		api.DELETE("/comments/:id", handlers.DeleteComment)

		// Notifications management
		api.GET("/notifications", handlers.GetNotifications)
		api.POST("/notifications", handlers.CreateNotification)
		api.DELETE("/notifications/:id", handlers.DeleteNotification)

		// User Management — list requires auth, mutation requires admin
		api.GET("/users", func(c *gin.Context) {
			var users []models.User
			if err := db.DB.Find(&users).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch users"})
				return
			}
			c.JSON(http.StatusOK, users)
		})
		api.DELETE("/users/:id", middleware.AdminRequired(), handlers.DeleteUser)
		api.PATCH("/users/:id", middleware.AdminRequired(), handlers.UpdateUser)
	}

	// Kong Proxy routes (authenticated, node-resolved, RBAC protected)
	kongGroup := r.Group("")
	kongGroup.Use(middleware.AuthRequired(), middleware.ResolveKongNode(), middleware.KongRBAC())
	{
		kongGroup.GET("/api/kong/prometheus-metrics", kongHandler.GetPrometheusMetrics)
		kongGroup.GET("/api/kong/error-details", kongHandler.GetErrorDetails)
		kongGroup.Any("/kong/*proxyPath", pathTraversalGuard(), kongHandler.ProxyKong)
		kongGroup.Any("/api/kong/*proxyPath", pathTraversalGuard(), kongHandler.ProxyKong)
	}

	// Serve static files from frontend build
	r.StaticFile("/favicon.svg", "./public/favicon.svg")
	r.Static("/assets", "./public/assets")
	r.NoRoute(func(c *gin.Context) {
		c.File("./public/index.html")
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "1337"
	}

	log.Printf("Backend listening on port %s", port)
	if err := r.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}

// pathTraversalGuard rejects proxy paths that contain directory traversal sequences
func pathTraversalGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Param("proxyPath")
		if strings.Contains(path, "..") {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid path"})
			c.Abort()
			return
		}
		c.Next()
	}
}
