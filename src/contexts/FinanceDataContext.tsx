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
  totalInvestmentsResult: number

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
  refreshCryptoQuotes: () => Promise<void>

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
  const [rules, setRules] = useState<CategorizationRule[]>([])
  const [customCategories, setCustomCategories] = useState<CategoryItem[]>([])
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

    // 1. Busca transações que apontam para essa conta (account ou transfer_target_account)
    const [txnsAsAccount, txnsAsTransferTarget] = await Promise.all([
      pb.collection('transactions').getFullList<Transaction>({
        batch: 500,
        filter: `account = "${id}"`,
      }),
      pb.collection('transactions').getFullList<Transaction>({
        batch: 500,
        filter: `transfer_target_account = "${id}"`,
      }),
    ])

    // Combina removendo possíveis duplicatas de id
    const allLinkedMap = new Map<string, Transaction>()
    txnsAsAccount.forEach((t) => allLinkedMap.set(t.id, t))
    txnsAsTransferTarget.forEach((t) => allLinkedMap.set(t.id, t))
    const linkedTxns = Array.from(allLinkedMap.values())

    if (linkedTxns.length > 0 && !options?.deleteLinkedTransactions) {
      throw new Error(
        'Esta conta possui movimentações vinculadas e não pode ser excluída para não quebrar o histórico.',
      )
    }

    // 2. Desvincula ou limpa contas (bills), recorrentes e recorrências que apontam para essa conta
    try {
      const [linkedBills, linkedRecurring, linkedRecurrences] = await Promise.all([
        pb.collection('bills').getFullList<Bill>({ batch: 500, filter: `account = "${id}"` }),
        pb
          .collection('recurring_bills')
          .getFullList<RecurringBill>({ batch: 500, filter: `account = "${id}"` }),
        pb
          .collection('recurrences')
          .getFullList<Recurrence>({ batch: 500, filter: `account = "${id}"` }),
      ])

      for (const b of linkedBills) {
        try {
          await pb.collection('bills').update(b.id, { account: null })
        } catch {
          /* intentionally ignored */
        }
      }

      for (const rb of linkedRecurring) {
        try {
          await pb.collection('recurring_bills').update(rb.id, { account: null })
        } catch {
          /* intentionally ignored */
        }
      }

      for (const r of linkedRecurrences) {
        try {
          await pb.collection('recurrences').update(r.id, { account: null })
        } catch {
          /* intentionally ignored */
        }
      }
    } catch (e) {
      console.warn('Erro ao desvincular conta de bills/recurrences:', e)
    }

    // 3. Se optou por excluir transações vinculadas, remove todas antes da conta
    if (linkedTxns.length > 0 && options?.deleteLinkedTransactions) {
      const linkedTxnIds = new Set(linkedTxns.map((t) => t.id))

      // 3.1 Se alguma transação gerada estiver em bills, desvincula antes de excluir a transação
      try {
        const billsWithGenTx = await pb.collection('bills').getFullList<Bill>({
          batch: 500,
          filter: `generated_transaction != null && generated_transaction != ""`,
        })
        for (const b of billsWithGenTx) {
          if (b.generated_transaction && linkedTxnIds.has(b.generated_transaction)) {
            try {
              await pb.collection('bills').update(b.id, { generated_transaction: null })
            } catch {
              /* intentionally ignored */
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao desvincular generated_transaction de bills:', e)
      }

      // 3.2 Se alguma transação estiver vinculada como pagamento de fatura, desvincula
      try {
        const invoicesWithPayTx = await pb.collection('invoices').getFullList<Invoice>({
          batch: 500,
          filter: `payment_transaction != null && payment_transaction != ""`,
        })
        for (const inv of invoicesWithPayTx) {
          if (inv.payment_transaction && linkedTxnIds.has(inv.payment_transaction)) {
            try {
              await pb.collection('invoices').update(inv.id, { payment_transaction: null })
            } catch {
              /* intentionally ignored */
            }
          }
        }
      } catch (e) {
        console.warn('Erro ao desvincular payment_transaction de faturas:', e)
      }

      // 3.3 Deleta as transações vinculadas sequencialmente para garantir sincronismo no PocketBase
      for (const t of linkedTxns) {
        try {
          await pb.collection('transactions').delete(t.id)
        } catch (err) {
          console.warn(`Erro ao excluir transação ${t.id}:`, err)
        }
      }

      // 3.4 Verificação extra de segurança: busca qualquer transação restante que ainda aponte para a conta
      try {
        const [leftover1, leftover2] = await Promise.all([
          pb.collection('transactions').getFullList<Transaction>({
            batch: 500,
            filter: `account = "${id}"`,
          }),
          pb.collection('transactions').getFullList<Transaction>({
            batch: 500,
            filter: `transfer_target_account = "${id}"`,
          }),
        ])
        const leftoverAll = [...leftover1, ...leftover2]
        for (const lt of leftoverAll) {
          try {
            await pb.collection('transactions').delete(lt.id)
          } catch {
            /* ignore */
          }
        }
      } catch (e) {
        console.warn('Erro na checagem final de transações vinculadas:', e)
      }
    }

    // 4. Exclui a conta bancária
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

    // 1. Apagar itens dependentes (filhos) primeiro
    // 1.1 Goal contributions (filhos de goals do usuário)
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
              .catch(() => {}),
          ),
        )
      }
    } catch (e) {
      console.warn('Erro ao limpar contribuições de metas:', e)
    }

    // 1.2 Invoice items (filhos de invoices do usuário)
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
              .catch(() => {}),
          ),
        )
      }
    } catch (e) {
      console.warn('Erro ao limpar itens de faturas:', e)
    }

    // 2. Apagar transações vinculadas do usuário (deve vir antes de bills, accounts, cards, installments)
    try {
      const userTxns = await pb.collection('transactions').getFullList<Transaction>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      await Promise.all(
        userTxns.map((t) =>
          pb
            .collection('transactions')
            .delete(t.id)
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar transações:', e)
    }

    // 3. Apagar faturas (invoices)
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
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar faturas:', e)
    }

    // 4. Apagar contas e boletos (bills)
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
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar contas/boletos:', e)
    }

    // 5. Apagar contas recorrentes (recurring_bills)
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
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar contas recorrentes:', e)
    }

    // 6. Apagar recorrências (recurrences)
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
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar recorrências:', e)
    }

    // 7. Apagar parcelamentos (installments)
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
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar parcelamentos:', e)
    }

    // 8. Apagar orçamentos (budgets)
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
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar orçamentos:', e)
    }

    // 9. Apagar metas (goals)
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
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar metas:', e)
    }

    // 10. Apagar investimentos (investments)
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
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar investimentos:', e)
    }

    // 11. Apagar regras de categorização (categorization_rules)
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
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar regras de categorização:', e)
    }

    // 12. Apagar categorias personalizadas (categories)
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
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar categorias personalizadas:', e)
    }

    // 13. Apagar análises semanais (weekly_analyses)
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
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar análises semanais:', e)
    }

    // 14. Apagar cartões de crédito (credit_cards)
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
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar cartões:', e)
    }

    // 15. Apagar contas bancárias (accounts) - transações já foram removidas, então passa pelo hook de proteção
    try {
      const userAccounts = await pb.collection('accounts').getFullList<Account>({
        batch: 500,
        filter: `user = "${userId}"`,
      })
      await Promise.all(
        userAccounts.map((acc) =>
          pb
            .collection('accounts')
            .delete(acc.id)
            .catch(() => {}),
        ),
      )
    } catch (e) {
      console.warn('Erro ao limpar contas bancárias:', e)
    }

    // Atualiza todo o estado local para zerar e repete com delay para garantir consistência
    await fetchAllData()
    await new Promise((resolve) => setTimeout(resolve, 300))
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
        refreshCryptoQuotes,

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
