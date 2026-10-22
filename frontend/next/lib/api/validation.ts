import { NextResponse } from 'next/server'
import { z } from 'zod'

export async function readJson(request: Request): Promise<unknown | NextResponse> {
  try {
    return await request.json()
  } catch {
    return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
  }
}

export function isResponse(value: unknown): value is NextResponse {
  return value instanceof NextResponse
}

export function invalid() {
  return NextResponse.json({ error: 'Dados inválidos.' }, { status: 400 })
}

export function validUuid(value: string) {
  return z.uuid().safeParse(value).success
}
