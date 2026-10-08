-- +goose Up
-- +goose StatementBegin
CREATE TABLE billing_checkout_sessions (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    request_key UUID NOT NULL,
    session_id TEXT NOT NULL DEFAULT '',
    checkout_url TEXT NOT NULL DEFAULT '',
    expires_at TIMESTAMPTZ,
    lease_expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS billing_checkout_sessions;
-- +goose StatementEnd
