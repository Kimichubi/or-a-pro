import { randomUUID } from 'node:crypto'
import { NextResponse, type NextRequest } from 'next/server'
import sharp from 'sharp'
import { getApiContext, isApiError } from '@/lib/api/context'
import { consumeRateLimit } from '@/lib/api/rate-limit'
import { createSupabaseAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'
const maximumUploadBytes = 2 * 1024 * 1024
const maximumRequestBytes = maximumUploadBytes + 64 * 1024

async function readUploadForm(request: NextRequest) {
  const reader = request.body?.getReader()
  if (!reader) return null
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > maximumRequestBytes) {
        await reader.cancel()
        return null
      }
      chunks.push(value)
    }
  } catch {
    return null
  }
  const contentType = request.headers.get('content-type')
  if (!contentType?.toLowerCase().startsWith('multipart/form-data;')) return null
  const body = Buffer.concat(chunks.map((chunk) => Buffer.from(chunk)))
  try {
    const parsed = await new Request('http://localhost/upload', { method: 'POST', headers: { 'content-type': contentType }, body }).formData()
    return parsed
  } catch {
    return null
  }
}

function detectImage(bytes: Buffer) {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return { type: 'image/png', extension: 'png' }
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return { type: 'image/jpeg', extension: 'jpg' }
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') return { type: 'image/webp', extension: 'webp' }
  return null
}

export async function POST(request: NextRequest) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const rateLimit = await consumeRateLimit(request, 'business-logo', 10, 3600, context.user.id)
  if (rateLimit === 'limited') return NextResponse.json({ error: 'Limite de envio atingido. Tente novamente mais tarde.' }, { status: 429 })
  if (rateLimit === 'unavailable') return NextResponse.json({ error: 'Serviço temporariamente indisponível.' }, { status: 503 })
  const { data: hasPlan, error: planError } = await context.supabase.rpc('current_user_has_professional_plan')
  if (planError) return NextResponse.json({ error: 'Não foi possível verificar o plano.' }, { status: 503 })
  if (!hasPlan) return NextResponse.json({ error: 'O envio de logotipo exige o plano Profissional.' }, { status: 403 })

  const declaredSize = Number(request.headers.get('content-length') ?? 0)
  if (declaredSize > maximumRequestBytes) return NextResponse.json({ error: 'Envie uma imagem de até 2 MB.' }, { status: 413 })
  const form = await readUploadForm(request)
  if (!form) return NextResponse.json({ error: 'Arquivo inválido ou maior que o limite permitido.' }, { status: 400 })
  const file = form.get('file')
  if (!(file instanceof File) || file.size < 1 || file.size > maximumUploadBytes) return NextResponse.json({ error: 'Envie uma imagem de até 2 MB.' }, { status: 400 })
  const bytes = Buffer.from(await file.arrayBuffer())
  const image = detectImage(bytes)
  if (!image || image.type !== file.type) return NextResponse.json({ error: 'Formato inválido. Use PNG, JPEG ou WebP.' }, { status: 400 })

  let normalized: Buffer
  try {
    normalized = await sharp(bytes, { limitInputPixels: 10_000_000, failOn: 'error' })
      .rotate()
      .resize({ width: 2048, height: 2048, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 84 })
      .toBuffer()
  } catch {
    return NextResponse.json({ error: 'O arquivo não contém uma imagem válida.' }, { status: 400 })
  }
  if (normalized.byteLength > maximumUploadBytes) return NextResponse.json({ error: 'A imagem otimizada ultrapassa 2 MB.' }, { status: 400 })
  try {
    const admin = createSupabaseAdminClient()
    const path = `${context.user.id}/${randomUUID()}.webp`
    const { error: uploadError } = await admin.storage.from('business-logos').upload(path, normalized, { contentType: 'image/webp', upsert: false })
    if (uploadError) return NextResponse.json({ error: 'Não foi possível salvar o logotipo.' }, { status: 500 })
    const { data: publicUrl } = admin.storage.from('business-logos').getPublicUrl(path)
    const { data: business, error: updateError } = await admin.from('businesses').update({ logo_url: publicUrl.publicUrl }).eq('user_id', context.user.id).select('id').single()
    if (updateError || !business) {
      await admin.storage.from('business-logos').remove([path])
      return NextResponse.json({ error: 'Não foi possível atualizar o perfil do negócio.' }, { status: 500 })
    }
    return NextResponse.json({ logoUrl: publicUrl.publicUrl })
  } catch {
    return NextResponse.json({ error: 'Armazenamento ainda não configurado.' }, { status: 503 })
  }
}
