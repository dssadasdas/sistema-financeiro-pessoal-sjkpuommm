import type { BankName } from '@/types/finance'

export interface ParsedItem {
  id: string
  date: string
  description: string
  category: string
  value: number
  installments: string
}

export interface ParseResult {
  detectedBank: BankName
  referenceMonth: string
  dueDate: string
  detectedTotal: number
  items: ParsedItem[]
}

// ----- Detecção de banco por palavra-chave -----
const BANK_KEYWORDS: { bank: BankName; keywords: string[] }[] = [
  { bank: 'Nubank', keywords: ['Nubank', 'Nu Pagamentos', 'nu bank'] },
  { bank: 'Itaú', keywords: ['Itaú', 'Itaucard', 'Itau'] },
  { bank: 'Bradesco', keywords: ['Bradesco', 'Bradescard'] },
  { bank: 'Santander', keywords: ['Santander', 'Sancard'] },
  { bank: 'Banco do Brasil', keywords: ['Banco do Brasil', 'BB ', 'Cartão BB'] },
  { bank: 'Caixa', keywords: ['Caixa', 'Caixa Econômica'] },
  { bank: 'Inter', keywords: ['Inter', 'Banco Inter'] },
  { bank: 'C6', keywords: ['C6 Bank', 'C6'] },
  { bank: 'Sicoob', keywords: ['Sicoob'] },
  { bank: 'PicPay', keywords: ['PicPay'] },
  { bank: 'Mercado Pago', keywords: ['Mercado Pago', 'MercadoPago'] },
  { bank: 'Neon', keywords: ['Neon'] },
]

export function detectBankFromText(text: string, fallback: BankName = 'Outro'): BankName {
  const lower = text.toLowerCase()
  for (const entry of BANK_KEYWORDS) {
    if (entry.keywords.some((k) => lower.includes(k.toLowerCase()))) {
      return entry.bank
    }
  }
  return fallback
}

// ----- Categorização automática por palavra-chave -----
const CATEGORY_RULES: { category: string; keywords: string[] }[] = [
  { category: 'Luz', keywords: ['coelba', 'neoenergia', 'enel', 'light', 'cpfl'] },
  { category: 'Água', keywords: ['embasa', 'sabesp', 'sanepar', 'casan', 'água'] },
  {
    category: 'Alimentação',
    keywords: [
      'ifood',
      'rap',
      'zé delivery',
      'supermercado',
      'mercado',
      'restaurante',
      'padaria',
      'panificadora',
      'lanchonete',
      'café',
    ],
  },
  {
    category: 'Combustível',
    keywords: ['posto', 'shell', 'i piranga', 'ipiranga', 'petrobras', 'ale ', 'combustível'],
  },
  { category: 'Transporte', keywords: ['uber', '99', 'táxi', 'taxi', 'transporte'] },
  {
    category: 'Educação',
    keywords: ['escola', 'colégio', 'colegio', 'faculdade', 'universidade', 'curso', 'udemy'],
  },
  {
    category: 'Saúde',
    keywords: [
      'farmácia',
      'drogaria',
      'drogasil',
      'pacheco',
      'clínica',
      'clinica',
      'hospital',
      'laboratório',
      'laboratorio',
    ],
  },
  {
    category: 'Assinaturas',
    keywords: [
      'netflix',
      'spotify',
      'amazon prime',
      'disney',
      'hbo',
      'max ',
      'streaming',
      'youtube',
    ],
  },
  {
    category: 'Compras',
    keywords: [
      'amazon',
      'mercado livre',
      'mercadolivre',
      'magalu',
      'magazine luiza',
      'shopee',
      'shein',
      'aliexpress',
      'riachuelo',
      'zara',
      'renner',
      'c&a',
    ],
  },
  {
    category: 'Taxas e tarifas',
    keywords: ['iof', 'anuidade', 'encargos', 'tarifa', 'juros', 'multa'],
  },
]

export function categorizeByKeyword(description: string): string {
  const lower = description.toLowerCase()
  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return rule.category
    }
  }
  return 'Outros'
}

// Aplica regras aprendidas (localStorage) e regras do servidor
export function categorizeWithRules(
  description: string,
  learnedRules: Record<string, string>,
  serverRules: { keyword: string; category: string }[] = [],
): string {
  const lower = description.toLowerCase()
  // Regras aprendidas locais (match por palavra no estabelecimento)
  for (const [keyword, cat] of Object.entries(learnedRules)) {
    if (lower.includes(keyword.toLowerCase())) return cat
  }
  // Regras do servidor
  for (const r of serverRules) {
    if (lower.includes(r.keyword.toLowerCase())) return r.category
  }
  return categorizeByKeyword(description)
}

// ----- Utilitários de número/data -----
function parseBRLNumber(raw: string): number | null {
  if (!raw) return null
  let s = raw.replace(/[R$\s]/g, '')
  // Se houver ponto e vírgula, assume formato pt-BR (1.234,56)
  if (s.includes(',') && s.includes('.')) {
    s = s.replace(/\./g, '').replace(',', '.')
  } else if (s.includes(',')) {
    s = s.replace(',', '.')
  }
  const n = parseFloat(s)
  return isNaN(n) ? null : n
}

