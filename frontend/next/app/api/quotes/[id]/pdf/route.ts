import PDFDocument from 'pdfkit'
import { NextResponse, type NextRequest } from 'next/server'
import { getApiContext, isApiError } from '@/lib/api/context'
import { validUuid } from '@/lib/api/validation'

export const runtime = 'nodejs'

type RouteProps = { params: Promise<{ id: string }> }
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const dateLabel = (value: string | null) => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(value)) : '—'

export async function GET(_request: NextRequest, { params }: RouteProps) {
  const context = await getApiContext()
  if (isApiError(context)) return context
  const { id } = await params
  if (!validUuid(id)) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })
  const { data: quote, error } = await context.supabase.from('quotes')
    .select('*, customer:customers(*), items:quote_items(*)')
    .eq('id', id).eq('business_id', context.business.id).maybeSingle()
  if (error || !quote) return NextResponse.json({ error: 'Orçamento não encontrado.' }, { status: 404 })

  try {
    const bytes = await new Promise<Buffer>((resolve, reject) => {
      const pdf = new PDFDocument({ size: 'A4', margin: 44, bufferPages: true, info: { Title: quote.title, Author: context.business.name } })
      const chunks: Buffer[] = []
      pdf.on('data', (part: Buffer) => chunks.push(part))
      pdf.on('end', () => resolve(Buffer.concat(chunks)))
      pdf.on('error', reject)

      const primary = context.business.primary_color || '#155D61'
      const customer = quote.customer as Record<string, string>
      pdf.rect(0, 0, 595.28, 150).fill(primary)
      pdf.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(24).text(context.business.name || 'OrçaPro', 44, 42, { width: 505 })
      const businessLines = [context.business.phone && `Tel: ${context.business.phone}`, context.business.whatsapp && `WhatsApp: ${context.business.whatsapp}`, context.business.email, context.business.address].filter(Boolean)
      pdf.fillColor('#FFFFFF').font('Helvetica').fontSize(10).text(businessLines.join('   |   '), 44, 82, { width: 505, lineGap: 3 })
      pdf.rect(0, 150, 595.28, 4).fill(context.business.secondary_color || '#DD8F28')

      pdf.fillColor('#155D61').font('Helvetica-Bold').fontSize(22).text('ORÇAMENTO', 44, 180)
      pdf.fillColor('#423D34').font('Helvetica').fontSize(11)
      pdf.text(`Referência: ${quote.id.slice(0, 8).toUpperCase()}`, 44, 212)
      pdf.text(`Emissão: ${dateLabel(quote.created_at)}     Validade: ${quote.validity_days} dias`, 44, 230)

      const customerTop = 265
      pdf.roundedRect(44, customerTop, 507, 84, 7).fillAndStroke('#F1EFE9', '#E3DED3')
      pdf.fillColor('#7D7566').font('Helvetica-Bold').fontSize(9).text('CLIENTE', 58, customerTop + 14)
      pdf.fillColor('#1C1915').font('Helvetica-Bold').fontSize(14).text(customer?.name || '', 58, customerTop + 31, { width: 475 })
      const customerLine = [customer?.phone && `Telefone: ${customer.phone}`, customer?.email && `E-mail: ${customer.email}`, customer?.service_address && `Endereço: ${customer.service_address}`].filter(Boolean).join('   ·   ')
      pdf.fillColor('#423D34').font('Helvetica').fontSize(9).text(customerLine, 58, customerTop + 58, { width: 475 })

      let y = 380
      pdf.fillColor('#1C1915').font('Helvetica-Bold').fontSize(14).text('SERVIÇOS E MATERIAIS', 44, y)
      y += 28
      pdf.rect(44, y, 507, 28).fill('#155D61')
      pdf.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(9)
      pdf.text('Descrição', 54, y + 9, { width: 230 })
      pdf.text('Unid.', 300, y + 9, { width: 42 })
      pdf.text('Qtd.', 350, y + 9, { width: 45, align: 'right' })
      pdf.text('Preço', 400, y + 9, { width: 65, align: 'right' })
      pdf.text('Total', 470, y + 9, { width: 70, align: 'right' })
      y += 28

      for (const [index, item] of (quote.items ?? []).entries()) {
        const lineHeight = 36
        if (y + lineHeight > 750) { pdf.addPage(); y = 54 }
        if (index % 2 === 0) pdf.rect(44, y, 507, lineHeight).fill('#FAF9F6')
        pdf.fillColor('#2C2822').font('Helvetica').fontSize(9)
        pdf.text(item.name, 54, y + 7, { width: 230, height: 13, ellipsis: true })
        pdf.text(item.unit || 'un', 300, y + 7, { width: 42 })
        pdf.text(String(Number(item.quantity)), 350, y + 7, { width: 45, align: 'right' })
        pdf.text(currency.format(Number(item.unit_price)), 400, y + 7, { width: 65, align: 'right' })
        pdf.text(currency.format(Number(item.total)), 470, y + 7, { width: 70, align: 'right' })
        y += lineHeight
      }

      y += 14
      if (y > 700) { pdf.addPage(); y = 54 }
      pdf.fillColor('#423D34').font('Helvetica').fontSize(10)
      pdf.text(`Subtotal: ${currency.format(Number(quote.subtotal))}`, 330, y, { width: 210, align: 'right' })
      y += 18
      pdf.text(`Desconto: ${currency.format(Number(quote.discount_amount))}`, 330, y, { width: 210, align: 'right' })
      y += 22
      pdf.fillColor('#155D61').font('Helvetica-Bold').fontSize(16)
      pdf.text(`TOTAL: ${currency.format(Number(quote.total))}`, 300, y, { width: 240, align: 'right' })
      y += 34
      const additional = [quote.payment_conditions && `Condições de pagamento: ${quote.payment_conditions}`, quote.execution_days > 0 && `Prazo de execução: ${quote.execution_days} dias`, quote.notes && `Observações: ${quote.notes}`, context.business.terms_conditions && `Termos: ${context.business.terms_conditions}`].filter(Boolean).join('\n\n')
      if (additional) {
        if (y > 680) { pdf.addPage(); y = 54 }
        pdf.fillColor('#2C2822').font('Helvetica-Bold').fontSize(11).text('Condições e observações', 44, y)
        pdf.moveDown(0.5).font('Helvetica').fontSize(9).text(additional, { width: 507, lineGap: 3 })
      }
      pdf.end()
    })

    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="orcamento-${quote.id.slice(0, 8)}.pdf"`,
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return NextResponse.json({ error: 'Não foi possível gerar o PDF.' }, { status: 500 })
  }
}
