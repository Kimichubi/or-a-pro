package config

import (
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port            string
	DatabaseURL     string
	RedisURL        string
	JWTSecret       string
	AccessTokenTTL  time.Duration
	RefreshTokenTTL time.Duration
	CORSOrigin      string
	PublicBaseURL   string
	UploadDir       string
	AppEnv          string
	SMTPHost        string
	SMTPPort        string
	SMTPUsername    string
	SMTPPassword    string
	SMTPFrom        string
	AdminEmail      string
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	cfg := &Config{
		Port:            getEnv("APP_PORT", "8080"),
		DatabaseURL:     getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/orcapro?sslmode=disable"),
		RedisURL:        getEnv("REDIS_URL", "localhost:6379"),
		JWTSecret:       getEnv("JWT_SECRET", "dev-secret-change-me"),
		AccessTokenTTL:  getDuration("ACCESS_TOKEN_TTL", 15*time.Minute),
		RefreshTokenTTL: getDuration("REFRESH_TOKEN_TTL", 720*time.Hour),
		CORSOrigin:      getEnv("CORS_ORIGIN", "http://localhost:5173"),
		PublicBaseURL:   getEnv("PUBLIC_BASE_URL", "http://localhost:5173"),
		UploadDir:       getEnv("UPLOAD_DIR", "./uploads"),
		AppEnv:          getEnv("APP_ENV", "development"),
		SMTPHost:        os.Getenv("SMTP_HOST"),
		SMTPPort:        getEnv("SMTP_PORT", "587"),
		SMTPUsername:    os.Getenv("SMTP_USERNAME"),
		SMTPPassword:    os.Getenv("SMTP_PASSWORD"),
		SMTPFrom:        os.Getenv("SMTP_FROM"),
		AdminEmail:      strings.ToLower(strings.TrimSpace(os.Getenv("ADMIN_EMAIL"))),
	}

	if cfg.JWTSecret == "dev-secret-change-me" && cfg.AppEnv == "production" {
		return nil, fmt.Errorf("JWT_SECRET must be set in production")
	}
	if cfg.AppEnv == "production" && (cfg.SMTPHost == "" || cfg.SMTPFrom == "") {
		return nil, fmt.Errorf("SMTP_HOST and SMTP_FROM must be set in production")
	}
	if cfg.SMTPHost != "" && cfg.SMTPFrom == "" {
		return nil, fmt.Errorf("SMTP_FROM is required when SMTP_HOST is set")
	}
	if (cfg.SMTPUsername == "") != (cfg.SMTPPassword == "") {
		return nil, fmt.Errorf("SMTP_USERNAME and SMTP_PASSWORD must be configured together")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getDuration(key string, fallback time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return fallback
}
