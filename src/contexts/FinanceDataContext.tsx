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
  Recurrence,
  Installment,
  Budget,
  Goal,
  GoalContribution,
  Investment,
  CategorizationRule,
} from '@/types/finance'

interface FinanceDataContextType {
  accounts: Account[]
  creditCards: CreditCard[]
  transactions: Transaction[]
  invoices: Invoice[]
  bills: Bill[]
  recurrences: Recurrence[]
  installments: Installment[]
  budgets: Budget[]
  goals: Goal[]
  goalContributions: GoalContribution[]
  investments: Investment[]
  rules: CategorizationRule[]
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
  totalInvestmentsResult: number

  // Actions
  createTransaction: (data: Partial<Transaction>) => Promise<Transaction>
  updateTransaction: (id: string, data: Partial<Transaction>) => Promise<Transaction>
  deleteTransaction: (id: string) => Promise<void>
  toggleTransactionStatus: (tx: Transaction) => Promise<void>

  createAccount: (data: Partial<Account>) => Promise<Account>
  updateAccount: (id: string, data: Partial<Account>) => Promise<Account>
  deleteAccount: (id: string) => Promise<void>
  adjustAccountBalance: (accountId: string, newBalance: number, note?: string) => Promise<void>

  createCreditCard: (data: Partial<CreditCard>) => Promise<CreditCard>
  updateCreditCard: (id: string, data: Partial<CreditCard>) => Promise<CreditCard>
  deleteCreditCard: (id: string) => Promise<void>
  payInvoice: (invoiceId: string, accountId: string) => Promise<void>

  createBill: (data: Partial<Bill>) => Promise<Bill>
  updateBill: (id: string, data: Partial<Bill>) => Promise<Bill>
  deleteBill: (id: string) => Promise<void>
  markBillAsPaid: (bill: Bill, accountId?: string) => Promise<void>

  createRecurrence: (data: Partial<Recurrence>) => Promise<Recurrence>
  updateRecurrence: (id: string, data: Partial<Recurrence>) => Promise<Recurrence>
  deleteRecurrence: (id: string) => Promise<void>

  createInstallment: (data: Partial<Installment>) => Promise<Installment>
  deleteInstallment: (id: string) => Promise<void>

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
  refreshCryptoQuotes: () => Promise<void>

  saveRule: (keyword: string, category: string) => Promise<CategorizationRule>
  deleteRule: (id: string) => Promise<void>
}

const FinanceDataContext = createContext<FinanceDataContextType | undefined>(undefined)

