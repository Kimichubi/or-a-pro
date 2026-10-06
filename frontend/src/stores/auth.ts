import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import client, { tokenStore, errorMessage, refreshAccessToken } from '../api/client'
import type { User, Business } from '../api/types'

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  const business = ref<Business | null>(null)
  const isAdmin = ref(false)
  const loading = ref(false)
  const error = ref('')

  const accessToken = ref(tokenStore.access)
  let restorePromise: Promise<boolean> | null = null

  const isAuthenticated = computed(() => !!accessToken.value)

  function setTokens(access: string) {
    tokenStore.access = access
    accessToken.value = access
  }

  async function login(email: string, password: string) {
    loading.value = true
    error.value = ''
    try {
      const res = await client.post('/auth/login', { email, password })
      setTokens(res.data.accessToken)
      await fetchMe()
      return true
    } catch (err) {
      error.value = errorMessage(err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function register(name: string, email: string, password: string) {
    loading.value = true
    error.value = ''
    try {
      const res = await client.post('/auth/register', { name, email, password })
      setTokens(res.data.accessToken)
      await fetchMe()
      return true
    } catch (err) {
      error.value = errorMessage(err)
      return false
    } finally {
      loading.value = false
    }
  }

  async function fetchMe() {
    const res = await client.get('/auth/me')
    user.value = res.data.user
    business.value = res.data.business
    isAdmin.value = !!res.data.isAdmin
  }

  async function restoreSession(): Promise<boolean> {
    if (isAuthenticated.value) return true
    if (!restorePromise) {
      restorePromise = (async () => {
        const access = await refreshAccessToken()
        if (!access) return false
        accessToken.value = access
        try {
          await fetchMe()
          return true
        } catch {
          tokenStore.clear()
          accessToken.value = ''
          user.value = null
          business.value = null
          isAdmin.value = false
          return false
        }
      })().finally(() => {
        restorePromise = null
      })
    }
    return restorePromise
  }

  async function logout() {
    try {
      await client.post('/auth/logout')
    } catch {
      /* ignore */
    }
    tokenStore.clear()
    accessToken.value = ''
    user.value = null
    business.value = null
    isAdmin.value = false
  }

  function setBusiness(b: Business) {
    business.value = b
  }

  window.addEventListener('orcapro:auth-change', (e) => {
    const detail = (e as CustomEvent<{ access: string }>).detail
    accessToken.value = detail.access
    if (!accessToken.value) {
      user.value = null
      business.value = null
      isAdmin.value = false
    }
  })

  return {
    user,
    business,
    isAdmin,
    loading,
    error,
    isAuthenticated,
    login,
    register,
    fetchMe,
    logout,
    restoreSession,
    setBusiness,
  }
})
