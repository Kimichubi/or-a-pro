package handlers

import (
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"
)

const maxUploadSize = 2 << 20

func (h *Handlers) UploadLogo(c *fiber.Ctx) error {
	file, err := c.FormFile("file")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "arquivo é obrigatório"})
	}
	if file.Size > maxUploadSize {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "arquivo muito grande (máx. 2MB)"})
	}

	ext := strings.ToLower(filepath.Ext(file.Filename))
	if ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "formato inválido (use PNG, JPG ou WEBP)"})
	}

	if err := os.MkdirAll(h.UploadDir, 0o755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "falha ao salvar arquivo"})
	}

	filename := fmt.Sprintf("%s%s", uuid.NewString(), ext)
	dst := filepath.Join(h.UploadDir, filename)
	if err := c.SaveFile(file, dst); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "falha ao salvar arquivo"})
	}

	urlPath := "/uploads/" + filename
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"url": urlPath, "filename": filename})
}

func (h *Handlers) UploadFromDataURL(c *fiber.Ctx) error {
	var req struct {
		Data string `json:"data"`
	}
	if err := c.BodyParser(&req); err != nil || req.Data == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "dados inválidos"})
	}
	parts := strings.SplitN(req.Data, ",", 2)
	if len(parts) != 2 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "dataURL inválido"})
	}
	meta := parts[0]
	data := parts[1]
	ext := ".png"
	if strings.Contains(meta, "image/jpeg") {
		ext = ".jpg"
	} else if strings.Contains(meta, "image/webp") {
		ext = ".webp"
	}

	if err := os.MkdirAll(h.UploadDir, 0o755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "falha ao salvar arquivo"})
	}
	filename := fmt.Sprintf("%s-%d%s", uuid.NewString(), time.Now().Unix(), ext)
	dst := filepath.Join(h.UploadDir, filename)
	if err := os.WriteFile(dst, []byte(data), 0o644); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "falha ao salvar arquivo"})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"url": "/uploads/" + filename, "filename": filename})
}
