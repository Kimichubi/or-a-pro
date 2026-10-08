package middleware

import (
	"github.com/gofiber/fiber/v2"
	"github.com/kimichubi/orcapro-back/internal/store"
)

func Professional(billingStore *store.BillingStore) fiber.Handler {
	return func(c *fiber.Ctx) error {
		account, err := billingStore.GetByUserID(c.Context(), UserID(c))
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "não foi possível verificar o plano"})
		}
		if account.Plan != "professional" {
			return c.Status(fiber.StatusPaymentRequired).JSON(fiber.Map{
				"code":  "professional_plan_required",
				"error": "este recurso requer o plano Profissional",
			})
		}
		return c.Next()
	}
}
