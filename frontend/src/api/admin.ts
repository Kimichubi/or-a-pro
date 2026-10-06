import client from './client'
import type { AdminBusiness, AdminCustomer, AdminOverview } from './types'
import type { CustomerPayload } from './customers'

export async function getAdminOverview(): Promise<AdminOverview> {
  const res = await client.get('/admin/overview')
  return res.data
}

export async function listAdminBusinesses(search = ''): Promise<AdminBusiness[]> {
  const res = await client.get('/admin/businesses', { params: { search } })
  return res.data
}

export async function listAdminCustomers(search = '', businessId = ''): Promise<AdminCustomer[]> {
  const res = await client.get('/admin/customers', { params: { search, businessId: businessId || undefined } })
  return res.data
}

export async function updateAdminCustomer(id: string, data: CustomerPayload): Promise<AdminCustomer> {
  const res = await client.put(`/admin/customers/${id}`, data)
  return res.data
}
