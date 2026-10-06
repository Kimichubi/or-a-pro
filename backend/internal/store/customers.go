package store

import (
	"context"
	"errors"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kimichubi/orcapro-back/internal/domain"
)

type CustomerStore struct {
	pool *pgxpool.Pool
}

func NewCustomerStore(pool *pgxpool.Pool) *CustomerStore {
	return &CustomerStore{pool: pool}
}

type CreateCustomerParams struct {
	BusinessID     uuid.UUID
	Name           string
	Phone          string
	Email          string
	Document       string
	ServiceAddress string
	Notes          string
}

func (s *CustomerStore) Create(ctx context.Context, p CreateCustomerParams) (*domain.Customer, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO customers (business_id, name, phone, email, document, service_address, notes)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, business_id, name, phone, email, document, service_address, notes, created_at`,
		p.BusinessID, p.Name, p.Phone, p.Email, p.Document, p.ServiceAddress, p.Notes)
	c, err := scanCustomer(row)
	if err != nil {
		return nil, fmt.Errorf("create customer: %w", err)
	}
	return c, nil
}

func (s *CustomerStore) List(ctx context.Context, businessID uuid.UUID, search string) ([]domain.Customer, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, business_id, name, phone, email, document, service_address, notes, created_at
		FROM customers
		WHERE business_id = $1
		  AND ($2 = '' OR name ILIKE '%' || $2 || '%' OR phone ILIKE '%' || $2 || '%')
		ORDER BY created_at DESC`, businessID, search)
	if err != nil {
		return nil, fmt.Errorf("list customers: %w", err)
	}
	defer rows.Close()

	customers := []domain.Customer{}
	for rows.Next() {
		c, err := scanCustomer(rows)
		if err != nil {
			return nil, fmt.Errorf("scan customer: %w", err)
		}
		customers = append(customers, *c)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate customers: %w", err)
	}
	return customers, nil
}

func (s *CustomerStore) GetByID(ctx context.Context, businessID, id uuid.UUID) (*domain.Customer, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, business_id, name, phone, email, document, service_address, notes, created_at
		FROM customers WHERE business_id = $1 AND id = $2`, businessID, id)
	c, err := scanCustomer(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get customer: %w", err)
	}
	return c, nil
}

type UpdateCustomerParams struct {
	Name           *string
	Phone          *string
	Email          *string
	Document       *string
	ServiceAddress *string
	Notes          *string
}

func (s *CustomerStore) Update(ctx context.Context, businessID, id uuid.UUID, p UpdateCustomerParams) (*domain.Customer, error) {
	row := s.pool.QueryRow(ctx, `
		UPDATE customers SET
			name            = COALESCE($3, name),
			phone           = COALESCE($4, phone),
			email           = COALESCE($5, email),
			document        = COALESCE($6, document),
			service_address = COALESCE($7, service_address),
			notes           = COALESCE($8, notes)
		WHERE business_id = $1 AND id = $2
		RETURNING id, business_id, name, phone, email, document, service_address, notes, created_at`,
		businessID, id, p.Name, p.Phone, p.Email, p.Document, p.ServiceAddress, p.Notes)
	c, err := scanCustomer(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("update customer: %w", err)
	}
	return c, nil
}

func (s *CustomerStore) Delete(ctx context.Context, businessID, id uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM customers WHERE business_id = $1 AND id = $2`, businessID, id)
	if err != nil {
		return fmt.Errorf("delete customer: %w", err)
	}
	return nil
}

func scanCustomer(row rowScanner) (*domain.Customer, error) {
	var c domain.Customer
	err := row.Scan(
		&c.ID, &c.BusinessID, &c.Name, &c.Phone, &c.Email, &c.Document,
		&c.ServiceAddress, &c.Notes, &c.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}
