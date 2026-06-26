package utils

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"os"
	"sync"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

var (
	fallbackSecret string
	secretOnce     sync.Once
)

// GetJWTSecret retrieves the configured TOKEN_SECRET or generates a secure fallback
func GetJWTSecret() []byte {
	secret := os.Getenv("TOKEN_SECRET")
	if secret != "" {
		return []byte(secret)
	}

	secretOnce.Do(func() {
		bytes := make([]byte, 64)
		if _, err := rand.Read(bytes); err != nil {
			log.Fatalf("Failed to generate fallback JWT secret: %v", err)
		}
		fallbackSecret = hex.EncodeToString(bytes)
		log.Println("Warning: TOKEN_SECRET env var is not configured. A secure random token secret has been generated for this session.")
	})

	return []byte(fallbackSecret)
}

// IssueToken issues a JWT token for a given user ID
func IssueToken(userID uint) (string, error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": fmt.Sprintf("%d", userID),
		"id":  userID,
		"exp": time.Now().Add(24 * time.Hour).Unix(),
		"iat": time.Now().Unix(),
	})

	return token.SignedString(GetJWTSecret())
}

// VerifyToken validates the JWT token and returns the user ID from the claims
func VerifyToken(tokenStr string) (uint, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return GetJWTSecret(), nil
	})

	if err != nil {
		return 0, err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		// Try to read "id" or "sub"
		if idVal, exists := claims["id"]; exists {
			switch v := idVal.(type) {
			case float64:
				return uint(v), nil
			case int64:
				return uint(v), nil
			}
		}

		if subVal, exists := claims["sub"]; exists {
			if subStr, ok := subVal.(string); ok {
				var id uint
				if _, err := fmt.Sscanf(subStr, "%d", &id); err == nil {
					return id, nil
				}
			}
		}

		return 0, fmt.Errorf("invalid token claims")
	}

	return 0, fmt.Errorf("invalid token")
}

// IssueKongConnectionToken issues a JWT token for Kong's Admin API JWT authentication
func IssueKongConnectionToken(jwtKey, jwtSecret string) (string, error) {
	claims := jwt.MapClaims{
		"iss": jwtKey,
		"nbf": time.Now().Add(-1 * time.Minute).Unix(),
		"exp": time.Now().Add(2 * time.Minute).Unix(),
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(jwtSecret))
}
