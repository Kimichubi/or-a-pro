-- +goose Up
-- +goose StatementBegin
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name          TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE businesses (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name              TEXT NOT NULL DEFAULT '',
    logo_url          TEXT NOT NULL DEFAULT '',
    document          TEXT NOT NULL DEFAULT '',
    phone             TEXT NOT NULL DEFAULT '',
    whatsapp          TEXT NOT NULL DEFAULT '',
    email             TEXT NOT NULL DEFAULT '',
    address           TEXT NOT NULL DEFAULT '',
    primary_color     TEXT NOT NULL DEFAULT '#2563EB',
    secondary_color   TEXT NOT NULL DEFAULT '#F97316',
    terms_conditions  TEXT NOT NULL DEFAULT '',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX idx_businesses_user ON businesses(user_id);

CREATE TABLE customers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id     UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    phone           TEXT NOT NULL DEFAULT '',
    email           TEXT NOT NULL DEFAULT '',
    document        TEXT NOT NULL DEFAULT '',
    service_address TEXT NOT NULL DEFAULT '',
    notes           TEXT NOT NULL DEFAULT '',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_customers_business ON customers(business_id);

CREATE TABLE catalog_items (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id    UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    name           TEXT NOT NULL,
    description    TEXT NOT NULL DEFAULT '',
    unit           TEXT NOT NULL DEFAULT 'un',
    price          NUMERIC(12,2) NOT NULL DEFAULT 0,
    estimated_cost NUMERIC(12,2) NOT NULL DEFAULT 0,
    category       TEXT NOT NULL DEFAULT '',
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_catalog_business ON catalog_items(business_id);

CREATE TABLE quotes (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id        UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    customer_id        UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    status             TEXT NOT NULL DEFAULT 'draft'
                       CHECK (status IN ('draft','sent','viewed','approved','declined','expired')),
    slug               TEXT NOT NULL UNIQUE,
    title              TEXT NOT NULL DEFAULT 'Orçamento',
    discount_amount    NUMERIC(12,2) NOT NULL DEFAULT 0,
    execution_days     INTEGER NOT NULL DEFAULT 0,
    validity_days      INTEGER NOT NULL DEFAULT 7,
    notes              TEXT NOT NULL DEFAULT '',
    payment_conditions TEXT NOT NULL DEFAULT '',
    subtotal           NUMERIC(12,2) NOT NULL DEFAULT 0,
    total              NUMERIC(12,2) NOT NULL DEFAULT 0,
    sent_at            TIMESTAMPTZ,
    viewed_at          TIMESTAMPTZ,
    approved_at        TIMESTAMPTZ,
    declined_at        TIMESTAMPTZ,
    client_comment     TEXT NOT NULL DEFAULT '',
    created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quotes_business ON quotes(business_id);
CREATE INDEX idx_quotes_status ON quotes(status);

CREATE TABLE quote_items (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id        UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    catalog_item_id UUID REFERENCES catalog_items(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '',
    unit            TEXT NOT NULL DEFAULT 'un',
    quantity        NUMERIC(12,2) NOT NULL DEFAULT 1,
    unit_price      NUMERIC(12,2) NOT NULL DEFAULT 0,
    total           NUMERIC(12,2) NOT NULL DEFAULT 0
);

CREATE INDEX idx_quote_items_quote ON quote_items(quote_id);

CREATE TABLE reminders (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id   UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
    message    TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_reminders_quote ON reminders(quote_id);

CREATE TABLE password_reset_tokens (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_password_reset_token ON password_reset_tokens(token);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS password_reset_tokens;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS quote_items;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS catalog_items;
DROP TABLE IF EXISTS customers;
DROP TABLE IF EXISTS businesses;
DROP TABLE IF EXISTS users;
-- +goose StatementEnd
