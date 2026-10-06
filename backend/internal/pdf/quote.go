package pdf

import (
	"bytes"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/go-pdf/fpdf"
	"github.com/kimichubi/orcapro-back/internal/domain"
	"github.com/kimichubi/orcapro-back/internal/store"
)

const (
	colorBlue   = 37
	colorBlueG  = 99
	colorBlueB  = 235
	colorOrange = 249
	colorOrangeG = 115
	colorOrangeB = 22
	colorText   = 40
	colorTextG  = 44
	colorTextB  = 52
	colorMuted  = 100
	colorMutedG = 100
	colorMutedB = 110
)

// GenerateQuote renders a professional A4 PDF for the given quote.
// logoPath is an optional local image path for the business logo.
func GenerateQuote(q *store.QuoteDetail, logoPath string) ([]byte, error) {
	pdf := fpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(14, 14, 14)
	pdf.SetAutoPageBreak(true, 16)
	pdf.SetTitle("Orçamento " + q.Title, true)
	pdf.AddPage()

	drawHeader(pdf, &q.Business, logoPath)
	drawQuoteMeta(pdf, q)
	drawCustomer(pdf, q)
	drawItems(pdf, q)
	drawTotals(pdf, q)
	drawDetails(pdf, q)
	drawTerms(pdf, q)
	drawFooter(pdf, q)

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("output pdf: %w", err)
	}
	return buf.Bytes(), nil
}

func drawHeader(pdf *fpdf.Fpdf, b *domain.Business, logoPath string) {
	pdf.SetFillColor(colorBlue, colorBlueG, colorBlueB)
	pdf.Rect(0, 0, 210, 40, "F")

	// Logo
	if logoPath != "" {
		if _, err := os.Stat(logoPath); err == nil {
			if info := pdf.RegisterImage(logoPath, ""); info != nil {
				h := 22 * info.Height() / info.Width()
				if h > 26 {
					h = 26
				}
				pdf.ImageOptions(logoPath, 170, 9, 22, h, false, fpdf.ImageOptions{}, 0, "")
			}
		}
	}

	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("helvetica", "B", 18)
	pdf.SetXY(14, 10)
	name := b.Name
	if name == "" {
		name = "Minha Empresa"
	}
	pdf.MultiCell(140, 9, name, "", "L", false)

	pdf.SetFont("helvetica", "", 9)
	pdf.SetXY(14, 22)
	var contact []string
	if b.Phone != "" {
		contact = append(contact, "Tel: "+b.Phone)
	}
	if b.WhatsApp != "" {
		contact = append(contact, "WhatsApp: "+b.WhatsApp)
	}
	if b.Email != "" {
		contact = append(contact, b.Email)
	}
	if b.Address != "" {
		contact = append(contact, b.Address)
	}
	pdf.MultiCell(150, 5, strings.Join(contact, "  |  "), "", "L", false)

	pdf.SetXY(14, 42)
	pdf.SetFillColor(colorOrange, colorOrangeG, colorOrangeB)
	pdf.Rect(0, 40, 210, 1.5, "F")
}

func drawQuoteMeta(pdf *fpdf.Fpdf, q *store.QuoteDetail) {
	pdf.SetTextColor(colorBlue, colorBlueG, colorBlueB)
	pdf.SetFont("helvetica", "B", 14)
	pdf.SetXY(14, 46)
	pdf.CellFormat(120, 8, "ORÇAMENTO", "", 0, "L", false, 0, "")

	pdf.SetTextColor(colorText, colorTextG, colorTextB)
	pdf.SetFont("helvetica", "", 9)
	pdf.SetXY(14, 55)
	pdf.CellFormat(120, 5, "Referência: "+shortSlug(q.Slug), "", 0, "L", false, 0, "")
	pdf.SetXY(14, 60)
	pdf.CellFormat(120, 5, "Emissão: "+formatDate(q.CreatedAt), "", 0, "L", false, 0, "")
	pdf.SetXY(14, 65)
	pdf.CellFormat(120, 5, "Validade: "+fmt.Sprintf("%d dias", q.ValidityDays), "", 0, "L", false, 0, "")
}

