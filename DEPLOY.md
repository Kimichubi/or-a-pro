# Deploy do OrçaPro — VPS brasileiro (Hostinger / KingHost / HostGator)

Stack de produção em um único servidor, orquestrada por Docker Compose:

```
Internet
   │  :443 (HTTPS / Let's Encrypt)
   ▼
 Caddy ──► /            frontend (nginx + SPA Vue)
   │   └──►  /api/*      backend Go (Fiber) :8080
   │   └──►  /uploads/*  backend Go (arquivos: logo, PDF)
   │
   ├──► backend ──► postgres:5432 (volume pgdata)
   │            └► redis:6379 (volume redisdata)
   └──► uploads volume (logo / arquivos)
```

Todo o tráfego entra pelo Caddy (`:80`/`:443`). Postgres e Redis **não** são expostos à internet.

---

## 1. Pré-requisitos no servidor

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y docker.io docker-compose-plugin git

# Opcional: apontar o domínio para o IP do servidor
# Registre um registro A em seu provedor de DNS apontando para o IP do VPS
```

**Apontamento de DNS:** o domínio (ex.: `orcapro.com.br`) deve ter um registro `A` apontando para o IP público do VPS antes de subir o Caddy, senão o Let's Encrypt falhará.

---

## 2. Obter o código no servidor

```bash
cd /opt
sudo git clone <url-do-seu-repo> orcapro
cd orcapro
```

> Certifique-se que `backend/`, `frontend/`, `docker-compose.prod.yml`, `Caddyfile`, `.env.prod.example` estão no repositório.

---

## 3. Configurar variáveis de ambiente

```bash
cp .env.prod.example .env.prod
nano .env.prod
```

Valores que **precisam** ser alterados:

| Variável           | O que colocar                                        |
| ------------------ | ---------------------------------------------------- |
| `DOMAIN`           | `seu-dominio.com` (sem `https://`)                   |
| `POSTGRES_PASSWORD`| senha forte do banco                                 |
| `JWT_SECRET`       | segredo longo e aleatório (`openssl rand -hex 64`)  |
| `ADMIN_EMAIL`      | e-mail exato da conta que terá acesso ao backoffice   |
| `SMTP_HOST` / `SMTP_PORT` | servidor SMTP com STARTTLS, normalmente porta `587` |
| `SMTP_FROM`        | endereço remetente autorizado pelo provedor          |
| `STRIPE_SECRET_KEY` | chave privada; use `sk_test_...` antes de produção   |
| `STRIPE_WEBHOOK_SECRET` | segredo do endpoint webhook (`whsec_...`)       |
| `STRIPE_PRICE_PROFESSIONAL` | ID do preço mensal do Profissional em BRL    |

Configure também `SMTP_USERNAME` e `SMTP_PASSWORD` quando o provedor exigir autenticação. O backend recusa iniciar em produção sem `SMTP_HOST` e `SMTP_FROM`, pois sem eles a recuperação de senha não poderia ser enviada.

Gere os segredos localmente com `openssl rand -hex 32` para `POSTGRES_PASSWORD` e `openssl rand -hex 64` para `JWT_SECRET`. O formato hexadecimal evita caracteres reservados na URL de conexão do PostgreSQL usada pelo Compose.

No painel da Stripe, crie o preço mensal Profissional em BRL e configure o webhook `https://SEU_DOMINIO/api/billing/webhook` para `customer.subscription.created`, `customer.subscription.updated` e `customer.subscription.deleted`, na versão de API `2026-09-30.endive`. Copie o `whsec_...` para `STRIPE_WEBHOOK_SECRET` e habilite o Customer Portal para atualização de cartão e cancelamento. Faça primeiro a configuração com chaves e preços de teste; nunca coloque a chave privada Stripe no frontend. O plano Empresa ainda não está disponível para contratação nem inicia Checkout.

O arquivo `.env.prod` **não deve ser versionado**. Adicione ao `.gitignore`:

```gitignore
.env.prod
```

---

## 4. Subir a stack

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

> O Compose lê as variáveis de `.env.prod` para produzir a configuração (banco, senhas, domínio). Se rodar sem `--env-file`, ele tenta ler `.env` e os valores ficam vazios.

O que acontece no primeiro `up`:

1. Postgres e Redis sobem e passam no healthcheck.
2. O backend builda a imagem Go, roda as migrações (goose) e inicia na porta `8080`.
3. O frontend builda a SPA e serve pelo nginx.
4. O Caddy emite o certificado HTTPS automaticamente para `$DOMAIN`.

Verifique os logs:

```bash
docker compose -f docker-compose.prod.yml logs -f backend
docker compose -f docker-compose.prod.yml ps
```

Teste: `curl https://seu-dominio.com/health` deve retornar `{"status":"ok"}`.

---

## 5. Migrações

Elas rodam automaticamente no start do container `backend` (via `docker-entrypoint.sh`). Para rodar manualmente depois de novos arquivos em `backend/migrations/`:

