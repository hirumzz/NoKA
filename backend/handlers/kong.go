package handlers

import (
	"io"
	"net/http"
	"strings"

	"konga-backend/models"
	"konga-backend/services"

	"github.com/gin-gonic/gin"
)

type KongHandler struct {
	kongService services.KongProxyService
}

func NewKongHandler(svc services.KongProxyService) *KongHandler {
	return &KongHandler{kongService: svc}
}

func (h *KongHandler) ProxyKong(c *gin.Context) {
	nodeVal, exists := c.Get("kongNode")
	if !exists {
		c.JSON(http.StatusBadRequest, gin.H{"message": "No active Kong connection found"})
		return
	}
	node := nodeVal.(*models.KongNode)

	proxyPath := c.Param("proxyPath")
	method := c.Request.Method
	rawQuery := c.Request.URL.RawQuery

	var bodyBytes []byte
	if c.Request.Body != nil {
		var err error
		bodyBytes, err = io.ReadAll(c.Request.Body)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"message": "Failed to read request body"})
			return
		}
	}

	var user *models.User
	userVal, userExists := c.Get("user")
	if userExists {
		u, ok := userVal.(*models.User)
		if ok {
			user = u
		}
	}

	clientIP := c.ClientIP()

	statusCode, header, respBytes, err := h.kongService.ForwardRequest(node, method, proxyPath, rawQuery, bodyBytes, clientIP, user)
	if err != nil {
		if strings.Contains(err.Error(), "Failed to reach") {
			c.JSON(http.StatusBadGateway, gin.H{"message": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"message": err.Error()})
		}
		return
	}

	for k, vv := range header {
		if k == "Connection" || k == "Keep-Alive" || k == "Proxy-Authenticate" || k == "Transfer-Encoding" {
			continue
		}
		for _, v := range vv {
			c.Header(k, v)
		}
	}

	c.Data(statusCode, header.Get("Content-Type"), respBytes)
}
