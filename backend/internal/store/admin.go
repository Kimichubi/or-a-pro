package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type AdminStore struct {
	pool *pgxpool.Pool
}

func NewAdminStore(pool *pgxpool.Pool) *AdminStore {
	return &AdminStore{pool: pool}
}

type AdminOverview struct {
	Accounts    int64   `json:"accounts"`
	Businesses  int64   `json:"businesses"`
	Customers   int64   `json:"customers"`
	Quotes      int64   `json:"quotes"`
	ApprovedSum float64 `json:"approvedSum"`
}

type AdminBusiness struct {
	BusinessID    uuid.UUID `json:"businessId"`
	UserID        uuid.UUID `json:"userId"`
	BusinessName  string    `json:"businessName"`
	OwnerName     string    `json:"ownerName"`
	OwnerEmail    string    `json:"ownerEmail"`
	Email         string    `json:"email"`
	Phone         string    `json:"phone"`
	CustomerCount int64     `json:"customerCount"`
	QuoteCount    int64     `json:"quoteCount"`
	CreatedAt     string    `json:"createdAt"`
}

type AdminCustomer struct {
	ID             uuid.UUID `json:"id"`
	BusinessID     uuid.UUID `json:"businessId"`
	Name           string    `json:"name"`
	Phone          string    `json:"phone"`
	Email          string    `json:"email"`
	Document       string    `json:"document"`
	ServiceAddress string    `json:"serviceAddress"`
	Notes          string    `json:"notes"`
	CreatedAt      string    `json:"createdAt"`
	BusinessName   string    `json:"businessName"`
	OwnerEmail     string    `json:"ownerEmail"`
}

type AdminCustomerUpdate struct {
	Name           string
	Phone          string
	Email          string
	Document       string
	ServiceAddress string
	Notes          string
}

func (s *AdminStore) Overview(ctx context.Context) (*AdminOverview, error) {
	stats := &AdminOverview{}
	err := s.pool.QueryRow(ctx, `
		SELECT
			(SELECT COUNT(*) FROM users),
			(SELECT COUNT(*) FROM businesses),
			(SELECT COUNT(*) FROM customers),
			(SELECT COUNT(*) FROM quotes),
			COALESCE((SELECT SUM(total) FROM quotes WHERE status = 'approved'), 0)`).Scan(&stats.Accounts, &stats.Businesses, &stats.Customers, &stats.Quotes, &stats.ApprovedSum)
	if err != nil {
		return nil, fmt.Errorf("admin overview: %w", err)
	}
	return stats, nil
}

func (s *AdminStore) ListBusinesses(ctx context.Context, search string) ([]AdminBusiness, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT b.id, u.id, b.name, u.name, u.email, b.email, b.phone,
		       COUNT(DISTINCT c.id), COUNT(DISTINCT q.id), b.created_at::text
		FROM businesses b
		JOIN users u ON u.id = b.user_id
		LEFT JOIN customers c ON c.business_id = b.id
		LEFT JOIN quotes q ON q.business_id = b.id
		WHERE $1 = '' OR b.name ILIKE '%' || $1 || '%' OR u.name ILIKE '%' || $1 || '%'
		                   OR u.email ILIKE '%' || $1 || '%' OR b.email ILIKE '%' || $1 || '%'
		GROUP BY b.id, u.id
		ORDER BY b.created_at DESC`, search)
	if err != nil {
		return nil, fmt.Errorf("list admin businesses: %w", err)
	}
	defer rows.Close()

	items := make([]AdminBusiness, 0)
	for rows.Next() {
		var item AdminBusiness
		if err := rows.Scan(
			&item.BusinessID, &item.UserID, &item.BusinessName, &item.OwnerName,
			&item.OwnerEmail, &item.Email, &item.Phone, &item.CustomerCount,
			&item.QuoteCount, &item.CreatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan admin business: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin businesses: %w", err)
	}
	return items, nil
}

func (s *AdminStore) ListCustomers(ctx context.Context, search string, businessID *uuid.UUID) ([]AdminCustomer, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT c.id, c.business_id, c.name, c.phone, c.email, c.document,
		       c.service_address, c.notes, c.created_at::text, b.name, u.email
		FROM customers c
		JOIN businesses b ON b.id = c.business_id
		JOIN users u ON u.id = b.user_id
		WHERE ($1 = '' OR c.name ILIKE '%' || $1 || '%' OR c.phone ILIKE '%' || $1 || '%'
	                     OR c.email ILIKE '%' || $1 || '%' OR b.name ILIKE '%' || $1 || '%'
	                     OR u.email ILIKE '%' || $1 || '%')
		  AND ($2::uuid IS NULL OR c.business_id = $2)
		ORDER BY c.created_at DESC`, search, businessID)
	if err != nil {
		return nil, fmt.Errorf("list admin customers: %w", err)
	}
	defer rows.Close()

	items := make([]AdminCustomer, 0)
	for rows.Next() {
		var item AdminCustomer
		if err := rows.Scan(
			&item.ID, &item.BusinessID, &item.Name, &item.Phone, &item.Email,
			&item.Document, &item.ServiceAddress, &item.Notes, &item.CreatedAt,
			&item.BusinessName, &item.OwnerEmail,
		); err != nil {
			return nil, fmt.Errorf("scan admin customer: %w", err)
		}
		items = append(items, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate admin customers: %w", err)
	}
	return items, nil
}

func (s *AdminStore) UpdateCustomer(ctx context.Context, id uuid.UUID, update AdminCustomerUpdate) (*AdminCustomer, error) {
	row := s.pool.QueryRow(ctx, `
		UPDATE customers SET name = $2, phone = $3, email = $4, document = $5,
		       service_address = $6, notes = $7
		WHERE id = $1
		RETURNING id, business_id, name, phone, email, document, service_address, notes,
		          created_at::text,
		          (SELECT name FROM businesses WHERE id = business_id),
		          (SELECT u.email FROM users u JOIN businesses b ON b.user_id = u.id WHERE b.id = business_id)`,
		id, update.Name, update.Phone, update.Email, update.Document, update.ServiceAddress, update.Notes)
	var item AdminCustomer
	err := row.Scan(
		&item.ID, &item.BusinessID, &item.Name, &item.Phone, &item.Email, &item.Document,
		&item.ServiceAddress, &item.Notes, &item.CreatedAt, &item.BusinessName, &item.OwnerEmail,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("update admin customer: %w", err)
	}
	return &item, nil
}
