.PHONY: up down migrate-up migrate-down run test lint build

up:
	docker compose up -d

down:
	docker compose down

migrate-up:
	go run github.com/pressly/goose/v3/cmd/goose@latest -dir migrations postgres "$$(grep '^DATABASE_URL=' .env | cut -d= -f2-)" up

migrate-down:
	go run github.com/pressly/goose/v3/cmd/goose@latest -dir migrations postgres "$$(grep '^DATABASE_URL=' .env | cut -d= -f2-)" down

run:
	go run ./cmd/api

test:
	go test ./... -race

lint:
	go vet ./...

build:
	go build -o bin/orcapro-api ./cmd/api
