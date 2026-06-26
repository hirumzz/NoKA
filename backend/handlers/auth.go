package handlers

import (
	"net/http"
	"time"

	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/utils"

	"github.com/gin-gonic/gin"
)

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

// Login handles user authentication
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request fields", "error": err.Error()})
		return
	}

	var user models.User
	// Lookup user by username or email
	if err := db.DB.Where("username = ? OR email = ?", req.Identifier, req.Identifier).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid username or password"})
		return
	}

	if !user.Active {
		c.JSON(http.StatusForbidden, gin.H{"message": "Account is not activated."})
		return
	}

	var passport models.Passport
	// Lookup local passport
	if err := db.DB.Where("protocol = ? AND \"user\" = ?", "local", user.ID).First(&passport).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "No local authentication found for this user"})
		return
	}

	// Verify password
	if !utils.CheckPasswordHash(req.Password, passport.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Invalid username or password"})
		return
	}

	// Issue token
	token, err := utils.IssueToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to issue authentication token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":  user,
		"token": token,
	})
}

// RegisterFirstAdmin handles first-time admin setup (when user count is 0)
func RegisterFirstAdmin(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid fields", "error": err.Error()})
		return
	}

	if req.Password != req.PasswordConfirmation {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Passwords do not match"})
		return
	}

	// Count users
	var count int64
	db.DB.Model(&models.User{}).Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "An admin user is already registered!"})
		return
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to encrypt password"})
		return
	}

	// Start transaction
	tx := db.DB.Begin()

	now := time.Now()
	user := models.User{
		Username:  req.Username,
		Email:     req.Email,
		Role:      "admin",
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Admin:     true,
		Active:    true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create admin user", "error": err.Error()})
		return
	}

	passport := models.Passport{
		Protocol:   "local",
		Password:   hashedPassword,
		Identifier: req.Username,
		UserID:     user.ID,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if err := tx.Create(&passport).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create user authentication passport", "error": err.Error()})
		return
	}

	tx.Commit()

	// Issue token
	token, err := utils.IssueToken(user.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to issue token"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user":  user,
		"token": token,
	})
}

// Signup handles normal user registration
func Signup(c *gin.Context) {
	// For normal user registration (if settings allow)
	var req struct {
		Username             string `json:"username" binding:"required"`
		Email                string `json:"email" binding:"required,email"`
		Password             string `json:"password" binding:"required,min=7"`
		PasswordConfirmation string `json:"password_confirmation" binding:"required"`
		FirstName            string `json:"firstName"`
		LastName             string `json:"lastName"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid fields", "error": err.Error()})
		return
	}

	if req.Password != req.PasswordConfirmation {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Passwords do not match"})
		return
	}

	// Check if username or email already exists
	var count int64
	db.DB.Model(&models.User{}).Where("username = ? OR email = ?", req.Username, req.Email).Count(&count)
	if count > 0 {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Username or email already exists"})
		return
	}

	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to encrypt password"})
		return
	}

	tx := db.DB.Begin()
	now := time.Now()

	user := models.User{
		Username:  req.Username,
		Email:     req.Email,
		Role:      "viewer", // Default role
		FirstName: req.FirstName,
		LastName:  req.LastName,
		Admin:     false,
		Active:    true, // Automatically active for now (could check settings table if needed)
		CreatedAt: now,
		UpdatedAt: now,
	}

	if err := tx.Create(&user).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create user"})
		return
	}

	passport := models.Passport{
		Protocol:   "local",
		Password:   hashedPassword,
		Identifier: req.Username,
		UserID:     user.ID,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	if err := tx.Create(&passport).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create passport"})
		return
	}

	tx.Commit()

	c.JSON(http.StatusOK, user)
}
