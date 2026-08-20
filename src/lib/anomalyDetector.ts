import {
  Account,
  Bill,
  Budget,
  CategoryItem,
  CreditCard,
  Goal,
  Installment,
  Investment,
  Invoice,
  Recurrence,
  RecurringBill,
  Transaction,
} from '@/types/finance'
import { calculateCashFlowProjection, ProjectionSummary } from './projectionEngine'
import { calculateDreReport, calculateMonthlyComparative } from './dreEngine'
import { formatCurrency, formatDate } from './constants'

export type InsightPriority = 'CRITICO' | 'IMPORTANTE' | 'OPORTUNIDADE' | 'POSITIVO'

export interface FinancialAnomaly {
  id: string
  title: string
  description: string
  priority: InsightPriority
  category?: string
  diffValue?: number
  variationPct?: number
  detectedAt?: string
}

export interface FinancialOpportunity {
  id: string
  title: string
  description: string
  priority: 'OPORTUNIDADE'
  estimatedMonthlySavings?: number
  actionableStep?: string
}

export interface HealthScoreFactor {
  factor: string
  score: number
  maxScore: number
  status: 'positive' | 'warning' | 'negative'
  description: string
}

export interface HealthScoreResult {
  score: number // 0 a 100
  level: 'critica' | 'atencao' | 'boa' | 'excelente'
  levelLabel: string
  color: string
  bgColor: string
  factors: HealthScoreFactor[]
}

export interface WeeklyFinancialSummary {
  weekStart: string // YYYY-MM-DD
  weekEnd: string // YYYY-MM-DD
  weekLabel: string
  income: number
  expense: number
  result: number
  prevWeekIncome: number
  prevWeekExpense: number
  prevWeekResult: number
  expenseVariationPct: number
  incomeVariationPct: number
  topExpenseCategory: { category: string; value: number; percentage: number } | null
  fastestGrowingCategory: {
    category: string
    current: number
    previous: number
    diff: number
    pct: number
  } | null
  biggestIndividualExpense: {
    description: string
    value: number
    date: string
    category?: string
  } | null
  upcomingWeekBills: {
    description: string
    value: number
    dueDate: string
    type: 'pagar' | 'receber'
  }[]
  upcomingInvoices: { cardName: string; total: number; dueDate: string }[]
  budgetsStatus: { totalBudgets: number; warningCount: number; exceededCount: number }
  goalsStatus: { totalGoals: number; avgProgressPct: number }
  cashForecast30d: {
    projectedBalance: number
    isPositive: boolean
    hasRisk: boolean
    riskDate?: string
  }
  aiInsightText: string
  formattedSummaryText: string
}

export interface FinancialContextData {
  accounts: Account[]
  transactions: Transaction[]
  bills: Bill[]
  recurringBills: RecurringBill[]
  recurrences?: Recurrence[]
  installments: Installment[]
  invoices: Invoice[]
  creditCards?: CreditCard[]
  budgets: Budget[]
  goals: Goal[]
  investments: Investment[]
  customCategories?: CategoryItem[]
  currentMonthKey?: string
}

/**
 * Agrupa transações por mês (YYYY-MM) considerando apenas transações realizadas e operacionais.
 */
export function getMonthlyTotals(transactions: Transaction[]) {
  const map: Record<
    string,
    { income: number; expense: number; byCategory: Record<string, number>; txCount: number }
  > = {}

  transactions.forEach((t) => {
    if (t.status !== 'realizado') return
    if (t.type === 'ajuste' || t.source === 'ajuste' || t.category === 'Ajuste') return
    if (t.transfer_group_id || t.transfer_target_account || t.category === 'Transferência') return
    if (
      t.category === 'Fatura de cartão' ||
      t.category === 'Pagamento de fatura' ||
      t.description?.toLowerCase().includes('pagamento de fatura')
    ) {
      return
    }

    const ym = (t.date || '').slice(0, 7)
    if (!ym || ym.length < 7) return

    if (!map[ym]) {
      map[ym] = { income: 0, expense: 0, byCategory: {}, txCount: 0 }
    }

    const val = Number(t.value || 0)
    map[ym].txCount += 1
    const cat = (t.category || (t.type === 'receita' ? 'Outras Receitas' : 'Outros')).trim()

    if (t.type === 'receita') {
      map[ym].income += val
    } else if (t.type === 'despesa') {
      map[ym].expense += val
      map[ym].byCategory[cat] = (map[ym].byCategory[cat] || 0) + val
    }
  })

  return map
}

/**
 * 5. DETECÇÃO AUTOMÁTICA DE ANOMALIAS
 * Motor determinístico que calcula com base matemática estrita:
 * - Despesa muito acima da média (3 meses): variação > 30% gera alerta
 * - Categoria crescendo rapidamente (> 30% em relação à média 3 meses)
 * - Aumento de despesas recorrentes
 * - Queda relevante de receita (>20%)
 * - Piora da margem
 * - Orçamento > 80% consumido ou estourado
 * - Concentração de vencimentos (>3 na mesma data)
 * - Risco de saldo negativo (via projectionEngine)
 * - Aumento forte da fatura (>30%)
 * - Redução da capacidade de economia
 */
