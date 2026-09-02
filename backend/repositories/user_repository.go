package repositories

import (
	"konga-backend/models"

	"gorm.io/gorm"
)

type UserRepository interface {
	GetByID(id uint) (*models.User, error)
	GetByIdentifier(identifier string) (*models.User, error)
	GetPassportByUserID(userID uint, protocol string) (*models.Passport, error)
	CountUsers() (int64, error)
	CreateUserAndPassport(user *models.User, passport *models.Passport) error
	CreateUser(user *models.User) error
	CreatePassport(passport *models.Passport) error
	UpdateUser(user *models.User) error
	UpdatePassport(passport *models.Passport) error
}

type userRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) GetByID(id uint) (*models.User, error) {
	var user models.User
	if err := r.db.First(&user, id).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByIdentifier(identifier string) (*models.User, error) {
	var user models.User
	if err := r.db.Where("username = ? OR email = ?", identifier, identifier).First(&user).Error; err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetPassportByUserID(userID uint, protocol string) (*models.Passport, error) {
	var passport models.Passport
	if err := r.db.Where("protocol = ? AND \"user\" = ?", protocol, userID).First(&passport).Error; err != nil {
		return nil, err
	}
	return &passport, nil
}

func (r *userRepository) CountUsers() (int64, error) {
	var count int64
	if err := r.db.Model(&models.User{}).Count(&count).Error; err != nil {
		return 0, err
	}
	return count, nil
}

func (r *userRepository) CreateUserAndPassport(user *models.User, passport *models.Passport) error {
	tx := r.db.Begin()
	if err := tx.Create(user).Error; err != nil {
		tx.Rollback()
		return err
	}
	passport.UserID = user.ID
	if err := tx.Create(passport).Error; err != nil {
		tx.Rollback()
		return err
	}
	return tx.Commit().Error
}

func (r *userRepository) CreateUser(user *models.User) error {
	return r.db.Create(user).Error
}

func (r *userRepository) CreatePassport(passport *models.Passport) error {
	return r.db.Create(passport).Error
}

func (r *userRepository) UpdateUser(user *models.User) error {
	return r.db.Save(user).Error
}

func (r *userRepository) UpdatePassport(passport *models.Passport) error {
	return r.db.Save(passport).Error
}

