import client from './client'
import type { Customer } from './types'

export interface CustomerPayload {
  name: string
  phone: string
  email: string
  document: string
  serviceAddress: string
  notes: string
}

export async function listCustomers(search = ''): Promise<Customer[]> {
  const res = await client.get('/customers/', { params: { search } })
  return res.data
}

export async function createCustomer(data: CustomerPayload): Promise<Customer> {
  const res = await client.post('/customers/', data)
  return res.data
}

export async function updateCustomer(id: string, data: CustomerPayload): Promise<Customer> {
  const res = await client.put(`/customers/${id}`, data)
  return res.data
}

export async function deleteCustomer(id: string): Promise<void> {
  await client.delete(`/customers/${id}`)
}