export function detectAnomalies(
  context: FinancialContextData,
  refMonthKey?: string,
): {
  anomalies: FinancialAnomaly[]
  hasEnoughHistory: boolean
  historyMonthsCount: number
} {
  const currentMonthKey = refMonthKey || new Date().toISOString().slice(0, 7)
  const [curY, curM] = currentMonthKey.split('-').map(Number)
  const monthlyData = getMonthlyTotals(context.transactions)

  // Identifica os últimos 3 meses anteriores ao mês atual
  const past3MonthsKeys: string[] = []
  for (let i = 1; i <= 3; i++) {
    const d = new Date(curY, curM - 1 - i, 1)
    const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    past3MonthsKeys.push(ym)
  }

  // Contar quantos dos meses anteriores têm histórico de transações
  const availablePastMonths = past3MonthsKeys.filter((k) => (monthlyData[k]?.txCount || 0) > 0)
  const hasEnoughHistory = availablePastMonths.length >= 2

  const anomalies: FinancialAnomaly[] = []

  // 1. ANOMALIAS CRÍTICAS DE CAIXA E CONTAS VENCIDAS (independentes de histórico longo)
  const todayStr = new Date().toISOString().slice(0, 10)
  const overdueBills = context.bills.filter(
    (b) => b.status !== 'pago' && (b.due_date || '').slice(0, 10) < todayStr,
  )
  if (overdueBills.length > 0) {
    const totalOverdue = overdueBills.reduce((acc, b) => acc + Number(b.value || 0), 0)
    anomalies.push({
      id: 'overdue-bills-critical',
      title: 'Contas e Boletos Vencidos',
      description: `Você possui ${overdueBills.length} conta(s) vencida(s) totalizando ${formatCurrency(totalOverdue)}. Regularize para evitar juros e multas.`,
      priority: 'CRITICO',
      diffValue: totalOverdue,
    })
  }

  // Projeção de fluxo de caixa 30 dias (Risco de saldo negativo)
  const forecast = calculateCashFlowProjection({
    accounts: context.accounts,
    transactions: context.transactions,
    bills: context.bills,
    recurringBills: context.recurringBills,
    recurrences: context.recurrences,
    installments: context.installments,
    invoices: context.invoices,
    days: 30,
  })

  if (forecast.risk.hasRisk && forecast.risk.firstNegativeDate) {
    anomalies.push({
      id: 'cashflow-negative-risk',
      title: 'Risco de Saldo Negativo nos Próximos 30 Dias',
      description: `Projeção indica saldo negativo de ${formatCurrency(Math.abs(forecast.risk.firstNegativeBalance || 0))} a partir de ${formatDate(forecast.risk.firstNegativeDate)}. Maior déficit previsto: ${formatCurrency(forecast.risk.maxDeficit)}.`,
      priority: 'CRITICO',
      diffValue: forecast.risk.maxDeficit,
    })
  }

  // Concentração de vencimentos (>3 na mesma data)
  const paymentsByDate: Record<string, { count: number; total: number; names: string[] }> = {}
  forecast.timelineEvents
    .filter((ev) => ev.type === 'expense' && !ev.isSimulation)
    .forEach((ev) => {
      if (!paymentsByDate[ev.date]) {
        paymentsByDate[ev.date] = { count: 0, total: 0, names: [] }
      }
      paymentsByDate[ev.date].count += 1
      paymentsByDate[ev.date].total += ev.value
      if (paymentsByDate[ev.date].names.length < 3) {
        paymentsByDate[ev.date].names.push(ev.description)
      }
    })

  Object.entries(paymentsByDate).forEach(([date, info]) => {
    if (info.count > 3) {
      anomalies.push({
        id: `concentrated-payments-${date}`,
        title: `Concentração de Vencimentos em ${formatDate(date)}`,
        description: `Existem ${info.count} pagamentos concentrados no mesmo dia, somando ${formatCurrency(info.total)} (${info.names.join(', ')}...).`,
        priority: 'IMPORTANTE',
        diffValue: info.total,
      })
    }
  })

  // Orçamentos ultrapassados e > 80%
  const curBudgets = context.budgets.filter((b) => b.month === currentMonthKey)
  curBudgets.forEach((b) => {
    const limit = Number(b.limit_value || 0)
    const spent = Number(b.spent || 0)
    const pct = b.percentage || (limit > 0 ? Math.round((spent / limit) * 100) : 0)

    if (pct >= 100) {
      anomalies.push({
        id: `budget-exceeded-${b.id}`,
        title: `Orçamento Ultrapassado: ${b.category}`,
        description: `Gastos de ${formatCurrency(spent)} ultrapassaram o teto de ${formatCurrency(limit)} (${pct}% consumido).`,
        priority: 'IMPORTANTE',
        category: b.category,
        diffValue: spent - limit,
        variationPct: pct - 100,
      })
    } else if (pct >= 80) {
      anomalies.push({
        id: `budget-warning-${b.id}`,
        title: `Orçamento Próximo do Limite: ${b.category}`,
        description: `Você já utilizou ${pct}% do limite mensal (${formatCurrency(spent)} de ${formatCurrency(limit)}).`,
        priority: 'IMPORTANTE',
        category: b.category,
        diffValue: spent,
        variationPct: pct,
      })
    }
  })

  // Aumento forte de faturas de cartão (>30% em relação ao limite ou à fatura anterior)
  ;(context.creditCards || []).forEach((c) => {
    const pctUsed = Number(c.used_percentage || 0)
    if (pctUsed > 80) {
      anomalies.push({
        id: `card-limit-high-${c.id}`,
        title: `Cartão ${c.name} com Limite Comprometido`,
        description: `Fatura atual consome ${pctUsed}% do limite total de ${formatCurrency(c.limit)}.`,
        priority: 'IMPORTANTE',
        diffValue: c.current_invoice_total,
        variationPct: pctUsed,
      })
    }
  })

  // 2. COMPARAÇÕES HISTÓRICAS DE 3 MESES (se houver histórico)
  if (hasEnoughHistory) {
    const currentMonthExpenses = monthlyData[currentMonthKey]?.expense || 0
    const currentMonthIncome = monthlyData[currentMonthKey]?.income || 0

    // Médias dos últimos meses disponíveis
    const pastMonthsCount = availablePastMonths.length
    const avgExpense3m =
      availablePastMonths.reduce((acc, k) => acc + (monthlyData[k]?.expense || 0), 0) /
      pastMonthsCount
    const avgIncome3m =
      availablePastMonths.reduce((acc, k) => acc + (monthlyData[k]?.income || 0), 0) /
      pastMonthsCount

    // Mês anterior direto
    const prevMonthKey = past3MonthsKeys[0]
    const prevMonthIncome = monthlyData[prevMonthKey]?.income || 0
    const prevMonthExpense = monthlyData[prevMonthKey]?.expense || 0

    // Queda relevante de receita (> 20%)
    if (prevMonthIncome > 0 && currentMonthIncome > 0) {
      const incomeDropPct = ((prevMonthIncome - currentMonthIncome) / prevMonthIncome) * 100
      if (incomeDropPct >= 20) {
        anomalies.push({
          id: 'income-drop-20pct',
          title: 'Queda Relevante de Receita',
          description: `Sua receita atual (${formatCurrency(currentMonthIncome)}) está ${incomeDropPct.toFixed(1)}% menor que a do mês anterior (${formatCurrency(prevMonthIncome)}).`,
          priority: 'IMPORTANTE',
          diffValue: prevMonthIncome - currentMonthIncome,
          variationPct: -incomeDropPct,
        })
      }
    } else if (avgIncome3m > 0 && currentMonthIncome > 0) {
      const incomeDropAvgPct = ((avgIncome3m - currentMonthIncome) / avgIncome3m) * 100
      if (incomeDropAvgPct >= 20) {
        anomalies.push({
          id: 'income-drop-avg-20pct',
          title: 'Receita Abaixo da Média',
          description: `Receita atual (${formatCurrency(currentMonthIncome)}) está ${incomeDropAvgPct.toFixed(1)}% abaixo da média dos últimos meses (${formatCurrency(avgIncome3m)}).`,
          priority: 'IMPORTANTE',
          diffValue: avgIncome3m - currentMonthIncome,
          variationPct: -incomeDropAvgPct,
        })
      }
    }

    // Despesa total muito acima da média (> 30%)
    if (avgExpense3m > 0 && currentMonthExpenses > avgExpense3m * 1.3) {
      const expIncreasePct = ((currentMonthExpenses - avgExpense3m) / avgExpense3m) * 100
      anomalies.push({
        id: 'total-expense-spike-30pct',
        title: 'Despesas Totais Acima da Média',
        description: `O total de despesas deste mês (${formatCurrency(currentMonthExpenses)}) está ${expIncreasePct.toFixed(1)}% acima da média histórica de ${formatCurrency(avgExpense3m)}.`,
        priority: 'IMPORTANTE',
        diffValue: currentMonthExpenses - avgExpense3m,
        variationPct: expIncreasePct,
      })
    }

    // Categorias com gasto muito acima da média (3 meses): variação > 30%
    const curCats = monthlyData[currentMonthKey]?.byCategory || {}
    const allCategories = new Set<string>()
    availablePastMonths.forEach((k) => {
      Object.keys(monthlyData[k]?.byCategory || {}).forEach((c) => allCategories.add(c))
    })
    Object.keys(curCats).forEach((c) => allCategories.add(c))

    allCategories.forEach((cat) => {
      const curVal = curCats[cat] || 0
      const totalPast = availablePastMonths.reduce(
        (acc, k) => acc + (monthlyData[k]?.byCategory?.[cat] || 0),
        0,
      )
      const avgCat = totalPast / pastMonthsCount

      if (avgCat > 50 && curVal > avgCat * 1.3) {
        const diff = curVal - avgCat
        const pct = ((curVal - avgCat) / avgCat) * 100
        anomalies.push({
          id: `category-spike-${cat}`,
          title: `Gasto Anômalo em ${cat}`,
          description: `Seu gasto médio com ${cat} era ${formatCurrency(avgCat)}/mês. Neste mês já chegou a ${formatCurrency(curVal)}, representando aumento de ${pct.toFixed(1)}%.`,
          priority: 'IMPORTANTE',
          category: cat,
          diffValue: diff,
          variationPct: pct,
        })
      }
    })

    // Piora de margem ou redução drástica de poupança
    const curDre = calculateDreReport(context.transactions, {
      month: currentMonthKey,
      customCategories: context.customCategories,
    })
    const prevDre = calculateDreReport(context.transactions, {
      month: prevMonthKey,
      customCategories: context.customCategories,
    })

    if (prevDre.margemLiquidaPct > 10 && curDre.margemLiquidaPct < prevDre.margemLiquidaPct - 15) {
      anomalies.push({
        id: 'margin-deterioration',
        title: 'Piora na Margem Líquida',
        description: `Sua margem líquida caiu de ${prevDre.margemLiquidaPct.toFixed(1)}% no mês anterior para ${curDre.margemLiquidaPct.toFixed(1)}% neste mês.`,
        priority: 'IMPORTANTE',
        variationPct: curDre.margemLiquidaPct - prevDre.margemLiquidaPct,
      })
    }
  }

  // Ordena por prioridade: CRITICO > IMPORTANTE > OPORTUNIDADE > POSITIVO
  const priorityWeight: Record<InsightPriority, number> = {
    CRITICO: 4,
    IMPORTANTE: 3,
    OPORTUNIDADE: 2,
    POSITIVO: 1,
  }
  anomalies.sort((a, b) => priorityWeight[b.priority] - priorityWeight[a.priority])

  return {
    anomalies,
    hasEnoughHistory,
    historyMonthsCount: availablePastMonths.length,
  }
}

