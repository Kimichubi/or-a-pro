import client from './client'

export async function forgotPassword(email: string) {
  const res = await client.post('/auth/forgot-password', { email })
  return res.data
}

export async function resetPassword(token: string, password: string) {
  const res = await client.post('/auth/reset-password', { token, password })
  return res.data
}
