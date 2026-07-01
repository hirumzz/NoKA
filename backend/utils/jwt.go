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
		log.Println("[SECURITY WARNING] TOKEN_SECRET environment variable is not set. A random secret has been generated for this session. All sessions will be invalidated on restart. Set TOKEN_SECRET in production!")
	})

	return []byte(fallbackSecret)
}

// IssueToken issues a JWT token for a given user ID
func IssueToken(userID uint) (string, error) {
	// Generate a secure 16-byte hex string for jti
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	jti := hex.EncodeToString(b)

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"sub": fmt.Sprintf("%d", userID),
		"id":  userID,
		"exp": time.Now().Add(8 * time.Hour).Unix(), // 8h TTL (was 24h)
		"iat": time.Now().Unix(),
		"jti": jti,
	})

	return token.SignedString(GetJWTSecret())
}

// VerifyToken validates the JWT token and returns the user ID and jti from the claims
func VerifyToken(tokenStr string) (uint, string, error) {
	token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", t.Header["alg"])
		}
		return GetJWTSecret(), nil
	})

	if err != nil {
		return 0, "", err
	}

	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		var jti string
		if jtiVal, exists := claims["jti"]; exists {
			jti, _ = jtiVal.(string)
		}

		// Try to read "id" or "sub"
		if idVal, exists := claims["id"]; exists {
			switch v := idVal.(type) {
			case float64:
				return uint(v), jti, nil
			case int64:
				return uint(v), jti, nil
			}
		}

		if subVal, exists := claims["sub"]; exists {
			if subStr, ok := subVal.(string); ok {
				var id uint
				if _, err := fmt.Sscanf(subStr, "%d", &id); err == nil {
					return id, jti, nil
				}
			}
		}

		return 0, "", fmt.Errorf("invalid token claims")
	}

	return 0, "", fmt.Errorf("invalid token")
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
