package handlers

import (
	"net/http"

	"konga-backend/services"

	"github.com/gin-gonic/gin"
)

type AuditHandler struct {
	auditService services.AuditService
}

func NewAuditHandler(svc services.AuditService) *AuditHandler {
	return &AuditHandler{auditService: svc}
}

func (h *AuditHandler) GetAuditLogs(c *gin.Context) {
	logs, err := h.auditService.GetRecentAuditLogs()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to fetch audit logs", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, logs)
}
