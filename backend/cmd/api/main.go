package main

import (
	"context"
	"log"

	"github.com/redis/go-redis/v9"

	"github.com/kimichubi/orcapro-back/internal/auth"
	"github.com/kimichubi/orcapro-back/internal/config"
	"github.com/kimichubi/orcapro-back/internal/httpapi"
	"github.com/kimichubi/orcapro-back/internal/httpapi/handlers"
	"github.com/kimichubi/orcapro-back/internal/mailer"
	"github.com/kimichubi/orcapro-back/internal/store"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("load config: %v", err)
	}

	ctx := context.Background()

	pool, err := store.NewPostgres(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	defer pool.Close()

	redisClient := redis.NewClient(&redis.Options{Addr: cfg.RedisURL})
	if err := redisClient.Ping(ctx).Err(); err != nil {
		log.Fatalf("connect redis: %v", err)
	}
	defer redisClient.Close()

	jwt := auth.NewJWTManager(cfg.JWTSecret, cfg.AccessTokenTTL)
	refresh := auth.NewRefreshStore(redisClient, cfg.RefreshTokenTTL)

	hand := handlers.New(
		store.NewUserStore(pool),
		store.NewPasswordResetStore(pool),
		store.NewBusinessStore(pool),
		store.NewCustomerStore(pool),
		store.NewCatalogStore(pool),
		store.NewQuoteStore(pool),
		store.NewReminderStore(pool),
		store.NewDashboardStore(pool),
		jwt,
		refresh,
		redisClient,
		cfg.PublicBaseURL,
		cfg.UploadDir,
		mailer.NewSMTP(cfg.SMTPHost, cfg.SMTPPort, cfg.SMTPUsername, cfg.SMTPPassword, cfg.SMTPFrom),
		cfg.RefreshTokenTTL,
		cfg.AppEnv == "production",
	)
	hand.Admin = store.NewAdminStore(pool)
	hand.AdminEmail = cfg.AdminEmail

	server := httpapi.New(cfg.CORSOrigin, hand, jwt, cfg.UploadDir)
	log.Printf("orcapro-api listening on :%s", cfg.Port)
	if err := server.Listen(cfg.Port); err != nil {
		log.Fatalf("server error: %v", err)
	}
}
