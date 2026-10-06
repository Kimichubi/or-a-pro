<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter, RouterView, RouterLink } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import AppLogo from '../components/AppLogo.vue'

const router = useRouter()
const auth = useAuthStore()
const mobileOpen = ref(false)

const nav = [
  { name: 'dashboard', label: 'Visão geral', to: '/app', icon: 'M3 3h8v8H3zM13 3h8v8h-8zM3 13h8v8H3zM13 13h8v8h-8z', exact: true },
  { name: 'quotes', label: 'Orçamentos', to: '/app/orcamentos', icon: 'M9 12l2 2 4-4M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { name: 'customers', label: 'Clientes', to: '/app/clientes', icon: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2 M9 11a4 4 0 100-8 4 4 0 000 8z M22 21v-2a4 4 0 00-3-3.87 M15 3.13a4 4 0 010 7.75' },
  { name: 'catalog', label: 'Serviços e materiais', to: '/app/catalogo', icon: 'M4 4h16v16H4z M4 9h16 M9 4v16' },
  { name: 'business', label: 'Meu negócio', to: '/app/negocio', icon: 'M3 21h18 M5 21V7l7-4 7 4v14 M9 21v-6h6v6' },
]
const visibleNav = computed(() => auth.isAdmin
  ? [...nav, { name: 'admin', label: 'Administração', to: '/app/admin', icon: 'M12 3v18 M3 12h18 M5.6 5.6l12.8 12.8 M18.4 5.6L5.6 18.4' }]
  : nav)

async function logout() {
  await auth.logout()
  router.push('/login')
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 lg:flex">
    <aside class="hidden w-64 shrink-0 flex-col bg-blue-900 text-white lg:flex">
      <div class="border-b border-white/10 px-6 py-6">
        <RouterLink to="/app" aria-label="OrçaPro, início">
          <AppLogo size="sm" variant="inverse" />
        </RouterLink>
        <p class="mt-6 truncate text-sm font-medium text-white">{{ auth.business?.name || 'Seu negócio' }}</p>
        <p class="mt-1 text-xs text-white/55">Painel de trabalho</p>
      </div>

      <nav aria-label="Navegação principal" class="flex-1 space-y-1 px-3 py-5">
        <RouterLink
          v-for="item in visibleNav"
          :key="item.name"
          :to="item.to"
          class="flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-300"
          :active-class="item.exact ? undefined : 'bg-white/12 text-white'"
          :exact-active-class="item.exact ? 'bg-white/12 text-white' : undefined"
        >
          <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path :d="item.icon" />
          </svg>
          {{ item.label }}
        </RouterLink>
      </nav>

      <div class="border-t border-white/10 p-4">
        <div class="flex items-center gap-3">
          <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-orange-400 text-sm font-bold text-blue-900">
            {{ (auth.user?.name || auth.business?.name || 'O').slice(0, 1).toUpperCase() }}
          </span>
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">{{ auth.user?.name || auth.business?.name }}</p>
            <p class="truncate text-xs text-white/55">{{ auth.user?.email }}</p>
          </div>
          <button class="rounded-md px-2 py-1 text-xs text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-orange-300" @click="logout">
            Sair
          </button>
        </div>
      </div>
    </aside>

    <div class="min-w-0 flex-1">
      <header class="sticky top-0 z-30 flex items-center justify-between border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden">
        <RouterLink to="/app" aria-label="OrçaPro, início"><AppLogo size="sm" /></RouterLink>
        <button
          class="flex h-10 w-10 items-center justify-center rounded-lg text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600"
          :aria-expanded="mobileOpen"
          aria-controls="mobile-navigation"
          :aria-label="mobileOpen ? 'Fechar menu' : 'Abrir menu'"
          @click="mobileOpen = !mobileOpen"
        >
          <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true">
            <path v-if="!mobileOpen" d="M4 6h16M4 12h16M4 18h16" />
            <path v-else d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <nav v-if="mobileOpen" id="mobile-navigation" aria-label="Navegação principal" class="border-b border-gray-200 bg-white px-3 py-3 lg:hidden">
        <RouterLink
          v-for="item in visibleNav"
          :key="item.name"
          :to="item.to"
          class="flex min-h-11 items-center rounded-lg px-3 text-sm font-medium text-gray-700 hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-blue-600"
          @click="mobileOpen = false"
        >
          {{ item.label }}
        </RouterLink>
        <button class="mt-1 min-h-11 w-full rounded-lg px-3 text-left text-sm text-gray-500 hover:bg-gray-100" @click="logout">Sair da conta</button>
      </nav>

      <main class="mx-auto w-full max-w-[1440px] p-4 sm:p-6 lg:p-9">
        <RouterView />
      </main>
    </div>
  </div>
</template>
