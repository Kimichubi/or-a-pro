package handlers

import (
	"errors"
	"fmt"
	"log"
	"math"
	"path/filepath"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/kimichubi/orcapro-back/internal/domain"
	"github.com/kimichubi/orcapro-back/internal/httpapi/middleware"
	"github.com/kimichubi/orcapro-back/internal/pdf"
	"github.com/kimichubi/orcapro-back/internal/store"
)

type quoteItemRequest struct {
	CatalogItemID *string `json:"catalogItemId"`
	Name          string  `json:"name"`
	Description   string  `json:"description"`
	Unit          string  `json:"unit"`
	Quantity      float64 `json:"quantity"`
	UnitPrice     float64 `json:"unitPrice"`
}

type quoteRequest struct {
	CustomerID        string             `json:"customerId"`
	Title             string             `json:"title"`
	DiscountAmount    float64            `json:"discountAmount"`
	ExecutionDays     int                `json:"executionDays"`
	ValidityDays      int                `json:"validityDays"`
	Notes             string             `json:"notes"`
	PaymentConditions string             `json:"paymentConditions"`
	Items             []quoteItemRequest `json:"items"`
}

const maximumStoredAmount = 9999999999.99

func roundMoney(amount float64) float64 {
	return math.Round(amount*100+1e-8) / 100
}

func validMoneyAmount(amount float64) bool {
	return !math.IsNaN(amount) && !math.IsInf(amount, 0) && amount >= 0 && roundMoney(amount) <= maximumStoredAmount
}

func (h *Handlers) ListQuotes(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	status := c.Query("status", "")
	quotes, err := h.Quotes.List(c.Context(), business.ID, status)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list quotes"})
	}
	return c.JSON(quotes)
}

func (h *Handlers) CreateQuote(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	var req quoteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.CustomerID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "customerId is required"})
	}
	customerID, err := uuid.Parse(req.CustomerID)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid customerId"})
	}
	if _, err := h.Customers.GetByID(c.Context(), business.ID, customerID); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "customer does not belong to this business"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to validate customer"})
	}
	if len(req.Items) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "at least one item is required"})
	}
	if len(req.Items) > 100 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "a quote can contain at most 100 items"})
	}
	if !validMoneyAmount(req.DiscountAmount) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "discount must be a valid amount with at most 10 digits before cents"})
	}
	req.DiscountAmount = roundMoney(req.DiscountAmount)
	if req.ExecutionDays < 0 || req.ExecutionDays > 730 || req.ValidityDays < 0 || req.ValidityDays > 365 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "execution and validity days are outside the allowed range"})
	}
	if len(strings.TrimSpace(req.Title)) > 160 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title must be 160 characters or fewer"})
	}

	items, subtotal, err := buildItems(req.Items)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
	}
	if req.DiscountAmount > subtotal {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "discount cannot exceed the subtotal"})
	}
	if err := h.validateCatalogReferences(c, business.ID, req.Items); err != nil {
		if errors.Is(err, store.ErrNotFound) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "catalog item does not belong to this business"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to validate catalog items"})
	}
	total := subtotal - req.DiscountAmount
	if total < 0 {
		total = 0
	}
	validity := req.ValidityDays
	if validity <= 0 {
		validity = 7
	}
	title := req.Title
	if title == "" {
		title = "Orçamento"
	}

	quote, err := h.Quotes.Create(c.Context(), store.CreateQuoteParams{
		BusinessID:        business.ID,
		CustomerID:        customerID,
		Title:             title,
		DiscountAmount:    req.DiscountAmount,
		ExecutionDays:     req.ExecutionDays,
		ValidityDays:      validity,
		Notes:             req.Notes,
		PaymentConditions: req.PaymentConditions,
		Subtotal:          subtotal,
		Total:             total,
		Items:             items,
	})
	if err != nil {
		log.Printf("create quote: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create quote"})
	}
	return c.Status(fiber.StatusCreated).JSON(quote)
}

func (h *Handlers) GetQuote(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	quote, err := h.Quotes.GetByID(c.Context(), id)
	if errors.Is(err, store.ErrNotFound) || (quote != nil && quote.BusinessID != business.ID) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "quote not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load quote"})
	}
	return c.JSON(quote)
}

