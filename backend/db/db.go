package db

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"strings"

	"github.com/joho/godotenv"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
	"konga-backend/models"
)

var DB *gorm.DB

// InitDB initializes GORM DB connection
func InitDB() *gorm.DB {
	// Try to load .env from current dir or parent dir
	_ = godotenv.Load()
	if envPath, err := filepath.Abs("../.env"); err == nil {
		_ = godotenv.Load(envPath)
	}

	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_DATABASE")

	if host == "" {
		host = "localhost"
	}
	if port == "" {
		port = "5432"
	}
	if user == "" {
		user = "postgres"
	}
	if dbname == "" {
		dbname = "konga"
	}

	var dsn string
	dbUri := os.Getenv("DB_URI")
	if dbUri != "" {
		dsn = dbUri
	} else {
		dsn = fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%s sslmode=disable TimeZone=UTC",
			host, user, password, dbname, port)
	}

	// Log connection info without leaking credentials
	if dbUri != "" {
		log.Println("Connecting to database via DB_URI")
	} else {
		log.Printf("Connecting to database at %s:%s/%s", host, port, dbname)
	}

	var err error
	gormLogLevel := logger.Warn
	if strings.ToLower(os.Getenv("DB_LOG_SQL")) == "true" || strings.ToLower(os.Getenv("DB_DEBUG")) == "true" {
		gormLogLevel = logger.Info
		log.Println("GORM SQL Query Logging enabled (DB_LOG_SQL=true)")
	}

	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(gormLogLevel),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Database connection established successfully")

	err = DB.AutoMigrate(
		&models.User{},
		&models.Passport{},
		&models.KongNode{},
		&models.AuditLog{},
		&models.KongaComment{},
		&models.KongaNotification{},
		&models.BlacklistedToken{},
		&models.ReachabilityStatus{},
		&models.Snapshot{},
		&models.EntityAuthor{},
	)
	if err != nil {
		log.Printf("Failed to auto-migrate database schema: %v", err)
	}

	return DB
}
