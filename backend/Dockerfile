# syntax=docker/dockerfile:1

FROM golang:1.27-alpine AS builder

WORKDIR /src

RUN apk add --no-cache git

COPY go.mod go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /out/orcapro-api ./cmd/api \
    && go install github.com/pressly/goose/v3/cmd/goose@v3.28.0

FROM alpine:3.20

WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /out/orcapro-api ./
COPY --from=builder /go/bin/goose ./
COPY migrations ./migrations
COPY docker-entrypoint.sh ./
RUN chmod +x ./docker-entrypoint.sh

ENV APP_PORT=8080

EXPOSE 8080

ENTRYPOINT ["./docker-entrypoint.sh"]
