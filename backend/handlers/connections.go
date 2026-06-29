package handlers

import (
	"net/http"
	"strconv"
	"time"

	"konga-backend/db"
	"konga-backend/models"

	"github.com/gin-gonic/gin"
)

type CreateConnectionRequest struct {
	Name         string `json:"name" binding:"required"`
	KongAdminURL string `json:"kong_admin_url" binding:"required"`
	Type         string `json:"type"` // key_auth, jwt, basic_auth, default
	KongAPIKey   string `json:"kong_api_key"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	JWTAlgorithm string `json:"jwt_algorithm"`
	JWTKey       string `json:"jwt_key"`
	JWTSecret    string `json:"jwt_secret"`
	NetdataURL   string `json:"netdata_url"`
}

// GetConnections lists all connections
func GetConnections(c *gin.Context) {
	var nodes []models.KongNode
	if err := db.DB.Find(&nodes).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch connections", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, nodes)
}

// CreateConnection saves a new connection
func CreateConnection(c *gin.Context) {
	var req CreateConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request fields", "error": err.Error()})
		return
	}

	now := time.Now()
	node := models.KongNode{
		Name:         req.Name,
		KongAdminURL: req.KongAdminURL,
		Type:         req.Type,
		KongAPIKey:   req.KongAPIKey,
		Username:     req.Username,
		Password:     req.Password,
		JWTAlgorithm: req.JWTAlgorithm,
		JWTKey:       req.JWTKey,
		JWTSecret:    req.JWTSecret,
		NetdataURL:   req.NetdataURL,
		Active:       false,
		KongVersion:  "3.9.2", // Default to newest
		CreatedAt:    now,
		UpdatedAt:    now,
	}

	if node.Type == "" {
		node.Type = "default"
	}

	if err := db.DB.Create(&node).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create connection", "error": err.Error()})
		return
	}

	c.JSON(http.StatusCreated, node)
}

// DeleteConnection deletes a connection
func DeleteConnection(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid connection ID"})
		return
	}

	if err := db.DB.Delete(&models.KongNode{}, uint(id)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to delete connection", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Connection deleted successfully"})
}

// ActivateConnection updates user's default node ID
func ActivateConnection(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid connection ID"})
		return
	}

	// Verify node exists
	var node models.KongNode
	if err := db.DB.First(&node, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Connection node not found"})
		return
	}

	// Get user context
	userVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}
	user := userVal.(*models.User)

	// Begin TX
	tx := db.DB.Begin()

	// Update user's active node
	nodeID := uint(id)
	user.Node = &nodeID
	if err := tx.Model(user).Update("node", nodeID).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to activate connection for user", "error": err.Error()})
		return
	}

	// Deactivate all nodes and activate this one (optional for display status)
	if err := tx.Model(&models.KongNode{}).Where("id <> ?", nodeID).Update("active", false).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to update connection states", "error": err.Error()})
		return
	}
	if err := tx.Model(&node).Update("active", true).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to activate connection node", "error": err.Error()})
		return
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to commit connection activation", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Connection activated successfully", "node": node})
}

type UpdateConnectionRequest struct {
	Name         string `json:"name"`
	KongAdminURL string `json:"kong_admin_url"`
	Type         string `json:"type"`
	KongAPIKey   string `json:"kong_api_key"`
	Username     string `json:"username"`
	Password     string `json:"password"`
	JWTAlgorithm string `json:"jwt_algorithm"`
	JWTKey       string `json:"jwt_key"`
	JWTSecret    string `json:"jwt_secret"`
	NetdataURL   string `json:"netdata_url"`
	HealthChecks *bool  `json:"health_checks"`
}

// UpdateConnection modifies an existing connection node details or settings
func UpdateConnection(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid connection ID"})
		return
	}

	var req UpdateConnectionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid parameters", "error": err.Error()})
		return
	}

	var node models.KongNode
	if err := db.DB.First(&node, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Connection node not found"})
		return
	}

	updates := make(map[string]interface{})
	if req.Name != "" {
		updates["name"] = req.Name
	}
	if req.KongAdminURL != "" {
		updates["kong_admin_url"] = req.KongAdminURL
	}
	if req.Type != "" {
		updates["type"] = req.Type
	}
	if req.KongAPIKey != "" {
		updates["kong_api_key"] = req.KongAPIKey
	}
	if req.Username != "" {
		updates["username"] = req.Username
	}
	if req.Password != "" {
		updates["password"] = req.Password
	}
	if req.JWTAlgorithm != "" {
		updates["jwt_algorithm"] = req.JWTAlgorithm
	}
	if req.JWTKey != "" {
		updates["jwt_key"] = req.JWTKey
	}
	if req.JWTSecret != "" {
		updates["jwt_secret"] = req.JWTSecret
	}
	if req.NetdataURL != "" {
		updates["netdata_url"] = req.NetdataURL
	}
	if req.HealthChecks != nil {
		updates["health_checks"] = *req.HealthChecks
		if *req.HealthChecks {
			// Mock default details if empty
			if node.HealthCheckDetails == "" {
				updates["health_check_details"] = `{"isHealthy":true,"lastChecked":"` + time.Now().Format(time.RFC3339) + `","firstSucceeded":"` + time.Now().Format(time.RFC3339) + `"}`
			}
		}
	}

	updates["updatedAt"] = time.Now()

	if err := db.DB.Model(&node).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to update connection", "error": err.Error()})
		return
	}

	db.DB.First(&node, uint(id))

	c.JSON(http.StatusOK, node)
}
