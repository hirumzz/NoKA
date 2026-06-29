package handlers

import (
	"net/http"
	"strconv"
	"time"

	"konga-backend/db"
	"konga-backend/models"

	"github.com/gin-gonic/gin"
)

type CreateCommentRequest struct {
	ReferenceID   string `json:"referenceId" binding:"required"`
	ReferenceType string `json:"referenceType" binding:"required"` // route, service, consumer
	Content       string `json:"content" binding:"required"`
}

type UpdateCommentRequest struct {
	Content string `json:"content" binding:"required"`
}

// GetComments gets comments for a specific entity
func GetComments(c *gin.Context) {
	refID := c.Query("referenceId")
	refType := c.Query("referenceType")

	if refID == "" || refType == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Missing referenceId or referenceType query params"})
		return
	}

	var comments []models.KongaComment
	if err := db.DB.Preload("User").
		Where("\"referenceId\" = ? AND \"referenceType\" = ?", refID, refType).
		Order("\"createdAt\" ASC").
		Find(&comments).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch comments", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, comments)
}

// CreateComment adds a comment to an entity
func CreateComment(c *gin.Context) {
	userVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}
	user := userVal.(*models.User)

	// Check permission: Viewer cannot add comments
	if user.Role == "viewer" {
		c.JSON(http.StatusForbidden, gin.H{"message": "Forbidden - Viewers cannot write comments"})
		return
	}

	var req CreateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request fields", "error": err.Error()})
		return
	}

	now := time.Now()
	comment := models.KongaComment{
		ReferenceID:   req.ReferenceID,
		ReferenceType: req.ReferenceType,
		Content:       req.Content,
		UserID:        user.ID,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := db.DB.Create(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to save comment", "error": err.Error()})
		return
	}

	// Preload User and return
	db.DB.Preload("User").First(&comment, comment.ID)

	c.JSON(http.StatusCreated, comment)
}

// UpdateComment updates an existing comment (only owner can edit)
func UpdateComment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid comment ID"})
		return
	}

	userVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}
	user := userVal.(*models.User)

	var req UpdateCommentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Content is required", "error": err.Error()})
		return
	}

	var comment models.KongaComment
	if err := db.DB.First(&comment, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Comment not found"})
		return
	}

	// Check owner permissions
	if comment.UserID != user.ID {
		c.JSON(http.StatusForbidden, gin.H{"message": "You can only edit your own comments"})
		return
	}

	comment.Content = req.Content
	comment.UpdatedAt = time.Now()

	if err := db.DB.Save(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to update comment", "error": err.Error()})
		return
	}

	db.DB.Preload("User").First(&comment, comment.ID)

	c.JSON(http.StatusOK, comment)
}

// DeleteComment removes a comment (owner or admin can delete)
func DeleteComment(c *gin.Context) {
	idStr := c.Param("id")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid comment ID"})
		return
	}

	userVal, exists := c.Get("user")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		return
	}
	user := userVal.(*models.User)

	var comment models.KongaComment
	if err := db.DB.First(&comment, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Comment not found"})
		return
	}

	// Owner or Admin role can delete
	isOwner := comment.UserID == user.ID
	isAdmin := user.Admin || user.Role == "admin"

	if !isOwner && !isAdmin {
		c.JSON(http.StatusForbidden, gin.H{"message": "Only the comment owner or an administrator can delete comments"})
		return
	}

	if err := db.DB.Delete(&comment).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to delete comment", "error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted successfully", "id": id})
}
