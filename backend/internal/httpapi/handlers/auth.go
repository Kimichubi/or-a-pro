package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/google/uuid"

	"github.com/kimichubi/orcapro-back/internal/auth"
	"github.com/kimichubi/orcapro-back/internal/httpapi/middleware"
	"github.com/kimichubi/orcapro-back/internal/store"
)

type registerRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type tokenResponse struct {
	AccessToken string `json:"accessToken"`
}

const refreshCookieName = "orcapro_refresh"

type forgotPasswordRequest struct {
	Email string `json:"email"`
}

type resetPasswordRequest struct {
	Token    string `json:"token"`
	Password string `json:"password"`
}

func (h *Handlers) Register(c *fiber.Ctx) error {
	var req registerRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Email == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "email and password are required"})
	}
	if len(req.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "password must be at least 8 characters"})
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash password"})
	}

	name := req.Name
	if name == "" {
		name = "Meu Negócio"
	}

	user, err := h.Users.Create(c.Context(), store.CreateUserParams{
		Email:        req.Email,
		PasswordHash: passwordHash,
		Name:         name,
	})
	if err != nil {
		if errors.Is(err, store.ErrEmailTaken) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": "email already registered"})
		}
		log.Printf("register: create user: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create user"})
	}

	if _, err := h.Business.Create(c.Context(), user.ID, name); err != nil {
		log.Printf("register: create business: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to setup business"})
	}

	resp, err := h.issueTokens(c, user.ID)
	if err != nil {
		return err
	}
	return c.Status(fiber.StatusCreated).JSON(resp)
}

func (h *Handlers) Login(c *fiber.Ctx) error {
	var req loginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}

	user, err := h.Users.GetByEmail(c.Context(), req.Email)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
	}

	ok, err := auth.VerifyPassword(user.PasswordHash, req.Password)
	if err != nil || !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
	}

	resp, err := h.issueTokens(c, user.ID)
	if err != nil {
		return err
	}
	return c.JSON(resp)
}

func (h *Handlers) RefreshToken(c *fiber.Ctx) error {
	refreshToken := c.Cookies(refreshCookieName)
	if refreshToken == "" {
		h.clearRefreshCookie(c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid refresh token"})
	}

	userID, err := h.Refresh.GetUser(c.Context(), refreshToken)
	if err != nil {
		h.clearRefreshCookie(c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid refresh token"})
	}

	newRefresh, err := h.Refresh.Rotate(c.Context(), refreshToken)
	if err != nil {
		h.clearRefreshCookie(c)
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid refresh token"})
	}

	access, _, err := h.JWT.Generate(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}

	h.setRefreshCookie(c, newRefresh)
	return c.JSON(tokenResponse{AccessToken: access})
}

func (h *Handlers) Logout(c *fiber.Ctx) error {
	refreshToken := c.Cookies(refreshCookieName)
	if refreshToken != "" {
		_ = h.Refresh.Delete(c.Context(), refreshToken)
	}
	h.clearRefreshCookie(c)
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handlers) Me(c *fiber.Ctx) error {
	userID := middleware.UserID(c)
	user, err := h.Users.GetByID(c.Context(), userID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "user not found"})
	}
	business, err := h.getBusiness(c, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "business not found"})
	}
	return c.JSON(fiber.Map{"user": user, "business": business, "isAdmin": h.IsAdmin(user.Email)})
}

type updateMeRequest struct {
	Name *string `json:"name"`
}

func (h *Handlers) UpdateMe(c *fiber.Ctx) error {
	userID := middleware.UserID(c)
	var req updateMeRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Name == nil {
		return c.JSON(fiber.Map{"ok": true})
	}
	_, err := h.Users.UpdateName(c.Context(), userID, *req.Name)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update profile"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handlers) ForgotPassword(c *fiber.Ctx) error {
	var req forgotPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Email == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "email is required"})
	}
	if h.Mailer == nil {
		return c.Status(fiber.StatusServiceUnavailable).JSON(fiber.Map{"error": "recuperação de senha indisponível; configure o envio de e-mail"})
	}

	user, err := h.Users.GetByEmail(c.Context(), req.Email)
	if err != nil {
		// Avoid leaking account existence; always return ok.
		return c.JSON(fiber.Map{"ok": true})
	}

	token, err := randomToken()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create token"})
	}
	expiresAt := time.Now().Add(1 * time.Hour)
	if err := h.PassReset.Create(c.Context(), user.ID, token, expiresAt); err != nil {
		log.Printf("forgot password: %v", err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to create reset"})
	}

	resetLink := h.PublicBase + "/reset-password?token=" + token
	if err := h.Mailer.SendPasswordReset(user.Email, resetLink); err != nil {
		_ = h.PassReset.DeleteForUser(c.Context(), user.ID)
		log.Printf("forgot password: failed to deliver reset email: %v", err)
		// Keep the same response for unknown accounts and delivery failures.
		return c.JSON(fiber.Map{"ok": true})
	}

	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handlers) ResetPassword(c *fiber.Ctx) error {
	var req resetPasswordRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid request body"})
	}
	if req.Token == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "token and password are required"})
	}
	if len(req.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "password must be at least 8 characters"})
	}

	userID, err := h.PassReset.GetUserByToken(c.Context(), req.Token)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid or expired token"})
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to hash password"})
	}
	if err := h.Users.UpdatePassword(c.Context(), userID, passwordHash); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to update password"})
	}
	_ = h.PassReset.DeleteForUser(c.Context(), userID)

	return c.JSON(fiber.Map{"ok": true})
}

func (h *Handlers) issueTokens(c *fiber.Ctx, userID uuid.UUID) (*tokenResponse, error) {
	access, _, err := h.JWT.Generate(userID)
	if err != nil {
		return nil, c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate token"})
	}
	refresh, err := h.Refresh.Create(c.Context(), userID)
	if err != nil {
		return nil, c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "failed to generate refresh token"})
	}
	h.setRefreshCookie(c, refresh)
	return &tokenResponse{AccessToken: access}, nil
}

func (h *Handlers) setRefreshCookie(c *fiber.Ctx, token string) {
	c.Cookie(&fiber.Cookie{
		Name:     refreshCookieName,
		Value:    token,
		Path:     "/api/auth",
		HTTPOnly: true,
		Secure:   h.SecureCookies,
		SameSite: "Lax",
		MaxAge:   int(h.RefreshTTL.Seconds()),
	})
}

func (h *Handlers) clearRefreshCookie(c *fiber.Ctx) {
	c.Cookie(&fiber.Cookie{
		Name:     refreshCookieName,
		Value:    "",
		Path:     "/api/auth",
		HTTPOnly: true,
		Secure:   h.SecureCookies,
		SameSite: "Lax",
		MaxAge:   -1,
	})
}

func randomToken() (string, error) {
	buf := make([]byte, 32)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return hex.EncodeToString(buf), nil
}
