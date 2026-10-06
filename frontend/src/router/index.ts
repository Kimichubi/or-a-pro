import { createRouter, createWebHistory } from 'vue-router'
import { ref } from 'vue'
import { useAuthStore } from '../stores/auth'

export const restoringSession = ref(false)

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'landing', component: () => import('../views/LandingView.vue') },
    { path: '/login', name: 'login', component: () => import('../views/LoginView.vue') },
    { path: '/register', name: 'register', component: () => import('../views/RegisterView.vue') },
    { path: '/forgot-password', name: 'forgot', component: () => import('../views/ForgotPasswordView.vue') },
    { path: '/reset-password', name: 'reset', component: () => import('../views/ResetPasswordView.vue') },
    { path: '/orcamento/:slug', name: 'public-quote', component: () => import('../views/PublicQuoteView.vue') },
    {
      path: '/app',
      component: () => import('../layouts/AppLayout.vue'),
      meta: { requiresAuth: true },
      children: [
        { path: '', name: 'dashboard', component: () => import('../views/DashboardView.vue') },
        { path: 'negocio', name: 'business', component: () => import('../views/BusinessView.vue') },
        { path: 'clientes', name: 'customers', component: () => import('../views/CustomersView.vue') },
        { path: 'catalogo', name: 'catalog', component: () => import('../views/CatalogView.vue') },
        { path: 'orcamentos', name: 'quotes', component: () => import('../views/QuotesView.vue') },
        { path: 'orcamentos/novo', name: 'quote-new', component: () => import('../views/QuoteCreateView.vue') },
        { path: 'orcamentos/:id/editar', name: 'quote-edit', component: () => import('../views/QuoteCreateView.vue') },
        { path: 'orcamentos/:id', name: 'quote-detail', component: () => import('../views/QuoteDetailView.vue') },
        { path: 'admin', name: 'admin', component: () => import('../views/AdminView.vue'), meta: { requiresAdmin: true } },
      ],
    },
    { path: '/:pathMatch(.*)*', name: 'not-found', component: () => import('../views/NotFoundView.vue') },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    restoringSession.value = true
    if (!(await auth.restoreSession())) {
      return { name: 'login', query: { redirect: to.fullPath } }
    }
  }
  if (to.meta.requiresAdmin && auth.isAuthenticated && !auth.user) {
    try { await auth.fetchMe() } catch { return { name: 'login' } }
  }
  if (to.meta.requiresAdmin && !auth.isAdmin) return { name: 'dashboard' }
  if (auth.isAuthenticated && (to.name === 'login' || to.name === 'register')) {
    return { name: 'dashboard' }
  }
  return true
})

router.afterEach(() => {
  restoringSession.value = false
})

router.onError(() => {
  restoringSession.value = false
})

export default router
