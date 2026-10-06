package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kimichubi/orcapro-back/internal/domain"
)

type QuoteStore struct {
	pool *pgxpool.Pool
}

func NewQuoteStore(pool *pgxpool.Pool) *QuoteStore {
	return &QuoteStore{pool: pool}
}

type QuoteItemInput struct {
	CatalogItemID *uuid.UUID
	Name          string
	Description   string
	Unit          string
	Quantity      float64
	UnitPrice     float64
}

type QuoteSummary struct {
	ID             uuid.UUID          `json:"id"`
	BusinessID     uuid.UUID          `json:"businessId"`
	CustomerID     uuid.UUID          `json:"customerId"`
	CustomerName   string             `json:"customerName"`
	Status         domain.QuoteStatus `json:"status"`
	Slug           string             `json:"slug"`
	Title          string             `json:"title"`
	DiscountAmount float64            `json:"discountAmount"`
	Subtotal       float64            `json:"subtotal"`
	Total          float64            `json:"total"`
	CreatedAt      time.Time          `json:"createdAt"`
	UpdatedAt      time.Time          `json:"updatedAt"`
}

type QuoteDetail struct {
	domain.Quote
	Customer  domain.Customer    `json:"customer"`
	Business  domain.Business    `json:"business"`
	Items     []domain.QuoteItem `json:"items"`
	Reminders []domain.Reminder  `json:"reminders"`
}

type CreateQuoteParams struct {
	BusinessID        uuid.UUID
	CustomerID        uuid.UUID
	Title             string
	DiscountAmount    float64
	ExecutionDays     int
	ValidityDays      int
	Notes             string
	PaymentConditions string
	Subtotal          float64
	Total             float64
	Items             []QuoteItemInput
}

func (s *QuoteStore) Create(ctx context.Context, p CreateQuoteParams) (*QuoteDetail, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	slug, err := newSlug()
	if err != nil {
		return nil, fmt.Errorf("generate slug: %w", err)
	}

	var quote domain.Quote
	err = tx.QueryRow(ctx, `
		INSERT INTO quotes (business_id, customer_id, title, discount_amount, execution_days,
		                    validity_days, notes, payment_conditions, subtotal, total, slug)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		RETURNING id, business_id, customer_id, status, slug, title, discount_amount, execution_days,
		          validity_days, notes, payment_conditions, subtotal, total, sent_at, viewed_at,
		          approved_at, declined_at, client_comment, created_at, updated_at`,
		p.BusinessID, p.CustomerID, p.Title, p.DiscountAmount, p.ExecutionDays,
		p.ValidityDays, p.Notes, p.PaymentConditions, p.Subtotal, p.Total, slug).
		Scan(&quote.ID, &quote.BusinessID, &quote.CustomerID, &quote.Status, &quote.Slug, &quote.Title,
			&quote.DiscountAmount, &quote.ExecutionDays, &quote.ValidityDays, &quote.Notes,
			&quote.PaymentConditions, &quote.Subtotal, &quote.Total, &quote.SentAt, &quote.ViewedAt,
			&quote.ApprovedAt, &quote.DeclinedAt, &quote.ClientComment, &quote.CreatedAt, &quote.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("insert quote: %w", err)
	}

	if _, err := insertItems(ctx, tx, quote.ID, p.Items); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return s.GetByID(ctx, quote.ID)
}

func insertItems(ctx context.Context, tx pgx.Tx, quoteID uuid.UUID, inputs []QuoteItemInput) ([]domain.QuoteItem, error) {
	items := []domain.QuoteItem{}
	for _, in := range inputs {
		total := in.Quantity * in.UnitPrice
		var item domain.QuoteItem
		err := tx.QueryRow(ctx, `
			INSERT INTO quote_items (quote_id, catalog_item_id, name, description, unit, quantity, unit_price, total)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			RETURNING id, quote_id, catalog_item_id, name, description, unit, quantity, unit_price, total`,
			quoteID, in.CatalogItemID, in.Name, in.Description, in.Unit, in.Quantity, in.UnitPrice, total).
			Scan(&item.ID, &item.QuoteID, &item.CatalogItemID, &item.Name, &item.Description,
				&item.Unit, &item.Quantity, &item.UnitPrice, &item.Total)
		if err != nil {
			return nil, fmt.Errorf("insert quote item: %w", err)
		}
		items = append(items, item)
	}
	return items, nil
}

