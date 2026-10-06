-- +goose Up
-- +goose StatementBegin
ALTER TABLE quote_items ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
CREATE INDEX idx_quote_items_created ON quote_items(created_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_quote_items_created;
ALTER TABLE quote_items DROP COLUMN IF EXISTS created_at;
-- +goose StatementEnd
