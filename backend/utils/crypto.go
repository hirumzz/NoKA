package utils

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"io"
	"log"
	"os"
	"strings"
	"sync"
)

const encPrefix = "enc_v1:"

var (
	encryptionKey []byte
	encKeyOnce    sync.Once
)

// GetEncryptionKey retrieves the 32-byte encryption key from the environment.
// If it is not set or invalid length, it uses SHA-256 of the JWT secret to derive a secure 32-byte key.
func GetEncryptionKey() []byte {
	encKeyOnce.Do(func() {
		keyStr := os.Getenv("ENCRYPTION_KEY")
		if keyStr != "" {
			// Hash it so we always get 32 bytes
			hash := sha256.Sum256([]byte(keyStr))
			encryptionKey = hash[:]
		} else {
			log.Println("[SECURITY WARNING] ENCRYPTION_KEY environment variable is not set. Deriving fallback encryption key from JWT secret.")
			// Fallback to SHA-256 of the JWT secret (which is already secure)
			jwtSecret := GetJWTSecret()
			hash := sha256.Sum256(jwtSecret)
			encryptionKey = hash[:]
		}
	})
	return encryptionKey
}

// Encrypt encrypts a plaintext string using AES-256-GCM and prepends a prefix.
// If the string is empty or already encrypted, it returns it as-is.
func Encrypt(plainText string) (string, error) {
	if plainText == "" || strings.HasPrefix(plainText, encPrefix) {
		return plainText, nil
	}

	block, err := aes.NewCipher(GetEncryptionKey())
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonce := make([]byte, aesGCM.NonceSize())
	if _, err = io.ReadFull(rand.Reader, nonce); err != nil {
		return "", err
	}

	cipherText := aesGCM.Seal(nonce, nonce, []byte(plainText), nil)
	return encPrefix + base64.StdEncoding.EncodeToString(cipherText), nil
}

// Decrypt decrypts a ciphertext string that was encrypted by Encrypt.
// If the string does not have the encrypted prefix, it assumes it is plaintext and returns it as-is.
func Decrypt(cipherText string) (string, error) {
	if cipherText == "" || !strings.HasPrefix(cipherText, encPrefix) {
		return cipherText, nil
	}

	b64Data := strings.TrimPrefix(cipherText, encPrefix)
	encData, err := base64.StdEncoding.DecodeString(b64Data)
	if err != nil {
		return "", err
	}

	block, err := aes.NewCipher(GetEncryptionKey())
	if err != nil {
		return "", err
	}

	aesGCM, err := cipher.NewGCM(block)
	if err != nil {
		return "", err
	}

	nonceSize := aesGCM.NonceSize()
	if len(encData) < nonceSize {
		return "", errors.New("ciphertext too short")
	}

	nonce, actualCipherText := encData[:nonceSize], encData[nonceSize:]
	plainText, err := aesGCM.Open(nil, nonce, actualCipherText, nil)
	if err != nil {
		return "", err
	}

	return string(plainText), nil
}
