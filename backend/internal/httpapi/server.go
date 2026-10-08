package httpapi

import (
	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"

	"github.com/kimichubi/orcapro-back/internal/auth"
	"github.com/kimichubi/orcapro-back/internal/httpapi/handlers"
	"github.com/kimichubi/orcapro-back/internal/httpapi/middleware"
)

type Server struct {
	app  *fiber.App
	hand *handlers.Handlers
	jwt  *auth.JWTManager
}

func New(corsOrigin string, hand *handlers.Handlers, jwt *auth.JWTManager, uploadDir string) *Server {
	app := fiber.New(fiber.Config{
		AppName:   "orcapro-api",
		BodyLimit: 3 << 20,
	})

	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins:     corsOrigin,
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: true,
	}))

	app.Static("/uploads", uploadDir)

	s := &Server{app: app, hand: hand, jwt: jwt}
	s.routes()
	return s
}

func (s *Server) routes() {
	app := s.app
	h := s.hand
	requireAuth := middleware.Auth(s.jwt)

	app.Get("/health", func(c *fiber.Ctx) error {
		return c.JSON(fiber.Map{"status": "ok"})
	})
	app.Post("/api/billing/webhook", h.StripeWebhook)

	authGroup := app.Group("/api/auth")
	authGroup.Post("/register", h.Register)
	authGroup.Post("/login", h.Login)
	authGroup.Post("/refresh", h.RefreshToken)
	authGroup.Post("/logout", h.Logout)
	authGroup.Post("/forgot-password", h.ForgotPassword)
	authGroup.Post("/reset-password", h.ResetPassword)
	authGroup.Get("/me", requireAuth, h.Me)
	authGroup.Patch("/me", requireAuth, h.UpdateMe)

	billing := app.Group("/api/billing", requireAuth)
	billing.Get("/status", h.BillingStatus)
	billing.Post("/checkout", h.BillingCheckout)
	billing.Post("/portal", h.BillingPortal)

	business := app.Group("/api/business", requireAuth)
	business.Get("/", h.GetBusiness)
	business.Put("/", h.UpdateBusiness)
	business.Post("/logo", middleware.Professional(h.BillingStore), h.UploadLogo)
	business.Post("/logo/dataurl", middleware.Professional(h.BillingStore), h.UploadFromDataURL)

	customers := app.Group("/api/customers", requireAuth)
	customers.Get("/", h.ListCustomers)
	customers.Post("/", h.CreateCustomer)
	customers.Get("/:id", h.GetCustomer)
	customers.Put("/:id", h.UpdateCustomer)
	customers.Delete("/:id", h.DeleteCustomer)

	catalog := app.Group("/api/catalog", requireAuth, middleware.Professional(h.BillingStore))
	catalog.Get("/", h.ListCatalog)
	catalog.Post("/", h.CreateCatalogItem)
	catalog.Put("/:id", h.UpdateCatalogItem)
	catalog.Delete("/:id", h.DeleteCatalogItem)

	quotes := app.Group("/api/quotes", requireAuth)
	quotes.Get("/", h.ListQuotes)
	quotes.Post("/", h.CreateQuote)
	quotes.Get("/awaiting", h.ListAwaiting)
	quotes.Get("/:id", h.GetQuote)
	quotes.Put("/:id", h.UpdateQuote)
	quotes.Delete("/:id", h.DeleteQuote)
	quotes.Post("/:id/status", h.SetQuoteStatus)
	quotes.Post("/:id/send", h.SendQuote)
	quotes.Get("/:id/pdf", h.GetQuotePDF)
	quotes.Post("/:id/reminders", middleware.Professional(h.BillingStore), h.CreateReminder)

	app.Get("/api/dashboard", requireAuth, h.GetDashboard)

	admin := app.Group("/api/admin", requireAuth, middleware.Admin(h.Users, h.AdminEmail))
	admin.Get("/overview", h.AdminOverview)
	admin.Get("/businesses", h.AdminListBusinesses)
	admin.Get("/customers", h.AdminListCustomers)
	admin.Put("/customers/:id", h.AdminUpdateCustomer)

	public := app.Group("/api/public")
	public.Get("/quotes/:slug", h.GetPublicQuote)
	public.Post("/quotes/:slug/approve", h.ApproveQuote)
	public.Post("/quotes/:slug/decline", h.DeclineQuote)
}

func (s *Server) Listen(port string) error {
	return s.app.Listen(":" + port)
}
