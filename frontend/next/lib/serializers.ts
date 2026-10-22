type DbRow = Record<string, unknown>

export function serializeBusiness(row: DbRow) {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    logoUrl: row.logo_url,
    document: row.document,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    termsConditions: row.terms_conditions,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function serializeCustomer(row: DbRow) {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    phone: row.phone,
    email: row.email,
    document: row.document,
    serviceAddress: row.service_address,
    notes: row.notes,
    createdAt: row.created_at,
  }
}

export function serializeCatalogItem(row: DbRow) {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description,
    unit: row.unit,
    price: Number(row.price),
    estimatedCost: Number(row.estimated_cost),
    category: row.category,
    createdAt: row.created_at,
  }
}

export function serializeQuoteItem(row: DbRow) {
  return {
    id: row.id,
    quoteId: row.quote_id,
    catalogItemId: row.catalog_item_id,
    name: row.name,
    description: row.description,
    unit: row.unit,
    quantity: Number(row.quantity),
    unitPrice: Number(row.unit_price),
    total: Number(row.total),
  }
}

export function serializeQuote(row: DbRow) {
  return {
    id: row.id,
    businessId: row.business_id,
    customerId: row.customer_id,
    status: row.status,
    slug: row.slug,
    title: row.title,
    discountAmount: Number(row.discount_amount),
    executionDays: row.execution_days,
    validityDays: row.validity_days,
    notes: row.notes,
    paymentConditions: row.payment_conditions,
    subtotal: Number(row.subtotal),
    total: Number(row.total),
    sentAt: row.sent_at,
    viewedAt: row.viewed_at,
    approvedAt: row.approved_at,
    declinedAt: row.declined_at,
    clientComment: row.client_comment,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function serializeReminder(row: DbRow) {
  return {
    id: row.id,
    quoteId: row.quote_id,
    message: row.message,
    createdAt: row.created_at,
  }
}

export function serializeQuoteSummary(row: DbRow) {
  const customer = row.customer as { name?: string } | null | undefined
  return {
    ...serializeQuote(row),
    customerName: customer?.name ?? row.customer_name ?? '',
  }
}
