package middleware

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/kimichubi/orcapro-back/internal/auth"
)

const ctxUserID = "userID"

func Auth(jwt *auth.JWTManager) fiber.Handler {
	return func(c *fiber.Ctx) error {
		header := c.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing bearer token"})
		}

		token := strings.TrimPrefix(header, "Bearer ")
		userID, err := jwt.Parse(token)
		if err != nil {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid or expired token"})
		}

		c.Locals(ctxUserID, userID)
		return c.Next()
	}
}

func UserID(c *fiber.Ctx) uuid.UUID {
	id, _ := c.Locals(ctxUserID).(uuid.UUID)
	return id
}
