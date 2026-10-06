package handlers

import (
	"errors"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/kimichubi/orcapro-back/internal/httpapi/middleware"
	"github.com/kimichubi/orcapro-back/internal/store"
)

func (h *Handlers) ListCustomers(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	search := c.Query("search", "")
	customers, err := h.Customers.List(c.Context(), business.ID, search)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list customers"})
	}
	return c.JSON(customers)
}

type customerRequest struct {
	Name           string `json:"name"`
	Phone          string `json:"phone"`
	Email          string `json:"email"`
	Document       string `json:"document"`
	ServiceAddress string `json:"serviceAddress"`
	Notes          string `json:"notes"`
}

func (h *Handlers) CreateCustomer(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	var req customerRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "name is required"})
	}

	customer, err := h.Customers.Create(c.Context(), store.CreateCustomerParams{
		BusinessID:     business.ID,
		Name:           req.Name,
		Phone:          req.Phone,
		Email:          req.Email,
		Document:       req.Document,
		ServiceAddress: req.ServiceAddress,
		Notes:          req.Notes,
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create customer"})
	}
	return c.Status(fiber.StatusCreated).JSON(customer)
}

func (h *Handlers) GetCustomer(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	customer, err := h.Customers.GetByID(c.Context(), business.ID, id)
	if errors.Is(err, store.ErrNotFound) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "customer not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load customer"})
	}
	return c.JSON(customer)
}

func (h *Handlers) UpdateCustomer(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	var req customerRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	customer, err := h.Customers.Update(c.Context(), business.ID, id, store.UpdateCustomerParams{
		Name:           &req.Name,
		Phone:          &req.Phone,
		Email:          &req.Email,
		Document:       &req.Document,
		ServiceAddress: &req.ServiceAddress,
		Notes:          &req.Notes,
	})
	if errors.Is(err, store.ErrNotFound) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "customer not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update customer"})
	}
	return c.JSON(customer)
}

func (h *Handlers) DeleteCustomer(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	if err := h.Customers.Delete(c.Context(), business.ID, id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete customer"})
	}
	return c.JSON(fiber.Map{"ok": true})
}
