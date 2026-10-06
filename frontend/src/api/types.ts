export interface User {
  id: string
  email: string
  name: string
  createdAt: string
}

export interface AdminOverview {
  accounts: number
  businesses: number
  customers: number
  quotes: number
  approvedSum: number
}

export interface AdminBusiness {
  businessId: string
  userId: string
  businessName: string
  ownerName: string
  ownerEmail: string
  email: string
  phone: string
  customerCount: number
  quoteCount: number
  createdAt: string
}

export interface AdminCustomer extends Customer {
  businessName: string
  ownerEmail: string
}

export interface Business {
  id: string
  userId: string
  name: string
  logoUrl: string
  document: string
  phone: string
  whatsapp: string
  email: string
  address: string
  primaryColor: string
  secondaryColor: string
  termsConditions: string
  createdAt: string
  updatedAt: string
}

export interface Customer {
  id: string
  businessId: string
  name: string
  phone: string
  email: string
  document: string
  serviceAddress: string
  notes: string
  createdAt: string
}

export interface CatalogItem {
  id: string
  businessId: string
  name: string
  description: string
  unit: string
  price: number
  estimatedCost: number
  category: string
  createdAt: string
}

export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'approved' | 'declined' | 'expired'

export interface QuoteItem {
  id: string
  quoteId: string
  catalogItemId: string | null
  name: string
  description: string
  unit: string
  quantity: number
  unitPrice: number
  total: number
}

export interface Quote {
  id: string
  businessId: string
  customerId: string
  status: QuoteStatus
  slug: string
  title: string
  discountAmount: number
  executionDays: number
  validityDays: number
  notes: string
  paymentConditions: string
  subtotal: number
  total: number
  sentAt: string | null
  viewedAt: string | null
  approvedAt: string | null
  declinedAt: string | null
  clientComment: string
  createdAt: string
  updatedAt: string
}

export interface QuoteSummary {
  id: string
  businessId: string
  customerId: string
  customerName: string
  status: QuoteStatus
  slug: string
  title: string
  discountAmount: number
  subtotal: number
  total: number
  createdAt: string
  updatedAt: string
}

export interface QuoteDetail extends Quote {
  customer: Customer
  business: Business
  items: QuoteItem[]
  reminders: Reminder[]
}

export interface Reminder {
  id: string
  quoteId: string
  message: string
  createdAt: string
}

export interface DashboardStats {
  quotesSent: number
  quotesApproved: number
  totalApproved: number
  awaitingResponse: number
  approvalRate: number
  recentQuotes: RecentQuote[]
}

export interface RecentQuote {
  id: string
  status: QuoteStatus
  customer: string
  title: string
  total: number
  createdAt: string
}

export interface AwaitingQuote {
  id: string
  slug: string
  title: string
  customer: string
  customerPhone: string
  total: number
  daysPending: number
  status: QuoteStatus
}

export interface QuoteItemInput {
  catalogItemId: string | null
  name: string
  description: string
  unit: string
  quantity: number
  unitPrice: number
}
