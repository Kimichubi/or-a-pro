package mailer

import (
	"fmt"
	"net/smtp"
	"strings"
)

type Sender interface {
	SendPasswordReset(to, resetURL string) error
}

type SMTP struct {
	address  string
	username string
	password string
	from     string
}

func NewSMTP(host, port, username, password, from string) *SMTP {
	if host == "" || from == "" {
		return nil
	}
	return &SMTP{
		address:  host + ":" + port,
		username: username,
		password: password,
		from:     from,
	}
}

func (s *SMTP) SendPasswordReset(to, resetURL string) error {
	if s == nil {
		return fmt.Errorf("SMTP is not configured")
	}
	message := strings.Join([]string{
		"To: " + to,
		"From: OrcaPro <" + s.from + ">",
		"Subject: Redefina sua senha do OrçaPro",
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=UTF-8",
		"",
		"Recebemos um pedido para redefinir sua senha.",
		"Use o link abaixo em até 1 hora:",
		resetURL,
		"",
		"Se você não fez este pedido, ignore esta mensagem.",
	}, "\r\n")

	var auth smtp.Auth
	if s.username != "" {
		auth = smtp.PlainAuth("", s.username, s.password, strings.Split(s.address, ":")[0])
	}
	return smtp.SendMail(s.address, auth, s.from, []string{to}, []byte(message))
}