func (s *QuoteStore) List(ctx context.Context, businessID uuid.UUID, status string) ([]QuoteSummary, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT q.id, q.business_id, q.customer_id, c.name AS customer_name, q.status, q.slug, q.title,
		       q.discount_amount, q.subtotal, q.total, q.created_at, q.updated_at
		FROM quotes q
		JOIN customers c ON c.id = q.customer_id
		WHERE q.business_id = $1
		  AND ($2 = '' OR q.status = $2)
		ORDER BY q.created_at DESC`, businessID, status)
	if err != nil {
		return nil, fmt.Errorf("list quotes: %w", err)
	}
	defer rows.Close()

	quotes := []QuoteSummary{}
	for rows.Next() {
		var q QuoteSummary
		err := rows.Scan(&q.ID, &q.BusinessID, &q.CustomerID, &q.CustomerName, &q.Status, &q.Slug,
			&q.Title, &q.DiscountAmount, &q.Subtotal, &q.Total, &q.CreatedAt, &q.UpdatedAt)
		if err != nil {
			return nil, fmt.Errorf("scan quote: %w", err)
		}
		quotes = append(quotes, q)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate quotes: %w", err)
	}
	return quotes, nil
}

func (s *QuoteStore) GetByID(ctx context.Context, id uuid.UUID) (*QuoteDetail, error) {
	var q domain.Quote
	err := s.pool.QueryRow(ctx, `
		SELECT id, business_id, customer_id, status, slug, title, discount_amount, execution_days,
		       validity_days, notes, payment_conditions, subtotal, total, sent_at, viewed_at,
		       approved_at, declined_at, client_comment, created_at, updated_at
		FROM quotes WHERE id = $1`, id).
		Scan(&q.ID, &q.BusinessID, &q.CustomerID, &q.Status, &q.Slug, &q.Title,
			&q.DiscountAmount, &q.ExecutionDays, &q.ValidityDays, &q.Notes,
			&q.PaymentConditions, &q.Subtotal, &q.Total, &q.SentAt, &q.ViewedAt,
			&q.ApprovedAt, &q.DeclinedAt, &q.ClientComment, &q.CreatedAt, &q.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get quote: %w", err)
	}

	detail := &QuoteDetail{Quote: q}

	customer, err := NewCustomerStore(s.pool).GetByID(ctx, q.BusinessID, q.CustomerID)
	if err != nil {
		return nil, err
	}
	detail.Customer = *customer

	business, err := NewBusinessStore(s.pool).GetByID(ctx, q.BusinessID)
	if err != nil {
		return nil, err
	}
	detail.Business = *business

	items, err := s.listItems(ctx, q.ID)
	if err != nil {
		return nil, err
	}
	detail.Items = items

	reminders, err := NewReminderStore(s.pool).List(ctx, q.ID)
	if err != nil {
		return nil, err
	}
	detail.Reminders = reminders

	return detail, nil
}

func (s *QuoteStore) listItems(ctx context.Context, quoteID uuid.UUID) ([]domain.QuoteItem, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, quote_id, catalog_item_id, name, description, unit, quantity, unit_price, total
		FROM quote_items WHERE quote_id = $1 ORDER BY created_at`, quoteID)
	if err != nil {
		return nil, fmt.Errorf("list quote items: %w", err)
	}
	defer rows.Close()

	items := []domain.QuoteItem{}
	for rows.Next() {
		var item domain.QuoteItem
		if err := rows.Scan(&item.ID, &item.QuoteID, &item.CatalogItemID, &item.Name, &item.Description,
			&item.Unit, &item.Quantity, &item.UnitPrice, &item.Total); err != nil {
			return nil, fmt.Errorf("scan quote item: %w", err)
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

type UpdateQuoteParams struct {
	CustomerID        *uuid.UUID
	Title             *string
	DiscountAmount    *float64
	ExecutionDays     *int
	ValidityDays      *int
	Notes             *string
	PaymentConditions *string
	Subtotal          *float64
	Total             *float64
	Items             *[]QuoteItemInput
}

func (s *QuoteStore) Update(ctx context.Context, businessID, id uuid.UUID, p UpdateQuoteParams) (*QuoteDetail, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	row := tx.QueryRow(ctx, `
		UPDATE quotes SET
			customer_id        = COALESCE($3, customer_id),
			title              = COALESCE($4, title),
			discount_amount    = COALESCE($5, discount_amount),
			execution_days     = COALESCE($6, execution_days),
			validity_days      = COALESCE($7, validity_days),
			notes              = COALESCE($8, notes),
			payment_conditions = COALESCE($9, payment_conditions),
			subtotal           = COALESCE($10, subtotal),
			total              = COALESCE($11, GREATEST(COALESCE($10, subtotal) - COALESCE($5, discount_amount), 0)),
			updated_at         = now()
		WHERE business_id = $1 AND id = $2
		RETURNING id, business_id, customer_id, status, slug, title, discount_amount, execution_days,
		          validity_days, notes, payment_conditions, subtotal, total, sent_at, viewed_at,
		          approved_at, declined_at, client_comment, created_at, updated_at`,
		businessID, id, p.CustomerID, p.Title, p.DiscountAmount, p.ExecutionDays,
		p.ValidityDays, p.Notes, p.PaymentConditions, p.Subtotal, p.Total)

	var quote domain.Quote
	err = row.Scan(&quote.ID, &quote.BusinessID, &quote.CustomerID, &quote.Status, &quote.Slug, &quote.Title,
		&quote.DiscountAmount, &quote.ExecutionDays, &quote.ValidityDays, &quote.Notes,
		&quote.PaymentConditions, &quote.Subtotal, &quote.Total, &quote.SentAt, &quote.ViewedAt,
		&quote.ApprovedAt, &quote.DeclinedAt, &quote.ClientComment, &quote.CreatedAt, &quote.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("update quote: %w", err)
	}

	if p.Items != nil {
		if _, err := tx.Exec(ctx, `DELETE FROM quote_items WHERE quote_id = $1`, id); err != nil {
			return nil, fmt.Errorf("delete quote items: %w", err)
		}
		if _, err := insertItems(ctx, tx, id, *p.Items); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit tx: %w", err)
	}

	return s.GetByID(ctx, id)
}

func (s *QuoteStore) Delete(ctx context.Context, businessID, id uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM quotes WHERE business_id = $1 AND id = $2`, businessID, id)
	if err != nil {
		return fmt.Errorf("delete quote: %w", err)
	}
	return nil
}

func (s *QuoteStore) GetBySlug(ctx context.Context, slug string) (*QuoteDetail, error) {
	var q domain.Quote
	err := s.pool.QueryRow(ctx, `
		SELECT id, business_id, customer_id, status, slug, title, discount_amount, execution_days,
		       validity_days, notes, payment_conditions, subtotal, total, sent_at, viewed_at,
		       approved_at, declined_at, client_comment, created_at, updated_at
		FROM quotes WHERE slug = $1`, slug).
		Scan(&q.ID, &q.BusinessID, &q.CustomerID, &q.Status, &q.Slug, &q.Title,
			&q.DiscountAmount, &q.ExecutionDays, &q.ValidityDays, &q.Notes,
			&q.PaymentConditions, &q.Subtotal, &q.Total, &q.SentAt, &q.ViewedAt,
			&q.ApprovedAt, &q.DeclinedAt, &q.ClientComment, &q.CreatedAt, &q.UpdatedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get quote by slug: %w", err)
	}

	detail := &QuoteDetail{Quote: q}
	customer, err := NewCustomerStore(s.pool).GetByID(ctx, q.BusinessID, q.CustomerID)
	if err != nil {
		return nil, err
	}
	detail.Customer = *customer
	business, err := NewBusinessStore(s.pool).GetByID(ctx, q.BusinessID)
	if err != nil {
		return nil, err
	}
	detail.Business = *business
	items, err := s.listItems(ctx, q.ID)
	if err != nil {
		return nil, err
	}
	detail.Items = items
	reminders, err := NewReminderStore(s.pool).List(ctx, q.ID)
	if err != nil {
		return nil, err
	}
	detail.Reminders = reminders
	return detail, nil
}

func (s *QuoteStore) SetStatus(ctx context.Context, businessID, id uuid.UUID, status domain.QuoteStatus) error {
	_, err := s.pool.Exec(ctx, `UPDATE quotes SET status = $3, updated_at = now() WHERE business_id = $1 AND id = $2`,
		businessID, id, status)
	if err != nil {
		return fmt.Errorf("set status: %w", err)
	}
	return nil
}

func (s *QuoteStore) MarkSent(ctx context.Context, businessID, id uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE quotes SET status = 'sent', sent_at = now(), updated_at = now()
		WHERE business_id = $1 AND id = $2 AND status = 'draft'`, businessID, id)
	if err != nil {
		return fmt.Errorf("mark sent: %w", err)
	}
	return nil
}

func (s *QuoteStore) MarkViewed(ctx context.Context, slug string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE quotes SET viewed_at = COALESCE(viewed_at, now()),
		                  status = CASE WHEN status = 'draft' THEN 'viewed' ELSE status END
		WHERE slug = $1`, slug)
	if err != nil {
		return fmt.Errorf("mark viewed: %w", err)
	}
	return nil
}

func (s *QuoteStore) ClientDecision(ctx context.Context, slug string, approved bool, comment string) error {
	var q domain.Quote
	err := s.pool.QueryRow(ctx, `
		SELECT id, business_id, status FROM quotes WHERE slug = $1`, slug).
		Scan(&q.ID, &q.BusinessID, &q.Status)
	if errors.Is(err, pgx.ErrNoRows) {
		return ErrNotFound
	}
	if err != nil {
		return fmt.Errorf("get quote for decision: %w", err)
	}
	if q.Status == domain.QuoteStatusApproved || q.Status == domain.QuoteStatusDeclined {
		return ErrAlreadyDecided
	}

	if approved {
		_, err = s.pool.Exec(ctx, `
			UPDATE quotes SET status = 'approved', approved_at = now(), declined_at = NULL, client_comment = $2, updated_at = now()
			WHERE id = $1`, q.ID, comment)
	} else {
		_, err = s.pool.Exec(ctx, `
			UPDATE quotes SET status = 'declined', declined_at = now(), approved_at = NULL, client_comment = $2, updated_at = now()
			WHERE id = $1`, q.ID, comment)
	}
	if err != nil {
		return fmt.Errorf("client decision: %w", err)
	}
	return nil
}

func (s *QuoteStore) Awaiting(ctx context.Context, businessID uuid.UUID) ([]domain.AwaitingQuote, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT q.id, q.slug, q.title, c.name AS customer_name, c.phone, q.total, q.status,
		       EXTRACT(DAY FROM now() - q.sent_at)::int AS days_pending
		FROM quotes q
		JOIN customers c ON c.id = q.customer_id
		WHERE q.business_id = $1
		  AND q.status IN ('sent', 'viewed')
		ORDER BY q.sent_at ASC`, businessID)
	if err != nil {
		return nil, fmt.Errorf("list awaiting quotes: %w", err)
	}
	defer rows.Close()

	quotes := []domain.AwaitingQuote{}
	for rows.Next() {
		var q domain.AwaitingQuote
		if err := rows.Scan(&q.ID, &q.Slug, &q.Title, &q.Customer, &q.CustomerPhone, &q.Total, &q.Status, &q.DaysPending); err != nil {
			return nil, fmt.Errorf("scan awaiting quote: %w", err)
		}
		quotes = append(quotes, q)
	}
	return quotes, rows.Err()
}

func newSlug() (string, error) {
	id, err := uuid.NewRandom()
	if err != nil {
		return "", err
	}
	return id.String(), nil
}
