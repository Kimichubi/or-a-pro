package handlers

import (
	"errors"
	"time"

	"github.com/gofiber/fiber/v2"

	"github.com/kimichubi/orcapro-back/internal/domain"
	"github.com/kimichubi/orcapro-back/internal/store"
)

type publicQuoteItem struct {
	Name        string  `json:"name"`
	Description string  `json:"description"`
	Unit        string  `json:"unit"`
	Quantity    float64 `json:"quantity"`
	UnitPrice   float64 `json:"unitPrice"`
	Total       float64 `json:"total"`
}

type publicQuoteResponse struct {
	Title             string            `json:"title"`
	DiscountAmount    float64           `json:"discountAmount"`
	ExecutionDays     int               `json:"executionDays"`
	ValidityDays      int               `json:"validityDays"`
	Notes             string            `json:"notes"`
	PaymentConditions string            `json:"paymentConditions"`
	Subtotal          float64           `json:"subtotal"`
	Total             float64           `json:"total"`
	CreatedAt         time.Time         `json:"createdAt"`
	SentAt            *time.Time        `json:"sentAt"`
	CanRespond        bool              `json:"canRespond"`
	Customer          publicQuoteClient `json:"customer"`
	Business          publicQuoteBrand  `json:"business"`
	Items             []publicQuoteItem `json:"items"`
}

type publicQuoteClient struct {
	Name string `json:"name"`
}

type publicQuoteBrand struct {
	Name            string `json:"name"`
	LogoURL         string `json:"logoUrl"`
	Phone           string `json:"phone"`
	Email           string `json:"email"`
	PrimaryColor    string `json:"primaryColor"`
	SecondaryColor  string `json:"secondaryColor"`
	TermsConditions string `json:"termsConditions"`
}

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

	items := make([]publicQuoteItem, 0, len(quote.Items))
	for _, item := range quote.Items {
		items = append(items, publicQuoteItem{
			Name: item.Name, Description: item.Description, Unit: item.Unit,
			Quantity: item.Quantity, UnitPrice: item.UnitPrice, Total: item.Total,
		})
	}
	canRespond := (quote.Status == domain.QuoteStatusSent || quote.Status == domain.QuoteStatusViewed) &&
		quote.SentAt != nil && time.Now().Before(quote.SentAt.AddDate(0, 0, quote.ValidityDays))
	return c.JSON(publicQuoteResponse{
		Title: quote.Title, DiscountAmount: quote.DiscountAmount,
		ExecutionDays: quote.ExecutionDays, ValidityDays: quote.ValidityDays,
		Notes: quote.Notes, PaymentConditions: quote.PaymentConditions,
		Subtotal: quote.Subtotal, Total: quote.Total, CreatedAt: quote.CreatedAt, SentAt: quote.SentAt, CanRespond: canRespond,
		Customer: publicQuoteClient{Name: quote.Customer.Name},
		Business: publicQuoteBrand{
			Name: quote.Business.Name, LogoURL: quote.Business.LogoURL,
			Phone: quote.Business.Phone, Email: quote.Business.Email,
			PrimaryColor: quote.Business.PrimaryColor, SecondaryColor: quote.Business.SecondaryColor,
			TermsConditions: quote.Business.TermsConditions,
		},
		Items: items,
	})
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
		if errors.Is(err, store.ErrDecisionNotOpen) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "este orçamento ainda não foi enviado ou já expirou"})
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
		if errors.Is(err, store.ErrDecisionNotOpen) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "este orçamento ainda não foi enviado ou já expirou"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "falha ao recusar orçamento"})
	}
	return c.JSON(fiber.Map{"ok": true, "status": "declined"})
}
