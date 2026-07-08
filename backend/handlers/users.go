package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"

	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/datatypes"
)

type UpdateUserRequest struct {
	Username  string  `json:"username"`
	Email     string  `json:"email"`
	FirstName *string `json:"firstName"`
	LastName  *string `json:"lastName"`
	Avatar    *string `json:"avatar"`
	Role      string  `json:"role"`
	Active    *bool   `json:"active"`
	Node      *uint   `json:"node"`
	Password  string  `json:"password"`
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

	recordUserAuditAndNotify(c, "DELETE", "users", "/api/users/"+idStr, "User deleted: ID "+idStr, "mdi-account-minus", map[string]string{"id": idStr})

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
	isAdmin := currentUser.Admin || currentUser.Role == "admin" || currentUser.Role == "superadmin"

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
		if req.Role == "admin" || req.Role == "superadmin" {
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
	if req.FirstName != nil {
		updates["firstName"] = *req.FirstName
	}
	if req.LastName != nil {
		updates["lastName"] = *req.LastName
	}
	if req.Avatar != nil {
		updates["avatar"] = *req.Avatar
	}

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

	db.DB.First(&user, uint(id))

	recordUserAuditAndNotify(c, "PATCH", "users", "/api/users/"+idStr, "User updated: "+user.Username, "mdi-account-edit", updates)

	c.JSON(http.StatusOK, user)
}

func recordUserAuditAndNotify(c *gin.Context, action, entity, url, message, icon string, payload interface{}) {
	var userID *uint
	var username string = "anonymous"
	if userVal, exists := c.Get("user"); exists {
		if u, ok := userVal.(*models.User); ok {
			userID = &u.ID
			username = u.Username
		}
	}

	payloadBytes, _ := json.Marshal(payload)
	
	audit := models.AuditLog{
		IPAddress:    c.ClientIP(),
		UserID:       userID,
		Username:     username,
		Action:       action,
		Entity:       entity,
		URL:          url,
		Payload:      datatypes.JSON(payloadBytes),
		KongNodeName: "system",
	}
	db.DB.Create(&audit)

	notif := models.KongaNotification{
		Message:     message,
		Icon:        icon,
		State:       "users",
		StateParams: datatypes.JSON("{}"),
		UserID:      userID,
	}
	db.DB.Create(&notif)
}
