package billing

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	"github.com/stripe/stripe-go/v87"
	"github.com/stripe/stripe-go/v87/webhook"

	"github.com/kimichubi/orcapro-back/internal/store"
)

var ErrInvalidWebhookSignature = errors.New("invalid Stripe webhook signature")

type Service struct {
	client         *stripe.Client
	store          *store.BillingStore
	webhookSecret  string
	publicBaseURL  string
	professionalID string
}

func NewService(
	apiKey string,
	webhookSecret string,
	publicBaseURL string,
	professionalPriceID string,
	billingStore *store.BillingStore,
) *Service {
	if apiKey == "" || webhookSecret == "" || professionalPriceID == "" || billingStore == nil {
		return nil
	}
	return &Service{
		client:         stripe.NewClient(apiKey),
		store:          billingStore,
		webhookSecret:  webhookSecret,
		publicBaseURL:  strings.TrimRight(publicBaseURL, "/"),
		professionalID: professionalPriceID,
	}
}

func (s *Service) CreateCustomer(ctx context.Context, userID uuid.UUID, email string) (string, error) {
	params := &stripe.CustomerCreateParams{
		Email: stripe.String(email),
		Metadata: map[string]string{
			"user_id": userID.String(),
		},
	}
	params.SetIdempotencyKey("orcapro-customer-" + userID.String())
	customer, err := s.client.V1Customers.Create(ctx, params)
	if err != nil {
		return "", fmt.Errorf("create Stripe customer: %w", err)
	}
	return customer.ID, nil
}

func (s *Service) CreateCheckout(ctx context.Context, userID uuid.UUID, customerID string, plan string, idempotencyKey string) (*stripe.CheckoutSession, error) {
	priceID := s.priceForPlan(plan)
	if priceID == "" {
		return nil, fmt.Errorf("plan is not available for checkout")
	}
	if customerID == "" {
		return nil, fmt.Errorf("Stripe customer is not linked to this account")
	}
	price, err := s.client.V1Prices.Retrieve(ctx, priceID, &stripe.PriceRetrieveParams{})
	if err != nil {
		return nil, fmt.Errorf("retrieve Stripe professional price: %w", err)
	}
	if !price.Active || price.Currency != stripe.CurrencyBRL || price.UnitAmount != 2900 ||
		price.Recurring == nil || price.Recurring.Interval != stripe.PriceRecurringIntervalMonth || price.Recurring.IntervalCount != 1 {
		return nil, fmt.Errorf("Stripe professional price must be active, BRL 29.00, recurring monthly")
	}
	userIDString := userID.String()
	metadata := map[string]string{"user_id": userIDString, "plan": plan}
	params := &stripe.CheckoutSessionCreateParams{
		Mode:              stripe.String(stripe.CheckoutSessionModeSubscription),
		SuccessURL:        stripe.String(s.publicBaseURL + "/app/assinatura?success=1&session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:         stripe.String(s.publicBaseURL + "/app/assinatura?canceled=1"),
		ClientReferenceID: stripe.String(userIDString),
		LineItems: []*stripe.CheckoutSessionCreateLineItemParams{{
			Price:    stripe.String(priceID),
			Quantity: stripe.Int64(1),
		}},
		Metadata: metadata,
		SubscriptionData: &stripe.CheckoutSessionCreateSubscriptionDataParams{
			Metadata: metadata,
		},
	}
	params.Customer = stripe.String(customerID)
	params.SetIdempotencyKey("orcapro-checkout-" + idempotencyKey)

	session, err := s.client.V1CheckoutSessions.Create(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("create Stripe Checkout session: %w", err)
	}
	if session.URL == "" {
		return nil, fmt.Errorf("Stripe Checkout session has no redirect URL")
	}
	return session, nil
}

func (s *Service) CreatePortal(ctx context.Context, customerID string) (string, error) {
	if customerID == "" {
		return "", fmt.Errorf("Stripe customer is not linked to this account")
	}
	session, err := s.client.V1BillingPortalSessions.Create(ctx, &stripe.BillingPortalSessionCreateParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(s.publicBaseURL + "/app/assinatura"),
	})
	if err != nil {
		return "", fmt.Errorf("create Stripe billing portal session: %w", err)
	}
	if session.URL == "" {
		return "", fmt.Errorf("Stripe billing portal session has no redirect URL")
	}
	return session.URL, nil
}

func (s *Service) HandleWebhook(ctx context.Context, payload []byte, signature string) error {
	event, err := webhook.ConstructEvent(payload, signature, s.webhookSecret)
	if err != nil {
		return fmt.Errorf("%w: %v", ErrInvalidWebhookSignature, err)
	}
	if event.Type != stripe.EventTypeCustomerSubscriptionCreated &&
		event.Type != stripe.EventTypeCustomerSubscriptionUpdated &&
		event.Type != stripe.EventTypeCustomerSubscriptionDeleted {
		return nil
	}

	var subscription stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &subscription); err != nil {
		return fmt.Errorf("decode Stripe subscription event: %w", err)
	}
	userID, err := uuid.Parse(subscription.Metadata["user_id"])
	if err != nil {
		return fmt.Errorf("Stripe subscription metadata has no valid user_id: %w", err)
	}
	plan := subscription.Metadata["plan"]
	if plan != "professional" {
		plan = s.planForPrice(subscription)
	}
	customerID := ""
	if subscription.Customer != nil {
		customerID = subscription.Customer.ID
	}
	priceID := ""
	if subscription.Items != nil && len(subscription.Items.Data) > 0 && subscription.Items.Data[0].Price != nil {
		priceID = subscription.Items.Data[0].Price.ID
	}
	status := string(subscription.Status)
	if event.Type == stripe.EventTypeCustomerSubscriptionDeleted {
		status = string(stripe.SubscriptionStatusCanceled)
	}
	return s.store.ApplySubscriptionEvent(
		ctx, event.ID, string(event.Type), userID, customerID, subscription.ID, priceID, status, plan, event.Created,
	)
}

func (s *Service) priceForPlan(plan string) string {
	switch plan {
	case "professional":
		return s.professionalID
	default:
		return ""
	}
}

func (s *Service) planForPrice(subscription stripe.Subscription) string {
	if subscription.Items == nil || len(subscription.Items.Data) == 0 || subscription.Items.Data[0].Price == nil {
		return "free"
	}
	switch subscription.Items.Data[0].Price.ID {
	case s.professionalID:
		return "professional"
	default:
		return "free"
	}
}
