package handlers

import (
	"log"
	"strings"

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
	containsProfessionalValues :=
		(req.LogoURL != nil && strings.TrimSpace(*req.LogoURL) != "") ||
			(req.PrimaryColor != nil && *req.PrimaryColor != "#2563EB") ||
			(req.SecondaryColor != nil && *req.SecondaryColor != "#F97316") ||
			(req.TermsConditions != nil && strings.TrimSpace(*req.TermsConditions) != "")
	if containsProfessionalValues {
		current, err := h.Business.GetByUserID(c.Context(), userID)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "não foi possível carregar o negócio"})
		}
		requestsNewProfessionalFeature :=
			(req.LogoURL != nil && strings.TrimSpace(*req.LogoURL) != "" && *req.LogoURL != current.LogoURL) ||
				(req.PrimaryColor != nil && *req.PrimaryColor != "#2563EB" && *req.PrimaryColor != current.PrimaryColor) ||
				(req.SecondaryColor != nil && *req.SecondaryColor != "#F97316" && *req.SecondaryColor != current.SecondaryColor) ||
				(req.TermsConditions != nil && strings.TrimSpace(*req.TermsConditions) != "" && *req.TermsConditions != current.TermsConditions)
		if requestsNewProfessionalFeature {
			account, err := h.BillingStore.GetByUserID(c.Context(), userID)
			if err != nil {
				return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "não foi possível verificar o plano"})
			}
			if account.Plan != "professional" {
				return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
					"code": "professional_plan_required", "error": "logo, cores personalizadas e termos exigem o plano Profissional",
				})
			}
		}
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
