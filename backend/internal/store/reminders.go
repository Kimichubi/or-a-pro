package store

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kimichubi/orcapro-back/internal/domain"
)

type ReminderStore struct {
	pool *pgxpool.Pool
}

func NewReminderStore(pool *pgxpool.Pool) *ReminderStore {
	return &ReminderStore{pool: pool}
}

func (s *ReminderStore) Create(ctx context.Context, quoteID uuid.UUID, message string) (*domain.Reminder, error) {
	var r domain.Reminder
	err := s.pool.QueryRow(ctx, `
		INSERT INTO reminders (quote_id, message)
		VALUES ($1, $2)
		RETURNING id, quote_id, message, created_at`, quoteID, message).
		Scan(&r.ID, &r.QuoteID, &r.Message, &r.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create reminder: %w", err)
	}
	return &r, nil
}

func (s *ReminderStore) List(ctx context.Context, quoteID uuid.UUID) ([]domain.Reminder, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, quote_id, message, created_at FROM reminders WHERE quote_id = $1 ORDER BY created_at DESC`, quoteID)
	if err != nil {
		return nil, fmt.Errorf("list reminders: %w", err)
	}
	defer rows.Close()

	reminders := []domain.Reminder{}
	for rows.Next() {
		var r domain.Reminder
		if err := rows.Scan(&r.ID, &r.QuoteID, &r.Message, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan reminder: %w", err)
		}
		reminders = append(reminders, r)
	}
	return reminders, rows.Err()
}