function parseDateDDMMYYYY(raw: string, referenceYear?: number): string | null {
  const m = raw.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/)
  if (!m) return null
  const day = m[1].padStart(2, '0')
  const month = m[2].padStart(2, '0')
  let year = m[3]
  if (!year) year = String(referenceYear || new Date().getFullYear())
  if (year.length === 2) year = '20' + year
  return `${year}-${month}-${day}`
}

// ----- Extração do total da fatura -----
export function detectInvoiceTotal(text: string): number {
  const patterns = [
    /total\s*(?:da\s*)?fatura[:\s]*R?\$?\s*([\d.,]+)/i,
    /valor\s*total[:\s]*R?\$?\s*([\d.,]+)/i,
    /fatura\s*atual[:\s]*R?\$?\s*([\d.,]+)/i,
    /total\s*a\s*pagar[:\s]*R?\$?\s*([\d.,]+)/i,
  ]
  for (const p of patterns) {
    const m = text.match(p)
    if (m) {
      const n = parseBRLNumber(m[1])
      if (n !== null && n > 0) return n
    }
  }
  return 0
}

export function detectReferenceMonth(text: string): string {
  const now = new Date().toISOString().slice(0, 7)
  const m = text.match(/(\d{2})\/(\d{4})/)
  if (m) return `${m[2]}-${m[1]}`
  const m2 = text.match(/vencimento[:\s]*\d{1,2}\/(\d{1,2})\/(\d{2,4})/i)
  if (m2) {
    let year = m2[2]
    if (year.length === 2) year = '20' + year
    return `${year}-${m2[1].padStart(2, '0')}`
  }
  return now
}

// ----- Parsers -----
interface RawLine {
  date: string | null
  description: string
  value: number | null
  installments: string
}

// Parser A: linhas "DD/MM Descrição R$ valor" ou "DD/MM/YYYY Descrição valor"
function parseLinesStyleA(text: string): RawLine[] {
  const lines = text.split(/\r?\n/)
  const out: RawLine[] = []
  const valueRegex = /R?\$?\s*([\d.,]+)$/
  const installRegex = /(\d+)\s*\/\s*(\d+)/
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (/^\s*(total|fatura|saldo|limite|pagamento recebido|encerramento)/i.test(trimmed)) continue
    const dateMatch = trimmed.match(/^(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)\s+(.*)$/)
    if (!dateMatch) continue
    const rest = dateMatch[2]
    const valueMatch = rest.match(valueRegex)
    if (!valueMatch) continue
    const value = parseBRLNumber(valueMatch[1])
    if (value === null) continue
    let description = rest.slice(0, rest.length - valueMatch[0].length).trim()
    let installments = ''
    const instMatch = description.match(installRegex)
    if (instMatch) {
      installments = `${instMatch[1]}/${instMatch[2]}`
      description = description.replace(installRegex, '').trim()
    }
    out.push({
      date: parseDateDDMMYYYY(dateMatch[1]),
      description,
      value,
      installments,
    })
  }
  return out
}

// Parser B: linhas tabulares "Descrição ... DD/MM valor" (data no meio/fim)
function parseLinesStyleB(text: string): RawLine[] {
  const lines = text.split(/\r?\n/)
  const out: RawLine[] = []
  const valueRegex = /R?\$?\s*([\d.,]+)\s*$/
  const dateRegex = /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (/^\s*(total|fatura|saldo|limite|pagamento|encerramento)/i.test(trimmed)) continue
    const valueMatch = trimmed.match(valueRegex)
    if (!valueMatch) continue
    const value = parseBRLNumber(valueMatch[1])
    if (value === null || value <= 0) continue
    const dateMatch = trimmed.match(dateRegex)
    let description = trimmed.replace(valueRegex, '').trim()
    let installments = ''
    const instMatch = description.match(/(\d+)\s*\/\s*(\d+)/)
    if (instMatch) {
      // só considera parcelas se for pequeno número
      if (parseInt(instMatch[1]) <= 60 && parseInt(instMatch[2]) <= 60) {
        installments = `${instMatch[1]}/${instMatch[2]}`
        description = description.replace(/(\d+)\s*\/\s*(\d+)/, '').trim()
      }
    }
    if (dateMatch) {
      description = description
        .replace(dateMatch[0], '')
        .replace(/\s{2,}/g, ' ')
        .trim()
    }
    out.push({
      date: dateMatch ? parseDateDDMMYYYY(dateMatch[1]) : null,
      description,
      value,
      installments,
    })
  }
  return out
}

