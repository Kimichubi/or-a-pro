package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"

	"github.com/kimichubi/orcapro-back/internal/store"
)

func (h *Handlers) GetPublicQuote(c *fiber.Ctx) error {
	slug := c.Params("slug")
	quote, err := h.Quotes.GetBySlug(c.Context(), slug)
	if errors.Is(err, store.ErrNotFound) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "orçamento não encontrado"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "falha ao carregar orçamento"})
	}

	_ = h.Quotes.MarkViewed(c.Context(), slug)

	return c.JSON(quote)
}

type decisionRequest struct {
	Comment string `json:"comment"`
}

func (h *Handlers) ApproveQuote(c *fiber.Ctx) error {
	slug := c.Params("slug")
	var req decisionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.Quotes.ClientDecision(c.Context(), slug, true, req.Comment); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "orçamento não encontrado"})
		}
		if errors.Is(err, store.ErrAlreadyDecided) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "orçamento já respondido"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "falha ao aprovar orçamento"})
	}
	return c.JSON(fiber.Map{"ok": true, "status": "approved"})
}

func (h *Handlers) DeclineQuote(c *fiber.Ctx) error {
	slug := c.Params("slug")
	var req decisionRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if err := h.Quotes.ClientDecision(c.Context(), slug, false, req.Comment); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "orçamento não encontrado"})
		}
		if errors.Is(err, store.ErrAlreadyDecided) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "orçamento já respondido"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "falha ao recusar orçamento"})
	}
	return c.JSON(fiber.Map{"ok": true, "status": "declined"})
}