export const FinanceDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [creditCards, setCreditCards] = useState<CreditCard[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [bills, setBills] = useState<Bill[]>([])
  const [recurrences, setRecurrences] = useState<Recurrence[]>([])
  const [installments, setInstallments] = useState<Installment[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalContributions, setGoalContributions] = useState<GoalContribution[]>([])
  const [investments, setInvestments] = useState<Investment[]>([])
  const [rules, setRules] = useState<CategorizationRule[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const fetchAllData = useCallback(async () => {
    if (!user) {
      setAccounts([])
      setCreditCards([])
      setTransactions([])
      setInvoices([])
      setBills([])
      setRecurrences([])
      setInstallments([])
      setBudgets([])
      setGoals([])
      setGoalContributions([])
      setInvestments([])
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
        recRes,
        instRes,
        budRes,
        goalRes,
        goalContRes,
        invtRes,
        ruleRes,
      ] = await Promise.all([
        pb.collection('accounts').getFullList<Account>({ sort: 'name' }),
        pb.collection('credit_cards').getFullList<CreditCard>({ sort: 'name' }),
        pb
          .collection('transactions')
          .getFullList<Transaction>({ sort: '-date,created', expand: 'account,credit_card' }),
        pb
          .collection('invoices')
          .getFullList<Invoice>({ sort: '-reference', expand: 'credit_card' }),
        pb.collection('bills').getFullList<Bill>({ sort: 'due_date', expand: 'account' }),
        pb
          .collection('recurrences')
          .getFullList<Recurrence>({ sort: 'due_day', expand: 'account' }),
        pb
          .collection('installments')
          .getFullList<Installment>({ sort: '-created', expand: 'credit_card' }),
        pb.collection('budgets').getFullList<Budget>({ sort: 'category' }),
        pb.collection('goals').getFullList<Goal>({ sort: 'name' }),
        pb.collection('goal_contributions').getFullList<GoalContribution>({ sort: '-date' }),
        pb.collection('investments').getFullList<Investment>({ sort: 'name' }),
        pb.collection('categorization_rules').getFullList<CategorizationRule>({ sort: 'keyword' }),
      ])

      setAccounts(accRes)
      setCreditCards(cardRes)
      setTransactions(txRes)
      setInvoices(invRes)
      setBills(billRes)
      setRecurrences(recRes)
      setInstallments(instRes)
      setBudgets(budRes)
      setGoals(goalRes)
      setGoalContributions(goalContRes)
      setInvestments(invtRes)
      setRules(ruleRes)
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
      'recurrences',
      'installments',
      'budgets',
      'goals',
      'goal_contributions',
      'investments',
      'categorization_rules',
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

    // Also include transactions made on this card that aren't closed in invoices
    const cardTxns = transactions.filter(
      (t) =>
        t.credit_card === card.id &&
        t.type === 'despesa' &&
        (!t.source || t.source === 'manual' || t.source === 'importado' || t.source === 'parcela'),
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
    .filter((t) => t.type === 'receita' && t.status === 'realizado')
    .reduce((acc, t) => acc + Number(t.value || 0), 0)

  const monthExpensePaid = currentMonthTxns
    .filter((t) => t.type === 'despesa' && t.status === 'realizado')
    .reduce((acc, t) => acc + Number(t.value || 0), 0)

  const monthIncomePending = currentMonthTxns
    .filter((t) => t.type === 'receita' && t.status === 'pendente')
    .reduce((acc, t) => acc + Number(t.value || 0), 0)

  const monthExpensePending = currentMonthTxns
    .filter((t) => t.type === 'despesa' && t.status === 'pendente')
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

  // 4. Investments total
  let totalInvested = 0
  let totalInvestmentsCurrent = 0
  const investmentsWithMetrics: Investment[] = investments.map((inv) => {
    const applied = Number(inv.applied_value || 0)
    totalInvested += applied

    let current = applied
    const qty = Number(inv.quantity || 0)
    const price = Number(inv.current_price || 0)

    if (
      inv.type === 'bitcoin' ||
      inv.type === 'ethereum' ||
      inv.type === 'acao' ||
      inv.type === 'fii'
    ) {
      if (qty > 0 && price > 0) {
        current = qty * price
      }
    } else if (inv.type === 'cdi100' || inv.type === 'renda_fixa') {
      current = price > 0 ? price : applied * 1.094
    }

    totalInvestmentsCurrent += current
    const profit_loss = current - applied
    const profit_loss_pct = applied > 0 ? (profit_loss / applied) * 100 : 0

    return {
      ...inv,
      current_total_value: current,
      profit_loss,
      profit_loss_pct,
    }
  })

  const totalInvestmentsResult = totalInvestmentsCurrent - totalInvested

  // 5. Goals with accumulated
  const goalsWithAccumulated: Goal[] = goals.map((g) => {
    const contribs = goalContributions.filter((c) => c.goal === g.id)
    const accumulated = contribs.reduce((acc, c) => acc + Number(c.value || 0), 0)
    const target = Number(g.target_value || 0)
    const remaining = Math.max(0, target - accumulated)
    const percentage = target > 0 ? Math.min(100, Math.round((accumulated / target) * 100)) : 0

    return {
      ...g,
      accumulated,
      percentage,
      remaining,
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

  const deleteAccount = async (id: string) => {
    // Validação de movimentações vinculadas
    const linkedTxns = transactions.filter((t) => t.account === id)
    if (linkedTxns.length > 0) {
      throw new Error(
        'Esta conta possui movimentações vinculadas e não pode ser excluída para não quebrar o histórico.',
      )
    }
    await pb.collection('accounts').delete(id)
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

  const deleteCreditCard = async (id: string) => {
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

  const createBill = async (data: Partial<Bill>) => {
    if (!user) throw new Error('Não autenticado')
    const rec = await pb.collection('bills').create<Bill>({
      ...data,
      user: user.id,
    })
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

  const markBillAsPaid = async (bill: Bill, accountId?: string) => {
    if (!user) return
    const nowIso = new Date().toISOString()

    // Cria transação de despesa
    const txn = await pb.collection('transactions').create<Transaction>({
      user: user.id,
      description: bill.description,
      value: bill.value,
      category: bill.category || 'Contas e Boletos',
      date: bill.due_date || nowIso,
      payment_method: 'Boleto',
      status: 'realizado',
      type: 'despesa',
      account: accountId || bill.account || undefined,
      source: 'manual',
      paid_at: nowIso,
    })

    // Atualiza status do boleto
    await pb.collection('bills').update(bill.id, {
      status: 'pago',
      paid_at: nowIso,
      generated_transaction: txn.id,
    })

    // Se for recorrente, gera o próximo boleto no mês seguinte
    if (bill.recurring && bill.due_date) {
      const nextDue = new Date(bill.due_date)
      nextDue.setMonth(nextDue.getMonth() + 1)
      await pb.collection('bills').create<Bill>({
        user: user.id,
        description: bill.description,
        value: bill.value,
        due_date: nextDue.toISOString(),
        category: bill.category,
        status: 'não_pago',
        account: bill.account,
        recurring: true,
      })
    }

    await fetchAllData()
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

  const deleteInstallment = async (id: string) => {
    // Exclui grupo e transações filhas
    const linkedTxns = transactions.filter((t) => t.installment_group === id)
    for (const t of linkedTxns) {
      await pb
        .collection('transactions')
        .delete(t.id)
        .catch(() => {})
    }
    await pb.collection('installments').delete(id)
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
    await pb.collection('investments').delete(id)
    await fetchAllData()
  }

  const refreshCryptoQuotes = async () => {
    try {
      await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/investments/refresh-crypto`, {
        method: 'POST',
        headers: {
          Authorization: pb.authStore.token,
        },
      })
      await fetchAllData()
    } catch (e) {
      console.warn('Refresh crypto quote failed:', e)
    }
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

  return (
    <FinanceDataContext.Provider
      value={{
        accounts: accountsWithBalances,
        creditCards: creditCardsWithMetrics,
        transactions,
        invoices,
        bills,
        recurrences,
        installments,
        budgets: budgetsWithSpent,
        goals: goalsWithAccumulated,
        goalContributions,
        investments: investmentsWithMetrics,
        rules,
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
        totalInvestmentsResult,

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

        createRecurrence,
        updateRecurrence,
        deleteRecurrence,

        createInstallment,
        deleteInstallment,

        saveBudget,

        createGoal,
        updateGoal,
        deleteGoal,
        addGoalContribution,

        createInvestment,
        updateInvestment,
        deleteInvestment,
        refreshCryptoQuotes,

        saveRule,
        deleteRule,
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
