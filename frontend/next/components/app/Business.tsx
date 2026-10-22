'use client'

import { useEffect, useState, type FormEvent } from 'react'
import Image from 'next/image'
import { api, buttonClass, fieldClass } from '@/lib/client-api'
import { Loading, Notice, Page, Panel } from './Page'

type BusinessData = { id: string; name: string; logoUrl: string; document: string; phone: string; whatsapp: string; email: string; address: string; primaryColor: string; secondaryColor: string; termsConditions: string }

export function Business() {
  const [data, setData] = useState<BusinessData | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => { api<BusinessData>('/api/business').then(setData).catch((err) => setError(err.message)) }, [])
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (!data) return
    setBusy(true); setError(''); setSuccess('')
    try { const updated = await api<BusinessData>('/api/business', { method: 'PUT', body: JSON.stringify(data) }); setData(updated); setSuccess('Dados do negócio salvos.') }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível salvar.') } finally { setBusy(false) }
  }
  async function upload(file: File | undefined) {
    if (!file) return
    const body = new FormData(); body.append('file', file)
    setError(''); setSuccess('')
    try { const result = await api<{ logoUrl: string }>('/api/business/logo', { method: 'POST', body }); setData((current) => current ? { ...current, logoUrl: result.logoUrl } : current); setSuccess('Logotipo atualizado.') }
    catch (err) { setError(err instanceof Error ? err.message : 'Não foi possível enviar o logotipo.') }
  }
  const update = (key: keyof BusinessData, value: string) => setData((current) => current ? { ...current, [key]: value } : current)
  return <Page title="Meu negócio" description="Esses dados aparecem nos orçamentos enviados aos clientes.">
    {error && <Notice>{error}</Notice>}{success && <Notice kind="success">{success}</Notice>}
    {!data ? <Loading /> : <form onSubmit={save} className="space-y-5"><Panel><h2 className="font-semibold text-gray-900">Identidade do negócio</h2><div className="mt-4 flex flex-wrap items-center gap-5">{data.logoUrl ? <Image src={data.logoUrl} alt="Logotipo do negócio" width={80} height={80} unoptimized className="size-20 rounded-2xl border border-gray-200 object-contain p-2" /> : <div className="flex size-20 items-center justify-center rounded-2xl bg-gray-100 text-xs text-gray-500">Sem logo</div>}<label className="text-sm font-medium text-gray-700">Enviar logotipo (PNG, JPEG ou WebP, até 2 MB)<input className="mt-2 block max-w-full text-sm" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => upload(event.target.files?.[0])} /></label></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><Field label="Nome do negócio" value={data.name} onChange={(value) => update('name', value)} required maxLength={160} /><Field label="CPF ou CNPJ" value={data.document} onChange={(value) => update('document', value)} maxLength={30} /><Field label="Telefone" value={data.phone} onChange={(value) => update('phone', value)} maxLength={40} /><Field label="WhatsApp" value={data.whatsapp} onChange={(value) => update('whatsapp', value)} maxLength={40} /><Field label="E-mail público" value={data.email} onChange={(value) => update('email', value)} type="email" maxLength={254} /><Field label="Endereço" value={data.address} onChange={(value) => update('address', value)} maxLength={300} /></div></Panel>
      <Panel><h2 className="font-semibold text-gray-900">Aparência e termos</h2><div className="mt-4 grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium text-gray-700">Cor principal<input className={`${fieldClass} h-12`} type="color" value={data.primaryColor} onChange={(event) => update('primaryColor', event.target.value)} /></label><label className="text-sm font-medium text-gray-700">Cor de destaque<input className={`${fieldClass} h-12`} type="color" value={data.secondaryColor} onChange={(event) => update('secondaryColor', event.target.value)} /></label></div><label className="mt-4 block text-sm font-medium text-gray-700">Termos e condições<textarea className={fieldClass} rows={5} maxLength={5000} value={data.termsConditions} onChange={(event) => update('termsConditions', event.target.value)} /></label></Panel>
      <div className="flex justify-end"><button className={buttonClass} disabled={busy}>{busy ? 'Salvando…' : 'Salvar alterações'}</button></div>
    </form>}
  </Page>
}

function Field({ label, value, onChange, type = 'text', required = false, maxLength }: { label: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean; maxLength?: number }) {
  return <label className="block text-sm font-medium text-gray-700">{label}<input className={fieldClass} type={type} value={value} required={required} maxLength={maxLength} onChange={(event) => onChange(event.target.value)} /></label>
}