func drawCustomer(pdf *fpdf.Fpdf, q *store.QuoteDetail) {
	y := 76.0
	boxHeight := 26.0
	pdf.SetFillColor(244, 246, 250)
	pdf.Rect(14, y, 182, boxHeight, "F")
	pdf.SetDrawColor(colorBlue, colorBlueG, colorBlueB)
	pdf.Rect(14, y, 182, boxHeight, "D")

	pdf.SetTextColor(colorMuted, colorMutedG, colorMutedB)
	pdf.SetFont("helvetica", "B", 8)
	pdf.SetXY(18, y+3)
	pdf.CellFormat(60, 4, "CLIENTE", "", 0, "L", false, 0, "")

	pdf.SetTextColor(colorText, colorTextG, colorTextB)
	pdf.SetFont("helvetica", "B", 11)
	pdf.SetXY(18, y+8)
	pdf.CellFormat(150, 6, q.Customer.Name, "", 0, "L", false, 0, "")

	pdf.SetFont("helvetica", "", 8)
	pdf.SetXY(18, y+15)
	var lines []string
	if q.Customer.Phone != "" {
		lines = append(lines, "Telefone: "+q.Customer.Phone)
	}
	if q.Customer.Email != "" {
		lines = append(lines, "E-mail: "+q.Customer.Email)
	}
	if q.Customer.ServiceAddress != "" {
		lines = append(lines, "Endereço: "+q.Customer.ServiceAddress)
	}
	pdf.MultiCell(174, 4, strings.Join(lines, "   "), "", "L", false)
}

func drawItems(pdf *fpdf.Fpdf, q *store.QuoteDetail) {
	y := 108.0
	pdf.SetTextColor(colorText, colorTextG, colorTextB)
	pdf.SetFont("helvetica", "B", 10)
	pdf.SetXY(14, y)
	pdf.CellFormat(182, 7, "SERVIÇOS E MATERIAIS", "", 0, "L", false, 0, "")
	y += 8

	headerY := y
	pdf.SetFillColor(colorBlue, colorBlueG, colorBlueB)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("helvetica", "B", 8)
	drawTableHeader(pdf, headerY)
	y += 8

	pdf.SetFont("helvetica", "", 9)
	rowIndex := 0
	for _, item := range q.Items {
		if rowIndex%2 == 1 {
			pdf.SetFillColor(244, 246, 250)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}
		drawItemRow(pdf, item, y)
		y += 8
		rowIndex++
	}
}

func drawTableHeader(pdf *fpdf.Fpdf, y float64) {
	cols := []float64{8, 74, 20, 18, 30, 32}
	headers := []string{"#", "Descrição", "Unid.", "Qtd.", "Preço", "Total"}
	x := 14.0
	for i, c := range cols {
		align := "L"
		if i >= 2 {
			align = "C"
		}
		if i >= 4 {
			align = "R"
		}
		pdf.SetXY(x, y)
		pdf.CellFormat(c, 8, headers[i], "", 0, align, true, 0, "")
		x += c
	}
}

func drawItemRow(pdf *fpdf.Fpdf, item domain.QuoteItem, y float64) {
	cols := []float64{8, 74, 20, 18, 30, 32}
	x := 14.0
	pdf.SetXY(x, y)
	pdf.CellFormat(cols[0], 8, fmt.Sprintf("%d", 1), "", 0, "L", true, 0, "")
	x += cols[0]
	pdf.SetXY(x, y)
	desc := item.Name
	if item.Description != "" {
		desc += "\n" + item.Description
	}
	pdf.MultiCell(cols[1], 4, desc, "", "L", true)
	pdf.SetXY(x, y)
	x += cols[1]
	pdf.SetXY(x, y)
	pdf.CellFormat(cols[2], 8, item.Unit, "", 0, "C", true, 0, "")
	x += cols[2]
	pdf.SetXY(x, y)
	pdf.CellFormat(cols[3], 8, formatQty(item.Quantity), "", 0, "C", true, 0, "")
	x += cols[3]
	pdf.SetXY(x, y)
	pdf.CellFormat(cols[4], 8, formatMoney(item.UnitPrice), "", 0, "R", true, 0, "")
	x += cols[4]
	pdf.SetXY(x, y)
	pdf.CellFormat(cols[5], 8, formatMoney(item.Total), "", 0, "R", true, 0, "")
}

