package services

import (
	"errors"
	"sync"
	"time"

	"konga-backend/db"
	"konga-backend/models"
	"konga-backend/utils"
)

type AuthService interface {
	Login(identifier, password string) (*models.User, string, error)
	RegisterFirstAdmin(username, email, password, firstName, lastName string) (*models.User, string, error)
	Signup(username, email, password, firstName, lastName string) (*models.User, error)
}

type authService struct {
	registerMu sync.Mutex
}

func NewAuthService() AuthService {
	return &authService{}
}

func (s *authService) Login(identifier, password string) (*models.User, string, error) {
	var user models.User
	if err := db.DB.Where("username = ? OR email = ?", identifier, identifier).First(&user).Error; err != nil {
		return nil, "", errors.New("Invalid username or password")
	}

	var passport models.Passport
	if err := db.DB.Where("protocol = ? AND \"user\" = ?", "local", user.ID).First(&passport).Error; err != nil {
		return nil, "", errors.New("No local authentication found for this user")
	}

	if !utils.CheckPasswordHash(password, passport.Password) {
		return nil, "", errors.New("Invalid username or password")
	}

	// Verify if account is active ONLY AFTER password is correct
	if !user.Active {
		return nil, "", errors.New("ACCOUNT_DISABLED")
	}

	token, err := utils.IssueToken(user.ID)
	if err != nil {
		return nil, "", errors.New("Failed to issue authentication token")
	}

	return &user, token, nil
}

func (s *authService) RegisterFirstAdmin(username, email, password, firstName, lastName string) (*models.User, string, error) {
	s.registerMu.Lock()
	defer s.registerMu.Unlock()

	var count int64
	if err := db.DB.Model(&models.User{}).Count(&count).Error; err != nil {
		return nil, "", errors.New("Failed to verify user count")
	}
	if count > 0 {
		return nil, "", errors.New("An admin user is already registered!")
	}

	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return nil, "", errors.New("Failed to encrypt password")
	}

	now := time.Now()
	user := &models.User{
		Username:  username,
		Email:     email,
		Role:      "admin",
		FirstName: firstName,
		LastName:  lastName,
		Admin:     true,
		Active:    true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	passport := &models.Passport{
		Protocol:   "local",
		Password:   hashedPassword,
		Identifier: username,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	tx := db.DB.Begin()
	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		return nil, "", err
	}
	passport.UserID = user.ID
	if err := tx.Create(passport).Error; err != nil {
		tx.Rollback()
		return nil, "", err
	}
	if err := tx.Commit().Error; err != nil {
		return nil, "", err
	}

	token, err := utils.IssueToken(user.ID)
	if err != nil {
		return nil, "", errors.New("Failed to issue token")
	}

	return user, token, nil
}

func (s *authService) Signup(username, email, password, firstName, lastName string) (*models.User, error) {
	var existingUser models.User
	if err := db.DB.Where("username = ? OR email = ?", username, email).First(&existingUser).Error; err == nil {
		return nil, errors.New("Username or email already exists")
	}

	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return nil, errors.New("Failed to encrypt password")
	}

	now := time.Now()
	user := &models.User{
		Username:  username,
		Email:     email,
		Role:      "viewer",
		FirstName: firstName,
		LastName:  lastName,
		Admin:     false,
		Active:    true,
		CreatedAt: now,
		UpdatedAt: now,
	}

	passport := &models.Passport{
		Protocol:   "local",
		Password:   hashedPassword,
		Identifier: username,
		CreatedAt:  now,
		UpdatedAt:  now,
	}

	tx := db.DB.Begin()
	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		return nil, err
	}
	passport.UserID = user.ID
	if err := tx.Create(passport).Error; err != nil {
		tx.Rollback()
		return nil, err
	}
	if err := tx.Commit().Error; err != nil {
		return nil, err
	}

	return user, nil
}