func (h *Handlers) UpdateQuote(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	var req quoteRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	params := store.UpdateQuoteParams{}
	if req.CustomerID != "" {
		customerID, err := uuid.Parse(req.CustomerID)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid customerId"})
		}
		if _, err := h.Customers.GetByID(c.Context(), business.ID, customerID); err != nil {
			if errors.Is(err, store.ErrNotFound) {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "customer does not belong to this business"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to validate customer"})
		}
		params.CustomerID = &customerID
	}
	if !validMoneyAmount(req.DiscountAmount) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "discount must be a valid amount with at most 10 digits before cents"})
	}
	req.DiscountAmount = roundMoney(req.DiscountAmount)
	if req.ExecutionDays < 0 || req.ExecutionDays > 730 || req.ValidityDays < 0 || req.ValidityDays > 365 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "execution and validity days are outside the allowed range"})
	}
	if len(strings.TrimSpace(req.Title)) > 160 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "title must be 160 characters or fewer"})
	}
	params.Title = &req.Title
	params.DiscountAmount = &req.DiscountAmount
	params.ExecutionDays = &req.ExecutionDays
	validity := req.ValidityDays
	if validity <= 0 {
		validity = 7
	}
	params.ValidityDays = &validity
	params.Notes = &req.Notes
	params.PaymentConditions = &req.PaymentConditions

	if len(req.Items) > 0 {
		if len(req.Items) > 100 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "a quote can contain at most 100 items"})
		}
		items, subtotal, err := buildItems(req.Items)
		if err != nil {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": err.Error()})
		}
		if req.DiscountAmount > subtotal {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "discount cannot exceed the subtotal"})
		}
		if err := h.validateCatalogReferences(c, business.ID, req.Items); err != nil {
			if errors.Is(err, store.ErrNotFound) {
				return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "catalog item does not belong to this business"})
			}
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to validate catalog items"})
		}
		total := subtotal - req.DiscountAmount
		if total < 0 {
			total = 0
		}
		params.Subtotal = &subtotal
		params.Total = &total
		params.Items = &items
	} else {
		current, err := h.Quotes.GetByID(c.Context(), id)
		if errors.Is(err, store.ErrNotFound) || (current != nil && current.BusinessID != business.ID) {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "quote not found"})
		}
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load quote"})
		}
		if req.DiscountAmount > current.Subtotal {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "discount cannot exceed the subtotal"})
		}
	}

	quote, err := h.Quotes.Update(c.Context(), business.ID, id, params)
	if errors.Is(err, store.ErrNotFound) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "quote not found"})
	}
	if err != nil {
		log.Printf("update quote: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update quote"})
	}
	return c.JSON(quote)
}

