import pb from '@/lib/pocketbase/client'
import type {
  Transaction,
  Account,
  CreditCard,
  Bill,
  Budget,
  Goal,
  Investment,
} from '@/types/finance'

// Contexto enviado para a IA no backend. Sem dados sensíveis (senhas, tokens).
export interface AiAdvisorContext {
  mes: string
  receitas: number
  despesas: number
  saldo: number
  taxaEconomia: number
  topCategorias: Array<{ categoria: string; valor: number; percentual: number }>
  orcamentosAcima80: Array<{
    categoria: string
    percentual: number
    gasto: number
    limite: number
  }>
  cartoes: {
    totalFaturas: number
    cartoesEstourados: Array<{ nome: string; usadoPct: number }>
  }
  contasVencidas: Array<{ descricao: string; valor: number; vencimento: string }>
  contasProximas: Array<{ descricao: string; valor: number; vencimento: string }>
  metas: Array<{
    nome: string
    alvo: number
    acumulado: number
    progressoPct: number
  }>
  investimentos: {
    patrimonio: number
    rentabilidadePct: number
    aportes: Array<{ nome: string; tipo: string; valorAtual: number }>
  }
  tendencia: Array<{ mes: string; receitas: number; despesas: number }>
  saldoContas: number
}

export function buildAiContext(args: {
  transactions: Transaction[]
  accounts: Account[]
  creditCards: CreditCard[]
  bills: Bill[]
  budgets: Budget[]
  goals: Goal[]
  investments: Investment[]
  totalInvested: number
  totalInvestmentsResult: number
}): AiAdvisorContext {
  const {
    transactions,
    accounts,
    creditCards,
    bills,
    budgets,
    goals,
    investments,
    totalInvested,
    totalInvestmentsResult,
  } = args

  const currentMonthKey = new Date().toISOString().slice(0, 7)
  const todayStr = new Date().toISOString().slice(0, 10)

  const monthTxns = transactions.filter((t) => (t.date || '').startsWith(currentMonthKey))
  const receitas = monthTxns
    .filter((t) => t.type === 'receita' && t.status === 'realizado')
    .reduce((acc, t) => acc + Number(t.value || 0), 0)
  const despesas = monthTxns
    .filter((t) => t.type === 'despesa' && t.status === 'realizado')
    .reduce((acc, t) => acc + Number(t.value || 0), 0)
  const saldo = receitas - despesas
  const taxaEconomia = receitas > 0 ? (saldo / receitas) * 100 : 0

  // Top 5 categorias
  const catMap: Record<string, number> = {}
  monthTxns
    .filter((t) => t.type === 'despesa' && t.status === 'realizado')
    .forEach((t) => {
      const c = t.category || 'Outros'
      catMap[c] = (catMap[c] || 0) + Number(t.value || 0)
    })
  const topCategorias = Object.entries(catMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([categoria, valor]) => ({
      categoria,
      valor,
      percentual: despesas > 0 ? (valor / despesas) * 100 : 0,
    }))

  // Orçamentos acima de 80%
  const orcamentosAcima80 = budgets
    .filter((b) => b.month === currentMonthKey && (b.percentage || 0) >= 80)
    .sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
    .slice(0, 6)
    .map((b) => ({
      categoria: b.category,
      percentual: b.percentage || 0,
      gasto: b.spent || 0,
      limite: b.limit_value || 0,
    }))

  // Cartões
  const totalFaturas = creditCards.reduce((acc, c) => acc + (c.current_invoice_total || 0), 0)
  const cartoesEstourados = creditCards
    .filter((c) => (c.used_percentage || 0) > 80)
    .map((c) => ({ nome: c.name, usadoPct: c.used_percentage || 0 }))

  // Contas vencidas e próximas
  const pending = bills.filter((b) => b.status !== 'pago')
  const contasVencidas = pending
    .filter((b) => (b.due_date || '').slice(0, 10) < todayStr)
    .slice(0, 5)
    .map((b) => ({
      descricao: b.description,
      valor: Number(b.value || 0),
      vencimento: (b.due_date || '').slice(0, 10),
    }))
  const contasProximas = pending
    .filter((b) => (b.due_date || '').slice(0, 10) >= todayStr)
    .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''))
    .slice(0, 5)
    .map((b) => ({
      descricao: b.description,
      valor: Number(b.value || 0),
      vencimento: (b.due_date || '').slice(0, 10),
    }))

  // Metas
  const metas = goals.slice(0, 6).map((g) => ({
    nome: g.name,
    alvo: Number(g.target_value || 0),
    acumulado: Number(g.accumulated || 0),
    progressoPct: Number(g.percentage || 0),
  }))

  // Investimentos
  const patrimonio = totalInvested + totalInvestmentsResult
  const rentabilidadePct = totalInvested > 0 ? (totalInvestmentsResult / totalInvested) * 100 : 0
  const aportes = investments.slice(0, 8).map((inv) => ({
    nome: inv.name,
    tipo: inv.type,
    valorAtual: Number(inv.current_total_value || inv.applied_value || 0),
  }))

  // Tendência últimos 3 meses
  const now = new Date()
  const tendencia: Array<{ mes: string; receitas: number; despesas: number }> = []
  for (let i = 2; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const mk = d.toISOString().slice(0, 7)
    const txns = transactions.filter((t) => (t.date || '').startsWith(mk))
    tendencia.push({
      mes: mk,
      receitas: txns
        .filter((t) => t.type === 'receita' && t.status === 'realizado')
        .reduce((acc, t) => acc + Number(t.value || 0), 0),
      despesas: txns
        .filter((t) => t.type === 'despesa' && t.status === 'realizado')
        .reduce((acc, t) => acc + Number(t.value || 0), 0),
    })
  }

  const saldoContas = accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0)

  return {
    mes: currentMonthKey,
    receitas,
    despesas,
    saldo,
    taxaEconomia,
    topCategorias,
    orcamentosAcima80,
    cartoes: { totalFaturas, cartoesEstourados },
    contasVencidas,
    contasProximas,
    metas,
    investimentos: { patrimonio, rentabilidadePct, aportes },
    tendencia,
    saldoContas,
  }
}

export interface AiAdvisorResult {
  content: string
  offline: boolean
  error?: string
}

export async function askAiAdvisor(
  message: string,
  context: AiAdvisorContext,
  source: 'quick' | 'chat' = 'chat',
): Promise<AiAdvisorResult> {
  const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/ai/advisor`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: pb.authStore.token,
    },
    body: JSON.stringify({ message, context, source }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    return {
      content: data?.error || 'Não foi possível obter a análise agora.',
      offline: true,
      error: data?.error,
    }
  }
  return {
    content: data.content || '',
    offline: !!data.offline,
    error: data.error,
  }
}
