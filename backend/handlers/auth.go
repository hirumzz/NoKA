package handlers

import (
	"net/http"
	"time"

	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/services"
	"konga-backend/utils"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService services.AuthService
}

func NewAuthHandler(svc services.AuthService) *AuthHandler {
	return &AuthHandler{authService: svc}
}

type LoginRequest struct {
	Identifier string `json:"identifier" binding:"required"`
	Password   string `json:"password" binding:"required"`
}

type RegisterRequest struct {
	Username             string `json:"username" binding:"required"`
	Email                string `json:"email" binding:"required,email"`
	Password             string `json:"password" binding:"required,min=7"`
	PasswordConfirmation string `json:"password_confirmation" binding:"required"`
	FirstName            string `json:"firstName"`
	LastName             string `json:"lastName"`
}

func setTokenCookie(c *gin.Context, token string) {
	// Explicitly set Lax mode to mitigate CSRF
	c.SetSameSite(http.SameSiteLaxMode)

	// Set HttpOnly, Secure, Lax cookie. MaxAge 8 hours.
	// Secure should be true only if TLS is active or a reverse proxy terminated TLS.
	secure := c.Request.TLS != nil || c.Request.Header.Get("X-Forwarded-Proto") == "https"

	c.SetCookie("konga_token", token, 28800, "/", "", secure, true)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	// 1. Get current token (from cookie or header)
	tokenStr, err := c.Cookie("konga_token")
	if err != nil || tokenStr == "" {
		authHeader := c.GetHeader("Authorization")
		if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
			tokenStr = authHeader[7:]
		}
	}

	// 2. Blacklist token if valid
	if tokenStr != "" {
		_, jti, err := utils.VerifyToken(tokenStr)
		if err == nil && jti != "" {
			// Save jti to blacklisted_tokens
			bt := models.BlacklistedToken{
				Jti:       jti,
				ExpiresAt: time.Now().Add(8 * time.Hour), // Overestimate slightly
				CreatedAt: time.Now(),
			}
			db.DB.Create(&bt)
		}
	}

	// 3. Clear cookie
	c.SetSameSite(http.SameSiteLaxMode)
	secure := c.Request.TLS != nil || c.Request.Header.Get("X-Forwarded-Proto") == "https"
	c.SetCookie("konga_token", "", -1, "/", "", secure, true)
	c.JSON(http.StatusOK, gin.H{"message": "Logged out successfully"})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request fields", "error": err.Error()})
		return
	}

	user, token, err := h.authService.Login(req.Identifier, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": err.Error()})
		return
	}

	setTokenCookie(c, token)

	c.JSON(http.StatusOK, gin.H{
		"user":  user,
		"token": token, // Keep token in response for non-browser clients
	})
}

func (h *AuthHandler) RegisterFirstAdmin(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid fields", "error": err.Error()})
		return
	}

	if req.Password != req.PasswordConfirmation {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Passwords do not match"})
		return
	}

	user, token, err := h.authService.RegisterFirstAdmin(req.Username, req.Email, req.Password, req.FirstName, req.LastName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	setTokenCookie(c, token)

	c.JSON(http.StatusOK, gin.H{
		"user":  user,
		"token": token,
	})
}

func (h *AuthHandler) Signup(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid fields", "error": err.Error()})
		return
	}

	if req.Password != req.PasswordConfirmation {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Passwords do not match"})
		return
	}

	user, err := h.authService.Signup(req.Username, req.Email, req.Password, req.FirstName, req.LastName)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	c.JSON(http.StatusOK, user)
}
