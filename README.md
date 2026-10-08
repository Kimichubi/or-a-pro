# OrçaPro

SaaS web responsivo para prestadores de serviços brasileiros que enviam orçamentos pelo WhatsApp e precisam parecer mais profissionais.

> **Proposta:** "Crie orçamentos profissionais em 2 minutos e saiba quais clientes ainda não responderam."

Público-alvo: eletricistas, técnicos de ar-condicionado, encanadores, vidraceiros, pintores, instaladores, empresas de manutenção, freelancers e pequenos prestadores.

## Stack

| Camada   | Tecnologia                                        |
| -------- | ------------------------------------------------- |
| Backend  | Go 1.27, Fiber v2, PostgreSQL (pgx), Redis, Goose |
| Frontend | Vue 3, Vite, TypeScript, Tailwind CSS 4, Pinia    |

## Estrutura

```
orcapro/
├── backend/      # API Go (Fiber) + migrações + geração de PDF
└── frontend/     # SPA Vue 3 + Vite + Tailwind
```

## Funcionalidades do MVP

- **Autenticação** — cadastro, login, recuperação de senha, perfil do negócio.
- **Configuração do negócio** — nome, logo, CNPJ/CPF, telefone, WhatsApp, e-mail, endereço, cores, termos e condições.
- **Clientes** — CRUD com telefone, e-mail, CPF/CNPJ, endereço do serviço e observações.
- **Catálogo** — serviços/produtos com unidade, preço padrão, custo estimado e categoria.
- **Orçamentos** — cliente, itens, quantidades, desconto, prazo, validade, observações, condições de pagamento, total automático.
- **Status** — Rascunho, Enviado, Visualizado, Aprovado, Recusado, Expirado.
- **Compartilhamento** — PDF profissional, link público e botão para o WhatsApp com mensagem pronta.
- **Página pública** — o cliente visualiza e aprova/recusa com comentário, registrando data/hora.
- **Dashboard** — enviados, aprovados, valor aprovado, aguardando resposta, taxa de aprovação, últimos orçamentos.
- **Follow-up** — lembrete, dias parado e abertura do WhatsApp com mensagem de acompanhamento.

## Como rodar

### Pré-requisitos

- Go 1.27+
- Node 20+ e npm
- Docker + Docker Compose

### 1. Backend

```bash
cd backend
cp .env.example .env
make up            # sobe PostgreSQL (5435) e Redis (6382)
make migrate-up    # aplica as migrações
make run           # inicia a API em http://localhost:8081
```

> Portas usadas: API `8081`, PostgreSQL `5435`, Redis `6382` — escolhidas para não conflitar com outros projetos locais.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev        # http://localhost:5176
```

O Vite faz proxy de `/api` e `/uploads` para `http://localhost:8081`.

### Testes e build

```bash
# Backend
cd backend
make test && make lint

# Frontend
cd frontend
npm run lint && npm run build
```

## Configuração (backend/.env)

| Variável          | Descrição                                              |
| ----------------- | ------------------------------------------------------ |
| `APP_PORT`        | Porta da API (8081)                                    |
| `DATABASE_URL`    | URL do PostgreSQL                                      |
| `REDIS_URL`       | Endereço do Redis (refresh tokens)                     |
| `JWT_SECRET`      | Segredo do JWT (obrigatório em produção)               |
| `ACCESS_TOKEN_TTL`| TTL do access token (ex.: `15m`)                       |
| `REFRESH_TOKEN_TTL`| TTL do refresh token (ex.: `720h`)                    |
| `CORS_ORIGIN`     | Origem do frontend                                     |
| `PUBLIC_BASE_URL` | Base dos links públicos de orçamento                   |
| `UPLOAD_DIR`      | Pasta dos uploads (logo)                               |
| `APP_ENV`         | `development` ou `production`                          |
| `SMTP_HOST`       | Servidor SMTP para recuperação de senha                 |
| `SMTP_PORT`       | Porta SMTP com STARTTLS (padrão `587`)                  |
| `SMTP_USERNAME`   | Usuário SMTP (opcional se o servidor não exigir login)  |
| `SMTP_PASSWORD`   | Senha SMTP                                              |
| `SMTP_FROM`       | Endereço remetente; obrigatório em produção             |
| `ADMIN_EMAIL`     | E-mail autorizado a acessar o backoffice                |
| `STRIPE_SECRET_KEY` | Chave privada da Stripe (`sk_test_...` em testes)       |
| `STRIPE_WEBHOOK_SECRET` | Segredo de assinatura do webhook (`whsec_...`)     |
| `STRIPE_PRICE_PROFESSIONAL` | Price ID mensal do Profissional (`price_...`)  |

Em produção, configure o SMTP para habilitar a recuperação de senha. O refresh token fica em cookie `HttpOnly`, `SameSite=Lax` e `Secure`; o access token existe apenas em memória no navegador.

Para Stripe Billing, crie o preço mensal Profissional em BRL no painel da Stripe, configure os IDs e registre `https://SEU_DOMINIO/api/billing/webhook` para os eventos `customer.subscription.created`, `customer.subscription.updated` e `customer.subscription.deleted`, na versão de API `2026-09-30.endive`. Habilite também o Customer Portal para atualização do cartão e cancelamento. O backend ativa o plano apenas para assinaturas `active` ou `trialing`; o plano gratuito limita a criação a 5 orçamentos por mês. O plano Empresa ainda não está disponível para contratação.

## Resumo da API

Rotas principais (prefixo `/api`):

- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/forgot-password`, `POST /auth/reset-password`
- `GET/PATCH /auth/me`
- `GET/PUT /business/`, `POST /business/logo`
- `GET/POST/PUT/DELETE /customers`
- `GET/POST/PUT/DELETE /catalog`
- `GET/POST /quotes`, `GET/PUT/DELETE /quotes/:id`
- `POST /quotes/:id/send`, `GET /quotes/:id/pdf`, `POST /quotes/:id/status`, `POST /quotes/:id/reminders`
- `GET /quotes/awaiting`
- `GET /dashboard`
- Público: `GET /public/quotes/:slug`, `POST /public/quotes/:slug/approve`, `POST /public/quotes/:slug/decline`

## Fora do escopo do MVP

Assinatura eletrônica juridicamente qualificada, emissão de nota fiscal e CRM completo.
