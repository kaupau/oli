package handlers

import (
	"bytes"
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

type AIRequest struct {
	Message    string        `json:"message" binding:"required"`
	History    []ChatMessage `json:"history"`
	SoundBanks []string      `json:"sound_banks"`
}

type ChatMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type AnthropicRequest struct {
	Model     string        `json:"model"`
	MaxTokens int           `json:"max_tokens"`
	System    string        `json:"system"`
	Messages  []ChatMessage `json:"messages"`
}

type AnthropicResponse struct {
	Content []struct {
		Text string `json:"text"`
	} `json:"content"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error"`
}

func (h *Handler) Chat(c *gin.Context) {
	var req AIRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if h.anthropicKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ANTHROPIC_API_KEY not set"})
		return
	}

	systemPrompt := h.svc.GetSystemPrompt(req.SoundBanks)

	messages := make([]ChatMessage, 0, len(req.History)+1)
	for _, m := range req.History {
		messages = append(messages, m)
	}
	messages = append(messages, ChatMessage{Role: "user", Content: req.Message})

	anthropicReq := AnthropicRequest{
		Model:     "claude-sonnet-4-20250514",
		MaxTokens: 2048,
		System:    systemPrompt,
		Messages:  messages,
	}

	body, err := json.Marshal(anthropicReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to marshal request"})
		return
	}

	httpReq, err := http.NewRequest("POST", "https://api.anthropic.com/v1/messages", bytes.NewReader(body))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create request"})
		return
	}

	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("x-api-key", h.anthropicKey)
	httpReq.Header.Set("anthropic-version", "2023-06-01")

	resp, err := http.DefaultClient.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to call Anthropic API"})
		return
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read response"})
		return
	}

	var anthropicResp AnthropicResponse
	if err := json.Unmarshal(respBody, &anthropicResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to parse response"})
		return
	}

	if anthropicResp.Error != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": anthropicResp.Error.Message})
		return
	}

	if len(anthropicResp.Content) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "empty response"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"response": anthropicResp.Content[0].Text,
	})
}
