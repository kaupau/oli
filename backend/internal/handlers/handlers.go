package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"strudelvibe/internal/services"
)

type Handler struct {
	svc          *services.Service
	anthropicKey string
}

func New(svc *services.Service, anthropicKey string) *Handler {
	return &Handler{svc: svc, anthropicKey: anthropicKey}
}

func (h *Handler) RegisterRoutes(r *gin.Engine) {
	api := r.Group("/api")
	{
		api.GET("/soundbanks", h.ListSoundBanks)
		api.POST("/soundbanks", h.CreateSoundBank)
		api.POST("/soundbanks/:id/files", h.UploadSoundFile)
		api.POST("/soundbanks/:id/folder", h.UploadFolder)
		api.DELETE("/soundbanks/files/:fileID", h.DeleteSoundFile)
		api.DELETE("/soundbanks/:id", h.DeleteSoundBank)

		api.GET("/projects", h.ListProjects)
		api.POST("/projects", h.CreateProject)
		api.GET("/projects/:id", h.GetProject)
		api.PUT("/projects/:id", h.UpdateProject)
		api.DELETE("/projects/:id", h.DeleteProject)

		api.POST("/chat", h.Chat)
	}

	r.Static("/uploads", h.svc.GetUploadDir())
}

func (h *Handler) ListSoundBanks(c *gin.Context) {
	banks, err := h.svc.ListSoundBanks()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, banks)
}

func (h *Handler) CreateSoundBank(c *gin.Context) {
	var req struct {
		Name        string `json:"name" binding:"required"`
		Description string `json:"description"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	bank, err := h.svc.CreateSoundBank(req.Name, req.Description)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, bank)
}

func (h *Handler) DeleteSoundBank(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.svc.DeleteSoundBank(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *Handler) UploadSoundFile(c *gin.Context) {
	bankID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bank id"})
		return
	}

	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no file provided"})
		return
	}

	sf, err := h.svc.UploadSoundFile(bankID, file)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, sf)
}

func (h *Handler) UploadFolder(c *gin.Context) {
	bankID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid bank id"})
		return
	}

	form, err := c.MultipartForm()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid form data"})
		return
	}

	files := form.File["files"]
	if len(files) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "no files provided"})
		return
	}

	var uploaded []interface{}
	var errors []string
	for _, file := range files {
		sf, err := h.svc.UploadSoundFile(bankID, file)
		if err != nil {
			errors = append(errors, file.Filename+": "+err.Error())
			continue
		}
		uploaded = append(uploaded, sf)
	}

	c.JSON(http.StatusCreated, gin.H{
		"uploaded": uploaded,
		"count":    len(uploaded),
		"errors":   errors,
	})
}

func (h *Handler) DeleteSoundFile(c *gin.Context) {
	fileID, err := strconv.ParseInt(c.Param("fileID"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.svc.DeleteSoundFile(fileID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}

func (h *Handler) ListProjects(c *gin.Context) {
	projects, err := h.svc.ListProjects()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, projects)
}

func (h *Handler) CreateProject(c *gin.Context) {
	var req struct {
		Name string `json:"name" binding:"required"`
		Code string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	project, err := h.svc.CreateProject(req.Name, req.Code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, project)
}

func (h *Handler) GetProject(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	project, err := h.svc.GetProject(id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "project not found"})
		return
	}
	c.JSON(http.StatusOK, project)
}

func (h *Handler) UpdateProject(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req struct {
		Name string `json:"name" binding:"required"`
		Code string `json:"code"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	project, err := h.svc.UpdateProject(id, req.Name, req.Code)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, project)
}

func (h *Handler) DeleteProject(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	if err := h.svc.DeleteProject(id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "deleted"})
}
