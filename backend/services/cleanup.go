package services

import (
	"log"
	"time"

	"konga-backend/db"
	"konga-backend/models"
)

// StartBlacklistedTokenCleanup periodically removes expired blacklisted tokens
// to prevent the database table from growing indefinitely.
func StartBlacklistedTokenCleanup() {
	go func() {
		for {
			// Run cleanup once an hour
			time.Sleep(1 * time.Hour)

			now := time.Now()
			result := db.DB.Where("expires_at < ?", now).Delete(&models.BlacklistedToken{})
			if result.Error != nil {
				log.Printf("Failed to clean up expired blacklisted tokens: %v", result.Error)
			} else if result.RowsAffected > 0 {
				log.Printf("Cleaned up %d expired blacklisted token(s)", result.RowsAffected)
			}
		}
	}()
}
