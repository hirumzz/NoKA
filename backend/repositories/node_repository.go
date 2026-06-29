package repositories

import (
	"konga-backend/models"

	"gorm.io/gorm"
)

type NodeRepository interface {
	GetByID(id uint) (*models.KongNode, error)
	GetAll() ([]models.KongNode, error)
}

type nodeRepository struct {
	db *gorm.DB
}

func NewNodeRepository(db *gorm.DB) NodeRepository {
	return &nodeRepository{db: db}
}

func (r *nodeRepository) GetByID(id uint) (*models.KongNode, error) {
	var node models.KongNode
	if err := r.db.First(&node, id).Error; err != nil {
		return nil, err
	}
	return &node, nil
}

func (r *nodeRepository) GetAll() ([]models.KongNode, error) {
	var nodes []models.KongNode
	if err := r.db.Find(&nodes).Error; err != nil {
		return nil, err
	}
	return nodes, nil
}
