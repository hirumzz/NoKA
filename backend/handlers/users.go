package handlers

import (
	"net/http"
	"strconv"

	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/utils"

	"github.com/gin-gonic/gin"
)

type UpdateUserRequest struct {
	Username  string `json:"username"`
	Email     string `json:"email"`
	FirstName string `json:"firstName"`
	LastName  string `json:"lastName"`
	Avatar    string `json:"avatar"`
	Role      string `json:"role"`
	Active    *bool  `json:"active"`
	Node      *uint  `json:"node"`
	Password  string `json:"password"`
}

// GetUserByID fetches a user by ID
func GetUserByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid user ID"})
		return
	}

	var user models.User
	if err := db.DB.First(&user, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "User not found"})
		return
	}

	c.JSON(http.StatusOK, user)
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

	currentUserVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}
	currentUser := currentUserVal.(*models.User)
	isAdmin := currentUser.Admin || currentUser.Role == "admin"

	// Non-admins can only update themselves
	if !isAdmin && currentUser.ID != uint(id) {
		c.JSON(http.StatusForbidden, gin.H{"message": "Forbidden - You can only edit your own profile"})
		return
	}

	// Non-admins cannot modify roles or active status
	if !isAdmin {
		req.Role = ""
		req.Active = nil
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
	if req.Username != "" {
		updates["username"] = req.Username
	}
	if req.Email != "" {
		updates["email"] = req.Email
	}
	if req.Avatar != "" {
		updates["avatar"] = req.Avatar
	}
	// Always allow updating names, even to empty strings
	updates["firstName"] = req.FirstName
	updates["lastName"] = req.LastName
	updates["avatar"] = req.Avatar

	if req.Node != nil {
		updates["node"] = *req.Node
	}

	tx := db.DB.Begin()

	if err := tx.Model(&user).Updates(updates).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to update user details"})
		return
	}

	// Update password if provided
	if req.Password != "" {
		hashedPassword, err := utils.HashPassword(req.Password)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to hash password"})
			return
		}
		
		// Update local passport
		if err := tx.Model(&models.Passport{}).
			Where("\"user\" = ? AND protocol = ?", user.ID, "local").
			Update("password", hashedPassword).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to update password"})
			return
		}
	}

	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to commit changes"})
		return
	}

	c.JSON(http.StatusOK, user)
}
