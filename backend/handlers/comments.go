package handlers

import (
	"fmt"
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
	ReferenceName string `json:"referenceName"`
	Content       string `json:"content" binding:"required"`
}

type UpdateCommentRequest struct {
	Content       string `json:"content" binding:"required"`
	ReferenceName string `json:"referenceName"`
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
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch comments"})
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
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to save comment"})
		return
	}

	// Preload User and return
	db.DB.Preload("User").First(&comment, comment.ID)

	username := "anonymous"
	if user.Username != "" {
		username = user.Username
	} else {
		username = user.Email
	}

	// Create System Notification
	icon := "mdi-comment-text-outline"
	
	refDisplayName := req.ReferenceType
	if req.ReferenceName != "" {
		refDisplayName = fmt.Sprintf("%s (%s)", req.ReferenceType, req.ReferenceName)
	}

	notificationMessage := fmt.Sprintf("%s commented on %s", username, refDisplayName)
	notif := &models.KongaNotification{
		Message:     notificationMessage,
		Icon:        icon,
		State:       req.ReferenceType + "s",
		StateParams: "{}",
		UserID:      &user.ID,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	_ = db.DB.Create(notif)

	// Create Audit Log
	auditPath := "/api/comments"
	if req.ReferenceName != "" {
		auditPath = fmt.Sprintf("/api/comments (%s)", req.ReferenceName)
	}
	auditLog := &models.AuditLog{
		IPAddress:    c.ClientIP(),
		UserID:       &user.ID,
		Username:     username,
		Action:       "POST",
		Entity:       "comments",
		URL:          auditPath,
		Payload:      fmt.Sprintf(`{"referenceType": "%s", "referenceId": "%s", "referenceName": "%s"}`, req.ReferenceType, req.ReferenceID, req.ReferenceName),
		KongNodeName: "system",
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	_ = db.DB.Create(auditLog)

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
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to update comment"})
		return
	}

	db.DB.Preload("User").First(&comment, comment.ID)

	username := "anonymous"
	if user.Username != "" {
		username = user.Username
	} else {
		username = user.Email
	}

	// Create System Notification
	icon := "mdi-comment-edit-outline"

	refDisplayName := comment.ReferenceType
	if req.ReferenceName != "" {
		refDisplayName = fmt.Sprintf("%s (%s)", comment.ReferenceType, req.ReferenceName)
	}

	notificationMessage := fmt.Sprintf("%s updated a comment on %s", username, refDisplayName)
	notif := &models.KongaNotification{
		Message:     notificationMessage,
		Icon:        icon,
		State:       comment.ReferenceType + "s",
		StateParams: "{}",
		UserID:      &user.ID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	_ = db.DB.Create(notif)

	// Create Audit Log
	auditUrl := "/api/comments/" + idStr
	if req.ReferenceName != "" {
		auditUrl = fmt.Sprintf("/api/comments/%s (%s: %s)", idStr, comment.ReferenceType, req.ReferenceName)
	}
	auditPayload := fmt.Sprintf(`{"referenceType": "%s", "referenceId": "%s", "referenceName": "%s"}`, comment.ReferenceType, comment.ReferenceID, req.ReferenceName)

	auditLog := &models.AuditLog{
		IPAddress:    c.ClientIP(),
		UserID:       &user.ID,
		Username:     username,
		Action:       "PATCH",
		Entity:       "comments",
		URL:          auditUrl,
		Payload:      auditPayload,
		KongNodeName: "system",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	_ = db.DB.Create(auditLog)

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
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to delete comment"})
		return
	}

	username := "anonymous"
	if user.Username != "" {
		username = user.Username
	} else {
		username = user.Email
	}

	// Create System Notification
	icon := "mdi-comment-remove-outline"
	
	refName := c.Query("referenceName")
	refDisplayName := comment.ReferenceType
	if refName != "" {
		refDisplayName = fmt.Sprintf("%s (%s)", comment.ReferenceType, refName)
	}

	notificationMessage := fmt.Sprintf("%s deleted a comment on %s", username, refDisplayName)
	notif := &models.KongaNotification{
		Message:     notificationMessage,
		Icon:        icon,
		State:       comment.ReferenceType + "s",
		StateParams: "{}",
		UserID:      &user.ID,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}
	_ = db.DB.Create(notif)

	// Create Audit Log
	auditUrl := "/api/comments/" + idStr
	if refName != "" {
		auditUrl = fmt.Sprintf("/api/comments/%s (%s: %s)", idStr, comment.ReferenceType, refName)
	}
	auditPayload := fmt.Sprintf(`{"referenceType": "%s", "referenceId": "%s", "referenceName": "%s"}`, comment.ReferenceType, comment.ReferenceID, refName)

	auditLog := &models.AuditLog{
		IPAddress:    c.ClientIP(),
		UserID:       &user.ID,
		Username:     username,
		Action:       "DELETE",
		Entity:       "comments",
		URL:          auditUrl,
		Payload:      auditPayload,
		KongNodeName: "system",
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	_ = db.DB.Create(auditLog)

	c.JSON(http.StatusOK, gin.H{"message": "Comment deleted successfully", "id": id})
}
