package handlers

import (
	"bytes"
	"encoding/base64"
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
	if len(req.Data) > base64.StdEncoding.EncodedLen(maxUploadSize)+64 {
		return c.Status(fiber.StatusRequestEntityTooLarge).JSON(fiber.Map{"error": "arquivo muito grande (máx. 2MB)"})
	}
	parts := strings.SplitN(req.Data, ",", 2)
	if len(parts) != 2 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "dataURL inválido"})
	}
	var ext string
	switch parts[0] {
	case "data:image/png;base64":
		ext = ".png"
	case "data:image/jpeg;base64":
		ext = ".jpg"
	case "data:image/webp;base64":
		ext = ".webp"
	default:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "formato inválido (use PNG, JPG ou WEBP)"})
	}
	data, err := base64.StdEncoding.Strict().DecodeString(parts[1])
	if err != nil || len(data) == 0 || len(data) > maxUploadSize {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "dataURL inválido ou arquivo muito grande (máx. 2MB)"})
	}
	validImage := false
	switch ext {
	case ".png":
		validImage = bytes.HasPrefix(data, []byte{0x89, 'P', 'N', 'G', 0x0D, 0x0A, 0x1A, 0x0A})
	case ".jpg":
		validImage = bytes.HasPrefix(data, []byte{0xFF, 0xD8, 0xFF})
	case ".webp":
		validImage = len(data) >= 12 && string(data[:4]) == "RIFF" && string(data[8:12]) == "WEBP"
	}
	if !validImage {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "conteúdo não corresponde a uma imagem PNG, JPG ou WEBP"})
	}

	if err := os.MkdirAll(h.UploadDir, 0o755); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "falha ao salvar arquivo"})
	}
	filename := fmt.Sprintf("%s-%d%s", uuid.NewString(), time.Now().Unix(), ext)
	dst := filepath.Join(h.UploadDir, filename)
	if err := os.WriteFile(dst, data, 0o644); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "falha ao salvar arquivo"})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"url": "/uploads/" + filename, "filename": filename})
}
