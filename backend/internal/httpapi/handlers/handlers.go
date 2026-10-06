package handlers

import (
	"strings"
	"time"

	"github.com/redis/go-redis/v9"

	"github.com/kimichubi/orcapro-back/internal/auth"
	"github.com/kimichubi/orcapro-back/internal/mailer"
	"github.com/kimichubi/orcapro-back/internal/store"
)

type Handlers struct {
	Users         *store.UserStore
	PassReset     *store.PasswordResetStore
	Business      *store.BusinessStore
	Customers     *store.CustomerStore
	Catalog       *store.CatalogStore
	Quotes        *store.QuoteStore
	Reminders     *store.ReminderStore
	Dashboard     *store.DashboardStore
	Admin         *store.AdminStore
	AdminEmail    string
	JWT           *auth.JWTManager
	Refresh       *auth.RefreshStore
	Redis         *redis.Client
	PublicBase    string
	UploadDir     string
	Mailer        mailer.Sender
	RefreshTTL    time.Duration
	SecureCookies bool
}

func (h *Handlers) IsAdmin(email string) bool {
	return h.AdminEmail != "" && strings.EqualFold(strings.TrimSpace(email), h.AdminEmail)
}

func New(
	users *store.UserStore,
	passReset *store.PasswordResetStore,
	business *store.BusinessStore,
	customers *store.CustomerStore,
	catalog *store.CatalogStore,
	quotes *store.QuoteStore,
	reminders *store.ReminderStore,
	dashboard *store.DashboardStore,
	jwt *auth.JWTManager,
	refresh *auth.RefreshStore,
	redisClient *redis.Client,
	publicBase string,
	uploadDir string,
	passwordMailer mailer.Sender,
	refreshTTL time.Duration,
	secureCookies bool,
) *Handlers {
	return &Handlers{
		Users:         users,
		PassReset:     passReset,
		Business:      business,
		Customers:     customers,
		Catalog:       catalog,
		Quotes:        quotes,
		Reminders:     reminders,
		Dashboard:     dashboard,
		JWT:           jwt,
		Refresh:       refresh,
		Redis:         redisClient,
		PublicBase:    publicBase,
		UploadDir:     uploadDir,
		Mailer:        passwordMailer,
		RefreshTTL:    refreshTTL,
		SecureCookies: secureCookies,
	}
}
