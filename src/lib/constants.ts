import { BankName } from '@/types/finance'

export const BANK_CONFIGS: Record<
  BankName,
  {
    name: string
    bgGradient: string
    cardBg: string
    textColor: string
    chipColor: string
    accentColor: string
    logoText: string
    badgeBg: string
  }
> = {
  Nubank: {
    name: 'Nubank',
    bgGradient: 'from-[#820ad1] to-[#590792]',
    cardBg: '#820ad1',
    textColor: '#FFFFFF',
    chipColor: 'bg-white/20 text-white',
    accentColor: '#820ad1',
    logoText: 'Nu',
    badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300',
  },
  Caixa: {
    name: 'Caixa Econômica',
    bgGradient: 'from-[#003366] via-[#004b99] to-[#EC7000]',
    cardBg: '#003366',
    textColor: '#FFFFFF',
    chipColor: 'bg-orange-500/30 text-white',
    accentColor: '#003366',
    logoText: 'CAIXA',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
  },
  Itaú: {
    name: 'Itaú',
    bgGradient: 'from-[#EC7000] to-[#b35400]',
    cardBg: '#EC7000',
    textColor: '#FFFFFF',
    chipColor: 'bg-blue-900/40 text-white',
    accentColor: '#EC7000',
    logoText: 'Itaú',
    badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  },
  Bradesco: {
    name: 'Bradesco',
    bgGradient: 'from-[#CC092F] to-[#003D70]',
    cardBg: '#CC092F',
    textColor: '#FFFFFF',
    chipColor: 'bg-white/20 text-white',
    accentColor: '#CC092F',
    logoText: 'bradesco',
    badgeBg: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
  Santander: {
    name: 'Santander',
    bgGradient: 'from-[#EC0000] to-[#800000]',
    cardBg: '#EC0000',
    textColor: '#FFFFFF',
    chipColor: 'bg-white/20 text-white',
    accentColor: '#EC0000',
    logoText: 'Santander',
    badgeBg: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
  'Banco do Brasil': {
    name: 'Banco do Brasil',
    bgGradient: 'from-[#04388C] via-[#0549b6] to-[#FFE600]',
    cardBg: '#04388C',
    textColor: '#FFFFFF',
    chipColor: 'bg-yellow-400/30 text-yellow-100',
    accentColor: '#04388C',
    logoText: 'BB',
    badgeBg: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
  },
  Inter: {
    name: 'Inter',
    bgGradient: 'from-[#FF7A00] to-[#003D79]',
    cardBg: '#FF7A00',
    textColor: '#FFFFFF',
    chipColor: 'bg-black/20 text-white',
    accentColor: '#FF7A00',
    logoText: 'inter',
    badgeBg: 'bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300',
  },
  C6: {
    name: 'C6 Bank',
    bgGradient: 'from-[#111111] via-[#222222] to-[#FFD100]',
    cardBg: '#1f1f1f',
    textColor: '#FFD100',
    chipColor: 'bg-yellow-500/20 text-yellow-300',
    accentColor: '#FFD100',
    logoText: 'C6 BANK',
    badgeBg: 'bg-zinc-800 text-yellow-400',
  },
  Sicoob: {
    name: 'Sicoob',
    bgGradient: 'from-[#00A859] to-[#004C97]',
    cardBg: '#00A859',
    textColor: '#FFFFFF',
    chipColor: 'bg-white/20 text-white',
    accentColor: '#00A859',
    logoText: 'SICOOB',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
  },
  PicPay: {
    name: 'PicPay',
    bgGradient: 'from-[#00C77E] to-[#00A5F2]',
    cardBg: '#00C77E',
    textColor: '#FFFFFF',
    chipColor: 'bg-white/20 text-white',
    accentColor: '#00C77E',
    logoText: 'PicPay',
    badgeBg: 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
  },
  'Mercado Pago': {
    name: 'Mercado Pago',
    bgGradient: 'from-[#FFE600] via-[#009EE3] to-[#0072bb]',
    cardBg: '#009EE3',
    textColor: '#FFFFFF',
    chipColor: 'bg-yellow-400/30 text-white',
    accentColor: '#009EE3',
    logoText: 'Mercado Pago',
    badgeBg: 'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  },
  Neon: {
    name: 'Neon',
    bgGradient: 'from-[#7028E4] to-[#00E5FF]',
    cardBg: '#7028E4',
    textColor: '#FFFFFF',
    chipColor: 'bg-cyan-400/30 text-white',
    accentColor: '#7028E4',
    logoText: 'neon',
    badgeBg: 'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
  },
  'Banco CSF/Atacadão': {
    name: 'Banco CSF / Atacadão',
    bgGradient: 'from-[#D71920] to-[#800000]',
    cardBg: '#D71920',
    textColor: '#FFFFFF',
    chipColor: 'bg-white/20 text-white',
    accentColor: '#D71920',
    logoText: 'CSF Atacadão',
    badgeBg: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
  },
  Outro: {
    name: 'Outro Banco',
    bgGradient: 'from-slate-700 via-slate-800 to-slate-900',
    cardBg: '#334155',
    textColor: '#FFFFFF',
    chipColor: 'bg-white/20 text-white',
    accentColor: '#475569',
    logoText: 'Cartão',
    badgeBg: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300',
  },
}

export const CATEGORY_COLORS: Record<string, string> = {
  Alimentação: '#F59E0B',
  Salário: '#16A34A',
  Moradia: '#2563EB',
  Transporte: '#0EA5E9',
  Saúde: '#EF4444',
  Educação: '#8B5CF6',
  Lazer: '#EC4899',
  Assinaturas: '#6366F1',
  Luz: '#EAB308',
  Água: '#06B6D4',
  Combustível: '#F97316',
  'Taxas e tarifas': '#64748B',
  'Fatura de cartão': '#820AD1',
  Compras: '#10B981',
  Investimentos: '#0E9F6E',
  Outros: '#94A3B8',
}

export const CATEGORY_SUGGESTIONS = [
  'Alimentação',
  'Salário',
  'Moradia',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Assinaturas',
  'Luz',
  'Água',
  'Combustível',
  'Taxas e tarifas',
  'Compras',
  'Investimentos',
  'Outros',
]

export function formatCurrency(value: number | undefined | null, hideValue = false): string {
  if (hideValue) return 'R$ •••••'
  const val = Number(value || 0)
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(val)
}

export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '--/--/----'
  try {
    const clean = dateString.includes('T') ? dateString.split('T')[0] : dateString.split(' ')[0]
    const [year, month, day] = clean.split('-')
    if (!year || !month || !day) return dateString
    return `${day}/${month}/${year}`
  } catch (_) {
    return dateString
  }
}

export function formatMonthYear(monthStr: string): string {
  // "2025-05" -> "Maio de 2025"
  if (!monthStr || !monthStr.includes('-')) return monthStr
  const [year, month] = monthStr.split('-')
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1)
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
}
