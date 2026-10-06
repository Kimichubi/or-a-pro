import client from './client'
import type { DashboardStats } from './types'

export async function getDashboard(): Promise<DashboardStats> {
  const res = await client.get('/dashboard')
  return res.data
}
