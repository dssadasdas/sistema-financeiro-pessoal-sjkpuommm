import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import { useAuth } from './AuthContext'
import {
  Account,
  CreditCard,
  Transaction,
  Invoice,
  InvoiceItem,
  Bill,
  RecurringBill,
  Recurrence,
  Installment,
  Budget,
  Goal,
  GoalContribution,
  Investment,
  InvestmentContribution,
  InvestmentEarning,
  InvestmentCategoryGroup,
  CategorizationRule,
  CategoryItem,
  DreGroup,
} from '@/types/finance'

interface FinanceDataContextType {
  accounts: Account[]
  creditCards: CreditCard[]
  transactions: Transaction[]
  invoices: Invoice[]
  bills: Bill[]
  recurringBills: RecurringBill[]
  recurrences: Recurrence[]
  installments: Installment[]
  budgets: Budget[]
  goals: Goal[]
  goalContributions: GoalContribution[]
  investments: Investment[]
  contributions: InvestmentContribution[]
  earnings: InvestmentEarning[]
  rules: CategorizationRule[]
  customCategories: CategoryItem[]
  isLoading: boolean
  loadError: boolean
  refreshAll: () => Promise<void>

  // Computed summaries
  totalCurrentBalance: number
  totalProjectedBalance: number
  monthIncomeReceived: number
  monthExpensePaid: number
  monthIncomePending: number
  monthExpensePending: number
  monthOpenInvoicesTotal: number
  totalInvested: number
  totalInvestmentsCurrent: number
  totalInvestmentsResult: number
  rentabilidadeMes: number
  rentabilidadeAno: number
  totalProventos: number
  indicators: {
    cdi: number
    ipca: number
    dolar: number
    euro: number
  }

  // Actions
  createTransaction: (data: Partial<Transaction>) => Promise<Transaction>
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<Transaction>
  deleteTransaction: (id: string) => Promise<void>
  toggleTransactionStatus: (tx: Transaction) => Promise<void>

  createAccount: (data: Partial<Account>) => Promise<Account>
  updateAccount: (id: string, data: Partial<Account>) => Promise<Account>
  deleteAccount: (id: string, options?: { deleteLinkedTransactions?: boolean }) => Promise<void>
  adjustAccountBalance: (accountId: string, newBalance: number, note?: string) => Promise<void>

  createCreditCard: (data: Partial<CreditCard>) => Promise<CreditCard>
  updateCreditCard: (id: string, data: Partial<CreditCard>) => Promise<CreditCard>
  deleteCreditCard: (id: string, options?: { deleteLinkedTransactions?: boolean }) => Promise<void>
  payInvoice: (invoiceId: string, accountId: string) => Promise<void>

  createBill: (data: Partial<Bill>, linkExistingTransactionId?: string) => Promise<Bill>
  updateBill: (id: string, data: Partial<Bill>) => Promise<Bill>
  deleteBill: (id: string) => Promise<void>
  markBillAsPaid: (bill: Bill, accountId?: string, paidDate?: string) => Promise<void>
  markBillAsUnpaid: (bill: Bill) => Promise<void>
  createTransfer: (
    sourceAccountId: string,
    targetAccountId: string,
    amount: number,
    date?: string,
    description?: string,
  ) => Promise<void>

  createRecurringBill: (data: Partial<RecurringBill>) => Promise<RecurringBill>
  updateRecurringBill: (id: string, data: Partial<RecurringBill>) => Promise<RecurringBill>
  deleteRecurringBill: (id: string, mode: 'base' | 'all') => Promise<void>
  generateRecurringBills: () => Promise<number>

  createRecurrence: (data: Partial<Recurrence>) => Promise<Recurrence>
  updateRecurrence: (id: string, data: Partial<Recurrence>) => Promise<Recurrence>
  deleteRecurrence: (id: string) => Promise<void>

  createInstallment: (data: Partial<Installment>) => Promise<Installment>
  updateInstallment: (id: string, data: Partial<Installment>) => Promise<Installment>
  deleteInstallment: (id: string, mode: 'all' | 'future') => Promise<void>
  toggleInstallmentParcel: (installmentId: string, parcelNumber: number) => Promise<void>

  saveBudget: (category: string, limitValue: number, month: string) => Promise<Budget>

  createGoal: (data: Partial<Goal>) => Promise<Goal>
  updateGoal: (id: string, data: Partial<Goal>) => Promise<Goal>
  deleteGoal: (id: string) => Promise<void>
  addGoalContribution: (
    goalId: string,
    value: number,
    note?: string,
    date?: string,
  ) => Promise<GoalContribution>

  createInvestment: (data: Partial<Investment>) => Promise<Investment>
  updateInvestment: (id: string, data: Partial<Investment>) => Promise<Investment>
  deleteInvestment: (id: string) => Promise<void>
  createContribution: (data: Partial<InvestmentContribution>) => Promise<InvestmentContribution>
  deleteContribution: (id: string) => Promise<void>
  createEarning: (data: Partial<InvestmentEarning>) => Promise<InvestmentEarning>
  deleteEarning: (id: string) => Promise<void>
  refreshCryptoQuotes: () => Promise<void>
  refreshAllPrices: () => Promise<{ updated: number; failed: number }>

  saveRule: (keyword: string, category: string) => Promise<CategorizationRule>
  deleteRule: (id: string) => Promise<void>

  saveCategoryDreGroup: (
    categoryName: string,
    dreGroup: DreGroup,
    type?: 'receita' | 'despesa',
  ) => Promise<CategoryItem>
  createCategory: (
    name: string,
    type: 'receita' | 'despesa',
    color?: string,
  ) => Promise<CategoryItem>
  deleteCategory: (id: string) => Promise<void>
  resetAllUserData: () => Promise<void>
}

const FinanceDataContext = createContext<FinanceDataContextType | undefined>(undefined)

