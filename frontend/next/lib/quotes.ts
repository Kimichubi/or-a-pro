import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { serializeBusiness, serializeCustomer, serializeQuote, serializeQuoteItem, serializeReminder } from '@/lib/serializers'

export async function getQuoteDetail(supabase: SupabaseClient, businessId: string, quoteId: string) {
  const { data, error } = await supabase
    .from('quotes')
    .select('*, customer:customers(*), items:quote_items(*), reminders(*)')
    .eq('id', quoteId)
    .eq('business_id', businessId)
    .maybeSingle()
  if (error || !data) return { data: null, error }
  const { data: business } = await supabase.from('businesses').select('*').eq('id', businessId).maybeSingle()
  return {
    error: null,
    data: {
      ...serializeQuote(data),
      customer: data.customer ? serializeCustomer(data.customer) : null,
      business: business ? serializeBusiness(business) : null,
      items: (data.items ?? []).map(serializeQuoteItem),
      reminders: (data.reminders ?? []).map(serializeReminder),
    },
  }
}
