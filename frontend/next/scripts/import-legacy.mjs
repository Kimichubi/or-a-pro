import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'
import { createClient } from '@supabase/supabase-js'
import sharp from 'sharp'

const scriptDir = path.dirname(fileURLToPath(import.meta.url))
const envPath = path.resolve(scriptDir, '../.env.local')
const applying = process.argv.includes('--apply')
const pageSize = 250
const batchSize = 100
const tables = {
  users: 'SELECT id::text, email, password_hash, name, created_at, plan, stripe_customer_id, stripe_subscription_id, stripe_price_id, subscription_status, stripe_subscription_event_created FROM users ORDER BY id LIMIT $1 OFFSET $2',
  businesses: 'SELECT id::text, user_id::text, name, logo_url, document, phone, whatsapp, email, address, primary_color, secondary_color, terms_conditions, created_at, updated_at FROM businesses ORDER BY id LIMIT $1 OFFSET $2',
  customers: 'SELECT id::text, business_id::text, name, phone, email, document, service_address, notes, created_at FROM customers ORDER BY id LIMIT $1 OFFSET $2',
  catalog_items: 'SELECT id::text, business_id::text, name, description, unit, price::text, estimated_cost::text, category, created_at FROM catalog_items ORDER BY id LIMIT $1 OFFSET $2',
  quotes: 'SELECT id::text, business_id::text, customer_id::text, status, slug, title, discount_amount::text, execution_days, validity_days, notes, payment_conditions, subtotal::text, total::text, sent_at, viewed_at, approved_at, declined_at, client_comment, created_at, updated_at FROM quotes ORDER BY id LIMIT $1 OFFSET $2',
  quote_items: 'SELECT id::text, quote_id::text, catalog_item_id::text, name, description, unit, quantity::text, unit_price::text, total::text, created_at FROM quote_items ORDER BY id LIMIT $1 OFFSET $2',
  reminders: 'SELECT id::text, quote_id::text, message, created_at FROM reminders ORDER BY id LIMIT $1 OFFSET $2',
  monthly_quote_usage: 'SELECT user_id::text, month_start::text, quotes_created FROM monthly_quote_usage ORDER BY user_id, month_start LIMIT $1 OFFSET $2',
  stripe_webhook_events: 'SELECT event_id, event_type, processed_at FROM stripe_webhook_events ORDER BY event_id LIMIT $1 OFFSET $2',
}

function fail(message) {
  console.error(message)
  process.exitCode = 1
}

try {
  process.loadEnvFile(envPath)
} catch {
  fail('Crie frontend/next/.env.local a partir de .env.example e preencha a conexão de origem e a configuração Supabase. Nenhum valor precisa ser exportado ou enviado por chat.')
  process.exit()
}

const sourceUrl = process.env.LEGACY_DATABASE_URL?.trim()
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
const secretKey = process.env.SUPABASE_SECRET_KEY?.trim()
if (!sourceUrl || !supabaseUrl || !secretKey) {
  fail('Faltam LEGACY_DATABASE_URL, NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SECRET_KEY em frontend/next/.env.local.')
  process.exit()
}

const source = new Client({ connectionString: sourceUrl })
const admin = createClient(supabaseUrl, secretKey, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } })
let sourceTransactionOpen = false

async function sourceRows(table) {
  const sql = tables[table]
  if (!sql) throw new Error('unknown source table')
  const result = []
  for (let offset = 0; ; offset += pageSize) {
    const page = await source.query(sql, [pageSize, offset])
    result.push(...page.rows)
    if (page.rows.length < pageSize) return result
  }
}

async function sourceCount(table) {
  const result = await source.query(`SELECT COUNT(*)::int AS count FROM ${table}`)
  return result.rows[0].count
}

async function destinationCount(table) {
  const { count, error } = await admin.from(table).select('*', { count: 'exact', head: true })
  if (error) throw new Error('destination count unavailable')
  return count ?? 0
}

async function writeBatches(table, rows, conflict = 'id') {
  for (let offset = 0; offset < rows.length; offset += batchSize) {
    const batch = rows.slice(offset, offset + batchSize)
    const { error } = await admin.from(table).upsert(batch, { onConflict: conflict })
    if (error) throw new Error(`write failed for ${table}`)
  }
}

function userRoleIds() {
  const raw = process.env.ORCAPRO_ADMIN_USER_IDS?.trim() ?? ''
  const ids = raw ? raw.split(',').map((id) => id.trim().toLowerCase()).filter(Boolean) : []
  if (ids.some((id) => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))) {
    throw new Error('admin IDs must be UUIDs')
  }
  return new Set(ids)
}

async function authUserExists(user) {
  const { data, error } = await admin.auth.admin.getUserById(user.id)
  if (error && !/not found/i.test(error.message)) throw new Error('could not verify an existing auth account')
  if (data.user) {
    if (data.user.email?.toLowerCase() !== user.email.toLowerCase()) throw new Error('an existing auth ID has a different email')
    return true
  }
  return false
}

