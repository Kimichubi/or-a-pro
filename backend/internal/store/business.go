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

type BusinessStore struct {
	pool *pgxpool.Pool
}

func NewBusinessStore(pool *pgxpool.Pool) *BusinessStore {
	return &BusinessStore{pool: pool}
}

func (s *BusinessStore) GetByUserID(ctx context.Context, userID uuid.UUID) (*domain.Business, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, user_id, name, logo_url, document, phone, whatsapp, email, address,
		       primary_color, secondary_color, terms_conditions, created_at, updated_at
		FROM businesses WHERE user_id = $1`, userID)
	b, err := scanBusiness(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get business: %w", err)
	}
	return b, nil
}

func (s *BusinessStore) GetByID(ctx context.Context, id uuid.UUID) (*domain.Business, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, user_id, name, logo_url, document, phone, whatsapp, email, address,
		       primary_color, secondary_color, terms_conditions, created_at, updated_at
		FROM businesses WHERE id = $1`, id)
	b, err := scanBusiness(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get business by id: %w", err)
	}
	return b, nil
}

func (s *BusinessStore) Create(ctx context.Context, userID uuid.UUID, name string) (*domain.Business, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO businesses (user_id, name)
		VALUES ($1, $2)
		RETURNING id, user_id, name, logo_url, document, phone, whatsapp, email, address,
		          primary_color, secondary_color, terms_conditions, created_at, updated_at`,
		userID, name)
	b, err := scanBusiness(row)
	if err != nil {
		return nil, fmt.Errorf("create business: %w", err)
	}
	return b, nil
}

type UpdateBusinessParams struct {
	Name             *string
	LogoURL          *string
	Document         *string
	Phone            *string
	WhatsApp         *string
	Email            *string
	Address          *string
	PrimaryColor     *string
	SecondaryColor   *string
	TermsConditions  *string
}

func (s *BusinessStore) Update(ctx context.Context, userID uuid.UUID, p UpdateBusinessParams) (*domain.Business, error) {
	row := s.pool.QueryRow(ctx, `
		UPDATE businesses SET
			name              = COALESCE($2, name),
			logo_url          = COALESCE($3, logo_url),
			document          = COALESCE($4, document),
			phone             = COALESCE($5, phone),
			whatsapp          = COALESCE($6, whatsapp),
			email             = COALESCE($7, email),
			address           = COALESCE($8, address),
			primary_color     = COALESCE($9, primary_color),
			secondary_color   = COALESCE($10, secondary_color),
			terms_conditions  = COALESCE($11, terms_conditions),
			updated_at        = now()
		WHERE user_id = $1
		RETURNING id, user_id, name, logo_url, document, phone, whatsapp, email, address,
		          primary_color, secondary_color, terms_conditions, created_at, updated_at`,
		userID, p.Name, p.LogoURL, p.Document, p.Phone, p.WhatsApp, p.Email, p.Address,
		p.PrimaryColor, p.SecondaryColor, p.TermsConditions)
	b, err := scanBusiness(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("update business: %w", err)
	}
	return b, nil
}

func scanBusiness(row rowScanner) (*domain.Business, error) {
	var b domain.Business
	err := row.Scan(
		&b.ID, &b.UserID, &b.Name, &b.LogoURL, &b.Document, &b.Phone, &b.WhatsApp,
		&b.Email, &b.Address, &b.PrimaryColor, &b.SecondaryColor, &b.TermsConditions,
		&b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &b, nil
}
