# OrçaPro Next

This app is the Next.js migration target for the existing Vue + Go product. It lives beside the current app so the current preview and its local changes stay available until the migration is verified.

## Local development

1. Install Node.js 20.12 or newer.
2. Copy `.env.example` to `.env.local` and edit that file locally. Next reads it automatically; no shell `export` is needed, and credentials must not be pasted into chat or committed.
3. Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` from the Supabase project API settings.
4. Set `SUPABASE_SECRET_KEY` from the Supabase server-side secret key setting. It is only used in server modules and must never use a `NEXT_PUBLIC_` prefix.
5. Apply the SQL files in `supabase/migrations` in filename order. For a local Supabase stack, run `npx supabase start` from this folder, then `npx supabase db reset`. For a hosted project, apply the same migration files with the Supabase SQL editor or the Supabase CLI.
6. In Supabase Auth settings, add `http://localhost:5177/auth/callback` as a redirect URL. Configure a production URL and custom SMTP before accepting public signups.
7. Run `npm ci`, then `npm run dev`. The Next app uses port 5177 and does not replace the Vite app on 5176.

### Where to get the environment values

1. Create the Supabase project that will own the new database. In the project's **Connect** dialog, copy the Project URL and publishable key. The key is public by design and remains constrained by Row Level Security. If needed, create a publishable/secret key pair under **Settings → API Keys**. Copy the secret key only into `SUPABASE_SECRET_KEY`; it bypasses RLS and must stay server-side. See the [Supabase API key guide](https://supabase.com/docs/guides/getting-started/api-keys).
2. In `frontend/next`, copy `.env.example` to `.env.local` and fill `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`, and `APP_URL=http://localhost:5177`. Next loads this file itself, so do not run `export` commands. The local ignore rules exclude `.env.local` from Git.
3. Apply every SQL file in `supabase/migrations` in filename order. In **Authentication → URL Configuration**, set the local callback URL above; add the production callback and site URL when the production domain is ready. Configure custom SMTP in Supabase before opening registration to the public; the built-in mail service is limited to project-team addresses. See [Supabase Auth configuration](https://supabase.com/docs/guides/auth/general-configuration) and [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp).
4. In Stripe, keep **Test mode** enabled, create the OrçaPro Professional product with a recurring monthly price, and copy its Price ID to `STRIPE_PRICE_PROFESSIONAL`. Copy the test secret API key to `STRIPE_SECRET_KEY`. Stripe's test and live modes have separate keys and objects; the API secret belongs only on the server. See [Stripe API keys](https://docs.stripe.com/keys) and [creating a recurring price](https://docs.stripe.com/api/prices/create).
5. Once a public staging URL exists, register `${APP_URL}/api/billing/webhook` in Stripe with `checkout.session.completed` and `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. Copy that endpoint's signing secret to `STRIPE_WEBHOOK_SECRET`; it is different from the Stripe API key. Create a separate endpoint and secret for production. See [Stripe webhook endpoints](https://docs.stripe.com/api/webhook_endpoints).
6. For Docker production, copy `.env.runtime.example` to `frontend/next/.env.runtime` on the server and fill the Supabase, `APP_URL`, and Stripe runtime values there. Docker Compose reads only `.env.runtime`; legacy database and upload paths stay in `.env.local` for the one-time importer.

The publishable key is designed for browser use. The browser fetches only the public URL and publishable key from `/api/config/supabase` at runtime, so Docker images can be built before production values are entered. The secret key, Stripe credentials, and legacy database URL stay in local or server-only configuration. API handlers authenticate with the user's cookie and rely on RLS for per-account records. The service key is used only for operations that require server authority, such as Stripe events, public quote decisions, admin screens, rate limiting, and storage upload.

## First admin account

After creating or importing your own account, use the Supabase SQL editor while logged in as the database owner:

```sql
update public.profiles
set role = 'admin'
where id = 'YOUR_SUPABASE_AUTH_USER_UUID';
```

The client cannot change `profiles.role`; authenticated users receive permission to update only their own display name. The SQL editor uses the database owner role, so use the ID of your account only.

## Stripe setup

Create a recurring Professional price in Stripe and fill `STRIPE_SECRET_KEY` and `STRIPE_PRICE_PROFESSIONAL` in `.env.local`. Add a webhook endpoint at `${APP_URL}/api/billing/webhook` with these events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

Copy the endpoint signing secret into `STRIPE_WEBHOOK_SECRET`. The endpoint verifies Stripe's signature against the raw request body, records event IDs once, and applies subscription changes only when their event timestamp is current. Use Stripe test-mode keys and a test price until the production account is ready.

## Legacy data import

The import tool reads `frontend/next/.env.local` itself. It never prints connection values or row contents. It defaults to a read-only simulation; the `--apply` flag is required to write to Supabase.

1. Back up the current PostgreSQL database. Before the final dry run and import, put the old app into maintenance/read-only mode and keep writes paused until cutover; the importer reads one consistent PostgreSQL snapshot, so writes made after that snapshot are not copied.
2. Set `LEGACY_DATABASE_URL` in `.env.local` to the existing OrçaPro Postgres connection. Add `LEGACY_UPLOADS_DIR` for the old backend's `uploads` folder if it contains business logos. Add `LEGACY_APP_URL` if old logos use absolute URLs.
3. Set `ORCAPRO_ADMIN_USER_IDS` to your own existing user UUID(s), comma-separated, if those accounts should be admins after import.
4. While writes remain paused, run `npm run import:legacy` and compare the source and destination counts. This is a dry run and writes nothing.
5. After confirming the Supabase project is the intended destination and the backup is usable, run `npm run import:legacy -- --apply`.
6. Check account, quote, customer, catalog, reminder, billing, and logo counts in Supabase. Ask users to sign in again; old JWT and refresh sessions belong to the Go app and are not carried over. Keep the old app read-only until the Next app is serving traffic.
7. If local logo files were not available during import, set `LEGACY_UPLOADS_DIR` and rerun the import; the importer is idempotent and stores valid images as optimized WebP objects.

Go password hashes are Argon2id PHC hashes. Supabase Auth documents Argon2 hash import with the existing user UUID, so the importer preserves account IDs and passwords. The importer rejects unexpected hash formats instead of silently resetting passwords. [Supabase password-hash migration guidance](https://supabase.com/docs/guides/platform/migrating-to-supabase/auth0)

## Run the Next app in Docker

Copy `.env.runtime.example` to `.env.runtime`, fill only the runtime values in that file, and set `APP_URL` to the production HTTPS origin. The container never receives the legacy database URL used by the migration tool. Then run from the repository root:

```sh
docker compose -f frontend/next/docker-compose.yml up --build -d
```

The container serves Next on port 3000, published locally on 5177. Point the reverse proxy at port 5177 and set `APP_URL` to the HTTPS site origin. Supabase Postgres is managed separately; the application container does not run the old Go service or a local database.

## Migration status

The Next app now has the core account, customer, catalog, quote, public approval, business profile, billing, admin, dashboard, and PDF flows. The Vue app and Go API remain in place as a fallback until the Supabase migrations, email delivery, Stripe test events, data import, visual QA, and production deployment have all been checked. Do not point the production domain at this app before those checks pass.
