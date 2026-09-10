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
		c.Header("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")
		c.Header("Permissions-Policy", "geolocation=(), microphone=(), camera=()")
		c.Header("X-Permitted-Cross-Domain-Policies", "none")
		c.Header("X-Robots-Tag", "noindex, nofollow, noarchive, nosnippet")
		c.Header("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' data: https://fonts.googleapis.com https://fonts.gstatic.com; img-src 'self' data: blob:; frame-ancestors 'none'; form-action 'self'; base-uri 'self';")
		c.Next()
	}
}

// antiCacheHeaders prevents intermediate proxies and browsers from caching sensitive API responses
func antiCacheHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
		c.Header("Pragma", "no-cache")
		c.Header("Expires", "0")
		c.Next()
	}
}

// maxRequestBodySize limits the maximum request body to prevent memory exhaustion DoS
func maxRequestBodySize(maxBytes int64) gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Body != nil {
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxBytes)
		}
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

	services.AutoSeedFirstAdmin(database)
	services.StartConnectionHealthChecker()
	services.StartReachabilityCron()
	services.StartBlacklistedTokenCleanup()
	services.SyncEntityAuthorsFromAuditLogs()
	services.StartAlertEvaluationEngine()
	go kongHandler.StartPrometheusMetricsCollector()

	// Use gin.New() instead of gin.Default() — avoids logging sensitive request data
	r := gin.New()
	r.SetTrustedProxies(nil)
	r.Use(gin.Recovery())

	// Security headers on all responses
	r.Use(securityHeaders())

	// Global Request Body Size Limiter (10MB)
	r.Use(maxRequestBodySize(10 * 1024 * 1024))

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
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, connection-id, X-CSRF-Token")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, PATCH, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}

		c.Next()
	})

	// CSRF Protection
	r.Use(middleware.CSRFProtection())

	// Public routes
	r.POST("/login", loginRateLimitMiddleware(loginRL), authHandler.Login)
	r.POST("/register", loginRateLimitMiddleware(loginRL), authHandler.RegisterFirstAdmin) // Only works if 0 users exist

	r.GET("/api/info", func(c *gin.Context) {
		count, _ := userRepo.CountUsers()
		signupEnabled := os.Getenv("SIGNUP_ENABLED") == "true"
		c.JSON(http.StatusOK, gin.H{
			"signup_enabled": signupEnabled,
			"has_users":      count > 0,
		})
	})

	// API Group with Authentication Required and Anti-Cache Protection
	api := r.Group("/api")
	api.Use(middleware.AuthRequired(), antiCacheHeaders())
	{
		api.GET("/me", func(c *gin.Context) {
			user, _ := c.Get("user")
			c.JSON(http.StatusOK, user)
		})

		// First-time force change password with rate limit
		api.POST("/auth/change-initial-password", loginRateLimitMiddleware(loginRL), authHandler.ChangeInitialPassword)

		// Admin-only: create new users
		api.POST("/auth/signup", middleware.AdminRequired(), authHandler.Signup)
		
		// Logout clears cookie and blacklists token
		api.POST("/auth/logout", authHandler.Logout)

		// Audit Logs list endpoint
		api.GET("/auditlogs", middleware.AdminRequired(), auditHandler.GetAuditLogs)

		// Connections (Nodes) management
		api.GET("/connections", handlers.GetConnections)
		api.POST("/connections", middleware.AdminRequired(), handlers.CreateConnection)
		api.PUT("/connections/:id", middleware.AdminRequired(), handlers.UpdateConnection)
		api.DELETE("/connections/:id", middleware.AdminRequired(), handlers.DeleteConnection)
		api.POST("/connections/:id/activate", middleware.AdminRequired(), handlers.ActivateConnection)
		api.POST("/connections/deactivate", middleware.AdminRequired(), handlers.DeactivateConnection)

		// System Settings & Resource Metrics
		api.GET("/settings", middleware.AdminRequired(), handlers.GetSystemSettings)
		api.POST("/settings", middleware.AdminRequired(), handlers.SaveSystemSettings)
		api.POST("/settings/test-integration", middleware.AdminRequired(), handlers.TestIntegrationChannel)
		api.GET("/system/resources", handlers.GetSystemResources)

		// Comments management
		api.GET("/comments", handlers.GetComments)
		api.POST("/comments", handlers.CreateComment)
		api.PUT("/comments/:id", handlers.UpdateComment)
		api.DELETE("/comments/:id", handlers.DeleteComment)

		// Notifications management
		api.GET("/notifications", handlers.GetNotifications)
		api.POST("/notifications", middleware.AdminRequired(), handlers.CreateNotification)
		api.DELETE("/notifications/:id", middleware.AdminRequired(), handlers.DeleteNotification)

		// User Management — list and mutations require admin
		api.GET("/users", middleware.AdminRequired(), func(c *gin.Context) {
			var users []models.User
			if err := db.DB.Find(&users).Error; err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch users"})
				return
			}
			c.JSON(http.StatusOK, users)
		})
		api.GET("/users/:id", middleware.AdminRequired(), handlers.GetUserByID)
		api.DELETE("/users/:id", middleware.AdminRequired(), handlers.DeleteUser)
		api.PATCH("/users/:id", handlers.UpdateUser)

		api.GET("/reachability", kongHandler.GetReachabilityStatuses)
		api.POST("/reachability/refresh", middleware.AdminRequired(), kongHandler.TriggerReachabilityCheck)
		api.GET("/entity-authors", kongHandler.GetEntityAuthors)

		// Snapshots (Admin only)
		api.GET("/snapshots", middleware.AdminRequired(), handlers.GetSnapshots)
		api.POST("/snapshots", middleware.AdminRequired(), handlers.CreateSnapshot)
		api.DELETE("/snapshots/:id", middleware.AdminRequired(), handlers.DeleteSnapshot)

		// Flexible Alerting Engine
		api.GET("/alerts/rules", handlers.GetAlertRules)
		api.POST("/alerts/rules", middleware.AdminRequired(), handlers.CreateAlertRule)
		api.PUT("/alerts/rules/:id", middleware.AdminRequired(), handlers.UpdateAlertRule)
		api.DELETE("/alerts/rules/:id", middleware.AdminRequired(), handlers.DeleteAlertRule)
		api.PATCH("/alerts/rules/:id/toggle", middleware.AdminRequired(), handlers.ToggleAlertRule)
		api.POST("/alerts/rules/test", middleware.AdminRequired(), handlers.TestAlertRule)
		api.GET("/alerts/history", handlers.GetAlertHistory)
		api.DELETE("/alerts/history", middleware.AdminRequired(), handlers.ClearAlertHistory)
	}

	// Kong Proxy routes (authenticated, node-resolved, RBAC protected)
	kongGroup := r.Group("")
	kongGroup.Use(middleware.AuthRequired(), middleware.ResolveKongNode(), middleware.KongRBAC())
	{
		kongGroup.Any("/kong/*proxyPath", pathTraversalGuard(), kongHandler.ProxyKong)
		kongGroup.Any("/api/kong/*proxyPath", pathTraversalGuard(), kongHandler.ProxyKong)
	}

	// Serve static files from frontend build
	r.StaticFile("/favicon.svg", "./public/favicon.svg")
	r.Static("/assets", "./public/assets")
	r.Static("/images", "./public/images")
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

// pathTraversalGuard rejects proxy paths that contain directory traversal sequences, null bytes, or backslashes
func pathTraversalGuard() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Param("proxyPath")
		rawPath := c.Request.URL.RawPath
		rawURI := c.Request.RequestURI

		// Check for directory traversal, Windows backslashes, null bytes, and encoded sequences
		if strings.Contains(path, "..") || strings.Contains(path, "\\") || strings.Contains(path, "\x00") ||
			strings.Contains(rawPath, "..") || strings.Contains(rawPath, "\\") ||
			strings.Contains(strings.ToLower(rawURI), "%2e%2e") || strings.Contains(strings.ToLower(rawURI), "%252e%252e") ||
			strings.Contains(strings.ToLower(rawURI), "%00") {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid path: directory traversal attempt rejected"})
			c.Abort()
			return
		}
		c.Next()
	}
}
