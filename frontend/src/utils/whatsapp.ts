export function cleanPhone(phone: string): string {
  return (phone || '').replace(/\D/g, '')
}

export function waLink(phone: string, message: string): string {
  const digits = cleanPhone(phone)
  const base = digits.startsWith('55') ? digits : `55${digits}`
  return `https://wa.me/${base}?text=${encodeURIComponent(message)}`
}

export function openWhatsApp(phone: string, message: string): void {
  window.open(waLink(phone, message), '_blank')
}
