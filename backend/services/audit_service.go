package services

import (
	"konga-backend/models"
	"konga-backend/repositories"
)

type AuditService interface {
	GetRecentAuditLogs() ([]models.AuditLog, error)
}

type auditService struct {
	auditRepo repositories.AuditRepository
}

func NewAuditService(auditRepo repositories.AuditRepository) AuditService {
	return &auditService{auditRepo: auditRepo}
}

func (s *auditService) GetRecentAuditLogs() ([]models.AuditLog, error) {
	return s.auditRepo.GetAllSorted(100)
}
