import {
  Account,
  Bill,
  Invoice,
  RecurringBill,
  Recurrence,
  Installment,
  Transaction,
} from '@/types/finance'

export interface ProjectionEvent {
  id: string
  date: string // YYYY-MM-DD
  description: string
  value: number // always positive magnitude
  type: 'income' | 'expense'
  category?: string
  source:
    | 'transaction'
    | 'bill'
    | 'recurring_bill'
    | 'recurrence'
    | 'installment'
    | 'invoice'
    | 'simulation'
  sourceId?: string
  runningBalance: number // accumulated projected balance AFTER this event
  isSimulation?: boolean
}

export interface DayProjection {
  date: string // YYYY-MM-DD
  dayLabel: string // DD/MM
  startBalance: number
  incomeTotal: number
  expenseTotal: number
  endBalance: number
  isNegative: boolean
  events: ProjectionEvent[]
}

export interface RiskAnalysis {
  hasRisk: boolean
  firstNegativeDate: string | null // YYYY-MM-DD or DD/MM
  firstNegativeDayLabel: string | null // DD/MM
  firstNegativeBalance: number | null
  maxDeficit: number // worst negative balance magnitude (e.g. 1000 for -1000)
  maxDeficitDate: string | null
  negativeDaysCount: number
}

export interface ProjectionSimulation {
  value: number
  date: string // YYYY-MM-DD
  type: 'income' | 'expense' // 'income' = receita extra, 'expense' = despesa extra
}

export interface ProjectionSummary {
  startingBalance: number
  totalIncome: number
  totalExpense: number
  projectedEndBalance: number
  isPositive: boolean
  timelineEvents: ProjectionEvent[]
  dailyProjections: DayProjection[]
  risk: RiskAnalysis
  simulationApplied?: boolean
  originalSummary?: {
    totalIncome: number
    totalExpense: number
    projectedEndBalance: number
  }
}

export interface ProjectionEngineInput {
  accounts: Account[]
  transactions: Transaction[]
  bills: Bill[]
  recurringBills: RecurringBill[]
  recurrences?: Recurrence[]
  installments: Installment[]
  invoices: Invoice[]
  days: 30 | 60 | 90 | number
  startDate?: string // YYYY-MM-DD, defaults to today
  simulation?: ProjectionSimulation | null
}

/**
 * Utilitário de formatação de data YYYY-MM-DD
 */
