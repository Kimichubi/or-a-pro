package handlers

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/kimichubi/orcapro-back/internal/store"
)

func (h *Handlers) AdminOverview(c *fiber.Ctx) error {
	stats, err := h.Admin.Overview(c.Context())
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load overview"})
	}
	return c.JSON(stats)
}

func (h *Handlers) AdminListBusinesses(c *fiber.Ctx) error {
	items, err := h.Admin.ListBusinesses(c.Context(), strings.TrimSpace(c.Query("search")))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list businesses"})
	}
	return c.JSON(items)
}

func (h *Handlers) AdminListCustomers(c *fiber.Ctx) error {
	var businessID *uuid.UUID
	if raw := strings.TrimSpace(c.Query("businessId")); raw != "" {
		parsed, err := uuid.Parse(raw)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid business id"})
		}
		businessID = &parsed
	}
	items, err := h.Admin.ListCustomers(c.Context(), strings.TrimSpace(c.Query("search")), businessID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list customers"})
	}
	return c.JSON(items)
}

func (h *Handlers) AdminUpdateCustomer(c *fiber.Ctx) error {
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	var req customerRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if strings.TrimSpace(req.Name) == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}
	item, err := h.Admin.UpdateCustomer(c.Context(), id, store.AdminCustomerUpdate{
		Name: strings.TrimSpace(req.Name), Phone: strings.TrimSpace(req.Phone),
		Email: strings.TrimSpace(req.Email), Document: strings.TrimSpace(req.Document),
		ServiceAddress: strings.TrimSpace(req.ServiceAddress), Notes: strings.TrimSpace(req.Notes),
	})
	if errors.Is(err, store.ErrNotFound) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "customer not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update customer"})
	}
	return c.JSON(item)
}