/**
 * 7. OPORTUNIDADES DE ECONOMIA (Determinísticas e Neutras)
 * Identifica assinaturas recorrentes, categorias crescendo, gastos frequentes e orçamentos.
 * NUNCA afirma que uma despesa é "desnecessária".
 */
export function identifySavingsOpportunities(
  context: FinancialContextData,
): FinancialOpportunity[] {
  const opportunities: FinancialOpportunity[] = []

  // 1. Assinaturas e recorrências ativas
  const activeRecs = (context.recurringBills || []).filter((r) => r.active && r.type === 'pagar')
  const totalRecs = activeRecs.reduce((acc, r) => acc + Number(r.value || 0), 0)

  if (totalRecs > 0) {
    opportunities.push({
      id: 'active-subscriptions-review',
      title: 'Revisão de Assinaturas e Recorrências',
      description: `Você possui ${formatCurrency(totalRecs)} mensais em compromissos recorrentes ativos (${activeRecs.length} itens). Vale revisar se todos continuam sendo utilizados com frequência.`,
      priority: 'OPORTUNIDADE',
      estimatedMonthlySavings: totalRecs * 0.15,
      actionableStep: 'Acesse Recorrências para auditar serviços contratados.',
    })
  }

  // 2. Maior categoria de gasto com potencial de otimização de 10%
  const currentMonthKey = new Date().toISOString().slice(0, 7)
  const monthlyTotals = getMonthlyTotals(context.transactions)
  const curExpensesByCat = monthlyTotals[currentMonthKey]?.byCategory || {}
  const sortedCats = Object.entries(curExpensesByCat).sort((a, b) => b[1] - a[1])

  if (sortedCats.length > 0 && sortedCats[0][1] > 200) {
    const [topCat, topVal] = sortedCats[0]
    const potential10Pct = topVal * 0.1
    opportunities.push({
      id: `top-category-opt-${topCat}`,
      title: `Otimização em ${topCat}`,
      description: `Reduzir em 10% a categoria ${topCat} (atualmente em ${formatCurrency(topVal)}) representaria aproximadamente ${formatCurrency(potential10Pct)} de economia mensal.`,
      priority: 'OPORTUNIDADE',
      estimatedMonthlySavings: potential10Pct,
      actionableStep: `Defina um limite mensal para ${topCat} na aba Orçamentos.`,
    })
  }

  // 3. Gastos de baixo valor com alta frequência (micro-gastos)
  const recentExpenses = context.transactions.filter(
    (t) =>
      t.type === 'despesa' &&
      t.status === 'realizado' &&
      (t.date || '').startsWith(currentMonthKey),
  )
  const microExpenses = recentExpenses.filter(
    (t) => Number(t.value || 0) > 0 && Number(t.value || 0) <= 35,
  )
  if (microExpenses.length >= 8) {
    const microTotal = microExpenses.reduce((acc, t) => acc + Number(t.value || 0), 0)
    opportunities.push({
      id: 'micro-expenses-volume',
      title: 'Acompanhamento de Pequenos Gastos',
      description: `Identificados ${microExpenses.length} pequenos gastos (abaixo de R$ 35,00) que somam ${formatCurrency(microTotal)} este mês. O monitoramento desses lançamentos pode gerar folga no caixa.`,
      priority: 'OPORTUNIDADE',
      estimatedMonthlySavings: microTotal * 0.2,
      actionableStep: 'Monitore gastos diários de conveniência e delivery.',
    })
  }

  return opportunities
}

