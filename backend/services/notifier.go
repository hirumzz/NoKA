package services

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

var httpClient = &http.Client{
	Timeout: 10 * time.Second,
}

// SendTelegramNotification sends a notification message via Telegram Bot API
func SendTelegramNotification(botToken, chatId, topicId string, text string) error {
	if botToken == "" || chatId == "" {
		return fmt.Errorf("botToken and chatId are required")
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", botToken)

	// Attempt 1: Try sending with Markdown
	reqBody := map[string]interface{}{
		"chat_id":    chatId,
		"text":       text,
		"parse_mode": "Markdown",
	}

	if topicId != "" {
		reqBody["message_thread_id"] = topicId
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	resp, err := httpClient.Post(url, "application/json", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return fmt.Errorf("telegram request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	var tgResp struct {
		OK          bool   `json:"ok"`
		ErrorCode   int    `json:"error_code"`
		Description string `json:"description"`
	}

	if err := json.Unmarshal(respBody, &tgResp); err == nil {
		if !tgResp.OK {
			// Fallback: If Markdown entity parsing failed (e.g. unescaped brackets or underscores),
			// send as clean plain text so brackets [SECURITY ANOMALY] and quotes remain 100% intact!
			delete(reqBody, "parse_mode")
			plainBytes, _ := json.Marshal(reqBody)
			retryResp, retryErr := httpClient.Post(url, "application/json", bytes.NewBuffer(plainBytes))
			if retryErr == nil {
				defer retryResp.Body.Close()
				retryBody, _ := io.ReadAll(retryResp.Body)
				var retryTgResp struct {
					OK          bool   `json:"ok"`
					ErrorCode   int    `json:"error_code"`
					Description string `json:"description"`
				}
				if json.Unmarshal(retryBody, &retryTgResp) == nil && retryTgResp.OK {
					return nil
				}
			}
			return fmt.Errorf("telegram API error (%d): %s", tgResp.ErrorCode, tgResp.Description)
		}
	}

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("telegram returned status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// SendWhatsAppNotification sends a notification message via WhatsApp API gateway (e.g. WAHA)
func SendWhatsAppNotification(serverUrl, apiKey, recipient, session string, text string) error {
	if serverUrl == "" || recipient == "" {
		return fmt.Errorf("serverUrl and recipient are required")
	}

	targetUrl := strings.TrimRight(serverUrl, "/")
	if !strings.HasSuffix(targetUrl, "/api/sendText") && !strings.Contains(targetUrl, "/api/") {
		targetUrl = targetUrl + "/api/sendText"
	}

	if session == "" {
		session = "default"
	}

	reqBody := map[string]interface{}{
		"chatId":  recipient,
		"text":    text,
		"session": session,
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPost, targetUrl, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	if apiKey != "" {
		req.Header.Set("X-Api-Key", apiKey)
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("whatsapp request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("whatsapp API returned status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// SendWebhookNotification sends a generic HTTP webhook notification
func SendWebhookNotification(url, method string, customHeaders map[string]string, payload interface{}) error {
	if url == "" {
		return fmt.Errorf("url is required")
	}

	if method == "" {
		method = http.MethodPost
	}

	var jsonBytes []byte
	var err error
	if rawBytes, ok := payload.([]byte); ok {
		jsonBytes = rawBytes
	} else if rawStr, ok := payload.(string); ok {
		jsonBytes = []byte(rawStr)
	} else {
		jsonBytes, err = json.Marshal(payload)
		if err != nil {
			return err
		}
	}

	req, err := http.NewRequest(strings.ToUpper(method), url, bytes.NewBuffer(jsonBytes))
	if err != nil {
		return err
	}

	req.Header.Set("Content-Type", "application/json")
	for k, v := range customHeaders {
		if k != "" && v != "" {
			req.Header.Set(k, v)
		}
	}

	resp, err := httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("webhook request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("webhook returned status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// SendSlackNotification sends a notification via Slack Incoming Webhook
func SendSlackNotification(webhookUrl, channel, username string, text string) error {
	if webhookUrl == "" {
		return fmt.Errorf("webhookUrl is required")
	}

	payload := map[string]interface{}{
		"text": text,
	}
	if channel != "" {
		payload["channel"] = channel
	}
	if username != "" {
		payload["username"] = username
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := httpClient.Post(webhookUrl, "application/json", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return fmt.Errorf("slack request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("slack returned status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// SendDiscordNotification sends a notification via Discord Webhook
func SendDiscordNotification(webhookUrl, username string, text string) error {
	if webhookUrl == "" {
		return fmt.Errorf("webhookUrl is required")
	}

	payload := map[string]interface{}{
		"content": text,
	}
	if username != "" {
		payload["username"] = username
	}

	jsonBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	resp, err := httpClient.Post(webhookUrl, "application/json", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return fmt.Errorf("discord request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("discord returned status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}
