import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number.isFinite(value) ? value : 0)
}

export function formatNumber(value: number, decimals = 1): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Number.isFinite(value) ? value : 0)
}

export function formatDateBR(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const clean = dateStr.length === 10 ? `${dateStr}T12:00:00` : dateStr
    return format(parseISO(clean), 'dd/MM/yyyy', { locale: ptBR })
  } catch {
    return dateStr
  }
}

export function formatMonthYear(date: Date): string {
  const formatted = format(date, "MMMM 'de' yyyy", { locale: ptBR })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

export function formatShortMonth(date: Date): string {
  const formatted = format(date, 'MMM', { locale: ptBR })
  return formatted.charAt(0).toUpperCase() + formatted.slice(1).replace('.', '')
}

export function getTodayISO(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function getMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

export function getMonthRefDate(monthKey: string): string {
  return `${monthKey}-01`
}

export function getWhatsAppUrl(phone: string, text?: string): string {
  const digits = phone.replace(/\D/g, '')
  const withCountry = digits.startsWith('55') ? digits : `55${digits}`
  const encoded = text ? `?text=${encodeURIComponent(text)}` : ''
  return `https://wa.me/${withCountry}${encoded}`
}

export function getGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`
}

export function getGoogleMapsRouteUrl(addresses: string[]): string {
  if (addresses.length === 0) return 'https://www.google.com/maps'
  if (addresses.length === 1) return getGoogleMapsUrl(addresses[0])
  const destination = encodeURIComponent(addresses[addresses.length - 1])
  const waypoints = addresses
    .slice(0, -1)
    .map((a) => encodeURIComponent(a))
    .join('|')
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}&travelmode=driving`
}

export function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob(['\uFEFF' + content], { type: `${mimeType};charset=utf-8;` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
