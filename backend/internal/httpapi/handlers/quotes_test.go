package handlers

import (
	"math"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
)

func TestBuildItemsCalculatesSubtotal(t *testing.T) {
	items, subtotal, err := buildItems([]quoteItemRequest{
		{Name: "  Instalação  ", Quantity: 1.5, UnitPrice: 120},
		{Name: "Material", Quantity: 2, UnitPrice: 35.5},
	})
	if err != nil {
		t.Fatalf("buildItems returned an error: %v", err)
	}
	if len(items) != 2 {
		t.Fatalf("expected 2 items, got %d", len(items))
	}
	if items[0].Name != "Instalação" {
		t.Fatalf("expected item name to be trimmed, got %q", items[0].Name)
	}
	if subtotal != 251 {
		t.Fatalf("expected subtotal 251, got %v", subtotal)
	}
}

func TestBuildItemsRoundsToStoredPrecision(t *testing.T) {
	items, subtotal, err := buildItems([]quoteItemRequest{{Name: "Serviço", Quantity: 1.005, UnitPrice: 10.999}})
	if err != nil {
		t.Fatalf("buildItems returned an error: %v", err)
	}
	if items[0].Quantity != 1.01 || items[0].UnitPrice != 11 {
		t.Fatalf("expected quantity 1.01 and price 11, got %v and %v", items[0].Quantity, items[0].UnitPrice)
	}
	if subtotal != 11.11 {
		t.Fatalf("expected subtotal 11.11, got %v", subtotal)
	}
}

func TestValidMoneyAmount(t *testing.T) {
	if !validMoneyAmount(9999999999.99) {
		t.Fatal("expected maximum database amount to be valid")
	}
	for _, amount := range []float64{-0.01, math.NaN(), math.Inf(1), 10000000000} {
		if validMoneyAmount(amount) {
			t.Errorf("expected %v to be rejected", amount)
		}
	}
}

func TestSetRefreshCookieUsesHttpOnlyProductionCookie(t *testing.T) {
	app := fiber.New()
	handlers := &Handlers{RefreshTTL: 24 * time.Hour, SecureCookies: true}
	app.Get("/api/auth/test-cookie", func(c *fiber.Ctx) error {
		handlers.setRefreshCookie(c, "refresh-secret")
		return c.SendStatus(fiber.StatusNoContent)
	})

	request := httptest.NewRequest(http.MethodGet, "/api/auth/test-cookie", nil)
	response, err := app.Test(request)
	if err != nil {
		t.Fatalf("app.Test returned an error: %v", err)
	}
	defer response.Body.Close()

	cookie := response.Header.Get("Set-Cookie")
	for _, flag := range []string{"orcapro_refresh=refresh-secret", "path=/api/auth", "httponly", "secure", "samesite=lax", "max-age=86400"} {
		if !strings.Contains(strings.ToLower(cookie), flag) {
			t.Errorf("expected cookie to contain %q, got %q", flag, cookie)
		}
	}
}

func TestBuildItemsRejectsInvalidValues(t *testing.T) {
	tests := []struct {
		name string
		item quoteItemRequest
	}{
		{name: "empty name", item: quoteItemRequest{Quantity: 1, UnitPrice: 10}},
		{name: "zero quantity", item: quoteItemRequest{Name: "Serviço", Quantity: 0, UnitPrice: 10}},
		{name: "negative price", item: quoteItemRequest{Name: "Serviço", Quantity: 1, UnitPrice: -1}},
		{name: "infinite quantity", item: quoteItemRequest{Name: "Serviço", Quantity: math.Inf(1), UnitPrice: 1}},
		{name: "nan price", item: quoteItemRequest{Name: "Serviço", Quantity: 1, UnitPrice: math.NaN()}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if _, _, err := buildItems([]quoteItemRequest{test.item}); err == nil {
				t.Fatal("expected invalid item to be rejected")
			}
		})
	}
}

func TestBuildItemsRejectsExcessiveItemCount(t *testing.T) {
	items := make([]quoteItemRequest, 101)
	if _, _, err := buildItems(items); err == nil {
		t.Fatal("expected more than 100 items to be rejected")
	}
}
