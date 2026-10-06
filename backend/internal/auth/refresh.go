package auth

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/redis/go-redis/v9"
)

var ErrRefreshNotFound = errors.New("refresh token not found")

type RefreshStore struct {
	redis *redis.Client
	ttl   time.Duration
}

func NewRefreshStore(redis *redis.Client, ttl time.Duration) *RefreshStore {
	return &RefreshStore{redis: redis, ttl: ttl}
}

func (s *RefreshStore) Create(ctx context.Context, userID uuid.UUID) (string, error) {
	token, err := randomToken()
	if err != nil {
		return "", err
	}
	key := refreshKey(token)
	if err := s.redis.Set(ctx, key, userID.String(), s.ttl).Err(); err != nil {
		return "", fmt.Errorf("store refresh token: %w", err)
	}
	return token, nil
}

func (s *RefreshStore) GetUser(ctx context.Context, token string) (uuid.UUID, error) {
	val, err := s.redis.Get(ctx, refreshKey(token)).Result()
	if errors.Is(err, redis.Nil) {
		return uuid.Nil, ErrRefreshNotFound
	}
	if err != nil {
		return uuid.Nil, fmt.Errorf("get refresh token: %w", err)
	}
	userID, err := uuid.Parse(val)
	if err != nil {
		return uuid.Nil, ErrRefreshNotFound
	}
	return userID, nil
}

func (s *RefreshStore) Delete(ctx context.Context, token string) error {
	if err := s.redis.Del(ctx, refreshKey(token)).Err(); err != nil {
		return fmt.Errorf("delete refresh token: %w", err)
	}
	return nil
}

func (s *RefreshStore) Rotate(ctx context.Context, oldToken string) (string, error) {
	val, err := s.redis.GetDel(ctx, refreshKey(oldToken)).Result()
	if errors.Is(err, redis.Nil) {
		return "", ErrRefreshNotFound
	}
	if err != nil {
		return "", fmt.Errorf("consume refresh token: %w", err)
	}
	userID, err := uuid.Parse(val)
	if err != nil {
		return "", ErrRefreshNotFound
	}
	return s.Create(ctx, userID)
}

func refreshKey(token string) string {
	return "refresh:" + token
}

func randomToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", fmt.Errorf("generate random token: %w", err)
	}
	return hex.EncodeToString(buf), nil
}