export function toISODate(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function formatDayMonth(isoDate: string): string {
  if (!isoDate) return ''
  const parts = isoDate.split('-')
  if (parts.length < 3) return isoDate
  return `${parts[2]}/${parts[1]}`
}

/**
 * MOTOR CENTRAL DE CÁLCULO DA PROJEÇÃO FINANCEIRA (FLUXO DE CAIXA PROJETADO)
 *
 * Regras implementadas:
 * 1. Saldo consolidado inicial = soma de `current_balance` de todas as contas (ou saldo inicial + tx realizadas)
 * 2. Período: de hoje até hoje + (days - 1)
 * 3. Anti-duplicidade estrita:
 *    - Transferências entre contas são ignoradas (não alteram saldo consolidado).
 *    - Transações realizadas / pagas NÃO entram como eventos futuros.
 *    - Boleto (bill) vinculado a transação (por bill.generated_transaction ou transaction.bill_id) é contabilizado UMA ÚNICA VEZ.
 *    - Compras parceladas dentro de faturas de cartão NÃO são duplicadas (usa-se a fatura como fonte).
 *    - Recorrências (recurring_bills/recurrences) que já geraram transação ou conta no período são desduplicadas.
 * 4. Detecção de risco: identifica primeiro dia negativo, maior déficit e quantidade de dias no vermelho.
 * 5. Simulador 'E se?': adiciona evento temporário sem salvar no banco de dados.
 */
export function calculateCashFlowProjection(input: ProjectionEngineInput): ProjectionSummary {
  const {
    accounts,
    transactions,
    bills,
    recurringBills,
    recurrences = [],
    installments,
    invoices,
    days = 30,
    startDate,
    simulation,
  } = input

  const baseToday = startDate ? new Date(startDate + 'T00:00:00') : new Date()
  const todayStr = toISODate(baseToday)
  const endDateObj = new Date(baseToday)
  endDateObj.setDate(endDateObj.getDate() + (days - 1))
  const endDateStr = toISODate(endDateObj)

  // 1. Saldo Consolidado Inicial Real (soma dos saldos das contas)
  // Se current_balance já foi computado no context, usa-o; senão calcula a partir de opening_balance + tx realizadas.
  const startingBalance = accounts.reduce((acc, account) => {
    if (typeof account.current_balance === 'number') {
      return acc + account.current_balance
    }
    let bal = Number(account.opening_balance || 0)
    const accTxns = transactions.filter((t) => t.account === account.id)
    accTxns.forEach((t) => {
      const val = Number(t.value || 0)
      if (t.status === 'realizado') {
        if (t.type === 'receita') bal += val
        else if (t.type === 'despesa') bal -= val
        else if (t.type === 'ajuste') bal = val
      }
    })
    return acc + bal
  }, 0)

  // Conjuntos para controle anti-duplicidade
  const processedBillIds = new Set<string>()
  const processedTxIds = new Set<string>()
  const coveredRecurringMonthlyKeys = new Set<string>() // "recId_YYYY-MM"
  const coveredInstallmentMonths = new Set<string>() // "instId_YYYY-MM"

  type RawItem = {
    date: string
    description: string
    value: number
    type: 'income' | 'expense'
    category?: string
    source: ProjectionEvent['source']
    sourceId?: string
    priority: number // para ordenação estável no mesmo dia (receitas antes de despesas ou vice-versa)
  }

  const rawEvents: RawItem[] = []

  // A) Transações pendentes (type='income' ou type='despesa') com data dentro do período
  transactions.forEach((tx) => {
    if (tx.status !== 'pendente') return
    // Transferências entre contas não alteram saldo consolidado
    if (tx.transfer_group_id || tx.category === 'Transferência') return

    const txDate = (tx.date || '').slice(0, 10)
    if (!txDate || txDate < todayStr || txDate > endDateStr) return

    const val = Number(tx.value || 0)
    if (val <= 0) return

    // Se a transação é vinculada a um boleto (bill_id), anota para evitar duplicar
    if (tx.bill_id) {
      processedBillIds.add(tx.bill_id)
    }

    // Se a transação pertence a um grupo de parcelamento no cartão de crédito,
    // e já temos faturas de cartão como fonte de despesa de crédito, ignoramos
    // para não duplicar com a fatura do cartão
    if (tx.source === 'parcela' && tx.credit_card) {
      return
    }

    // Se é transação gerada por recorrência, anota a chave
    if (tx.source === 'recorrência') {
      const ym = txDate.slice(0, 7)
      coveredRecurringMonthlyKeys.add(`${tx.description}_${ym}`)
    }

    processedTxIds.add(tx.id)

    rawEvents.push({
      date: txDate,
      description:
        tx.description || (tx.type === 'receita' ? 'Receita Prevista' : 'Despesa Prevista'),
      value: val,
      type: tx.type === 'receita' ? 'income' : 'expense',
      category: tx.category,
      source: 'transaction',
      sourceId: tx.id,
      priority: tx.type === 'receita' ? 1 : 2,
    })
  })

  // B) Boletos e Contas pendentes (bills com status != 'pago') com vencimento dentro do período
  bills.forEach((b) => {
    if (b.status === 'pago') return

    const dueDate = (b.due_date || '').slice(0, 10)
    if (!dueDate || dueDate < todayStr || dueDate > endDateStr) return

    // Anti-duplicidade: se já processamos transação vinculada a esse boleto
    if (processedBillIds.has(b.id)) return
    if (b.generated_transaction && processedTxIds.has(b.generated_transaction)) return

    const val = Number(b.value || 0)
    if (val <= 0) return

    const isReceita = b.type === 'receber'
    processedBillIds.add(b.id)

    if (b.recurring_bill) {
      const ym = dueDate.slice(0, 7)
      coveredRecurringMonthlyKeys.add(`${b.recurring_bill}_${ym}`)
    }

    rawEvents.push({
      date: dueDate,
      description: b.description || (isReceita ? 'Boleto a Receber' : 'Boleto / Conta a Pagar'),
      value: val,
      type: isReceita ? 'income' : 'expense',
      category: b.category,
      source: 'bill',
      sourceId: b.id,
      priority: isReceita ? 1 : 2,
    })
  })

  // C) Faturas de cartão de crédito (invoices com status='aberta' / 'open' / 'pending' e due_date no período)
  invoices.forEach((inv) => {
    if (inv.status === 'paga') return

    const dueDate = (inv.due_date || '').slice(0, 10)
    if (!dueDate || dueDate < todayStr || dueDate > endDateStr) return

    const val = Number(inv.total || 0)
    if (val <= 0) return

    const cardName = inv.expand?.credit_card?.name || 'Cartão'
    rawEvents.push({
      date: dueDate,
      description: `Fatura ${cardName}`,
      value: val,
      type: 'expense',
      category: 'Cartão de Crédito',
      source: 'invoice',
      sourceId: inv.id,
      priority: 3,
    })
  })

  // D) Receitas e Despesas Recorrentes previstas (recurring_bills e recurrences ativas)
  // Gera ocorrências para os meses no período que ainda não foram geradas
  const processRecurring = (
    recId: string,
    desc: string,
    val: number,
    type: 'income' | 'expense',
    dueDay: number,
    cat?: string,
    active: boolean = true,
  ) => {
    if (!active || val <= 0) return

    // Itera por todos os meses no range
    let current = new Date(baseToday.getFullYear(), baseToday.getMonth(), 1)
    const end = new Date(endDateObj.getFullYear(), endDateObj.getMonth() + 1, 1)

    while (current < end) {
      const year = current.getFullYear()
      const month = current.getMonth()
      const ym = `${year}-${String(month + 1).padStart(2, '0')}`

      // Último dia do mês
      const lastDayOfMonth = new Date(year, month + 1, 0).getDate()
      const actualDay = Math.min(dueDay || 1, lastDayOfMonth)
      const eventDate = `${ym}-${String(actualDay).padStart(2, '0')}`

      if (eventDate >= todayStr && eventDate <= endDateStr) {
        // Anti-duplicidade: verifica se já gerou transação ou boleto
        const keyWithId = `${recId}_${ym}`
        const keyWithDesc = `${desc}_${ym}`
        if (
          !coveredRecurringMonthlyKeys.has(keyWithId) &&
          !coveredRecurringMonthlyKeys.has(keyWithDesc)
        ) {
          coveredRecurringMonthlyKeys.add(keyWithId)
          rawEvents.push({
            date: eventDate,
            description: desc || (type === 'income' ? 'Receita Recorrente' : 'Despesa Recorrente'),
            value: val,
            type,
            category: cat,
            source: 'recurring_bill',
            sourceId: recId,
            priority: type === 'income' ? 1 : 2,
          })
        }
      }
      current = new Date(year, month + 1, 1)
    }
  }

  recurringBills.forEach((rb) => {
    if (!rb.active && rb.active !== undefined) return
    const isReceber = rb.type === 'receber'
    processRecurring(
      rb.id,
      rb.description,
      Number(rb.value || 0),
      isReceber ? 'income' : 'expense',
      Number(rb.due_day || 1),
      rb.category,
      rb.active,
    )
  })

  recurrences.forEach((rc) => {
    if (!rc.active && rc.active !== undefined) return
    processRecurring(
      rc.id,
      rc.description,
      Number(rc.value || 0),
      rc.type === 'receita' ? 'income' : 'expense',
      Number(rc.due_day || 1),
      rc.category,
      rc.active,
    )
  })

  // E) Parcelamentos futuros que NÃO são em cartão de crédito (ex: parcelamento direto/boleto/promissória)
  // Compras em cartão já entram na fatura do cartão
  installments.forEach((inst) => {
    // Se o parcelamento tem cartão de crédito associado, a cobrança vem via fatura de cartão -> NÃO contabilizar separadamente
    if (inst.credit_card) return

    const total = Number(inst.total_installments || 1)
    const current = Number(inst.current_installment || 1)
    const parcelVal = Number(
      inst.installment_value || (inst.total_value ? inst.total_value / total : 0),
    )
    if (parcelVal <= 0) return

    // Data de início
    const startDateRaw = inst.start_date ? inst.start_date.slice(0, 10) : todayStr
    const [startYear, startMonth, startDay] = startDateRaw.split('-').map(Number)

    for (let p = current; p <= total; p++) {
      const monthOffset = p - current
      const d = new Date(startYear, startMonth - 1 + monthOffset, startDay || 1)
      const pDateStr = toISODate(d)

      if (pDateStr >= todayStr && pDateStr <= endDateStr) {
        const ym = pDateStr.slice(0, 7)
        const key = `${inst.id}_${ym}`
        if (!coveredInstallmentMonths.has(key)) {
          coveredInstallmentMonths.add(key)
          rawEvents.push({
            date: pDateStr,
            description: `${inst.description} (${p}/${total})`,
            value: parcelVal,
            type: 'expense',
            category: inst.category || 'Parcelamento',
            source: 'installment',
            sourceId: inst.id,
            priority: 2,
          })
        }
      }
    }
  })

  // F) Simulação "E se?"
  if (simulation && simulation.value > 0) {
    const simDate = (simulation.date || todayStr).slice(0, 10)
    if (simDate >= todayStr && simDate <= endDateStr) {
      rawEvents.push({
        date: simDate,
        description:
          simulation.type === 'income' ? 'Simulação: Receita Extra' : 'Simulação: Despesa Extra',
        value: Number(simulation.value),
        type: simulation.type,
        category: 'Simulação',
        source: 'simulation',
        priority: simulation.type === 'income' ? 0 : 4,
      })
    }
  }

  // Ordena os eventos por data ascendente e depois por prioridade
  rawEvents.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return a.priority - b.priority
  })

  // 4. Constrói a linha do tempo (timeline) com saldo acumulado após cada evento
  let running = startingBalance
  let totalIncome = 0
  let totalExpense = 0

  const timelineEvents: ProjectionEvent[] = rawEvents.map((ev, idx) => {
    if (ev.type === 'income') {
      running += ev.value
      totalIncome += ev.value
    } else {
      running -= ev.value
      totalExpense += ev.value
    }

    return {
      id: ev.sourceId ? `${ev.source}-${ev.sourceId}-${idx}` : `event-${idx}`,
      date: ev.date,
      description: ev.description,
      value: ev.value,
      type: ev.type,
      category: ev.category,
      source: ev.source,
      sourceId: ev.sourceId,
      runningBalance: running,
      isSimulation: ev.source === 'simulation',
    }
  })

  const projectedEndBalance = running
  const isPositive = projectedEndBalance >= 0

  // 5. Constrói a projeção diária dia a dia para o gráfico
  const dailyProjections: DayProjection[] = []
  let dayRunning = startingBalance
  let firstNegativeDate: string | null = null
  let firstNegativeDayLabel: string | null = null
  let firstNegativeBalance: number | null = null
  let maxDeficit = 0
  let maxDeficitDate: string | null = null
  let negativeDaysCount = 0

  const cursorDate = new Date(baseToday)
  for (let i = 0; i < days; i++) {
    const dStr = toISODate(cursorDate)
    const dayLabel = formatDayMonth(dStr)
    const dayEvents = timelineEvents.filter((ev) => ev.date === dStr)

    const dayIncome = dayEvents
      .filter((ev) => ev.type === 'income')
      .reduce((acc, ev) => acc + ev.value, 0)
    const dayExpense = dayEvents
      .filter((ev) => ev.type === 'expense')
      .reduce((acc, ev) => acc + ev.value, 0)

    const startBal = dayRunning
    dayRunning = startBal + dayIncome - dayExpense
    const isNegative = dayRunning < 0

    if (isNegative) {
      negativeDaysCount++
      if (!firstNegativeDate) {
        firstNegativeDate = dStr
        firstNegativeDayLabel = dayLabel
        firstNegativeBalance = dayRunning
      }
      const currentDeficit = Math.abs(dayRunning)
      if (currentDeficit > maxDeficit) {
        maxDeficit = currentDeficit
        maxDeficitDate = dStr
      }
    }

    dailyProjections.push({
      date: dStr,
      dayLabel,
      startBalance: startBal,
      incomeTotal: dayIncome,
      expenseTotal: dayExpense,
      endBalance: dayRunning,
      isNegative,
      events: dayEvents,
    })

    cursorDate.setDate(cursorDate.getDate() + 1)
  }

  // 6. Risco de Caixa
  const risk: RiskAnalysis = {
    hasRisk: negativeDaysCount > 0,
    firstNegativeDate,
    firstNegativeDayLabel,
    firstNegativeBalance,
    maxDeficit,
    maxDeficitDate,
    negativeDaysCount,
  }

  // 7. Se houver simulação, calcula também o original para comparação lado a lado
  let originalSummary: ProjectionSummary['originalSummary'] | undefined
  if (simulation && simulation.value > 0) {
    const orig = calculateCashFlowProjection({
      ...input,
      simulation: null,
    })
    originalSummary = {
      totalIncome: orig.totalIncome,
      totalExpense: orig.totalExpense,
      projectedEndBalance: orig.projectedEndBalance,
    }
  }

  return {
    startingBalance,
    totalIncome,
    totalExpense,
    projectedEndBalance,
    isPositive,
    timelineEvents,
    dailyProjections,
    risk,
    simulationApplied: !!(simulation && simulation.value > 0),
    originalSummary,
  }
}
