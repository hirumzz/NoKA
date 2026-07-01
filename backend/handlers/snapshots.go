package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"konga-backend/db"
	"konga-backend/models"
	
	"gorm.io/datatypes"

	"github.com/gin-gonic/gin"
)

type CreateSnapshotRequest struct {
	Name     string          `json:"name" binding:"required"`
	Data     json.RawMessage `json:"data" binding:"required"`
	NodeName string          `json:"node_name"`
}

// GetSnapshots retrieves all snapshots
func GetSnapshots(c *gin.Context) {
	var snapshots []models.Snapshot
	if err := db.DB.Order("\"createdAt\" DESC").Find(&snapshots).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch snapshots"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": snapshots})
}

// CreateSnapshot creates a new snapshot entry
func CreateSnapshot(c *gin.Context) {
	var req CreateSnapshotRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid request payload", "error": err.Error()})
		return
	}

	snapshot := models.Snapshot{
		Name:     req.Name,
		Data:     string(req.Data),
		NodeName: req.NodeName,
	}

	if err := db.DB.Create(&snapshot).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to save snapshot"})
		return
	}

	// Capture Audit Log
	username := "anonymous"
	var userID *uint
	if userVal, exists := c.Get("user"); exists {
		if u, ok := userVal.(*models.User); ok {
			userID = &u.ID
			if u.Username != "" {
				username = u.Username
			} else {
				username = u.Email
			}
		}
	}

	auditLog := &models.AuditLog{
		IPAddress:    c.ClientIP(),
		UserID:       userID,
		Username:     username,
		Action:       "POST",
		Entity:       "snapshots",
		URL:          "/api/snapshots",
		Payload:      datatypes.JSON(fmt.Sprintf(`{"name": "%s"}`, req.Name)),
		KongNodeName: req.NodeName,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}
	_ = db.DB.Create(auditLog)

	c.JSON(http.StatusCreated, gin.H{"message": "Snapshot saved successfully", "data": snapshot})
}

// DeleteSnapshot deletes a snapshot entry
func DeleteSnapshot(c *gin.Context) {
	id := c.Param("id")

	// Get snapshot details for audit log
	var snapshot models.Snapshot
	if err := db.DB.First(&snapshot, id).Error; err == nil {
		// Proceed with delete
		if err := db.DB.Delete(&models.Snapshot{}, id).Error; err == nil {
			// Capture Audit Log
			username := "anonymous"
			var userID *uint
			if userVal, exists := c.Get("user"); exists {
				if u, ok := userVal.(*models.User); ok {
					userID = &u.ID
					if u.Username != "" {
						username = u.Username
					} else {
						username = u.Email
					}
				}
			}

			auditLog := &models.AuditLog{
				IPAddress:    c.ClientIP(),
				UserID:       userID,
				Username:     username,
				Action:       "DELETE",
				Entity:       "snapshots",
				URL:          "/api/snapshots/" + id,
				Payload:      datatypes.JSON(fmt.Sprintf(`{"id": "%s", "name": "%s"}`, id, snapshot.Name)),
				KongNodeName: snapshot.NodeName,
				CreatedAt:    time.Now(),
				UpdatedAt:    time.Now(),
			}
			_ = db.DB.Create(auditLog)
			
			c.JSON(http.StatusOK, gin.H{"message": "Snapshot deleted successfully"})
			return
		}
	}

	c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to delete snapshot"})
}