function chooseBestParse(text: string, targetTotal: number): RawLine[] {
  const candidates = [parseLinesStyleA(text), parseLinesStyleB(text)]
  let best: RawLine[] = []
  let bestDiff = Infinity
  for (const c of candidates) {
    if (c.length === 0) continue
    const sum = c.reduce((a, b) => a + (b.value || 0), 0)
    const diff = Math.abs(sum - targetTotal)
    if (diff < bestDiff) {
      bestDiff = diff
      best = c
    }
  }
  // Se não há total alvo, escolhe o com mais itens
  if (targetTotal === 0) {
    best = candidates.reduce((a, b) => (b.length > a.length ? b : a), [] as RawLine[])
  }
  return best
}

function rawToParsed(
  raws: RawLine[],
  opts: {
    learnedRules: Record<string, string>
    serverRules: { keyword: string; category: string }[]
  },
): ParsedItem[] {
  const today = new Date().toISOString().slice(0, 10)
  return raws
    .filter((r) => r.value !== null && r.value !== 0 && r.description.length > 1)
    .map((r, i) => ({
      id: `parsed-${i}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: r.date || today,
      description: r.description || 'Compra',
      category: categorizeWithRules(r.description || '', opts.learnedRules, opts.serverRules),
      value: Math.abs(r.value as number),
      installments: r.installments || '',
    }))
}

// ----- API pública: parseTexto -----
export function parseInvoiceText(
  text: string,
  opts: {
    learnedRules?: Record<string, string>
    serverRules?: { keyword: string; category: string }[]
    bankHint?: BankName
  } = {},
): ParseResult {
  const detectedBank = detectBankFromText(text, opts.bankHint || 'Outro')
  const referenceMonth = detectReferenceMonth(text)
  const detectedTotal = detectInvoiceTotal(text)
  const dueDate = referenceMonth + '-22'
  const raws = chooseBestParse(text, detectedTotal)
  const items = rawToParsed(raws, {
    learnedRules: opts.learnedRules || {},
    serverRules: opts.serverRules || [],
  })
  return { detectedBank, referenceMonth, dueDate, detectedTotal, items }
}

// ----- Leitura de PDF via pdfjs-dist -----
export async function extractTextFromPdf(file: File, password?: string): Promise<string> {
  const pdfjs = await import('pdfjs-dist')
  // Configura worker via URL do módulo (compatível com Vite)
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/build/pdf.worker.min.mjs',
    import.meta.url,
  ).toString()
  const arrayBuffer = await file.arrayBuffer()
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    password: password || '',
  })
  const pdf = await loadingTask.promise
  let fullText = ''
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const content = await page.getTextContent()
    const strings = content.items.map((it: any) => ('str' in it ? it.str : ''))
    fullText += strings.join(' ') + '\n'
  }
  return fullText
}

// ----- OCR de imagem via tesseract.js -----
export async function extractTextFromImage(
  file: File,
  onProgress?: (p: number) => void,
): Promise<string> {
  const Tesseract = await import('tesseract.js')
  const imageUrl = URL.createObjectURL(file)
  try {
    const { data } = await Tesseract.recognize(imageUrl, 'por', {
      logger: (m: any) => {
        if (m.status === 'recognizing text' && typeof m.progress === 'number') {
          onProgress?.(m.progress)
        }
      },
    })
    return data.text || ''
  } finally {
    URL.revokeObjectURL(imageUrl)
  }
}

// ----- Roteador de extração por tipo de arquivo -----
export async function extractTextFromFile(
  file: File,
  opts: { pdfPassword?: string; onOcrProgress?: (p: number) => void } = {},
): Promise<string> {
  const name = file.name.toLowerCase()
  if (name.endsWith('.pdf') || file.type === 'application/pdf') {
    return extractTextFromPdf(file, opts.pdfPassword)
  }
  if (name.endsWith('.csv') || name.endsWith('.txt') || file.type.startsWith('text/')) {
    return file.text()
  }
  if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|bmp)$/.test(name)) {
    return extractTextFromImage(file, opts.onOcrProgress)
  }
  // Fallback: tenta ler como texto
  try {
    return await file.text()
  } catch (_) {
    return ''
  }
}

// ----- localStorage para regras aprendidas -----
const LEARNED_RULES_KEY = 'raiz_learned_categories'

export function loadLearnedRules(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LEARNED_RULES_KEY) || '{}')
  } catch (_) {
    return {}
  }
}

export function saveLearnedRule(keyword: string, category: string) {
  const rules = loadLearnedRules()
  const key = keyword.trim().toLowerCase()
  if (key) {
    rules[key] = category
    localStorage.setItem(LEARNED_RULES_KEY, JSON.stringify(rules))
  }
}

// ----- localStorage para olho por cartão -----
const CARD_EYE_KEY = 'raiz_card_hidden'

export function loadCardHiddenStates(): Record<string, boolean> {
  try {
    return JSON.parse(localStorage.getItem(CARD_EYE_KEY) || '{}')
  } catch (_) {
    return {}
  }
}

export function setCardHiddenState(cardId: string, hidden: boolean) {
  const states = loadCardHiddenStates()
  if (hidden) {
    states[cardId] = true
  } else {
    delete states[cardId]
  }
  localStorage.setItem(CARD_EYE_KEY, JSON.stringify(states))
}