/**
 * 10. SAÚDE FINANCEIRA (Score Interno Determinístico 0 a 100)
 *
 * Fórmula determinística (mesmo dado = exatamente o mesmo resultado):
 * - Saldo positivo projetado 30 dias: 20 pontos (sim = 20, não = 0)
 * - Relação receita/despesa > 1 no mês: 20 pontos (se rec >= desp: 20, senão proporção (rec/desp)*20)
 * - Zero contas vencidas: 20 pontos (-5 por conta vencida, mínimo 0)
 * - Orçamentos dentro do limite: 15 pontos (-3 por orçamento estourado, mínimo 0)
 * - Capacidade de economia > 10%: 15 pontos (se taxa >= 10%: 15, senão (taxa/10)*15, min 0)
 * - Evolução positiva (mês atual > anterior): 10 pontos (resultado cur >= prev ? 10 : 0)
 * Total máximo = 100 pontos.
 */
export function calculateHealthScore(
  context: FinancialContextData,
  refMonthKey?: string,
): HealthScoreResult {
  const currentMonthKey = refMonthKey || new Date().toISOString().slice(0, 7)
  const [curY, curM] = currentMonthKey.split('-').map(Number)
  const prevDate = new Date(curY, curM - 2, 1)
  const prevMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  const monthlyTotals = getMonthlyTotals(context.transactions)
  const curIncome = monthlyTotals[currentMonthKey]?.income || 0
  const curExpense = monthlyTotals[currentMonthKey]?.expense || 0
  const prevIncome = monthlyTotals[prevMonthKey]?.income || 0
  const prevExpense = monthlyTotals[prevMonthKey]?.expense || 0

  const curResult = curIncome - curExpense
  const prevResult = prevIncome - prevExpense

  // 1. Saldo positivo projetado 30 dias (20 pts)
  const forecast = calculateCashFlowProjection({
    accounts: context.accounts,
    transactions: context.transactions,
    bills: context.bills,
    recurringBills: context.recurringBills,
    recurrences: context.recurrences,
    installments: context.installments,
    invoices: context.invoices,
    days: 30,
  })
  const factor1Score =
    forecast.isPositive && !forecast.risk.hasRisk ? 20 : forecast.isPositive ? 10 : 0
  const factor1: HealthScoreFactor = {
    factor: 'Saldo Projetado 30 Dias',
    score: factor1Score,
    maxScore: 20,
    status: factor1Score === 20 ? 'positive' : factor1Score > 0 ? 'warning' : 'negative',
    description: forecast.isPositive
      ? `Fluxo projetado positivo (${formatCurrency(forecast.projectedEndBalance)})`
      : `Risco de saldo negativo (${formatCurrency(forecast.projectedEndBalance)})`,
  }

  // 2. Relação receita/despesa no mês (20 pts)
  let factor2Score = 0
  if (curIncome > 0 && curExpense === 0) {
    factor2Score = 20
  } else if (curIncome >= curExpense && curIncome > 0) {
    factor2Score = 20
  } else if (curExpense > 0 && curIncome > 0) {
    factor2Score = Math.max(0, Math.min(20, Math.round((curIncome / curExpense) * 20)))
  } else {
    factor2Score = 10 // neutro se sem dados
  }
  const factor2: HealthScoreFactor = {
    factor: 'Receitas vs. Despesas do Mês',
    score: factor2Score,
    maxScore: 20,
    status: factor2Score >= 18 ? 'positive' : factor2Score >= 10 ? 'warning' : 'negative',
    description:
      curIncome >= curExpense
        ? `Receitas (${formatCurrency(curIncome)}) superam despesas (${formatCurrency(curExpense)})`
        : `Despesas (${formatCurrency(curExpense)}) superam receitas (${formatCurrency(curIncome)})`,
  }

  // 3. Zero contas vencidas (20 pts, -5 por conta vencida, mín 0)
  const todayStr = new Date().toISOString().slice(0, 10)
  const overdueBills = context.bills.filter(
    (b) => b.status !== 'pago' && (b.due_date || '').slice(0, 10) < todayStr,
  )
  const factor3Score = Math.max(0, 20 - overdueBills.length * 5)
  const factor3: HealthScoreFactor = {
    factor: 'Compromissos em Dia',
    score: factor3Score,
    maxScore: 20,
    status: overdueBills.length === 0 ? 'positive' : factor3Score > 10 ? 'warning' : 'negative',
    description:
      overdueBills.length === 0
        ? 'Nenhuma conta ou boleto vencido'
        : `${overdueBills.length} conta(s) vencida(s) pendente(s)`,
  }

  // 4. Orçamentos dentro do limite (15 pts, -3 por orçamento estourado, mín 0)
  const curBudgets = context.budgets.filter((b) => b.month === currentMonthKey)
  const exceededBudgets = curBudgets.filter((b) => {
    const limit = Number(b.limit_value || 0)
    const spent = Number(b.spent || 0)
    return limit > 0 && spent > limit
  })
  const factor4Score = curBudgets.length === 0 ? 15 : Math.max(0, 15 - exceededBudgets.length * 3)
  const factor4: HealthScoreFactor = {
    factor: 'Cumprimento de Orçamentos',
    score: factor4Score,
    maxScore: 15,
    status: exceededBudgets.length === 0 ? 'positive' : factor4Score >= 9 ? 'warning' : 'negative',
    description:
      curBudgets.length === 0
        ? 'Sem orçamentos estourados'
        : exceededBudgets.length === 0
          ? 'Todos os orçamentos dentro do limite'
          : `${exceededBudgets.length} categoria(s) estouraram o orçamento`,
  }

  // 5. Capacidade de economia > 10% (15 pts)
  const savingsRate = curIncome > 0 ? ((curIncome - curExpense) / curIncome) * 100 : 0
  let factor5Score = 0
  if (savingsRate >= 10) {
    factor5Score = 15
  } else if (savingsRate > 0) {
    factor5Score = Math.max(0, Math.min(15, Math.round((savingsRate / 10) * 15)))
  } else {
    factor5Score = 0
  }
  const factor5: HealthScoreFactor = {
    factor: 'Capacidade de Poupança',
    score: factor5Score,
    maxScore: 15,
    status: factor5Score >= 12 ? 'positive' : factor5Score > 0 ? 'warning' : 'negative',
    description:
      savingsRate > 0
        ? `Taxa de poupança atual em ${savingsRate.toFixed(1)}%`
        : 'Sem sobra financeira positiva no mês corrente',
  }

  // 6. Evolução positiva (mês atual >= anterior: 10 pts)
  const evolutionPositive = curResult >= prevResult || (prevResult === 0 && curResult >= 0)
  const factor6Score = evolutionPositive ? 10 : 0
  const factor6: HealthScoreFactor = {
    factor: 'Evolução Mensal',
    score: factor6Score,
    maxScore: 10,
    status: factor6Score === 10 ? 'positive' : 'warning',
    description: evolutionPositive
      ? `Resultado líquido (${formatCurrency(curResult)}) melhor ou estável vs mês anterior (${formatCurrency(prevResult)})`
      : `Resultado líquido (${formatCurrency(curResult)}) inferior ao mês anterior (${formatCurrency(prevResult)})`,
  }

  const totalScore = Math.max(
    0,
    Math.min(
      100,
      factor1Score + factor2Score + factor3Score + factor4Score + factor5Score + factor6Score,
    ),
  )

  let level: HealthScoreResult['level'] = 'critica'
  let levelLabel = 'Crítica'
  let color = 'text-red-600'
  let bgColor = 'bg-red-50 dark:bg-red-950/40'

  if (totalScore >= 80) {
    level = 'excelente'
    levelLabel = 'Excelente'
    color = 'text-emerald-600'
    bgColor = 'bg-emerald-50 dark:bg-emerald-950/40'
  } else if (totalScore >= 60) {
    level = 'boa'
    levelLabel = 'Boa'
    color = 'text-green-600'
    bgColor = 'bg-green-50 dark:bg-green-950/40'
  } else if (totalScore >= 40) {
    level = 'atencao'
    levelLabel = 'Atenção'
    color = 'text-amber-600'
    bgColor = 'bg-amber-50 dark:bg-amber-950/40'
  }

  return {
    score: totalScore,
    level,
    levelLabel,
    color,
    bgColor,
    factors: [factor1, factor2, factor3, factor4, factor5, factor6],
  }
}

