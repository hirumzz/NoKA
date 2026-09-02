package services

import (
	"encoding/json"
	"log"
	"regexp"
	"strings"

	"konga-backend/db"
	"konga-backend/models"
)

var uuidRegex = regexp.MustCompile(`[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}`)

// SyncEntityAuthorsFromAuditLogs scans konga_audit_logs and populates konga_entity_authors
func SyncEntityAuthorsFromAuditLogs() {
	var auditLogs []models.AuditLog
	if err := db.DB.Order("id ASC").Find(&auditLogs).Error; err != nil {
		log.Printf("[SYNC] Failed to fetch audit logs for entity author sync: %v", err)
		return
	}

	syncedCount := 0
	for _, logEntry := range auditLogs {
		if logEntry.Username == "" || logEntry.Username == "anonymous" {
			continue
		}

		// Find UUID in URL or Payload
		var targetUUID string
		uuidMatches := uuidRegex.FindAllString(logEntry.URL, -1)
		if len(uuidMatches) > 0 {
			targetUUID = uuidMatches[len(uuidMatches)-1] // Take last matched UUID
		}

		if targetUUID == "" && len(logEntry.Payload) > 0 {
			var payloadMap map[string]interface{}
			if err := json.Unmarshal(logEntry.Payload, &payloadMap); err == nil {
				if id, ok := payloadMap["id"].(string); ok && id != "" {
					targetUUID = id
				}
			}
		}

		if targetUUID == "" {
			continue
		}

		entityType := logEntry.Entity
		if entityType == "" || entityType == "unknown" {
			parts := strings.Split(strings.TrimPrefix(logEntry.URL, "/"), "/")
			if len(parts) > 0 {
				entityType = parts[0]
			}
		}

		actionUpper := strings.ToUpper(logEntry.Action)

		var existing models.EntityAuthor
		err := db.DB.Where("entity_id = ?", targetUUID).First(&existing).Error

		if err != nil {
			createdBy := "-"
			if strings.HasPrefix(actionUpper, "POST") {
				createdBy = logEntry.Username
			}

			author := models.EntityAuthor{
				EntityID:          targetUUID,
				EntityType:        entityType,
				CreatedByUserID:   logEntry.UserID,
				CreatedByUsername: createdBy,
				UpdatedByUserID:   logEntry.UserID,
				UpdatedByUsername: logEntry.Username,
				CreatedAt:         logEntry.CreatedAt,
				UpdatedAt:         logEntry.CreatedAt,
			}
			if err := db.DB.Create(&author).Error; err == nil {
				syncedCount++
			}
		} else {
			updates := map[string]interface{}{}
			if strings.HasPrefix(actionUpper, "POST") && (existing.CreatedByUsername == "" || existing.CreatedByUsername == "-") {
				updates["created_by_username"] = logEntry.Username
				updates["created_by_user_id"] = logEntry.UserID
				updates["createdAt"] = logEntry.CreatedAt
			}
			if strings.HasPrefix(actionUpper, "PATCH") || strings.HasPrefix(actionUpper, "PUT") {
				updates["updated_by_username"] = logEntry.Username
				updates["updated_by_user_id"] = logEntry.UserID
				updates["updatedAt"] = logEntry.CreatedAt
			}
			if len(updates) > 0 {
				db.DB.Model(&existing).Updates(updates)
				syncedCount++
			}
		}
	}

	log.Printf("[SYNC] Successfully reconciled and synced %d audit log entries into konga_entity_authors", syncedCount)
}
