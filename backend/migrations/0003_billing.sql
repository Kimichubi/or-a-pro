-- +goose Up
-- +goose StatementBegin
ALTER TABLE users
    ADD COLUMN plan TEXT NOT NULL DEFAULT 'free'
        CHECK (plan IN ('free', 'professional', 'company')),
    ADD COLUMN stripe_customer_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN stripe_subscription_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN stripe_price_id TEXT NOT NULL DEFAULT '',
    ADD COLUMN subscription_status TEXT NOT NULL DEFAULT 'inactive',
    ADD COLUMN stripe_subscription_event_created BIGINT NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX idx_users_stripe_customer
    ON users (stripe_customer_id)
    WHERE stripe_customer_id <> '';

CREATE TABLE stripe_webhook_events (
    event_id TEXT PRIMARY KEY,
    event_type TEXT NOT NULL,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE monthly_quote_usage (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month_start DATE NOT NULL,
    quotes_created INTEGER NOT NULL DEFAULT 0 CHECK (quotes_created >= 0),
    PRIMARY KEY (user_id, month_start)
);

INSERT INTO monthly_quote_usage (user_id, month_start, quotes_created)
SELECT b.user_id, date_trunc('month', now())::date, COUNT(*)::integer
FROM quotes q
JOIN businesses b ON b.id = q.business_id
WHERE q.created_at >= date_trunc('month', now())
GROUP BY b.user_id;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS stripe_webhook_events;
DROP TABLE IF EXISTS monthly_quote_usage;
DROP INDEX IF EXISTS idx_users_stripe_customer;
ALTER TABLE users
    DROP COLUMN IF EXISTS subscription_status,
    DROP COLUMN IF EXISTS stripe_price_id,
    DROP COLUMN IF EXISTS stripe_subscription_id,
    DROP COLUMN IF EXISTS stripe_customer_id,
    DROP COLUMN IF EXISTS stripe_subscription_event_created,
    DROP COLUMN IF EXISTS plan;
-- +goose StatementEnd