/**
 * 8. ANÁLISE SEMANAL AUTOMÁTICA
 * Gera resumo estruturado da semana atual ou de uma semana específica.
 */
export function generateWeeklySummary(
  context: FinancialContextData,
  referenceDate: Date = new Date(),
): WeeklyFinancialSummary {
  // Calcula início (segunda-feira) e fim (domingo) da semana de referência
  const ref = new Date(referenceDate)
  ref.setHours(0, 0, 0, 0)
  const dayOfWeek = ref.getDay() // 0 = dom, 1 = seg...
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1) - dayOfWeek
  const monday = new Date(ref)
  monday.setDate(ref.getDate() + diffToMonday)

  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)

  const prevMonday = new Date(monday)
  prevMonday.setDate(monday.getDate() - 7)
  const prevSunday = new Date(prevMonday)
  prevSunday.setDate(prevMonday.getDate() + 6)

  const toIso = (d: Date) => d.toISOString().slice(0, 10)
  const weekStart = toIso(monday)
  const weekEnd = toIso(sunday)
  const prevWeekStart = toIso(prevMonday)
  const prevWeekEnd = toIso(prevSunday)

  const weekLabel = `${monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} a ${sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`

  // Transações desta semana
  const currentWeekTxns = context.transactions.filter((t) => {
    if (t.status !== 'realizado') return false
    if (t.transfer_group_id || t.category === 'Transferência' || t.type === 'ajuste') return false
    const d = (t.date || '').slice(0, 10)
    return d >= weekStart && d <= weekEnd
  })

  // Transações da semana anterior
  const prevWeekTxns = context.transactions.filter((t) => {
    if (t.status !== 'realizado') return false
    if (t.transfer_group_id || t.category === 'Transferência' || t.type === 'ajuste') return false
    const d = (t.date || '').slice(0, 10)
    return d >= prevWeekStart && d <= prevWeekEnd
  })

  // Totais da semana
  const income = currentWeekTxns
    .filter((t) => t.type === 'receita')
    .reduce((acc, t) => acc + Number(t.value || 0), 0)
  const expense = currentWeekTxns
    .filter((t) => t.type === 'despesa')
    .reduce((acc, t) => acc + Number(t.value || 0), 0)
  const result = income - expense

  const prevWeekIncome = prevWeekTxns
    .filter((t) => t.type === 'receita')
    .reduce((acc, t) => acc + Number(t.value || 0), 0)
  const prevWeekExpense = prevWeekTxns
    .filter((t) => t.type === 'despesa')
    .reduce((acc, t) => acc + Number(t.value || 0), 0)
  const prevWeekResult = prevWeekIncome - prevWeekExpense

  const expenseVariationPct =
    prevWeekExpense > 0
      ? ((expense - prevWeekExpense) / prevWeekExpense) * 100
      : expense > 0
        ? 100
        : 0
  const incomeVariationPct =
    prevWeekIncome > 0 ? ((income - prevWeekIncome) / prevWeekIncome) * 100 : income > 0 ? 100 : 0

  // Categorias desta semana e semana anterior
  const curCatMap: Record<string, number> = {}
  currentWeekTxns
    .filter((t) => t.type === 'despesa')
    .forEach((t) => {
      const c = t.category || 'Outros'
      curCatMap[c] = (curCatMap[c] || 0) + Number(t.value || 0)
    })

  const prevCatMap: Record<string, number> = {}
  prevWeekTxns
    .filter((t) => t.type === 'despesa')
    .forEach((t) => {
      const c = t.category || 'Outros'
      prevCatMap[c] = (prevCatMap[c] || 0) + Number(t.value || 0)
    })

  const sortedCats = Object.entries(curCatMap).sort((a, b) => b[1] - a[1])
  const topExpenseCategory =
    sortedCats.length > 0
      ? {
          category: sortedCats[0][0],
          value: sortedCats[0][1],
          percentage: expense > 0 ? (sortedCats[0][1] / expense) * 100 : 0,
        }
      : null

  // Categoria que mais aumentou
  const allCatNames = Array.from(new Set([...Object.keys(curCatMap), ...Object.keys(prevCatMap)]))
  const growthList = allCatNames
    .map((c) => {
      const cur = curCatMap[c] || 0
      const prev = prevCatMap[c] || 0
      const diff = cur - prev
      const pct = prev > 0 ? (diff / prev) * 100 : cur > 0 ? 100 : 0
      return { category: c, current: cur, previous: prev, diff, pct }
    })
    .filter((g) => g.diff > 0)
    .sort((a, b) => b.diff - a.diff)

  const fastestGrowingCategory = growthList[0] || null

  // Maior despesa individual da semana
  const singleExpenses = currentWeekTxns
    .filter((t) => t.type === 'despesa')
    .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
  const biggestIndividualExpense =
    singleExpenses.length > 0
      ? {
          description: singleExpenses[0].description,
          value: Number(singleExpenses[0].value || 0),
          date: singleExpenses[0].date,
          category: singleExpenses[0].category,
        }
      : null

  // Contas da próxima semana (segunda a domingo seguintes)
  const nextMonday = new Date(sunday)
  nextMonday.setDate(sunday.getDate() + 1)
  const nextSunday = new Date(nextMonday)
  nextSunday.setDate(nextMonday.getDate() + 6)
  const nextMondayStr = toIso(nextMonday)
  const nextSundayStr = toIso(nextSunday)

  const upcomingWeekBills = context.bills
    .filter((b) => {
      if (b.status === 'pago') return false
      const d = (b.due_date || '').slice(0, 10)
      return d >= nextMondayStr && d <= nextSundayStr
    })
    .map((b) => ({
      description: b.description,
      value: Number(b.value || 0),
      dueDate: b.due_date,
      type: (b.type || 'pagar') as 'pagar' | 'receber',
    }))

  // Faturas próximas de cartão
  const upcomingInvoices = context.invoices
    .filter((inv) => {
      if (inv.status === 'paga') return false
      const d = (inv.due_date || '').slice(0, 10)
      return d >= weekStart && d <= nextSundayStr
    })
    .map((inv) => ({
      cardName: inv.expand?.credit_card?.name || 'Cartão',
      total: Number(inv.total || 0),
      dueDate: inv.due_date || '',
    }))

  // Situação de orçamentos e metas
  const curMonthKey = weekStart.slice(0, 7)
  const monthBudgets = context.budgets.filter((b) => b.month === curMonthKey)
  const warningCount = monthBudgets.filter(
    (b) => (b.percentage || 0) >= 80 && (b.percentage || 0) < 100,
  ).length
  const exceededCount = monthBudgets.filter((b) => (b.percentage || 0) >= 100).length

  const avgProgressPct =
    context.goals.length > 0
      ? Math.round(
          context.goals.reduce((acc, g) => acc + Number(g.percentage || 0), 0) /
            context.goals.length,
        )
      : 0

  // Previsão 30 dias
  const forecast = calculateCashFlowProjection({
    accounts: context.accounts,
    transactions: context.transactions,
    bills: context.bills,
    recurringBills: context.recurringBills,
    recurrences: context.recurrences,
    installments: context.installments,
    invoices: context.invoices,
    days: 30,
  })

  // Monta insight da IA e texto formatado padrão conforme especificação:
  // RESUMO DA SEMANA
  // Entrou: R$ X.XXX | Saiu: R$ X.XXX | Resultado: +R$ XXX
  // Comparado à semana anterior: Despesas ↓ X%
  // MAIOR GASTO: [categoria] — R$ XXX
  // ATENÇÃO: [alerta relevante]
  // PREVISÃO: [status do fluxo de caixa]
  // INSIGHT SEMEIA: [análise baseada em dados reais]

  const varSign = expenseVariationPct >= 0 ? '↑' : '↓'
  const varAbs = Math.abs(expenseVariationPct).toFixed(1)

  const alertLine =
    upcomingWeekBills.length > 0
      ? `${upcomingWeekBills.length} conta(s) a vencer na próxima semana totalizando ${formatCurrency(upcomingWeekBills.reduce((acc, b) => acc + b.value, 0))}.`
      : upcomingInvoices.length > 0
        ? `Fatura ${upcomingInvoices[0].cardName} de ${formatCurrency(upcomingInvoices[0].total)} próxima do vencimento.`
        : exceededCount > 0
          ? `${exceededCount} orçamento(s) estourado(s) este mês.`
          : 'Nenhum alerta crítico para a semana.'

  const forecastLine = forecast.isPositive
    ? `Fluxo de caixa saudável. Saldo projetado de ${formatCurrency(forecast.projectedEndBalance)} em 30 dias.`
    : `Atenção: previsão de saldo negativo (${formatCurrency(forecast.projectedEndBalance)}) nos próximos 30 dias.`

  let aiInsight = ''
  if (result >= 0) {
    aiInsight = `Semana finalizada com saldo positivo de ${formatCurrency(result)}. ${topExpenseCategory ? `Sua maior concentração foi em ${topExpenseCategory.category} (${topExpenseCategory.percentage.toFixed(0)}% do total).` : ''} Mantenha o ritmo para fechar o mês no azul.`
  } else {
    aiInsight = `Saídas superaram entradas em ${formatCurrency(Math.abs(result))} nesta semana. ${fastestGrowingCategory ? `A categoria ${fastestGrowingCategory.category} teve aumento de ${fastestGrowingCategory.pct.toFixed(0)}% vs semana anterior.` : ''} Recomenda-se cautela nos próximos dias.`
  }

  const formattedSummaryText = `
RESUMO DA SEMANA (${weekLabel})
Entrou: ${formatCurrency(income)} | Saiu: ${formatCurrency(expense)} | Resultado: ${result >= 0 ? '+' : ''}${formatCurrency(result)}

Comparado à semana anterior: Despesas ${varSign} ${varAbs}%

MAIOR GASTO: ${topExpenseCategory ? `${topExpenseCategory.category} — ${formatCurrency(topExpenseCategory.value)}` : 'Sem despesas registradas'}

ATENÇÃO: ${alertLine}

PREVISÃO: ${forecastLine}

INSIGHT SEMEIA: ${aiInsight}
  `.trim()

  return {
    weekStart,
    weekEnd,
    weekLabel,
    income,
    expense,
    result,
    prevWeekIncome,
    prevWeekExpense,
    prevWeekResult,
    expenseVariationPct,
    incomeVariationPct,
    topExpenseCategory,
    fastestGrowingCategory,
    biggestIndividualExpense,
    upcomingWeekBills,
    upcomingInvoices,
    budgetsStatus: {
      totalBudgets: monthBudgets.length,
      warningCount,
      exceededCount,
    },
    goalsStatus: {
      totalGoals: context.goals.length,
      avgProgressPct,
    },
    cashForecast30d: {
      projectedBalance: forecast.projectedEndBalance,
      isPositive: forecast.isPositive,
      hasRisk: forecast.risk.hasRisk,
      riskDate: forecast.risk.firstNegativeDate || undefined,
    },
    aiInsightText: aiInsight,
    formattedSummaryText,
  }
}

