package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const FreeQuoteLimit = 5

var ErrCheckoutInProgress = errors.New("checkout session is being created")

type BillingAccount struct {
	Plan                 string `json:"plan"`
	SubscriptionStatus   string `json:"subscriptionStatus"`
	StripeCustomerID     string `json:"-"`
	StripeSubscriptionID string `json:"-"`
	CanManage            bool   `json:"canManage"`
	BillingEnabled       bool   `json:"billingEnabled"`
	QuotesUsed           int64  `json:"quotesUsed"`
	QuotesLimit          *int64 `json:"quotesLimit"`
}

type BillingStore struct {
	pool *pgxpool.Pool
}

type CheckoutReservation struct {
	Token uuid.UUID
	URL   string
	Ready bool
}

func NewBillingStore(pool *pgxpool.Pool) *BillingStore {
	return &BillingStore{pool: pool}
}

func (s *BillingStore) GetByUserID(ctx context.Context, userID uuid.UUID) (*BillingAccount, error) {
	account := &BillingAccount{}
	err := s.pool.QueryRow(ctx, `
		SELECT u.plan, u.subscription_status, u.stripe_customer_id, u.stripe_subscription_id,
		       COALESCE(qu.quotes_created, 0)
		FROM users u
		LEFT JOIN monthly_quote_usage qu
		       ON qu.user_id = u.id AND qu.month_start = date_trunc('month', now())::date
		WHERE u.id = $1`, userID).Scan(
		&account.Plan, &account.SubscriptionStatus, &account.StripeCustomerID,
		&account.StripeSubscriptionID, &account.QuotesUsed,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get billing account: %w", err)
	}
	if account.Plan == "free" {
		limit := int64(FreeQuoteLimit)
		account.QuotesLimit = &limit
	}
	account.CanManage = account.StripeCustomerID != ""
	return account, nil
}

func (s *BillingStore) LinkStripeCustomer(ctx context.Context, userID uuid.UUID, customerID string) (string, error) {
	var linkedCustomerID string
	err := s.pool.QueryRow(ctx, `
		UPDATE users
		SET stripe_customer_id = COALESCE(NULLIF(stripe_customer_id, ''), $2)
		WHERE id = $1
		RETURNING stripe_customer_id`, userID, customerID).Scan(&linkedCustomerID)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", ErrNotFound
	}
	if err != nil {
		return "", fmt.Errorf("link Stripe customer: %w", err)
	}
	return linkedCustomerID, nil
}

func (s *BillingStore) ReserveCheckout(ctx context.Context, userID uuid.UUID) (*CheckoutReservation, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin checkout reservation: %w", err)
	}
	defer tx.Rollback(ctx)

	inserted, err := tx.Exec(ctx, `
		INSERT INTO billing_checkout_sessions (user_id, request_key, lease_expires_at)
		VALUES ($1, gen_random_uuid(), now() + interval '2 minutes')
		ON CONFLICT (user_id) DO NOTHING`, userID)
	if err != nil {
		return nil, fmt.Errorf("create checkout reservation: %w", err)
	}

	var token uuid.UUID
	var checkoutURL string
	var expiresAt *time.Time
	var leaseExpiresAt time.Time
	if err := tx.QueryRow(ctx, `
		SELECT request_key, checkout_url, expires_at, lease_expires_at
		FROM billing_checkout_sessions WHERE user_id = $1 FOR UPDATE`, userID).
		Scan(&token, &checkoutURL, &expiresAt, &leaseExpiresAt); err != nil {
		return nil, fmt.Errorf("load checkout reservation: %w", err)
	}

	if checkoutURL != "" && expiresAt != nil && expiresAt.After(time.Now()) {
		if err := tx.Commit(ctx); err != nil {
			return nil, fmt.Errorf("commit existing checkout reservation: %w", err)
		}
		return &CheckoutReservation{Token: token, URL: checkoutURL, Ready: true}, nil
	}
	if inserted.RowsAffected() == 0 && checkoutURL == "" && leaseExpiresAt.After(time.Now()) {
		return nil, ErrCheckoutInProgress
	}

	if err := tx.QueryRow(ctx, `
		UPDATE billing_checkout_sessions
		SET request_key = CASE WHEN checkout_url <> '' THEN gen_random_uuid() ELSE request_key END,
		    checkout_url = '', session_id = '', expires_at = NULL,
		    lease_expires_at = now() + interval '2 minutes'
		WHERE user_id = $1
		RETURNING request_key`, userID).Scan(&token); err != nil {
		return nil, fmt.Errorf("claim checkout reservation: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit checkout reservation: %w", err)
	}
	return &CheckoutReservation{Token: token}, nil
}

func (s *BillingStore) SaveCheckout(ctx context.Context, userID uuid.UUID, token uuid.UUID, sessionID string, checkoutURL string, expiresAt time.Time) error {
	result, err := s.pool.Exec(ctx, `
		UPDATE billing_checkout_sessions
		SET session_id = $3, checkout_url = $4, expires_at = $5, lease_expires_at = $5
		WHERE user_id = $1 AND request_key = $2`, userID, token, sessionID, checkoutURL, expiresAt)
	if err != nil {
		return fmt.Errorf("save Stripe checkout session: %w", err)
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *BillingStore) ReleaseCheckout(ctx context.Context, userID uuid.UUID, token uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `
		DELETE FROM billing_checkout_sessions WHERE user_id = $1 AND request_key = $2`, userID, token)
	if err != nil {
		return fmt.Errorf("release checkout reservation: %w", err)
	}
	return nil
}

func (s *BillingStore) ApplySubscriptionEvent(
	ctx context.Context,
	eventID string,
	eventType string,
	userID uuid.UUID,
	customerID string,
	subscriptionID string,
	priceID string,
	status string,
	plan string,
	eventCreated int64,
) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin billing event transaction: %w", err)
	}
	defer tx.Rollback(ctx)

	tag, err := tx.Exec(ctx, `
		INSERT INTO stripe_webhook_events (event_id, event_type)
		VALUES ($1, $2)
		ON CONFLICT (event_id) DO NOTHING`, eventID, eventType)
	if err != nil {
		return fmt.Errorf("record Stripe event: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil
	}

	if plan != "professional" {
		plan = "free"
	}
	if status != "active" && status != "trialing" {
		plan = "free"
	}
	result, err := tx.Exec(ctx, `
		UPDATE users
		SET stripe_customer_id = COALESCE(NULLIF($2, ''), stripe_customer_id),
		    stripe_subscription_id = COALESCE(NULLIF($3, ''), stripe_subscription_id),
		    stripe_price_id = COALESCE(NULLIF($4, ''), stripe_price_id),
		    subscription_status = $5,
		    plan = $6,
		    stripe_subscription_event_created = $7
		WHERE id = $1 AND stripe_subscription_event_created <= $7`,
		userID, customerID, subscriptionID, priceID, status, plan, eventCreated)
	if err != nil {
		return fmt.Errorf("update subscription from Stripe event: %w", err)
	}
	if result.RowsAffected() == 0 {
		var exists bool
		if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM users WHERE id = $1)`, userID).Scan(&exists); err != nil {
			return fmt.Errorf("check user for Stripe event: %w", err)
		}
		if !exists {
			return ErrNotFound
		}
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit stale Stripe event: %w", err)
		}
		return nil
	}
	if _, err := tx.Exec(ctx, `DELETE FROM billing_checkout_sessions WHERE user_id = $1`, userID); err != nil {
		return fmt.Errorf("clear checkout reservation after subscription update: %w", err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit Stripe event: %w", err)
	}
	return nil
}