func (h *Handlers) DeleteQuote(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	if err := h.Quotes.Delete(c.Context(), business.ID, id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to delete quote"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handlers) SetQuoteStatus(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	var req struct {
		Status string `json:"status"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	status := domain.QuoteStatus(req.Status)
	if !validStatus(status) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid status"})
	}
	if err := h.Quotes.SetStatus(c.Context(), business.ID, id, status); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update status"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handlers) SendQuote(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	quote, err := h.Quotes.GetByID(c.Context(), id)
	if errors.Is(err, store.ErrNotFound) || (quote != nil && quote.BusinessID != business.ID) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "quote not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load quote"})
	}

	if err := h.Quotes.MarkSent(c.Context(), business.ID, id); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to mark as sent"})
	}

	link := h.PublicBase + "/orcamento/" + quote.Slug
	message := buildShareMessage(quote, link)

	return c.JSON(fiber.Map{
		"ok":      true,
		"slug":    quote.Slug,
		"link":    link,
		"message": message,
	})
}

func (h *Handlers) GetQuotePDF(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	quote, err := h.Quotes.GetByID(c.Context(), id)
	if errors.Is(err, store.ErrNotFound) || (quote != nil && quote.BusinessID != business.ID) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "quote not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load quote"})
	}

	logoPath := h.resolveLogoPath(quote.Business.LogoURL)
	data, err := pdf.GenerateQuote(quote, logoPath)
	if err != nil {
		log.Printf("generate pdf: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate pdf"})
	}

	filename := fmt.Sprintf("orcamento-%s.pdf", shortSlug(quote.Slug))
	c.Set("Content-Type", "application/pdf")
	c.Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, filename))
	return c.Send(data)
}

func (h *Handlers) ListAwaiting(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	quotes, err := h.Quotes.Awaiting(c.Context(), business.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to list awaiting quotes"})
	}
	return c.JSON(quotes)
}

func (h *Handlers) CreateReminder(c *fiber.Ctx) error {
	business, err := h.getBusiness(c, middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load business"})
	}
	id, err := uuid.Parse(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid id"})
	}
	quote, err := h.Quotes.GetByID(c.Context(), id)
	if errors.Is(err, store.ErrNotFound) || (quote != nil && quote.BusinessID != business.ID) {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "quote not found"})
	}
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to load quote"})
	}

	var req struct {
		Message string `json:"message"`
	}
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	message := req.Message
	if message == "" {
		message = buildFollowUpMessage(quote)
	}

	reminder, err := h.Reminders.Create(c.Context(), id, message)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create reminder"})
	}
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{
		"reminder": reminder,
		"message":  message,
	})
}

func (h *Handlers) resolveLogoPath(logoURL string) string {
	if logoURL == "" {
		return ""
	}
	if strings.HasPrefix(logoURL, "/uploads/") {
		name := filepath.Base(logoURL)
		return filepath.Join(h.UploadDir, name)
	}
	if strings.HasPrefix(logoURL, "http") {
		return ""
	}
	return logoURL
}

func buildItems(reqs []quoteItemRequest) ([]store.QuoteItemInput, float64, error) {
	if len(reqs) > 100 {
		return nil, 0, fmt.Errorf("a quote can contain at most 100 items")
	}
	items := []store.QuoteItemInput{}
	subtotal := 0.0
	for _, r := range reqs {
		r.Name = strings.TrimSpace(r.Name)
		if r.Name == "" {
			return nil, 0, fmt.Errorf("item name is required")
		}
		if len(r.Name) > 160 {
			return nil, 0, fmt.Errorf("item name must be 160 characters or fewer")
		}
		if math.IsNaN(r.Quantity) || math.IsInf(r.Quantity, 0) || r.Quantity > maximumStoredAmount {
			return nil, 0, fmt.Errorf("quantity is outside the supported range")
		}
		if !validMoneyAmount(r.UnitPrice) {
			return nil, 0, fmt.Errorf("unit price must be a valid non-negative amount")
		}
		r.Quantity = roundMoney(r.Quantity)
		r.UnitPrice = roundMoney(r.UnitPrice)
		if r.Quantity <= 0 {
			return nil, 0, fmt.Errorf("quantity must be greater than zero")
		}
		var catID *uuid.UUID
		if r.CatalogItemID != nil && *r.CatalogItemID != "" {
			id, err := uuid.Parse(*r.CatalogItemID)
			if err != nil {
				return nil, 0, fmt.Errorf("invalid catalogItemId")
			}
			catID = &id
		}
		unit := r.Unit
		if unit == "" {
			unit = "un"
		}
		items = append(items, store.QuoteItemInput{
			CatalogItemID: catID,
			Name:          r.Name,
			Description:   r.Description,
			Unit:          unit,
			Quantity:      r.Quantity,
			UnitPrice:     r.UnitPrice,
		})
		lineTotal := roundMoney(r.Quantity * r.UnitPrice)
		if !validMoneyAmount(lineTotal) {
			return nil, 0, fmt.Errorf("item total is outside the supported range")
		}
		subtotal = roundMoney(subtotal + lineTotal)
		if math.IsInf(subtotal, 0) || math.IsNaN(subtotal) {
			return nil, 0, fmt.Errorf("quote subtotal is outside the supported range")
		}
		if !validMoneyAmount(subtotal) {
			return nil, 0, fmt.Errorf("quote subtotal is outside the supported range")
		}
	}
	return items, subtotal, nil
}

func (h *Handlers) validateCatalogReferences(c *fiber.Ctx, businessID uuid.UUID, items []quoteItemRequest) error {
	for _, item := range items {
		if item.CatalogItemID == nil || *item.CatalogItemID == "" {
			continue
		}
		id, err := uuid.Parse(*item.CatalogItemID)
		if err != nil {
			return fmt.Errorf("invalid catalogItemId")
		}
		if _, err := h.Catalog.GetByID(c.Context(), businessID, id); err != nil {
			return err
		}
	}
	return nil
}

func buildShareMessage(q *store.QuoteDetail, link string) string {
	name := q.Customer.Name
	service := q.Title
	validity := time.Now().AddDate(0, 0, q.ValidityDays).Format("02/01/2006")
	msg := fmt.Sprintf("Olá, %s. Preparei seu orçamento referente a %s. Você pode visualizar os detalhes neste link: %s. O orçamento é válido até %s.",
		name, service, link, validity)
	return msg
}

func buildFollowUpMessage(q *store.QuoteDetail) string {
	return fmt.Sprintf("Olá, %s. Gostaria de saber se conseguiu analisar o orçamento enviado. Posso esclarecer alguma dúvida?", q.Customer.Name)
}

func validStatus(s domain.QuoteStatus) bool {
	switch s {
	case domain.QuoteStatusDraft, domain.QuoteStatusSent, domain.QuoteStatusViewed,
		domain.QuoteStatusApproved, domain.QuoteStatusDeclined, domain.QuoteStatusExpired:
		return true
	}
	return false
}

func shortSlug(slug string) string {
	if len(slug) > 8 {
		return slug[:8]
	}
	return slug
}
