package services

import (
	"errors"
	"sync"
	"time"

	"konga-backend/models"
	"konga-backend/repositories"
	"konga-backend/utils"
)

type AuthService interface {
	Login(identifier, password string) (*models.User, string, error)
	RegisterFirstAdmin(username, email, password, firstName, lastName string) (*models.User, string, error)
	Signup(username, email, password, firstName, lastName, role string) (*models.User, error)
	ChangeInitialPassword(userID uint, newPassword string) (*models.User, error)
}

type authService struct {
	userRepo   repositories.UserRepository
	registerMu sync.Mutex
}

func NewAuthService(userRepo repositories.UserRepository) AuthService {
	return &authService{userRepo: userRepo}
}

func (s *authService) Login(identifier, password string) (*models.User, string, error) {
	user, err := s.userRepo.GetByIdentifier(identifier)
	if err != nil {
		return nil, "", errors.New("Invalid username or password")
	}

	passport, err := s.userRepo.GetPassportByUserID(user.ID, "local")
	if err != nil {
		return nil, "", errors.New("No local authentication found for this user")
	}

	if !utils.CheckPasswordHash(password, passport.Password) {
		return nil, "", errors.New("Invalid username or password")
	}

	// Verify if temporary password has expired (24h limit)
	if user.RequirePasswordChange && user.TemporaryPasswordExpiresAt != nil {
		if time.Now().After(*user.TemporaryPasswordExpiresAt) {
			return nil, "", errors.New("TEMPORARY_PASSWORD_EXPIRED")
		}
	}

	// Verify if account is active ONLY AFTER password is correct
	if !user.Active {
		return nil, "", errors.New("ACCOUNT_DISABLED")
	}

	token, err := utils.IssueToken(user.ID)
	if err != nil {
		return nil, "", errors.New("Failed to issue authentication token")
	}

	return user, token, nil
}

func (s *authService) RegisterFirstAdmin(username, email, password, firstName, lastName string) (*models.User, string, error) {
	s.registerMu.Lock()
	defer s.registerMu.Unlock()

	count, err := s.userRepo.CountUsers()
	if err != nil {
		return nil, "", errors.New("Failed to check user count")
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

	if err := s.userRepo.CreateUserAndPassport(user, passport); err != nil {
		return nil, "", errors.New("Failed to create admin user")
	}

	token, err := utils.IssueToken(user.ID)
	if err != nil {
		return nil, "", errors.New("Failed to issue token")
	}

	return user, token, nil
}

func (s *authService) Signup(username, email, password, firstName, lastName, role string) (*models.User, error) {
	_, err := s.userRepo.GetByIdentifier(username)
	if err == nil {
		return nil, errors.New("Username or email already exists")
	}

	hashedPassword, err := utils.HashPassword(password)
	if err != nil {
		return nil, errors.New("Failed to encrypt password")
	}

	now := time.Now()
	if role == "" {
		role = "viewer"
	}

	user := &models.User{
		Username:  username,
		Email:     email,
		Role:      role,
		FirstName: firstName,
		LastName:  lastName,
		Admin:     role == "admin" || role == "superadmin",
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

	if err := s.userRepo.CreateUserAndPassport(user, passport); err != nil {
		return nil, errors.New("Failed to create user")
	}

	return user, nil
}

func (s *authService) ChangeInitialPassword(userID uint, newPassword string) (*models.User, error) {
	if len(newPassword) < 7 {
		return nil, errors.New("Password must be at least 7 characters long")
	}

	user, err := s.userRepo.GetByID(userID)
	if err != nil {
		return nil, errors.New("User not found")
	}

	passport, err := s.userRepo.GetPassportByUserID(userID, "local")
	if err != nil {
		return nil, errors.New("Local authentication record not found")
	}

	hashedPassword, err := utils.HashPassword(newPassword)
	if err != nil {
		return nil, errors.New("Failed to encrypt new password")
	}

	passport.Password = hashedPassword
	passport.UpdatedAt = time.Now()
	if err := s.userRepo.UpdatePassport(passport); err != nil {
		return nil, errors.New("Failed to update password")
	}

	user.RequirePasswordChange = false
	user.TemporaryPasswordExpiresAt = nil
	user.UpdatedAt = time.Now()
	if err := s.userRepo.UpdateUser(user); err != nil {
		return nil, errors.New("Failed to update user status")
	}

	return user, nil
}

