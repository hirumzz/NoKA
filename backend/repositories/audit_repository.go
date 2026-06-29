package repositories

import (
	"konga-backend/models"

	"gorm.io/gorm"
)

type AuditRepository interface {
	CreateLog(log *models.AuditLog) error
	GetAllSorted(limit int) ([]models.AuditLog, error)
}

type auditRepository struct {
	db *gorm.DB
}

func NewAuditRepository(db *gorm.DB) AuditRepository {
	return &auditRepository{db: db}
}

func (r *auditRepository) CreateLog(log *models.AuditLog) error {
	return r.db.Create(log).Error
}

func (r *auditRepository) GetAllSorted(limit int) ([]models.AuditLog, error) {
	var logs []models.AuditLog
	if err := r.db.Order("\"createdAt\" DESC").Limit(limit).Find(&logs).Error; err != nil {
		return nil, err
	}
	return logs, nil
}