export const FinanceDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [recurringBills, setRecurringBills] = useState<RecurringBill[]>([])
  const [recurrences, setRecurrences] = useState<Recurrence[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalContributions, setGoalContributions] = useState<GoalContribution[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [contributions, setContributions] = useState<InvestmentContribution[]>([])
  const [earnings, setEarnings] = useState<InvestmentEarning[]>([])
  const [rules, setRules] = useState<CategorizationRule[]>([])
  const [customCategories, setCustomCategories] = useState<CategoryItem[]>([])
  const [indicators, setIndicators] = useState({
    cdi: 13.65,
    ipca: 0.42,
    dolar: 5.75,
    euro: 6.15,
  })
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const fetchAllData = useCallback(async () => {
    if (!user) {
      setAccounts([])
      setCreditCards([])
      setTransactions([])
      setInvoices([])
      setBills([])
      setRecurringBills([])
      setRecurrences([])
      setInstallments([])
      setBudgets([])
      setGoals([])
      setGoalContributions([])
      setInvestments([])
      setContributions([])
      setEarnings([])
      setRules([])
      setIsLoading(false)
      setLoadError(false)
      return
    }

    setIsLoading(true)
    setLoadError(false)
    try {
      const [
        accRes,
        cardRes,
        txRes,
        invRes,
        billRes,
        recurringBillRes,
        recRes,
        instRes,
        budRes,
        goalRes,
        goalContRes,
        invtRes,
        contribRes,
        earnRes,
        ruleRes,
        catRes,
      ] = await Promise.all([
        pb.collection('accounts').getFullList<Account>({ batch: 500, sort: 'name' }),
        pb.collection('credit_cards').getFullList<CreditCard>({ batch: 500, sort: 'name' }),
        pb.collection('transactions').getFullList<Transaction>({
          batch: 500,
          sort: '-date,created',
          expand: 'account,credit_card',
        }),
        pb
          .collection('invoices')
          .getFullList<Invoice>({ batch: 500, sort: '-reference', expand: 'credit_card' }),
        pb.collection('bills').getFullList<Bill>({
          batch: 500,
          sort: 'due_date',
          expand: 'account,recurring_bill',
        }),
        pb.collection('recurring_bills').getFullList<RecurringBill>({
          batch: 500,
          sort: 'next_date',
          expand: 'account,credit_card',
        }),
        pb
          .collection('recurrences')
          .getFullList<Recurrence>({ batch: 500, sort: 'due_day', expand: 'account' }),
        pb
          .collection('installments')
          .getFullList<Installment>({ batch: 500, sort: '-created', expand: 'credit_card' }),
        pb.collection('budgets').getFullList<Budget>({ batch: 500, sort: 'category' }),
        pb.collection('goals').getFullList<Goal>({ batch: 500, sort: 'name' }),
        pb
          .collection('goal_contributions')
          .getFullList<GoalContribution>({ batch: 500, sort: '-date' }),
        pb.collection('investments').getFullList<Investment>({ batch: 500, sort: 'name' }),
        pb
          .collection('investment_contributions')
          .getFullList<InvestmentContribution>({ batch: 500, sort: '-date' })
          .catch(() => [] as InvestmentContribution[]),
        pb
          .collection('investment_earnings')
          .getFullList<InvestmentEarning>({ batch: 500, sort: '-date' })
          .catch(() => [] as InvestmentEarning[]),
        pb
          .collection('categorization_rules')
          .getFullList<CategorizationRule>({ batch: 500, sort: 'keyword' }),
        pb
          .collection('categories')
          .getFullList<CategoryItem>({ batch: 500, sort: 'name' })
          .catch(() => [] as CategoryItem[]),
      ])

      setAccounts(accRes)
      setCreditCards(cardRes)
      setTransactions(txRes)
      setInvoices(invRes)
      setBills(billRes)
      setRecurringBills(recurringBillRes)
      setRecurrences(recRes)
      setInstallments(instRes)
      setBudgets(budRes)
      setGoals(goalRes)
      setGoalContributions(goalContRes)
      setInvestments(invtRes)
      setContributions(contribRes)
      setEarnings(earnRes)
      setRules(ruleRes)
      setCustomCategories(catRes)
    } catch (err) {
      console.error('Erro ao buscar dados financeiros:', err)
      setLoadError(true)
    } finally {
      setIsLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchAllData()

    if (!user) return

    // Realtime subscriptions
    const collections = [
      'accounts',
      'credit_cards',
      'transactions',
      'invoices',
      'invoice_items',
      'bills',
      'recurring_bills',
      'recurrences',
      'installments',
      'budgets',
      'goals',
      'goal_contributions',
      'investments',
      'investment_contributions',
      'investment_earnings',
      'categorization_rules',
      'categories',
    ]

    collections.forEach((col) => {
      pb.collection(col)
        .subscribe('*', () => {
          fetchAllData()
        })
        .catch((e) => console.warn(`Realtime sub failed for ${col}:`, e))
    })

    return () => {
      collections.forEach((col) => {
        pb.collection(col)
          .unsubscribe('*')
          .catch(() => {})
      })
    }
  }, [user, fetchAllData])

  // Computed data
  // 1. Accounts with balances
  const accountsWithBalances: Account[] = accounts.map((acc) => {
    const accTxns = transactions.filter((t) => t.account === acc.id)
    const has_transactions = accTxns.length > 0

    let balance = Number(acc.opening_balance || 0)
    let projected = balance

    accTxns.forEach((t) => {
      const val = Number(t.value || 0)
      if (t.status === 'realizado') {
        if (t.type === 'receita') balance += val
        else if (t.type === 'despesa') balance -= val
        else if (t.type === 'ajuste') balance = val // Ajuste pode redefinir ou ajustar
      }

      // Projetado inclui pendentes
      if (t.type === 'receita') projected += val
      else if (t.type === 'despesa') projected -= val
      else if (t.type === 'ajuste') projected = val
    })

    return {
      ...acc,
      current_balance: balance,
      projected_balance: projected,
      has_transactions,
    }
  })

  // 2. Credit Cards with computed metrics
  const creditCardsWithMetrics: CreditCard[] = creditCards.map((card) => {
    // Open invoices total or transactions in credit for this card
    const cardInvoices = invoices.filter((i) => i.credit_card === card.id && i.status === 'aberta')
    const current_invoice_total = cardInvoices.reduce(
      (acc, curr) => acc + Number(curr.total || 0),
      0,
    )

    // Transações manuais/importadas no cartão no mês corrente (ou ativas)
    const cardTxns = transactions.filter(
      (t) =>
        t.credit_card === card.id &&
        t.type === 'despesa' &&
        (!t.source || t.source === 'manual' || t.source === 'importado'),
    )
    const txnsTotal = cardTxns.reduce((acc, curr) => acc + Number(curr.value || 0), 0)

    const usedInvoice = Math.max(current_invoice_total, txnsTotal)
    const limit = Number(card.limit || 0)
    const available_limit = Math.max(0, limit - usedInvoice)
    const used_percentage = limit > 0 ? Math.min(100, Math.round((usedInvoice / limit) * 100)) : 0

    return {
      ...card,
      current_invoice_total: usedInvoice,
      available_limit,
      used_percentage,
    }
  })

  // 3. Month summaries
  const currentMonthPrefix = new Date().toISOString().slice(0, 7) // "YYYY-MM"
  const currentMonthTxns = transactions.filter((t) => (t.date || '').startsWith(currentMonthPrefix))

  const monthIncomeReceived = currentMonthTxns
    .filter(
      (t) =>
        t.type === 'receita' &&
        t.status === 'realizado' &&
        !t.transfer_group_id &&
        t.category !== 'Transferência',
    )
    .reduce((acc, t) => acc + Number(t.value || 0), 0)

  const monthExpensePaid = currentMonthTxns
    .filter(
      (t) =>
        t.type === 'despesa' &&
        t.status === 'realizado' &&
        !t.transfer_group_id &&
        t.category !== 'Transferência',
    )
    .reduce((acc, t) => acc + Number(t.value || 0), 0)

  const monthIncomePending = currentMonthTxns
    .filter(
      (t) =>
        t.type === 'receita' &&
        t.status === 'pendente' &&
        !t.transfer_group_id &&
        t.category !== 'Transferência',
    )
    .reduce((acc, t) => acc + Number(t.value || 0), 0)

  const monthExpensePending = currentMonthTxns
    .filter(
      (t) =>
        t.type === 'despesa' &&
        t.status === 'pendente' &&
        !t.transfer_group_id &&
        t.category !== 'Transferência',
    )
    .reduce((acc, t) => acc + Number(t.value || 0), 0)

  const monthOpenInvoicesTotal = invoices
    .filter((i) => i.status === 'aberta')
    .reduce((acc, i) => acc + Number(i.total || 0), 0)

  const totalCurrentBalance = accountsWithBalances.reduce(
    (acc, a) => acc + (a.current_balance || 0),
    0,
  )
  const totalProjectedBalance = accountsWithBalances.reduce(
    (acc, a) => acc + (a.projected_balance || 0),
    0,
  )

  // 4. Investments total & metrics
  const defaultCategoryForType = (type: string): InvestmentCategoryGroup => {
    if (
      [
        'cdb',
        'rdb',
        'lci',
        'lca',
        'tesouro_selic',
        'tesouro_prefixado',
        'tesouro_ipca',
        'debentures',
        'cri',
        'cra',
        'letras_financeiras',
        'poupanca',
        'cdi100',
        'renda_fixa',
      ].includes(type)
    ) {
      return 'renda_fixa'
    }
    if (['acao', 'fii', 'etf', 'bdr', 'fiagro'].includes(type)) {
      return 'renda_variavel'
    }
    if (
      [
        'fundo_rf',
        'fundo_multimercado',
        'fundo_acoes',
        'fundo_cambial',
        'fundo_imobiliario',
      ].includes(type)
    ) {
      return 'fundos'
    }
    if (['bitcoin', 'ethereum', 'cripto_alt'].includes(type)) {
      return 'cripto'
    }
    if (['pgbl', 'vgbl'].includes(type)) {
      return 'previdencia'
    }
    if (['acao_us', 'etf_internacional', 'dolar', 'euro'].includes(type)) {
      return 'internacional'
    }
    return 'outros'
  }

  const today = new Date()
  let totalInvested = 0
  let totalInvestmentsCurrent = 0

  const investmentsWithMetrics: Investment[] = investments.map((inv) => {
    const applied = Number(inv.applied_value || 0)
    totalInvested += applied

    let current = applied
    const qty = Number(inv.quantity || 0)
    const price = Number(inv.current_price || 0)
    const yieldRate = Number(inv.yield_rate || 0)
    const group = inv.category_group || defaultCategoryForType(inv.type)

    // Dias desde a aplicação
    let daysSinceApp = 30
    if (inv.application_date) {
      const appDate = new Date(inv.application_date)
      if (!isNaN(appDate.getTime())) {
        const diffTime = Math.max(0, today.getTime() - appDate.getTime())
        daysSinceApp = Math.floor(diffTime / (1000 * 60 * 60 * 24))
      }
    }

    // Cálculo do valor atual
    if (
      [
        'bitcoin',
        'ethereum',
        'cripto_alt',
        'acao',
        'fii',
        'etf',
        'bdr',
        'fiagro',
        'acao_us',
        'etf_internacional',
      ].includes(inv.type) ||
      group === 'cripto' ||
      group === 'renda_variavel'
    ) {
      if (qty > 0 && price > 0) {
        current = qty * price
      } else if (price > 0) {
        current = price
      }
    } else if (
      [
        'cdb',
        'rdb',
        'lci',
        'lca',
        'tesouro_selic',
        'tesouro_prefixado',
        'tesouro_ipca',
        'debentures',
        'cri',
        'cra',
        'letras_financeiras',
        'poupanca',
        'cdi100',
        'renda_fixa',
      ].includes(inv.type) ||
      group === 'renda_fixa'
    ) {
      if (inv.yield_type === 'cdi_pct' || inv.type === 'cdi100') {
        const pctCdi = yieldRate > 0 ? yieldRate / 100 : 1.0
        const cdiAnnual = (indicators.cdi || 13.65) / 100
        current = applied * (1 + (cdiAnnual * pctCdi * daysSinceApp) / 365)
      } else if (inv.yield_type === 'prefixado' || inv.type === 'tesouro_prefixado') {
        const rate = yieldRate > 0 ? yieldRate / 100 : 0.12
        current = applied * Math.pow(1 + rate, daysSinceApp / 365)
      } else if (inv.yield_type === 'ipca_mais' || inv.type === 'tesouro_ipca') {
        const ipcaAnnual = ((indicators.ipca || 0.42) * 12) / 100
        const spread = yieldRate > 0 ? yieldRate / 100 : 0.06
        current = applied * Math.pow(1 + ipcaAnnual + spread, daysSinceApp / 365)
      } else if (price > 0) {
        current = price
      } else if (inv.type === 'renda_fixa') {
        current = applied * 1.094
      }
    } else if (price > 0) {
      current = price
    }
    totalInvestmentsCurrent += current
    const profit_loss = current - applied
    const profit_loss_pct = applied > 0 ? (profit_loss / applied) * 100 : 0

    // Dias até o vencimento
    let days_until_maturity: number | undefined
    if (inv.maturity_date) {
      const matDate = new Date(inv.maturity_date)
      if (!isNaN(matDate.getTime())) {
        const diff = matDate.getTime() - today.getTime()
        days_until_maturity = Math.ceil(diff / (1000 * 60 * 60 * 24))
      }
    }

    // Cálculo de IR regressivo
    let estimated_tax_rate = 0
    let estimated_tax_value = 0
    let estimated_net_value = current

    if (
      inv.tax_regime === 'regressivo' ||
      (group === 'renda_fixa' && inv.tax_regime !== 'isento' && inv.tax_regime !== 'sem_ir')
    ) {
      if (daysSinceApp <= 180) {
        estimated_tax_rate = 22.5
      } else if (daysSinceApp <= 360) {
        estimated_tax_rate = 20.0
      } else if (daysSinceApp <= 720) {
        estimated_tax_rate = 17.5
      } else {
        estimated_tax_rate = 15.0
      }

      if (profit_loss > 0) {
        estimated_tax_value = (profit_loss * estimated_tax_rate) / 100
        estimated_net_value = current - estimated_tax_value
      }
    }

    return {
      ...inv,
      category_group: group,
      current_total_value: current,
      profit_loss,
      profit_loss_pct,
      days_until_maturity,
      estimated_net_value,
      estimated_tax_value,
      estimated_tax_rate,
    }
  })

  const totalInvestmentsResult = totalInvestmentsCurrent - totalInvested
  const totalProventos = earnings.reduce((sum, e) => sum + Number(e.value || 0), 0)

  // Estimativa de rentabilidade mês e ano consolidada
  const rentabilidadeMes =
    totalInvested > 0 ? ((totalInvestmentsResult * 0.25) / totalInvested) * 100 : 0
  const rentabilidadeAno = totalInvested > 0 ? (totalInvestmentsResult / totalInvested) * 100 : 0

  // 5. Goals with accumulated
  const goalsWithAccumulated: Goal[] = goals.map((g) => {
    const contribs = goalContributions
      .filter((c) => c.goal === g.id)
      .sort((a, b) => (a.date < b.date ? 1 : -1))
    const accumulated = contribs.reduce((acc, c) => acc + Number(c.value || 0), 0)
    const target = Number(g.target_value || 0)
    const remaining = Math.max(0, target - accumulated)
    const percentage = target > 0 ? Math.min(100, Math.round((accumulated / target) * 100)) : 0

    return {
      ...g,
      accumulated,
      percentage,
      remaining,
      contributions: contribs,
    }
  })

  // 6. Budgets with spent
  const budgetsWithSpent: Budget[] = budgets.map((b) => {
    const spent = transactions
      .filter(
        (t) =>
          t.type === 'despesa' &&
          t.status === 'realizado' &&
          t.category === b.category &&
          (t.date || '').startsWith(b.month),
      )
      .reduce((acc, t) => acc + Number(t.value || 0), 0)

    const limit = Number(b.limit_value || 0)
    const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0

    return {
      ...b,
      spent,
      percentage,
    }
  })

  // Action methods
  const createTransaction = async (data: Partial<Transaction>) => {
    if (!user) throw new Error('Não autenticado')
    const rec = await pb.collection('transactions').create<Transaction>({
      ...data,
      user: user.id,
    })
    await fetchAllData()
    return rec
  }

  const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    const rec = await pb.collection('transactions').update<Transaction>(id, data)
    await fetchAllData()
    return rec
  }

  const deleteTransaction = async (id: string) => {
    await pb.collection('transactions').delete(id)
    await fetchAllData()
  }

  const toggleTransactionStatus = async (tx: Transaction) => {
    const nextStatus = tx.status === 'realizado' ? 'pendente' : 'realizado'
    const paid_at = nextStatus === 'realizado' ? new Date().toISOString() : undefined
    await pb.collection('transactions').update(tx.id, {
      status: nextStatus,
      paid_at,
    })
    await fetchAllData()
  }

  const createAccount = async (data: Partial<Account>) => {
    if (!user) throw new Error('Não autenticado')
    const rec = await pb.collection('accounts').create<Account>({
      ...data,
      user: user.id,
    })
    await fetchAllData()
    return rec
  }

  const updateAccount = async (id: string, data: Partial<Account>) => {
    const rec = await pb.collection('accounts').update<Account>(id, data)
    await fetchAllData()
    return rec
  }

  const deleteAccount = async (id: string, options?: { deleteLinkedTransactions?: boolean }) => {
    if (!user) throw new Error('Não autenticado')

    // SEMPRE usar o endpoint cascade (atômico, bypassa hooks de proteção)
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/accounts/${encodeURIComponent(id)}/delete-cascade`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
      },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || err.message || 'Falha ao excluir conta.')
    }
    await fetchAllData()
  }

  const adjustAccountBalance = async (accountId: string, newBalance: number, note?: string) => {
    if (!user) throw new Error('Não autenticado')
    // Acha a conta atual para calcular a diferença
    const targetAcc = accountsWithBalances.find((a) => a.id === accountId)
    const currentVal = targetAcc?.current_balance ?? 0
    const diff = newBalance - currentVal

    const isReceita = diff >= 0
    const absDiff = Math.abs(diff)

    await pb.collection('transactions').create<Transaction>({
      user: user.id,
      description: note || 'Ajuste de Saldo',
      value: absDiff,
      category: 'Ajuste',
      date: new Date().toISOString(),
      payment_method: 'Transferência',
      status: 'realizado',
      type: isReceita ? 'receita' : 'despesa',
      account: accountId,
      source: 'ajuste',
      paid_at: new Date().toISOString(),
    })
    await fetchAllData()
  }

  const createCreditCard = async (data: Partial<CreditCard>) => {
    if (!user) throw new Error('Não autenticado')
    const rec = await pb.collection('credit_cards').create<CreditCard>({
      ...data,
      user: user.id,
    })
    await fetchAllData()
    return rec
  }

  const updateCreditCard = async (id: string, data: Partial<CreditCard>) => {
    const rec = await pb.collection('credit_cards').update<CreditCard>(id, data)
    await fetchAllData()
    return rec
  }

  const deleteCreditCard = async (id: string, options?: { deleteLinkedTransactions?: boolean }) => {
    if (!user) throw new Error('Não autenticado')

    // 1. Limpa referências em contas recorrentes e parcelamentos
    try {
      const [linkedRecBills, linkedInst] = await Promise.all([
        pb.collection('recurring_bills').getFullList<RecurringBill>({
          batch: 500,
          filter: `credit_card = "${id}"`,
        }),
        pb.collection('installments').getFullList<Installment>({
          batch: 500,
          filter: `credit_card = "${id}"`,
        }),
      ])

      for (const rb of linkedRecBills) {
        try {
          await pb.collection('recurring_bills').update(rb.id, { credit_card: null })
        } catch {
          /* intentionally ignored */
        }
      }

      for (const inst of linkedInst) {
        try {
          await pb.collection('installments').update(inst.id, { credit_card: null })
        } catch {
          /* intentionally ignored */
        }
      }
    } catch (e) {
      console.warn('Erro ao desvincular cartão de recorrentes/parcelamentos:', e)
    }

    // 2. Apaga faturas do cartão e seus itens
    try {
      const linkedInvoices = await pb.collection('invoices').getFullList<Invoice>({
        batch: 500,
        filter: `credit_card = "${id}"`,
      })
      for (const inv of linkedInvoices) {
        try {
          const items = await pb.collection('invoice_items').getFullList<InvoiceItem>({
            batch: 500,
            filter: `invoice = "${inv.id}"`,
          })
          for (const it of items) {
            try {
              await pb.collection('invoice_items').delete(it.id)
            } catch {
              /* intentionally ignored */
            }
          }
          await pb.collection('invoices').delete(inv.id)
        } catch {
          /* intentionally ignored */
        }
      }
    } catch (e) {
      console.warn('Erro ao limpar faturas do cartão:', e)
    }

    // 3. Trata transações vinculadas ao cartão
    try {
      const linkedTxns = await pb.collection('transactions').getFullList<Transaction>({
        batch: 500,
        filter: `credit_card = "${id}"`,
      })
      for (const t of linkedTxns) {
        try {
          if (options?.deleteLinkedTransactions) {
            await pb.collection('transactions').delete(t.id)
          } else {
            await pb.collection('transactions').update(t.id, { credit_card: null })
          }
        } catch {
          /* intentionally ignored */
        }
      }
    } catch (e) {
      console.warn('Erro ao tratar transações do cartão:', e)
    }

    // 4. Exclui o cartão
    await pb.collection('credit_cards').delete(id)
    await fetchAllData()
  }

  const payInvoice = async (invoiceId: string, accountId: string) => {
    const res = await fetch(
      `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/invoices/${invoiceId}/pay`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({ accountId }),
      },
    )
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Erro ao pagar fatura')
    }
    await fetchAllData()
  }

  const createBill = async (data: Partial<Bill>, linkExistingTransactionId?: string) => {
    if (!user) throw new Error('Não autenticado')
    const billType = data.type || 'pagar'
    const isReceber = billType === 'receber'
    const isPaid = data.status === 'pago'
    const nowIso = new Date().toISOString()
    const paidDate = data.paid_date || (isPaid ? data.due_date || nowIso.split('T')[0] : undefined)

    let txnId = linkExistingTransactionId

    // Se o usuário NÃO vinculou a uma despesa/receita já existente, criamos a despesa correspondente
    if (!txnId) {
      const newTxn = await pb.collection('transactions').create<Transaction>({
        user: user.id,
        description: data.description || 'Boleto / Conta',
        value: data.value || 0,
        category: data.category || 'Contas e Boletos',
        date: data.due_date || nowIso.split('T')[0],
        payment_method: 'Boleto',
        status: isPaid ? 'realizado' : 'pendente',
        type: isReceber ? 'receita' : 'despesa',
        account: data.account || undefined,
        source: 'manual',
        paid_at: isPaid ? nowIso : undefined,
      })
      txnId = newTxn.id
    }

    // Cria o boleto vinculado
    const rec = await pb.collection('bills').create<Bill>({
      ...data,
      user: user.id,
      generated_transaction: txnId,
      paid_date: isPaid ? paidDate : undefined,
      paid_at: isPaid ? nowIso : undefined,
    })

    // Atualiza a transação com o bill_id
    if (txnId) {
      await pb
        .collection('transactions')
        .update(txnId, {
          bill_id: rec.id,
        })
        .catch(() => {})
    }

    await fetchAllData()
    return rec
  }

  const updateBill = async (id: string, data: Partial<Bill>) => {
    const rec = await pb.collection('bills').update<Bill>(id, data)
    await fetchAllData()
    return rec
  }

  const deleteBill = async (id: string) => {
    await pb.collection('bills').delete(id)
    await fetchAllData()
  }

  const markBillAsPaid = async (bill: Bill, accountId?: string, paidDate?: string) => {
    if (!user) return
    // Idempotência: se já está pago, não debita nem duplica nada
    if (bill.status === 'pago') return

    const nowIso = new Date().toISOString()
    const effectivePaidDate = paidDate || nowIso.split('T')[0]
    const chosenAccount = accountId || bill.account || undefined
    const isReceber = bill.type === 'receber'

    // Localiza a transação vinculada (seja por generated_transaction ou bill_id)
    const existingTxnId =
      bill.generated_transaction || transactions.find((t) => t.bill_id === bill.id)?.id
    let txnId = existingTxnId

    if (existingTxnId) {
      await pb.collection('transactions').update(existingTxnId, {
        status: 'realizado',
        paid_at: nowIso,
        date: effectivePaidDate,
        ...(chosenAccount ? { account: chosenAccount } : {}),
      })
    } else {
      const txn = await pb.collection('transactions').create<Transaction>({
        user: user.id,
        description: bill.description,
        value: bill.value,
        category: bill.category || 'Contas e Boletos',
        date: effectivePaidDate,
        payment_method: 'Boleto',
        status: 'realizado',
        type: isReceber ? 'receita' : 'despesa',
        account: chosenAccount,
        source: 'manual',
        paid_at: nowIso,
        bill_id: bill.id,
      })
      txnId = txn.id
    }

    // Atualiza status do boleto UMA ÚNICA VEZ
    await pb.collection('bills').update(bill.id, {
      status: 'pago',
      paid_at: nowIso,
      paid_date: effectivePaidDate,
      generated_transaction: txnId,
      ...(chosenAccount ? { account: chosenAccount } : {}),
    })

    await fetchAllData()
  }

  const createTransfer = async (
    sourceAccountId: string,
    targetAccountId: string,
    amount: number,
    date?: string,
    description?: string,
  ) => {
    if (!user) throw new Error('Usuário não autenticado')
    if (sourceAccountId === targetAccountId) {
      throw new Error('A conta de origem e destino devem ser diferentes')
    }
    if (amount <= 0) {
      throw new Error('O valor da transferência deve ser maior que zero')
    }

    const sourceAcc = accounts.find((a) => a.id === sourceAccountId)
    const targetAcc = accounts.find((a) => a.id === targetAccountId)

    if (!sourceAcc || !targetAcc) {
      throw new Error('Contas bancárias não encontradas')
    }

    const transferDate = date || new Date().toISOString().split('T')[0]
    const transferGroupId = 'trf_' + Math.random().toString(36).substring(2, 11)
    const desc = description || `Transferência: ${sourceAcc.name} → ${targetAcc.name}`

    // Cria as duas transações vinculadas pelo transfer_group_id
    // Débito da conta origem
    await pb.collection('transactions').create<Transaction>({
      user: user.id,
      description: desc,
      value: amount,
      category: 'Transferência',
      date: transferDate,
      payment_method: 'Transferência',
      status: 'realizado',
      type: 'despesa',
      account: sourceAccountId,
      transfer_target_account: targetAccountId,
      transfer_group_id: transferGroupId,
      paid_at: new Date().toISOString(),
    })

    // Crédito na conta destino
    await pb.collection('transactions').create<Transaction>({
      user: user.id,
      description: desc,
      value: amount,
      category: 'Transferência',
      date: transferDate,
      payment_method: 'Transferência',
      status: 'realizado',
      type: 'receita',
      account: targetAccountId,
      transfer_target_account: sourceAccountId,
      transfer_group_id: transferGroupId,
      paid_at: new Date().toISOString(),
    })

    await fetchAllData()
  }

  const markBillAsUnpaid = async (bill: Bill) => {
    if (!user) return
    const patch: Partial<Bill> = { status: 'não_pago', paid_at: undefined }
    // Se existir transação gerada, reverte para pendente
    if (bill.generated_transaction) {
      await pb
        .collection('transactions')
        .update(bill.generated_transaction, { status: 'pendente', paid_at: undefined })
    }
    await pb.collection('bills').update(bill.id, patch)
    await fetchAllData()
  }

  const createRecurringBill = async (data: Partial<RecurringBill>) => {
    if (!user) throw new Error('Não autenticado')
    const rec = await pb.collection('recurring_bills').create<RecurringBill>({
      ...data,
      user: user.id,
    })
    await fetchAllData()
    return rec
  }

  const updateRecurringBill = async (id: string, data: Partial<RecurringBill>) => {
    const rec = await pb.collection('recurring_bills').update<RecurringBill>(id, data)
    await fetchAllData()
    return rec
  }

  const deleteRecurringBill = async (id: string, mode: 'base' | 'all') => {
    // base: exclui apenas a recorrência base, mantém as contas já geradas
    // all: exclui a base + as contas futuras (não pagas) vinculadas
    if (mode === 'all') {
      try {
        const futureBills = await pb.collection('bills').getFullList<Bill>({
          filter: `recurring_bill = "${id}" && status = "não_pago"`,
        })
        for (const b of futureBills) {
          await pb
            .collection('bills')
            .delete(b.id)
            .catch(() => {})
        }
      } catch (e) {
        console.warn('Erro ao excluir contas futuras:', e)
      }
    }
    await pb.collection('recurring_bills').delete(id)
    await fetchAllData()
  }

  const generateRecurringBills = async (): Promise<number> => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/recurring/generate`,
        {
          method: 'POST',
          headers: {
            Authorization: pb.authStore.token,
          },
        },
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Erro ao gerar recorrências')
      }
      const data = await res.json()
      await fetchAllData()
      return data.generated || 0
    } catch (e) {
      console.warn('generateRecurringBills failed:', e)
      await fetchAllData()
      return 0
    }
  }

  const createRecurrence = async (data: Partial<Recurrence>) => {
    if (!user) throw new Error('Não autenticado')
    const rec = await pb.collection('recurrences').create<Recurrence>({
      ...data,
      user: user.id,
    })
    await fetchAllData()
    return rec
  }

  const updateRecurrence = async (id: string, data: Partial<Recurrence>) => {
    const rec = await pb.collection('recurrences').update<Recurrence>(id, data)
    await fetchAllData()
    return rec
  }

  const deleteRecurrence = async (id: string) => {
    await pb.collection('recurrences').delete(id)
    await fetchAllData()
  }

  const createInstallment = async (data: Partial<Installment>) => {
    if (!user) throw new Error('Não autenticado')
    const rec = await pb.collection('installments').create<Installment>({
      ...data,
      user: user.id,
    })
    await fetchAllData()
    return rec
  }

  const updateInstallment = async (id: string, data: Partial<Installment>) => {
    const rec = await pb.collection('installments').update<Installment>(id, data)
    await fetchAllData()
    return rec
  }

  const deleteInstallment = async (id: string, mode: 'all' | 'future') => {
    // all: exclui todas as parcelas + grupo
    // future: exclui apenas as parcelas não pagas, mantém grupo + históricos
    const linkedTxns = transactions.filter((t) => t.installment_group === id)
    if (mode === 'all') {
      for (const t of linkedTxns) {
        await pb
          .collection('transactions')
          .delete(t.id)
          .catch(() => {})
      }
      await pb.collection('installments').delete(id)
    } else {
      // future: exclui pendentes
      const pending = linkedTxns.filter((t) => t.status !== 'realizado')
      for (const t of pending) {
        await pb
          .collection('transactions')
          .delete(t.id)
          .catch(() => {})
      }
      // Atualiza current_installment e total
      const inst = installments.find((i) => i.id === id)
      if (inst) {
        const paid = linkedTxns.filter((t) => t.status === 'realizado').length
        await pb.collection('installments').update(id, {
          total_installments: paid,
          current_installment: paid,
        })
      }
    }
    await fetchAllData()
  }

  const toggleInstallmentParcel = async (installmentId: string, parcelNumber: number) => {
    const linkedTxns = transactions
      .filter((t) => t.installment_group === installmentId && t.source === 'parcela')
      .sort((a, b) => (a.date < b.date ? -1 : 1))
    const parcel = linkedTxns[parcelNumber - 1]
    if (!parcel) return
    const nextStatus = parcel.status === 'realizado' ? 'pendente' : 'realizado'
    const paid_at = nextStatus === 'realizado' ? new Date().toISOString() : undefined
    await pb.collection('transactions').update(parcel.id, { status: nextStatus, paid_at })
    // Recalcula current_installment
    const inst = installments.find((i) => i.id === installmentId)
    if (inst) {
      const paidCount = linkedTxns.filter(
        (t, idx) => idx !== parcelNumber - 1 && t.status === 'realizado',
      ).length
      const newCount = nextStatus === 'realizado' ? paidCount + 1 : paidCount
      const total = inst.total_installments || linkedTxns.length
      const next = Math.min(total, newCount + 1)
      await pb.collection('installments').update(installmentId, { current_installment: next })
    }
    await fetchAllData()
  }

  const saveBudget = async (category: string, limitValue: number, month: string) => {
    if (!user) throw new Error('Não autenticado')
    const existing = budgets.find((b) => b.category === category && b.month === month)
    let rec: Budget
    if (existing) {
      rec = await pb.collection('budgets').update<Budget>(existing.id, {
        limit_value: limitValue,
      })
    } else {
      rec = await pb.collection('budgets').create<Budget>({
        user: user.id,
        category,
        limit_value: limitValue,
        month,
      })
    }
    await fetchAllData()
    return rec
  }

  const createGoal = async (data: Partial<Goal>) => {
    if (!user) throw new Error('Não autenticado')
    const rec = await pb.collection('goals').create<Goal>({
      ...data,
      user: user.id,
    })
    await fetchAllData()
    return rec
  }

  const updateGoal = async (id: string, data: Partial<Goal>) => {
    const rec = await pb.collection('goals').update<Goal>(id, data)
    await fetchAllData()
    return rec
  }

  const deleteGoal = async (id: string) => {
    await pb.collection('goals').delete(id)
    await fetchAllData()
  }

  const addGoalContribution = async (
    goalId: string,
    value: number,
    note?: string,
    date?: string,
  ) => {
    const rec = await pb.collection('goal_contributions').create<GoalContribution>({
      goal: goalId,
      value,
      note,
      date: date || new Date().toISOString(),
    })
    await fetchAllData()
    return rec
  }

  const createInvestment = async (data: Partial<Investment>) => {
    if (!user) throw new Error('Não autenticado')
    const rec = await pb.collection('investments').create<Investment>({
      ...data,
      user: user.id,
    })
    await fetchAllData()
    return rec
  }

  const updateInvestment = async (id: string, data: Partial<Investment>) => {
    const rec = await pb.collection('investments').update<Investment>(id, data)
    await fetchAllData()
    return rec
  }

  const deleteInvestment = async (id: string) => {
    // Exclui contribuições e proventos vinculados primeiro
    try {
      const [cList, eList] = await Promise.all([
        pb.collection('investment_contributions').getFullList<InvestmentContribution>({
          filter: `investment = "${id}"`,
        }),
        pb.collection('investment_earnings').getFullList<InvestmentEarning>({
          filter: `investment = "${id}"`,
        }),
      ])
      for (const c of cList) {
        await pb
          .collection('investment_contributions')
          .delete(c.id)
          .catch(() => {})
      }
      for (const e of eList) {
        await pb
          .collection('investment_earnings')
          .delete(e.id)
          .catch(() => {})
      }
    } catch (err) {
      console.warn('Erro ao limpar dependências do investimento:', err)
    }

    await pb.collection('investments').delete(id)
    await fetchAllData()
  }

  const createContribution = async (data: Partial<InvestmentContribution>) => {
    if (!user) throw new Error('Não autenticado')
    if (!data.investment) throw new Error('Investimento não informado')

    const rec = await pb.collection('investment_contributions').create<InvestmentContribution>({
      ...data,
      user: user.id,
    })

    // Atualiza preço médio e quantidade no investimento se for aplicável
    try {
      const inv = investments.find((i) => i.id === data.investment)
      if (inv) {
        const addedQty = Number(data.quantity || 0)
        const addedPrice = Number(data.unit_price || 0)
        const addedVal = Number(data.value || addedQty * addedPrice || 0)

        const curQty = Number(inv.quantity || 0)
        const curPrice = Number(inv.unit_price || 0)
        const curApplied = Number(inv.applied_value || 0)

        if (data.type === 'compra') {
          let newQty = curQty + addedQty
          let newUnitPrice = curPrice
          if (curQty + addedQty > 0 && addedPrice > 0) {
            newUnitPrice = (curQty * curPrice + addedQty * addedPrice) / (curQty + addedQty)
          }
          const newApplied = curApplied + addedVal

          await pb.collection('investments').update(inv.id, {
            quantity: newQty > 0 ? newQty : undefined,
            unit_price: newUnitPrice > 0 ? newUnitPrice : undefined,
            applied_value: newApplied,
          })
        } else if (data.type === 'venda') {
          const newQty = Math.max(0, curQty - addedQty)
          const newApplied = Math.max(0, curApplied - addedVal)
          await pb.collection('investments').update(inv.id, {
            quantity: newQty,
            applied_value: newApplied,
          })
        }
      }
    } catch (calcErr) {
      console.warn('Erro ao atualizar preço médio do investimento:', calcErr)
    }

    await fetchAllData()
    return rec
  }

  const deleteContribution = async (id: string) => {
    await pb.collection('investment_contributions').delete(id)
    await fetchAllData()
  }

  const createEarning = async (data: Partial<InvestmentEarning>) => {
    if (!user) throw new Error('Não autenticado')
    if (!data.investment) throw new Error('Investimento não informado')

    const rec = await pb.collection('investment_earnings').create<InvestmentEarning>({
      ...data,
      user: user.id,
    })
    await fetchAllData()
    return rec
  }

  const deleteEarning = async (id: string) => {
    await pb.collection('investment_earnings').delete(id)
    await fetchAllData()
  }

  const refreshAllPrices = async () => {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/investments/refresh-prices`,
        {
          method: 'POST',
          headers: {
            Authorization: pb.authStore.token,
          },
        },
      )
      if (res.ok) {
        const data = await res.json()
        if (data.indicators) {
          setIndicators({
            cdi: data.indicators.cdi || 13.65,
            ipca: data.indicators.ipca || 0.42,
            dolar: data.indicators.dolar || 5.75,
            euro: data.indicators.euro || 6.15,
          })
        }
        await fetchAllData()
        return { updated: data.updated || 0, failed: data.failed || 0 }
      }
    } catch (e) {
      console.warn('Refresh all prices failed:', e)
    }
    await fetchAllData()
    return { updated: 0, failed: 0 }
  }

  const refreshCryptoQuotes = async () => {
    await refreshAllPrices()
  }

  const saveRule = async (keyword: string, category: string) => {
    if (!user) throw new Error('Não autenticado')
    const rec = await pb.collection('categorization_rules').create<CategorizationRule>({
      user: user.id,
      keyword,
      category,
      is_learned: true,
    })
    await fetchAllData()
    return rec
  }

  const deleteRule = async (id: string) => {
    await pb.collection('categorization_rules').delete(id)
    await fetchAllData()
  }

  const createCategory = async (
    name: string,
    type: 'receita' | 'despesa',
    color?: string,
  ): Promise<CategoryItem> => {
    if (!user) throw new Error('Não autenticado')
    const trimmedName = name.trim()
    if (!trimmedName) throw new Error('Nome da categoria é obrigatório')

    const defaultDreGroup: DreGroup = type === 'receita' ? 'receita_bruta' : 'outras_operacionais'

    const existing = customCategories.find(
      (c) => c.name.trim().toLowerCase() === trimmedName.toLowerCase(),
    )

    let rec: CategoryItem
    if (existing) {
      rec = await pb.collection('categories').update<CategoryItem>(existing.id, {
        type,
        ...(color ? { color } : {}),
      })
    } else {
      rec = await pb.collection('categories').create<CategoryItem>({
        user: user.id,
        name: trimmedName,
        type,
        dre_group: defaultDreGroup,
        ...(color ? { color } : {}),
      })
    }
    await fetchAllData()
    return rec
  }

  const deleteCategory = async (id: string): Promise<void> => {
    await pb.collection('categories').delete(id)
    await fetchAllData()
  }

  const saveCategoryDreGroup = async (
    categoryName: string,
    dreGroup: DreGroup,
    type: 'receita' | 'despesa' = 'despesa',
  ) => {
    if (!user) throw new Error('Não autenticado')
    const existing = customCategories.find(
      (c) => c.name.trim().toLowerCase() === categoryName.trim().toLowerCase(),
    )
    let rec: CategoryItem
    if (existing) {
      rec = await pb.collection('categories').update<CategoryItem>(existing.id, {
        dre_group: dreGroup,
        type,
      })
    } else {
      rec = await pb.collection('categories').create<CategoryItem>({
        user: user.id,
        name: categoryName.trim(),
        dre_group: dreGroup,
        type,
      })
    }
    await fetchAllData()
    return rec
  }

  const resetAllUserData = async () => {
    if (!user) throw new Error('Não autenticado')
    const userId = user.id

    // Helper para limpar chaves de dados financeiros do localStorage
    // (preservando token de login, tema e preferências globais de conta)
    const clearFinancialLocalStorage = () => {
      const keysToRemove = [
        'semeia_primary_account_id',
        'semeia_archived_account_ids',
        'semeia_accounts_sort_by',
        'semeia_learned_category_rules',
        'semeia_card_eye_states',
      ]
      keysToRemove.forEach((k) => {
        try {
          localStorage.removeItem(k)
        } catch {
          /* intentionally ignored */
        }
      })
    }

    // 1. TENTATIVA PRIMÁRIA: Chamar o endpoint atômico de backend
    let endpointSuccess = false
    try {
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/reset-user-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
      })
      if (res.ok) {
        const data = await res.json().catch(() => ({}))
        if (data.success) {
          endpointSuccess = true
        }
      } else {
        console.warn('Endpoint /backend/v1/reset-user-data retornou status não-ok:', res.status)
      }
    } catch (endpointErr) {
      console.warn(
        'Falha ao chamar endpoint /backend/v1/reset-user-data, executando fallback:',
        endpointErr,
      )
    }

    if (endpointSuccess) {
      clearFinancialLocalStorage()
      await fetchAllData()
      await new Promise((resolve) => setTimeout(resolve, 500))
      await fetchAllData()
      return
    }

    // 2. FALLBACK: Execução passo a passo robusta no frontend
    console.info('Executando reset financeiro via fallback client-side...')

    // 2.1 Goal contributions (filhos de goals do usuário)
    try {
      const userGoals = await pb.collection('goals').getFullList<Goal>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      if (userGoals.length > 0) {
        const goalIds = userGoals.map((g) => `goal = "${g.id}"`).join(' || ')
        const contribs = await pb.collection('goal_contributions').getFullList<GoalContribution>({
          batch: 500,
          filter: goalIds,
        })
        await Promise.all(
          contribs.map((c) =>
            pb
              .collection('goal_contributions')
              .delete(c.id)
              .catch((err) => console.warn('Falha ao deletar goal_contribution:', err)),
          ),
        )
      }
    } catch (e) {
      console.warn('Erro ao limpar contribuições de metas:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.2 Invoice items (filhos de invoices do usuário)
    try {
      const userInvoices = await pb.collection('invoices').getFullList<Invoice>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      if (userInvoices.length > 0) {
        const invIds = userInvoices.map((inv) => `invoice = "${inv.id}"`).join(' || ')
        const items = await pb.collection('invoice_items').getFullList<InvoiceItem>({
          batch: 500,
          filter: invIds,
        })
        await Promise.all(
          items.map((item) =>
            pb
              .collection('invoice_items')
              .delete(item.id)
              .catch((err) => console.warn('Falha ao deletar invoice_item:', err)),
          ),
        )
      }
    } catch (e) {
      console.warn('Erro ao limpar itens de faturas:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.3 Apagar transações vinculadas do usuário com retry garantido (até 3 tentativas)
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        const userTxns = await pb.collection('transactions').getFullList<Transaction>({
          batch: 500,
          filter: `user = "${userId}"`,
        })
        if (userTxns.length === 0) break

        await Promise.all(
          userTxns.map((t) =>
            pb
              .collection('transactions')
              .delete(t.id)
              .catch((err) =>
                console.warn(`Falha ao deletar transaction ${t.id} (tentativa ${attempt}):`, err),
              ),
          ),
        )
      } catch (e) {
        console.warn(`Erro ao limpar transações (tentativa ${attempt}):`, e)
      }
      await new Promise((r) => setTimeout(r, 500))
    }

    // 2.4 Apagar faturas (invoices)
    try {
      const userInvoices = await pb.collection('invoices').getFullList<Invoice>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      await Promise.all(
        userInvoices.map((inv) =>
          pb
            .collection('invoices')
            .delete(inv.id)
            .catch((err) => console.warn('Falha ao deletar invoice:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar faturas:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.5 Apagar contas e boletos (bills)
    try {
      const userBills = await pb.collection('bills').getFullList<Bill>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      await Promise.all(
        userBills.map((b) =>
          pb
            .collection('bills')
            .delete(b.id)
            .catch((err) => console.warn('Falha ao deletar bill:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar contas/boletos:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.6 Apagar contas recorrentes (recurring_bills)
    try {
      const userRecurringBills = await pb.collection('recurring_bills').getFullList<RecurringBill>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      await Promise.all(
        userRecurringBills.map((rb) =>
          pb
            .collection('recurring_bills')
            .delete(rb.id)
            .catch((err) => console.warn('Falha ao deletar recurring_bill:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar contas recorrentes:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.7 Apagar recorrências (recurrences)
    try {
      const userRecurrences = await pb.collection('recurrences').getFullList<Recurrence>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      await Promise.all(
        userRecurrences.map((r) =>
          pb
            .collection('recurrences')
            .delete(r.id)
            .catch((err) => console.warn('Falha ao deletar recurrence:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar recorrências:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.8 Apagar parcelamentos (installments)
    try {
      const userInstallments = await pb.collection('installments').getFullList<Installment>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      await Promise.all(
        userInstallments.map((inst) =>
          pb
            .collection('installments')
            .delete(inst.id)
            .catch((err) => console.warn('Falha ao deletar installment:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar parcelamentos:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.9 Apagar orçamentos (budgets)
    try {
      const userBudgets = await pb.collection('budgets').getFullList<Budget>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      await Promise.all(
        userBudgets.map((bg) =>
          pb
            .collection('budgets')
            .delete(bg.id)
            .catch((err) => console.warn('Falha ao deletar budget:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar orçamentos:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.10 Apagar metas (goals)
    try {
      const userGoals = await pb.collection('goals').getFullList<Goal>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      await Promise.all(
        userGoals.map((g) =>
          pb
            .collection('goals')
            .delete(g.id)
            .catch((err) => console.warn('Falha ao deletar goal:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar metas:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.11 Apagar aportes, proventos e investimentos (investments)
    try {
      const userContribs = await pb
        .collection('investment_contributions')
        .getFullList<InvestmentContribution>({
          batch: 500,
          filter: `user = "${userId}"`,
        })
        .catch(() => [] as InvestmentContribution[])
      await Promise.all(
        userContribs.map((c) =>
          pb
            .collection('investment_contributions')
            .delete(c.id)
            .catch((err) => console.warn('Falha ao deletar investment_contribution:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar aportes de investimentos:', e)
    }

    try {
      const userEarnings = await pb
        .collection('investment_earnings')
        .getFullList<InvestmentEarning>({
          batch: 500,
          filter: `user = "${userId}"`,
        })
        .catch(() => [] as InvestmentEarning[])
      await Promise.all(
        userEarnings.map((e) =>
          pb
            .collection('investment_earnings')
            .delete(e.id)
            .catch((err) => console.warn('Falha ao deletar investment_earning:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar rendimentos de investimentos:', e)
    }

    try {
      const userInvestments = await pb.collection('investments').getFullList<Investment>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      await Promise.all(
        userInvestments.map((inv) =>
          pb
            .collection('investments')
            .delete(inv.id)
            .catch((err) => console.warn('Falha ao deletar investment:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar investimentos:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.12 Apagar regras de categorização (categorization_rules)
    try {
      const userRules = await pb
        .collection('categorization_rules')
        .getFullList<CategorizationRule>({
          batch: 500,
          filter: `user = "${userId}"`,
        })
      await Promise.all(
        userRules.map((r) =>
          pb
            .collection('categorization_rules')
            .delete(r.id)
            .catch((err) => console.warn('Falha ao deletar categorization_rule:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar regras de categorização:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.13 Apagar categorias personalizadas (categories)
    try {
      const userCategories = await pb.collection('categories').getFullList<CategoryItem>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      await Promise.all(
        userCategories.map((c) =>
          pb
            .collection('categories')
            .delete(c.id)
            .catch((err) => console.warn('Falha ao deletar category:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar categorias personalizadas:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.14 Apagar análises semanais (weekly_analyses)
    try {
      const userWeeklyAnalyses = await pb.collection('weekly_analyses').getFullList({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      await Promise.all(
        userWeeklyAnalyses.map((wa) =>
          pb
            .collection('weekly_analyses')
            .delete(wa.id)
            .catch((err) => console.warn('Falha ao deletar weekly_analysis:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar análises semanais:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.15 Apagar cartões de crédito (credit_cards)
    try {
      const userCards = await pb.collection('credit_cards').getFullList<CreditCard>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      await Promise.all(
        userCards.map((card) =>
          pb
            .collection('credit_cards')
            .delete(card.id)
            .catch((err) => console.warn('Falha ao deletar credit_card:', err)),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar cartões:', e)
    }
    await new Promise((r) => setTimeout(r, 500))

    // 2.16 Apagar contas bancárias (accounts) usando deleteAccount com cascade para passar pelo hook com segurança
    try {
      const userAccounts = await pb.collection('accounts').getFullList<Account>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      for (const acc of userAccounts) {
        try {
          await deleteAccount(acc.id, { deleteLinkedTransactions: true })
        } catch (accErr) {
          console.warn(`Falha ao deletar conta ${acc.id} com cascade:`, accErr)
          // Tentativa fallback direta
          await pb
            .collection('accounts')
            .delete(acc.id)
            .catch((e2) => console.warn(`Falha direta conta ${acc.id}:`, e2))
        }
      }
    } catch (e) {
      console.warn('Erro ao limpar contas bancárias:', e)
    }

    clearFinancialLocalStorage()

    // Atualiza todo o estado local para zerar e repete com delay de 500ms para garantir consistência
    await fetchAllData()
    await new Promise((resolve) => setTimeout(resolve, 500))
    await fetchAllData()
  }

  return (
    <FinanceDataContext.Provider
      value={{
        accounts: accountsWithBalances,
        creditCards: creditCardsWithMetrics,
        transactions,
        invoices,
        bills,
        recurringBills,
        recurrences,
        installments,
        budgets: budgetsWithSpent,
        goals: goalsWithAccumulated,
        goalContributions,
        investments: investmentsWithMetrics,
        contributions,
        earnings,
        rules,
        customCategories,
        isLoading,
        loadError,
        refreshAll: fetchAllData,

        totalCurrentBalance,
        totalProjectedBalance,
        monthIncomeReceived,
        monthExpensePaid,
        monthIncomePending,
        monthExpensePending,
        monthOpenInvoicesTotal,
        totalInvested,
        totalInvestmentsCurrent,
        totalInvestmentsResult,
        rentabilidadeMes,
        rentabilidadeAno,
        totalProventos,
        indicators,

        createTransaction,
        updateTransaction,
        deleteTransaction,
        toggleTransactionStatus,

        createAccount,
        updateAccount,
        deleteAccount,
        adjustAccountBalance,

        createCreditCard,
        updateCreditCard,
        deleteCreditCard,
        payInvoice,

        createBill,
        updateBill,
        deleteBill,
        markBillAsPaid,
        markBillAsUnpaid,
        createTransfer,

        createRecurringBill,
        updateRecurringBill,
        deleteRecurringBill,
        generateRecurringBills,

        createRecurrence,
        updateRecurrence,
        deleteRecurrence,

        createInstallment,
        updateInstallment,
        deleteInstallment,
        toggleInstallmentParcel,

        saveBudget,

        createGoal,
        updateGoal,
        deleteGoal,
        addGoalContribution,

        createInvestment,
        updateInvestment,
        deleteInvestment,
        createContribution,
        deleteContribution,
        createEarning,
        deleteEarning,
        refreshCryptoQuotes,
        refreshAllPrices,

        saveRule,
        deleteRule,
        saveCategoryDreGroup,
        createCategory,
        deleteCategory,
        resetAllUserData,
      }}
    >
      {children}
    </FinanceDataContext.Provider>
  )
}

export function useFinance() {
  const context = useContext(FinanceDataContext)
  if (!context) {
    throw new Error('useFinance deve ser usado dentro de um FinanceDataProvider')
  }
  return context
}
