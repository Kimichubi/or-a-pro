package store

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kimichubi/orcapro-back/internal/domain"
)

type DashboardStore struct {
	pool *pgxpool.Pool
}

func NewDashboardStore(pool *pgxpool.Pool) *DashboardStore {
	return &DashboardStore{pool: pool}
}

func (s *DashboardStore) Stats(ctx context.Context, businessID uuid.UUID) (*domain.DashboardStats, error) {
	stats := &domain.DashboardStats{RecentQuotes: make([]domain.RecentQuote, 0)}

	err := s.pool.QueryRow(ctx, `
		SELECT
			COUNT(*) FILTER (WHERE status IN ('sent','viewed','approved','declined','expired')) AS sent,
			COUNT(*) FILTER (WHERE status = 'approved') AS approved,
			COALESCE(SUM(total) FILTER (WHERE status = 'approved'), 0) AS total_approved,
			COUNT(*) FILTER (WHERE status IN ('sent','viewed')) AS awaiting
		FROM quotes WHERE business_id = $1`, businessID).
		Scan(&stats.QuotesSent, &stats.QuotesApproved, &stats.TotalApproved, &stats.AwaitingResponse)
	if err != nil {
		return nil, fmt.Errorf("dashboard stats: %w", err)
	}

	if stats.QuotesSent > 0 {
		stats.ApprovalRate = float64(stats.QuotesApproved) / float64(stats.QuotesSent) * 100
	}

	rows, err := s.pool.Query(ctx, `
		SELECT q.id, q.status, c.name AS customer_name, q.title, q.total, q.created_at
		FROM quotes q
		JOIN customers c ON c.id = q.customer_id
		WHERE q.business_id = $1
		ORDER BY q.created_at DESC
		LIMIT 8`, businessID)
	if err != nil {
		return nil, fmt.Errorf("dashboard recent: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var r domain.RecentQuote
		if err := rows.Scan(&r.ID, &r.Status, &r.Customer, &r.Title, &r.Total, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan recent quote: %w", err)
		}
		stats.RecentQuotes = append(stats.RecentQuotes, r)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate recent quotes: %w", err)
	}

	return stats, nil
}
