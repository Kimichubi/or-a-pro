import client from './client'
import type { Business } from './types'

export async function getBusiness(): Promise<Business> {
  const res = await client.get('/business/')
  return res.data
}

export async function updateBusiness(data: Partial<Business>): Promise<Business> {
  const res = await client.put('/business/', data)
  return res.data
}

export async function uploadLogo(file: File): Promise<string> {
  const form = new FormData()
  form.append('file', file)
  const res = await client.post('/business/logo', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })
  return res.data.url
}
