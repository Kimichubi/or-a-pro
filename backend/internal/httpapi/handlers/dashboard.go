package handlers

import (
	"github.com/gofiber/fiber/v2"

	"github.com/kimichubi/orcapro-back/internal/httpapi/middleware"
)

func (h *Handlers) GetDashboard(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	stats, err := h.Dashboard.Stats(c.Context(), business.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load dashboard"})
	}
	return c.JSON(stats)
}