```bash
docker compose -f docker-compose.prod.yml restart backend
```

Para nova migração em dev:

```bash
cd backend
go run github.com/pressly/goose/v3/cmd/goose@latest -dir migrations postgres "postgres://$POSTGRES_USER:$POSTGRES_PASSWORD@localhost:5432/$POSTGRES_DB" create <nome> sql
```

---

## 6. Atualizar o app

```bash
cd /opt/orcapro
git pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

---

## 7. Backup do banco

Antes de cadastrar clientes reais, agende cópias diárias do banco e do volume `uploads` para armazenamento fora do VPS, defina retenção e faça um teste de restauração. Os comandos abaixo são manuais e, sozinhos, não protegem contra falha do servidor.

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > backup_$(date +%Y%m%d).sql
```

### Backup dos uploads

Os uploads (logotipos/arquivos) ficam no volume `uploads`. Para um backup simples:

```bash
docker run --rm -v orcapro_uploads:/source -v "$PWD:/backup" alpine \
  tar czf /backup/uploads_$(date +%Y%m%d).tar.gz -C /source .
```

> Em produção real, agende esses dois comandos com crontab e envie para um storage externo (S3, Google Drive, etc.).

---

## 8. Manutenção básica

```bash
# Ver status dos containers
docker compose -f docker-compose.prod.yml ps

# Logs
docker compose -f docker-compose.prod.yml logs -f

# Reiniciar tudo
docker compose -f docker-compose.prod.yml restart

# Parar tudo
docker compose -f docker-compose.prod.yml down
```

---

## 9. Dimensionamento sugerido do VPS

| Uso | Recursos iniciais |
| --- | --- |
| MVP com todos os containers no mesmo VPS | 2 vCPU, 8 GB RAM, 100 GB NVMe |

Frontend, API, PostgreSQL, Redis e builds compartilham essa máquina. Monitore RAM e disco no piloto e dimensione com base no uso real; mantenha os backups fora dela.

---

## 10. CI/CD (GitHub Actions)

O repo já tem o workflow `.github/workflows/ci-cd.yml`:

- **CI** (push/PR em `main`): Backend `go vet` + `go test -race` + `go build`; Frontend `npm ci` + `lint` + `typecheck` + `build`. Rodam **em paralelo**.
- **CD** (somente push em `main`, após CI verde): assina SSH no VPS e roda `git pull` + `docker compose up -d --build`.

### 1. Garanta que a branch principal é `main`

```bash
git branch -M main
git remote add origin <url-do-seu-repo-github>
git push -u origin main
```

### 2. Configure os secrets no GitHub

Repositório → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret        | Descrição                                        |
| ------------- | ------------------------------------------------ |
| `VPS_HOST`    | IP público do servidor                           |
| `VPS_USER`    | usuário SSH (ex.: `root` ou `ubuntu`)            |
| `SSH_KEY`     | chave privada SSH do servidor (conteúdo do arquivo) |
| `VPS_APP_PATH`| caminho do projeto no VPS (ex.: `/opt/orcapro`)  |

### 3. Prepare o servidor

```bash
# gere/instale uma chave SSH se ainda não tiver
ssh-keygen -t ed25519
ssh-copy-id user@IP

# clone o repo no caminho definido em VPS_APP_PATH
sudo mkdir -p /opt/orcapro && sudo chown $USER /opt/orcapro
git clone <url-do-seu-repo-github> /opt/orcapro

# configure o .env.prod no servidor (necessário pra buildar)
cd /opt/orcapro
cp .env.prod.example .env.prod
nano .env.prod
```

> **Importante:** a chave privada (`SSH_KEY`) fica no GitHub Secrets; a chave pública vai no `~/.ssh/authorized_keys` do VPS. E `.env.prod` deve existir **no servidor** (está no `.gitignore`, não é commitado).

### 4. Deploy

Novo push em `main` → CI rodando → deploy automático no VPS.

Deploy manual (sem passar pelo CI):

```bash
cd /opt/orcapro
git pull --ff-only
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build
```

---

## Resumo de arquivos criados para deploy

| Arquivo                          | Função                                           |
| -------------------------------- | ------------------------------------------------ |
| `backend/Dockerfile`             | Imagem Go multi-stage (build + runtime)          |
| `backend/docker-entrypoint.sh`   | Roda migrações e inicia a API                    |
| `frontend/Dockerfile`            | Node build → nginx estático                      |
| `frontend/nginx.conf`            | Fallback SPA (`try_files`)                       |
| `docker-compose.prod.yml`        | Orquestra caddy + frontend + backend + db + redis |
| `Caddyfile`                      | Roteamento e HTTPS do Caddy                      |
| `.env.prod.example`              | Template seguro de variáveis de produção         |
| `.github/workflows/ci-cd.yml`    | CI (vet/test/lint/build) + CD (deploy via SSH)  |
