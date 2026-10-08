package handlers

import (
	"errors"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/kimichubi/orcapro-back/internal/billing"
	"github.com/kimichubi/orcapro-back/internal/httpapi/middleware"
	"github.com/kimichubi/orcapro-back/internal/store"
)

func (h *Handlers) BillingStatus(c *fiber.Ctx) error {
	account, err := h.BillingStore.GetByUserID(c.Context(), middleware.UserID(c))
	if err != nil {
		log.Printf("billing status: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "não foi possível carregar a assinatura"})
	}
	account.BillingEnabled = h.Stripe != nil
	return c.JSON(account)
}

func (h *Handlers) BillingCheckout(c *fiber.Ctx) error {
	if h.Stripe == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "pagamentos ainda não foram configurados"})
	}
	var req struct {
		Plan string `json:"plan"`
	}
	if err := c.BodyParser(&req); err != nil || req.Plan != "professional" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "plano inválido"})
	}
	userID := middleware.UserID(c)
	account, err := h.BillingStore.GetByUserID(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "não foi possível carregar a assinatura"})
	}
	switch account.SubscriptionStatus {
	case "active", "trialing", "past_due", "incomplete", "unpaid", "paused":
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "esta conta já tem uma assinatura em andamento; gerencie o pagamento atual pelo portal"})
	}
	user, err := h.Users.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "conta não encontrada"})
	}
	customerID := account.StripeCustomerID
	if customerID == "" {
		customerID, err = h.Stripe.CreateCustomer(c.Context(), user.ID, user.Email)
		if err == nil {
			customerID, err = h.BillingStore.LinkStripeCustomer(c.Context(), user.ID, customerID)
		}
		if err != nil {
			log.Printf("billing customer: %v", err)
			return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "não foi possível iniciar a cobrança"})
		}
	}
	reservation, err := h.BillingStore.ReserveCheckout(c.Context(), user.ID)
	if errors.Is(err, store.ErrCheckoutInProgress) {
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "o checkout desta conta está sendo iniciado; tente novamente em instantes"})
	}
	if err != nil {
		log.Printf("billing checkout reservation: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "não foi possível reservar o checkout"})
	}
	if reservation.Ready {
		return c.JSON(fiber.Map{"url": reservation.URL})
	}
	session, err := h.Stripe.CreateCheckout(c.Context(), user.ID, customerID, req.Plan, reservation.Token.String())
	if err != nil {
		if releaseErr := h.BillingStore.ReleaseCheckout(c.Context(), user.ID, reservation.Token); releaseErr != nil {
			log.Printf("release failed checkout reservation: %v", releaseErr)
		}
		log.Printf("billing checkout: %v", err)
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "não foi possível iniciar o pagamento; confira a configuração do plano na Stripe"})
	}
	if err := h.BillingStore.SaveCheckout(c.Context(), user.ID, reservation.Token, session.ID, session.URL, time.Unix(session.ExpiresAt, 0)); err != nil {
		log.Printf("save checkout session: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "checkout criado, mas não foi possível salvar a sessão; tente novamente"})
	}
	return c.JSON(fiber.Map{"url": session.URL})
}

func (h *Handlers) BillingPortal(c *fiber.Ctx) error {
	if h.Stripe == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "pagamentos ainda não foram configurados"})
	}
	account, err := h.BillingStore.GetByUserID(c.Context(), middleware.UserID(c))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "não foi possível carregar a assinatura"})
	}
	url, err := h.Stripe.CreatePortal(c.Context(), account.StripeCustomerID)
	if err != nil {
		log.Printf("billing portal: %v", err)
		return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "não foi possível abrir o portal; confira se a Stripe já processou sua assinatura"})
	}
	return c.JSON(fiber.Map{"url": url})
}

func (h *Handlers) StripeWebhook(c *fiber.Ctx) error {
	if h.Stripe == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "pagamentos ainda não foram configurados"})
	}
	signature := strings.TrimSpace(c.Get("Stripe-Signature"))
	if signature == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "assinatura do webhook ausente"})
	}
	if err := h.Stripe.HandleWebhook(c.Context(), c.Body(), signature); err != nil {
		log.Printf("Stripe webhook: %v", err)
		if errors.Is(err, billing.ErrInvalidWebhookSignature) {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "webhook inválido"})
		}
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "falha ao processar webhook"})
	}
	return c.SendStatus(fiber.StatusOK)
}
