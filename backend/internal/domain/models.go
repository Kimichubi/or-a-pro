package domain

import (
	"time"

	"github.com/google/uuid"
)

type User struct {
	ID           uuid.UUID `json:"id"`
	Email        string    `json:"email"`
	PasswordHash string    `json:"-"`
	Name         string    `json:"name"`
	CreatedAt    time.Time `json:"createdAt"`
}

type Business struct {
	ID               uuid.UUID `json:"id"`
	UserID           uuid.UUID `json:"userId"`
	Name             string    `json:"name"`
	LogoURL          string    `json:"logoUrl"`
	Document         string    `json:"document"`
	Phone            string    `json:"phone"`
	WhatsApp         string    `json:"whatsapp"`
	Email            string    `json:"email"`
	Address          string    `json:"address"`
	PrimaryColor     string    `json:"primaryColor"`
	SecondaryColor   string    `json:"secondaryColor"`
	TermsConditions  string    `json:"termsConditions"`
	CreatedAt        time.Time `json:"createdAt"`
	UpdatedAt        time.Time `json:"updatedAt"`
}

type Customer struct {
	ID             uuid.UUID  `json:"id"`
	BusinessID     uuid.UUID  `json:"businessId"`
	Name           string     `json:"name"`
	Phone          string     `json:"phone"`
	Email          string     `json:"email"`
	Document       string     `json:"document"`
	ServiceAddress string     `json:"serviceAddress"`
	Notes          string     `json:"notes"`
	CreatedAt      time.Time  `json:"createdAt"`
}

type CatalogItem struct {
	ID            uuid.UUID `json:"id"`
	BusinessID    uuid.UUID `json:"businessId"`
	Name          string    `json:"name"`
	Description   string    `json:"description"`
	Unit          string    `json:"unit"`
	Price         float64   `json:"price"`
	EstimatedCost float64   `json:"estimatedCost"`
	Category      string    `json:"category"`
	CreatedAt     time.Time `json:"createdAt"`
}

type QuoteStatus string

const (
	QuoteStatusDraft    QuoteStatus = "draft"
	QuoteStatusSent     QuoteStatus = "sent"
	QuoteStatusViewed   QuoteStatus = "viewed"
	QuoteStatusApproved QuoteStatus = "approved"
	QuoteStatusDeclined QuoteStatus = "declined"
	QuoteStatusExpired  QuoteStatus = "expired"
)

type Quote struct {
	ID               uuid.UUID    `json:"id"`
	BusinessID       uuid.UUID    `json:"businessId"`
	CustomerID       uuid.UUID    `json:"customerId"`
	Status           QuoteStatus  `json:"status"`
	Slug             string       `json:"slug"`
	Title            string       `json:"title"`
	DiscountAmount   float64      `json:"discountAmount"`
	ExecutionDays    int          `json:"executionDays"`
	ValidityDays     int          `json:"validityDays"`
	Notes            string       `json:"notes"`
	PaymentConditions string      `json:"paymentConditions"`
	Subtotal         float64      `json:"subtotal"`
	Total            float64      `json:"total"`
	SentAt           *time.Time   `json:"sentAt"`
	ViewedAt         *time.Time   `json:"viewedAt"`
	ApprovedAt       *time.Time   `json:"approvedAt"`
	DeclinedAt       *time.Time   `json:"declinedAt"`
	ClientComment    string       `json:"clientComment"`
	CreatedAt        time.Time    `json:"createdAt"`
	UpdatedAt        time.Time    `json:"updatedAt"`
}

type QuoteItem struct {
	ID           uuid.UUID `json:"id"`
	QuoteID      uuid.UUID `json:"quoteId"`
	CatalogItemID *uuid.UUID `json:"catalogItemId"`
	Name         string    `json:"name"`
	Description  string    `json:"description"`
	Unit         string    `json:"unit"`
	Quantity     float64   `json:"quantity"`
	UnitPrice    float64   `json:"unitPrice"`
	Total        float64   `json:"total"`
}

type Reminder struct {
	ID        uuid.UUID `json:"id"`
	QuoteID   uuid.UUID `json:"quoteId"`
	Message   string    `json:"message"`
	CreatedAt time.Time `json:"createdAt"`
}

type DashboardStats struct {
	QuotesSent       int64         `json:"quotesSent"`
	QuotesApproved   int64         `json:"quotesApproved"`
	TotalApproved    float64       `json:"totalApproved"`
	AwaitingResponse int64         `json:"awaitingResponse"`
	ApprovalRate     float64       `json:"approvalRate"`
	RecentQuotes     []RecentQuote `json:"recentQuotes"`
}

type RecentQuote struct {
	ID          uuid.UUID   `json:"id"`
	Status      QuoteStatus `json:"status"`
	Customer    string      `json:"customer"`
	Title       string      `json:"title"`
	Total       float64     `json:"total"`
	CreatedAt   time.Time   `json:"createdAt"`
}

type AwaitingQuote struct {
	ID             uuid.UUID   `json:"id"`
	Slug           string      `json:"slug"`
	Title          string      `json:"title"`
	Customer       string      `json:"customer"`
	CustomerPhone  string      `json:"customerPhone"`
	Total          float64     `json:"total"`
	DaysPending    int         `json:"daysPending"`
	Status         QuoteStatus `json:"status"`
}
