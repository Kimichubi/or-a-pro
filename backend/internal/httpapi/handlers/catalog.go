package handlers

import (
	"errors"
	"math"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/kimichubi/orcapro-back/internal/httpapi/middleware"
	"github.com/kimichubi/orcapro-back/internal/store"
)

func (h *Handlers) ListCatalog(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	search := c.Query("search", "")
	items, err := h.Catalog.List(c.Context(), business.ID, search)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list catalog"})
	}
	return c.JSON(items)
}

type catalogItemRequest struct {
	Name          string  `json:"name"`
	Description   string  `json:"description"`
	Unit          string  `json:"unit"`
	Price         float64 `json:"price"`
	EstimatedCost float64 `json:"estimatedCost"`
	Category      string  `json:"category"`
}

func (h *Handlers) CreateCatalogItem(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	var req catalogItemRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}
	if !validMoneyAmount(req.Price) || !validMoneyAmount(req.EstimatedCost) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "price and estimated cost must be valid non-negative amounts"})
	}
	req.Price = roundMoney(req.Price)
	req.EstimatedCost = roundMoney(req.EstimatedCost)

	item, err := h.Catalog.Create(c.Context(), store.CreateCatalogItemParams{
		BusinessID:    business.ID,
		Name:          req.Name,
		Description:   req.Description,
		Unit:          req.Unit,
		Price:         req.Price,
		EstimatedCost: req.EstimatedCost,
		Category:      req.Category,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create catalog item"})
	}
	return c.Status(fiber.StatusCreated).JSON(item)
}

func (h *Handlers) UpdateCatalogItem(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	var req catalogItemRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if math.IsNaN(req.Price) || math.IsInf(req.Price, 0) || math.IsNaN(req.EstimatedCost) || math.IsInf(req.EstimatedCost, 0) ||
		!validMoneyAmount(req.Price) || !validMoneyAmount(req.EstimatedCost) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "price and estimated cost must be valid non-negative amounts"})
	}
	req.Price = roundMoney(req.Price)
	req.EstimatedCost = roundMoney(req.EstimatedCost)

	item, err := h.Catalog.Update(c.Context(), business.ID, id, store.UpdateCatalogItemParams{
		Name:          &req.Name,
		Description:   &req.Description,
		Unit:          &req.Unit,
		Price:         &req.Price,
		EstimatedCost: &req.EstimatedCost,
		Category:      &req.Category,
	})
	if errors.Is(err, store.ErrNotFound) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "catalog item not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update catalog item"})
	}
	return c.JSON(item)
}

func (h *Handlers) DeleteCatalogItem(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	if err := h.Catalog.Delete(c.Context(), business.ID, id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete catalog item"})
	}
	return c.JSON(fiber.Map{"ok": true})
}