/**
 * 4. RESPOSTA DETERMINÍSTICA COM RACIOCÍNIO PARA SIMULAÇÃO DE COMPRAS
 * "Posso gastar R$ X agora?"
 */
export function evaluateCanSpendPurchase(
  purchaseValue: number,
  context: FinancialContextData,
  days: number = 30,
): {
  startingBalance: number
  totalIncome30d: number
  totalExpense30d: number
  balanceWithoutPurchase: number
  balanceWithPurchase: number
  willBeNegative: number | false
  reasoningText: string
} {
  const pWithout = calculateCashFlowProjection({
    accounts: context.accounts,
    transactions: context.transactions,
    bills: context.bills,
    recurringBills: context.recurringBills,
    recurrences: context.recurrences,
    installments: context.installments,
    invoices: context.invoices,
    days,
  })

  const pWith = calculateCashFlowProjection({
    accounts: context.accounts,
    transactions: context.transactions,
    bills: context.bills,
    recurringBills: context.recurringBills,
    recurrences: context.recurrences,
    installments: context.installments,
    invoices: context.invoices,
    days,
    simulation: {
      value: purchaseValue,
      date: new Date().toISOString().slice(0, 10),
      type: 'expense',
    },
  })

  const willBeNegative = pWith.projectedEndBalance < 0 ? Math.abs(pWith.projectedEndBalance) : false

  const reasoningText = `Hoje você possui ${formatCurrency(pWithout.startingBalance)} disponíveis em contas.
Nos próximos ${days} dias: Entradas previstas de ${formatCurrency(pWithout.totalIncome)} e Saídas previstas de ${formatCurrency(pWithout.totalExpense)}.
Sem a compra: Saldo projetado de ${formatCurrency(pWithout.projectedEndBalance)}.
Com a despesa adicional de ${formatCurrency(purchaseValue)}: Saldo projetado de ${formatCurrency(pWith.projectedEndBalance)}.
${
  willBeNegative
    ? `Pelos dados registrados, essa compra deixaria seu caixa negativo em aproximadamente ${formatCurrency(willBeNegative)} nos próximos ${days} dias.`
    : `Pelos compromissos atualmente cadastrados, essa compra não deixaria seu caixa negativo nos próximos ${days} dias.`
}`

  return {
    startingBalance: pWithout.startingBalance,
    totalIncome30d: pWithout.totalIncome,
    totalExpense30d: pWithout.totalExpense,
    balanceWithoutPurchase: pWithout.projectedEndBalance,
    balanceWithPurchase: pWith.projectedEndBalance,
    willBeNegative,
    reasoningText,
  }
}
