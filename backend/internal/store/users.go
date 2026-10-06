package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/kimichubi/orcapro-back/internal/domain"
)

type UserStore struct {
	pool *pgxpool.Pool
}

func NewUserStore(pool *pgxpool.Pool) *UserStore {
	return &UserStore{pool: pool}
}

type CreateUserParams struct {
	Email        string
	PasswordHash string
	Name         string
}

func (s *UserStore) Create(ctx context.Context, p CreateUserParams) (*domain.User, error) {
	row := s.pool.QueryRow(ctx, `
		INSERT INTO users (email, password_hash, name)
		VALUES ($1, $2, $3)
		RETURNING id, email, password_hash, name, created_at`,
		p.Email, p.PasswordHash, p.Name)

	user, err := scanUser(row)
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if pgErr.ConstraintName == "users_email_key" {
				return nil, ErrEmailTaken
			}
		}
		return nil, fmt.Errorf("create user: %w", err)
	}
	return user, nil
}

func (s *UserStore) GetByEmail(ctx context.Context, email string) (*domain.User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, name, created_at
		FROM users WHERE email = $1`, email)
	user, err := scanUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	return user, nil
}

func (s *UserStore) GetByID(ctx context.Context, id uuid.UUID) (*domain.User, error) {
	row := s.pool.QueryRow(ctx, `
		SELECT id, email, password_hash, name, created_at
		FROM users WHERE id = $1`, id)
	user, err := scanUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	return user, nil
}

func (s *UserStore) UpdateName(ctx context.Context, id uuid.UUID, name string) (*domain.User, error) {
	row := s.pool.QueryRow(ctx, `
		UPDATE users SET name = $2 WHERE id = $1
		RETURNING id, email, password_hash, name, created_at`, id, name)
	user, err := scanUser(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("update user name: %w", err)
	}
	return user, nil
}

func (s *UserStore) UpdatePassword(ctx context.Context, id uuid.UUID, passwordHash string) error {
	_, err := s.pool.Exec(ctx, `UPDATE users SET password_hash = $2 WHERE id = $1`, id, passwordHash)
	if err != nil {
		return fmt.Errorf("update password: %w", err)
	}
	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanUser(row rowScanner) (*domain.User, error) {
	var u domain.User
	err := row.Scan(&u.ID, &u.Email, &u.PasswordHash, &u.Name, &u.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &u, nil
}

type PasswordResetStore struct {
	pool *pgxpool.Pool
}

func NewPasswordResetStore(pool *pgxpool.Pool) *PasswordResetStore {
	return &PasswordResetStore{pool: pool}
}

func (s *PasswordResetStore) Create(ctx context.Context, userID uuid.UUID, token string, expiresAt time.Time) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO password_reset_tokens (user_id, token, expires_at)
		VALUES ($1, $2, $3)`, userID, token, expiresAt)
	if err != nil {
		return fmt.Errorf("create password reset: %w", err)
	}
	return nil
}

func (s *PasswordResetStore) GetUserByToken(ctx context.Context, token string) (uuid.UUID, error) {
	var userID uuid.UUID
	var expiresAt time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT user_id, expires_at FROM password_reset_tokens WHERE token = $1`, token).
		Scan(&userID, &expiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return uuid.Nil, ErrNotFound
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("get user by reset token: %w", err)
	}
	if time.Now().After(expiresAt) {
		return uuid.Nil, ErrNotFound
	}
	return userID, nil
}

func (s *PasswordResetStore) DeleteForUser(ctx context.Context, userID uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM password_reset_tokens WHERE user_id = $1`, userID)
	if err != nil {
		return fmt.Errorf("delete password resets: %w", err)
	}
	return nil
}
