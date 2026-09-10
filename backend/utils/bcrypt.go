package utils

import (
	"errors"
	"unicode"

	"golang.org/x/crypto/bcrypt"
)

// HashPassword generates a bcrypt hash of the password with salt cost 12 (OWASP recommended minimum)
func HashPassword(password string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(password), 12)
	return string(bytes), err
}

// CheckPasswordHash compares a password with a hash
func CheckPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	return err == nil
}

// ValidatePasswordStrength enforces strong password requirements:
// - Length between 8 and 64 characters
// - At least 1 uppercase letter
// - At least 1 lowercase letter
// - At least 1 number
// - At least 1 special character / symbol
func ValidatePasswordStrength(password string) error {
	runeCount := len([]rune(password))
	if runeCount < 8 {
		return errors.New("Password must be at least 8 characters long")
	}
	if runeCount > 64 {
		return errors.New("Password must not exceed 64 characters")
	}

	var hasUpper, hasLower, hasDigit, hasSpecial bool

	for _, ch := range password {
		switch {
		case unicode.IsUpper(ch):
			hasUpper = true
		case unicode.IsLower(ch):
			hasLower = true
		case unicode.IsDigit(ch):
			hasDigit = true
		case unicode.IsPunct(ch) || unicode.IsSymbol(ch):
			hasSpecial = true
		}
	}

	if !hasUpper {
		return errors.New("Password must contain at least 1 uppercase letter")
	}
	if !hasLower {
		return errors.New("Password must contain at least 1 lowercase letter")
	}
	if !hasDigit {
		return errors.New("Password must contain at least 1 number")
	}
	if !hasSpecial {
		return errors.New("Password must contain at least 1 special character (!@#$%^&*...)")
	}

	return nil
}