func drawTotals(pdf *fpdf.Fpdf, q *store.QuoteDetail) {
	y := pdf.GetY() + 4
	if y < 150 {
		y = 150
	}
	rowH := 7.0

	pdf.SetFont("helvetica", "", 9)
	pdf.SetTextColor(colorText, colorTextG, colorTextB)
	pdf.SetX(96)
	pdf.CellFormat(50, rowH, "Subtotal:", "", 0, "R", false, 0, "")
	pdf.SetX(146)
	pdf.CellFormat(50, rowH, formatMoney(q.Subtotal), "", 0, "R", false, 0, "")
	y += rowH

	if q.DiscountAmount > 0 {
		pdf.SetTextColor(colorOrange, colorOrangeG, colorOrangeB)
		pdf.SetX(96)
		pdf.CellFormat(50, rowH, "Desconto:", "", 0, "R", false, 0, "")
		pdf.SetX(146)
		pdf.CellFormat(50, rowH, "- "+formatMoney(q.DiscountAmount), "", 0, "R", false, 0, "")
		y += rowH
	}

	pdf.SetFillColor(colorBlue, colorBlueG, colorBlueB)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("helvetica", "B", 11)
	pdf.SetX(96)
	pdf.CellFormat(50, 9, "TOTAL:", "", 0, "R", true, 0, "")
	pdf.SetX(146)
	pdf.CellFormat(50, 9, formatMoney(q.Total), "", 0, "R", true, 0, "")
}

func drawDetails(pdf *fpdf.Fpdf, q *store.QuoteDetail) {
	y := pdf.GetY() + 8
	pdf.SetTextColor(colorText, colorTextG, colorTextB)
	pdf.SetFont("helvetica", "B", 9)
	pdf.SetXY(14, y)
	pdf.CellFormat(182, 6, "DETALHES", "", 0, "L", false, 0, "")
	y += 7

	pdf.SetFont("helvetica", "", 8)
	if q.ExecutionDays > 0 {
		pdf.SetXY(14, y)
		pdf.CellFormat(182, 5, "Prazo de execução: "+fmt.Sprintf("%d dia(s)", q.ExecutionDays), "", 0, "L", false, 0, "")
		y += 5
	}
	if q.PaymentConditions != "" {
		pdf.SetXY(14, y)
		pdf.MultiCell(182, 5, "Condições de pagamento: "+q.PaymentConditions, "", "L", false)
		y = pdf.GetY()
	}
	if q.Notes != "" {
		pdf.SetXY(14, y)
		pdf.MultiCell(182, 5, "Observações: "+q.Notes, "", "L", false)
		y = pdf.GetY()
	}
}

func drawTerms(pdf *fpdf.Fpdf, q *store.QuoteDetail) {
	if q.Business.TermsConditions == "" {
		return
	}
	y := pdf.GetY() + 6
	if pdf.GetY() > 235 {
		pdf.AddPage()
		y = 16
	}
	pdf.SetTextColor(colorMuted, colorMutedG, colorMutedB)
	pdf.SetFont("helvetica", "B", 8)
	pdf.SetXY(14, y)
	pdf.CellFormat(182, 5, "TERMOS E CONDIÇÕES", "", 0, "L", false, 0, "")
	pdf.SetFont("helvetica", "", 7)
	pdf.SetXY(14, y+5)
	pdf.MultiCell(182, 4, q.Business.TermsConditions, "", "L", false)
}

func drawFooter(pdf *fpdf.Fpdf, q *store.QuoteDetail) {
	y := 282.0
	pdf.SetDrawColor(colorBlue, colorBlueG, colorBlueB)
	pdf.Line(14, y, 196, y)
	pdf.SetTextColor(colorMuted, colorMutedG, colorMutedB)
	pdf.SetFont("helvetica", "", 7)
	pdf.SetXY(14, y+3)
	pdf.MultiCell(182, 4, "Documento gerado pelo OrçaPro — Crie orçamentos profissionais em 2 minutos.", "", "C", false)
}

func shortSlug(slug string) string {
	if len(slug) > 8 {
		return slug[:8]
	}
	return slug
}

func formatMoney(v float64) string {
	neg := v < 0
	if neg {
		v = -v
	}
	s := fmt.Sprintf("%.2f", v)
	parts := strings.Split(s, ".")
	intPart := parts[0]
	out := ""
	for i := len(intPart); i > 0; i-- {
		if i != len(intPart) && (len(intPart)-i)%3 == 0 {
			out = "." + out
		}
		out = string(intPart[i-1]) + out
	}
	res := "R$ " + out + "," + parts[1]
	if neg {
		res = "- " + res
	}
	return res
}

func formatQty(v float64) string {
	if v == float64(int64(v)) {
		return fmt.Sprintf("%d", int64(v))
	}
	return fmt.Sprintf("%.2f", v)
}

func formatDate(t time.Time) string {
	return t.Format("02/01/2006")
}
