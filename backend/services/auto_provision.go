package services

import (
	"crypto/rand"
	"fmt"
	"log"
	"math/big"
	"os"
	"time"

	"konga-backend/models"
	"konga-backend/utils"

	"gorm.io/gorm"
)

// generateSecureRandomPassword generates a 16-character complex password
func generateSecureRandomPassword(length int) string {
	const charset = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%^&*"
	res := make([]byte, length)
	for i := 0; i < length; i++ {
		num, err := rand.Int(rand.Reader, big.NewInt(int64(len(charset))))
		if err != nil {
			// Fallback
			res[i] = charset[i%len(charset)]
		} else {
			res[i] = charset[num.Int64()]
		}
	}
	return string(res)
}

// AutoSeedFirstAdmin checks if the database is fresh (0 users) and provisions default admin
func AutoSeedFirstAdmin(database *gorm.DB) {
	var count int64
	if err := database.Model(&models.User{}).Count(&count).Error; err != nil {
		log.Printf("[AUTO-PROVISION] Error checking user count: %v", err)
		return
	}

	if count > 0 {
		return
	}

	// Database is fresh, provision default admin
	username := os.Getenv("SEED_ADMIN_USERNAME")
	if username == "" {
		username = "admin"
	}

	email := os.Getenv("SEED_ADMIN_EMAIL")
	if email == "" {
		email = "admin@admin.com"
	}

	rawPassword := os.Getenv("SEED_ADMIN_PASSWORD")
	isCustomPassword := rawPassword != ""
	if !isCustomPassword {
		rawPassword = generateSecureRandomPassword(16)
	}

	hashedPassword, err := utils.HashPassword(rawPassword)
	if err != nil {
		log.Printf("[AUTO-PROVISION] Failed to hash generated password: %v", err)
		return
	}

	now := time.Now()
	expiresAt := now.Add(24 * time.Hour)
	user := &models.User{
		Username:                   username,
		Email:                      email,
		Role:                       "admin",
		FirstName:                  "Super",
		LastName:                   "Admin",
		Admin:                      true,
		Active:                     true,
		RequirePasswordChange:      !isCustomPassword, // If custom password provided via env, don't force change unless random
		TemporaryPasswordExpiresAt: &expiresAt,
		CreatedAt:                  now,
		UpdatedAt:                  now,
	}

	passport := &models.Passport{
		Protocol:   "local",
		Password:   hashedPassword,
		Identifier: username,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	tx := database.Begin()
	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		log.Printf("[AUTO-PROVISION] Failed to create initial admin user: %v", err)
		return
	}
	passport.UserID = user.ID
	if err := tx.Create(passport).Error; err != nil {
		tx.Rollback()
		log.Printf("[AUTO-PROVISION] Failed to create initial admin passport: %v", err)
		return
	}
	if err := tx.Commit().Error; err != nil {
		log.Printf("[AUTO-PROVISION] Transaction commit failed: %v", err)
		return
	}

	// Print prominent credential box in stdout logs
	fmt.Println()
	fmt.Println("=========================================================================================")
	fmt.Println(" [NOKA AUTO-PROVISION] Fresh installation detected. Default Administrator created:")
	fmt.Println("   Username : " + username)
	fmt.Println("   Email    : " + email)
	fmt.Println("   Password : " + rawPassword)
	fmt.Println("   Expires  : " + expiresAt.Format("2006-01-02 15:04:05 MST") + " (in 24 hours)")
	fmt.Println("-----------------------------------------------------------------------------------------")
	fmt.Println(" ⚠️  SECURITY NOTICE: You must sign in and set a permanent password within 24 hours.")
	fmt.Println("     After 24 hours, this temporary password will expire and the account will freeze.")
	fmt.Println("=========================================================================================")
	fmt.Println()
}
