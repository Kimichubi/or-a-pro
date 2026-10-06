package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"

	"github.com/kimichubi/orcapro-back/internal/store"
)

func Admin(users *store.UserStore, adminEmail string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		if adminEmail == "" {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "admin access is not configured"})
		}

		user, err := users.GetByID(c.Context(), UserID(c))
		if err != nil || !strings.EqualFold(strings.TrimSpace(user.Email), adminEmail) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "admin access required"})
		}
		return c.Next()
	}
}
