package handlers

import (
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/kimichubi/orcapro-back/internal/domain"
	"github.com/kimichubi/orcapro-back/internal/httpapi/middleware"
	"github.com/kimichubi/orcapro-back/internal/store"
)

func (h *Handlers) getBusiness(c *fiber.Ctx, userID uuid.UUID) (*domain.Business, error) {
	b, err := h.Business.GetByUserID(c.Context(), userID)
	if err == store.ErrNotFound {
		return h.Business.Create(c.Context(), userID, "Meu Negócio")
	}
	return b, err
}

func (h *Handlers) GetBusiness(c *fiber.Ctx) error {
	userID := middleware.UserID(c)
	b, err := h.getBusiness(c, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	return c.JSON(b)
}

type updateBusinessRequest struct {
	Name            *string `json:"name"`
	LogoURL         *string `json:"logoUrl"`
	Document        *string `json:"document"`
	Phone           *string `json:"phone"`
	WhatsApp        *string `json:"whatsapp"`
	Email           *string `json:"email"`
	Address         *string `json:"address"`
	PrimaryColor    *string `json:"primaryColor"`
	SecondaryColor  *string `json:"secondaryColor"`
	TermsConditions *string `json:"termsConditions"`
}

func (h *Handlers) UpdateBusiness(c *fiber.Ctx) error {
	userID := middleware.UserID(c)
	var req updateBusinessRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	b, err := h.Business.Update(c.Context(), userID, store.UpdateBusinessParams{
		Name:            req.Name,
		LogoURL:         req.LogoURL,
		Document:        req.Document,
		Phone:           req.Phone,
		WhatsApp:        req.WhatsApp,
		Email:           req.Email,
		Address:         req.Address,
		PrimaryColor:    req.PrimaryColor,
		SecondaryColor:  req.SecondaryColor,
		TermsConditions: req.TermsConditions,
	})
	if err != nil {
		log.Printf("update business: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update business"})
	}
	return c.JSON(b)
}
