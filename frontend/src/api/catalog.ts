import client from './client'
import type { CatalogItem } from './types'

export interface CatalogPayload {
  name: string
  description: string
  unit: string
  price: number
  estimatedCost: number
  category: string
}

export async function listCatalog(search = ''): Promise<CatalogItem[]> {
  const res = await client.get('/catalog/', { params: { search } })
  return res.data
}

export async function createCatalogItem(data: CatalogPayload): Promise<CatalogItem> {
  const res = await client.post('/catalog/', data)
  return res.data
}

export async function updateCatalogItem(id: string, data: CatalogPayload): Promise<CatalogItem> {
  const res = await client.put(`/catalog/${id}`, data)
  return res.data
}

export async function deleteCatalogItem(id: string): Promise<void> {
  await client.delete(`/catalog/${id}`)
}
