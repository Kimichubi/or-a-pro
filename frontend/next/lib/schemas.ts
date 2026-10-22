import { z } from 'zod'

const cleanText = (max: number) => z.string().trim().max(max)

export const customerSchema = z.object({
  name: cleanText(160).min(1),
  phone: cleanText(40).default(''),
  email: z.union([z.literal(''), z.email()]).default(''),
  document: cleanText(30).default(''),
  serviceAddress: cleanText(300).default(''),
  notes: cleanText(2000).default(''),
}).strict()

export const catalogSchema = z.object({
  name: cleanText(160).min(1),
  description: cleanText(2000).default(''),
  unit: cleanText(40).default('un'),
  price: z.number().finite().min(0).max(100_000_000),
  estimatedCost: z.number().finite().min(0).max(100_000_000).default(0),
  category: cleanText(100).default(''),
}).strict()

export const businessSchema = z.object({
  name: cleanText(160),
  document: cleanText(30),
  phone: cleanText(40),
  whatsapp: cleanText(40),
  email: z.union([z.literal(''), z.email()]),
  address: cleanText(300),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  secondaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  termsConditions: cleanText(5000),
}).strict()

export const quoteSchema = z.object({
  customerId: z.uuid(),
  title: cleanText(200).min(1),
  discountAmount: z.number().finite().min(0).max(100_000_000),
  executionDays: z.number().int().min(0).max(3650),
  validityDays: z.number().int().min(1).max(365),
  notes: cleanText(5000).default(''),
  paymentConditions: cleanText(2000).default(''),
  items: z.array(z.object({
    catalogItemId: z.union([z.uuid(), z.null()]),
    name: cleanText(200).min(1),
    description: cleanText(2000).default(''),
    unit: cleanText(40).default('un'),
    quantity: z.number().finite().positive().max(1_000_000),
    unitPrice: z.number().finite().min(0).max(100_000_000),
  }).strict()).min(1).max(100),
}).strict()

export const quoteStatusSchema = z.enum(['sent', 'viewed', 'approved', 'declined', 'expired'])
export const commentSchema = z.object({ comment: cleanText(2000).default('') }).strict()

export const reminderSchema = z.object({ message: cleanText(2000).min(1) }).strict()
export const adminCustomerSchema = customerSchema.extend({ businessId: z.uuid() }).strict()
