import axios, { type AxiosInstance } from 'axios'

const client: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
})

let accessToken = ''
const legacyAccessKey = 'orcapro_access'
const legacyRefreshKey = 'orcapro_refresh'
localStorage.removeItem(legacyAccessKey)
localStorage.removeItem(legacyRefreshKey)

const refreshClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: true,
})

export const tokenStore = {
  get access() {
    return accessToken
  },
  set access(v: string) {
    accessToken = v
  },
  clear() {
    accessToken = ''
  },
}

client.interceptors.request.use((config) => {
  const token = tokenStore.access
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

let refreshing: Promise<string | null> | null = null

function notifyAuthChange() {
  window.dispatchEvent(new CustomEvent('orcapro:auth-change', { detail: { access: tokenStore.access } }))
}

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshing) return refreshing
  refreshing = (async () => {
  try {
    const res = await refreshClient.post('/auth/refresh')
    tokenStore.access = res.data.accessToken
    notifyAuthChange()
    return res.data.accessToken as string
  } catch {
    tokenStore.clear()
    notifyAuthChange()
    return null
  } finally {
    refreshing = null
  }
  })()
  return refreshing
}

client.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const newToken = await refreshAccessToken()
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`
        return client(original)
      }
    }
    return Promise.reject(error)
  },
)

export function errorMessage(err: unknown): string {
  const anyErr = err as { response?: { data?: { error?: string } } }
  return anyErr?.response?.data?.error || 'Algo deu errado. Tente novamente.'
}

export default client
