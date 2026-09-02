package db

import (
	"fmt"
	"log"
	"os"
	"path/filepath"

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
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}

	log.Println("Database connection established successfully")

	err = DB.AutoMigrate(&models.User{})
	if err != nil {
		log.Printf("Failed to auto-migrate User: %v", err)
	}
	err = DB.AutoMigrate(&models.KongNode{})
	if err != nil {
		log.Printf("Failed to auto-migrate KongNode: %v", err)
	}
	err = DB.AutoMigrate(&models.BlacklistedToken{})
	if err != nil {
		log.Printf("Failed to auto-migrate BlacklistedToken: %v", err)
	}
	err = DB.AutoMigrate(&models.ReachabilityStatus{})
	if err != nil {
		log.Printf("Failed to auto-migrate ReachabilityStatus: %v", err)
	}
	err = DB.AutoMigrate(&models.Snapshot{})
	if err != nil {
		log.Printf("Failed to auto-migrate Snapshot: %v", err)
	}
	err = DB.AutoMigrate(&models.EntityAuthor{})
	if err != nil {
		log.Printf("Failed to auto-migrate EntityAuthor: %v", err)
	}

	return DB
}
