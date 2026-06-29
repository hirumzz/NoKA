package handlers

import (
	"net/http"
	"strconv"

	"konga-backend/db"
	"konga-backend/models"

	"github.com/gin-gonic/gin"
)

type UpdateUserRequest struct {
	Role   string `json:"role"`
	Active *bool  `json:"active"`
}

// DeleteUser deletes an administrator user
func DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid user ID"})
		return
	}

	// Verify we are not deleting ourself
	currentUserVal, exists := c.Get("user")
	if exists {
		currUser := currentUserVal.(*models.User)
		if currUser.ID == uint(id) {
			c.JSON(http.StatusBadRequest, gin.H{"message": "You cannot delete your own account"})
			return
		}
	}

	if err := db.DB.Delete(&models.User{}, uint(id)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "User deleted successfully"})
}

// UpdateUser updates user details (like role or active status)
func UpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid user ID"})
		return
	}

	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request fields", "error": err.Error()})
		return
	}

	var user models.User
	if err := db.DB.First(&user, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "User not found"})
		return
	}

	updates := make(map[string]interface{})
	if req.Role != "" {
		updates["role"] = req.Role
		if req.Role == "admin" {
			updates["admin"] = true
		} else {
			updates["admin"] = false
		}
	}
	if req.Active != nil {
		updates["active"] = *req.Active
	}

	if err := db.DB.Model(&user).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to update user"})
		return
	}

	c.JSON(http.StatusOK, user)
}
