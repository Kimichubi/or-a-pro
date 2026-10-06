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

type CatalogStore struct {
	pool *pgxpool.Pool
}

func NewCatalogStore(pool *pgxpool.Pool) *CatalogStore {
	return &CatalogStore{pool: pool}
}

type CreateCatalogItemParams struct {
	BusinessID    uuid.UUID
	Name          string
	Description   string
	Unit          string
	Price         float64
	EstimatedCost float64
	Category      string
}

func (s *CatalogStore) Create(ctx context.Context, p CreateCatalogItemParams) (*domain.CatalogItem, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO catalog_items (business_id, name, description, unit, price, estimated_cost, category)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, business_id, name, description, unit, price, estimated_cost, category, created_at`,
		p.BusinessID, p.Name, p.Description, p.Unit, p.Price, p.EstimatedCost, p.Category)
	item, err := scanCatalogItem(row)
	if err != nil {
		return nil, fmt.Errorf("create catalog item: %w", err)
	}
	return item, nil
}

func (s *CatalogStore) List(ctx context.Context, businessID uuid.UUID, search string) ([]domain.CatalogItem, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, business_id, name, description, unit, price, estimated_cost, category, created_at
		FROM catalog_items
		WHERE business_id = $1
		  AND ($2 = '' OR name ILIKE '%' || $2 || '%' OR category ILIKE '%' || $2 || '%')
		ORDER BY created_at DESC`, businessID, search)
	if err != nil {
		return nil, fmt.Errorf("list catalog: %w", err)
	}
	defer rows.Close()

	items := []domain.CatalogItem{}
	for rows.Next() {
		item, err := scanCatalogItem(rows)
		if err != nil {
			return nil, fmt.Errorf("scan catalog item: %w", err)
		}
		items = append(items, *item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate catalog: %w", err)
	}
	return items, nil
}

func (s *CatalogStore) GetByID(ctx context.Context, businessID, id uuid.UUID) (*domain.CatalogItem, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, business_id, name, description, unit, price, estimated_cost, category, created_at
		FROM catalog_items WHERE business_id = $1 AND id = $2`, businessID, id)
	item, err := scanCatalogItem(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get catalog item: %w", err)
	}
	return item, nil
}

type UpdateCatalogItemParams struct {
	Name          *string
	Description   *string
	Unit          *string
	Price         *float64
	EstimatedCost *float64
	Category      *string
}

func (s *CatalogStore) Update(ctx context.Context, businessID, id uuid.UUID, p UpdateCatalogItemParams) (*domain.CatalogItem, error) {
	row := s.pool.QueryRow(ctx, `
		UPDATE catalog_items SET
			name          = COALESCE($3, name),
			description   = COALESCE($4, description),
			unit          = COALESCE($5, unit),
			price         = COALESCE($6, price),
			estimated_cost = COALESCE($7, estimated_cost),
			category      = COALESCE($8, category)
		WHERE business_id = $1 AND id = $2
		RETURNING id, business_id, name, description, unit, price, estimated_cost, category, created_at`,
		businessID, id, p.Name, p.Description, p.Unit, p.Price, p.EstimatedCost, p.Category)
	item, err := scanCatalogItem(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("update catalog item: %w", err)
	}
	return item, nil
}

func (s *CatalogStore) Delete(ctx context.Context, businessID, id uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM catalog_items WHERE business_id = $1 AND id = $2`, businessID, id)
	if err != nil {
		return fmt.Errorf("delete catalog item: %w", err)
	}
	return nil
}

func scanCatalogItem(row rowScanner) (*domain.CatalogItem, error) {
	var item domain.CatalogItem
	err := row.Scan(
		&item.ID, &item.BusinessID, &item.Name, &item.Description, &item.Unit,
		&item.Price, &item.EstimatedCost, &item.Category, &item.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &item, nil
}