async function createLegacyAuthUser(user) {
  if (!/^\$argon2id\$v=19\$m=\d+,t=\d+,p=\d+\$[A-Za-z0-9+/]+={0,2}\$[A-Za-z0-9+/]+={0,2}$/.test(user.password_hash)) {
    throw new Error('a source password hash is not in the expected Argon2id PHC format')
  }
  if (await authUserExists(user)) return
  const response = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    method: 'POST',
    headers: { apikey: secretKey, Authorization: `Bearer ${secretKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: user.id, email: user.email, password_hash: user.password_hash, email_confirm: true, user_metadata: { name: user.name } }),
  })
  if (!response.ok) throw new Error('Supabase Auth rejected a legacy account; no response body was logged')
  const created = await response.json()
  if (created.id !== user.id) throw new Error('Supabase Auth did not preserve a legacy user ID')
}

async function importBusinesses(rows) {
  const uploadDir = process.env.LEGACY_UPLOADS_DIR?.trim()
  const appUrl = process.env.LEGACY_APP_URL?.trim() || 'http://localhost'
  let skippedLogos = 0
  for (const row of rows) {
    const { id, user_id, ...values } = row
    const { data: existing, error: updateError } = await admin.from('businesses').update({ id, ...values }).eq('user_id', user_id).select('id').maybeSingle()
    if (updateError) throw new Error('business import failed')
    if (!existing) {
      const { error: insertError } = await admin.from('businesses').insert({ id, user_id, ...values })
      if (insertError) throw new Error('business import failed')
    }

    if (!row.logo_url?.startsWith('/uploads/')) continue
    if (!uploadDir) { skippedLogos += 1; continue }
    let filename
    try {
      const pathname = new URL(row.logo_url, appUrl).pathname
      filename = path.basename(pathname)
      if (!/^[-a-zA-Z0-9_.]+\.(png|jpe?g|webp)$/i.test(filename)) throw new Error('invalid logo path')
      const original = await readFile(path.join(uploadDir, filename))
      const normalized = await sharp(original, { limitInputPixels: 10_000_000, failOn: 'error' }).rotate().resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true }).webp({ quality: 84 }).toBuffer()
      if (normalized.byteLength > 2 * 1024 * 1024) throw new Error('logo too large')
      const storagePath = `${user_id}/${id}.webp`
      const { error: uploadError } = await admin.storage.from('business-logos').upload(storagePath, normalized, { contentType: 'image/webp', upsert: true })
      if (uploadError) throw new Error('logo upload failed')
      const { data: publicUrl } = admin.storage.from('business-logos').getPublicUrl(storagePath)
      const { error: logoUpdateError } = await admin.from('businesses').update({ logo_url: publicUrl.publicUrl }).eq('id', id)
      if (logoUpdateError) throw new Error('logo reference update failed')
    } catch {
      skippedLogos += 1
    }
  }
  return skippedLogos
}

try {
  await source.connect()
  await source.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY')
  sourceTransactionOpen = true
  const sourceCounts = Object.fromEntries(await Promise.all(Object.keys(tables).map(async (table) => [table, await sourceCount(table)])))
  if (!applying) {
    const destinationCounts = Object.fromEntries(await Promise.all(['profiles', 'businesses', 'billing_accounts', 'customers', 'catalog_items', 'quotes', 'quote_items', 'reminders', 'monthly_quote_usage', 'stripe_webhook_events'].map(async (table) => [table, await destinationCount(table)])))
    await source.query('COMMIT')
    sourceTransactionOpen = false
    console.log('Simulação concluída. Nenhum dado foi gravado.')
    console.log(JSON.stringify({ origem: sourceCounts, destino: destinationCounts }, null, 2))
    console.log('Depois de conferir as contagens e o backup, use: npm run import:legacy -- --apply')
  } else {
    const users = await sourceRows('users')
    const adminIds = userRoleIds()
    for (const user of users) await createLegacyAuthUser(user)
    await writeBatches('profiles', users.map((user) => ({ id: user.id, email: user.email.toLowerCase().trim(), name: user.name, role: adminIds.has(user.id.toLowerCase()) ? 'admin' : 'user', created_at: user.created_at })))
    const businesses = await sourceRows('businesses')
    const skippedLogos = await importBusinesses(businesses)
    const billing = users.map((user) => ({
      user_id: user.id,
      plan: user.plan,
      stripe_customer_id: user.stripe_customer_id || null,
      stripe_subscription_id: user.stripe_subscription_id || null,
      stripe_price_id: user.stripe_price_id || null,
      subscription_status: user.subscription_status,
      stripe_subscription_event_created: user.stripe_subscription_event_created,
    }))
    await writeBatches('billing_accounts', billing, 'user_id')
    for (const table of ['customers', 'catalog_items', 'quotes', 'quote_items', 'reminders', 'monthly_quote_usage', 'stripe_webhook_events']) {
      const rows = await sourceRows(table)
      const conflict = table === 'monthly_quote_usage' ? 'user_id,month_start' : table === 'stripe_webhook_events' ? 'event_id' : 'id'
      if (rows.length) await writeBatches(table, rows, conflict)
    }
    const destinationCounts = Object.fromEntries(await Promise.all(['profiles', 'businesses', 'billing_accounts', 'customers', 'catalog_items', 'quotes', 'quote_items', 'reminders', 'monthly_quote_usage', 'stripe_webhook_events'].map(async (table) => [table, await destinationCount(table)])))
    await source.query('COMMIT')
    sourceTransactionOpen = false
    console.log('Importação concluída. Revise as contagens antes de apontar o domínio para o Next.')
    console.log(JSON.stringify({ origem: sourceCounts, destino: destinationCounts, logosNaoMigrados: skippedLogos }, null, 2))
    if (skippedLogos) console.log('Configure LEGACY_UPLOADS_DIR para importar os logotipos locais que faltaram e execute novamente.')
  }
} catch {
  fail(applying ? 'Importação interrompida. Os lotes gravados são idempotentes; corrija a configuração ou o dado de origem e execute novamente. Nenhum valor de conexão foi exibido.' : 'Não foi possível fazer a simulação. Confira as conexões e o esquema do banco, sem enviar credenciais por chat.')
} finally {
  if (sourceTransactionOpen) await source.query('ROLLBACK').catch(() => undefined)
  await source.end().catch(() => undefined)
}
