import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, CATEGORY_SUGGESTIONS, CATEGORY_COLORS } from '@/lib/constants'
import { Bill, BillType, RecurringFrequency, Transaction } from '@/types/finance'
import {
  Receipt,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  Trash2,
  Repeat,
  Search,
  ArrowDownCircle,
  ArrowUpCircle,
  Pencil,
  Filter,
  Check,
  Building2,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  ChevronDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'

// Modelo unificado de item de Conta a Pagar e Receber
export interface UnifiedAccountItem {
  id: string
  origin: 'bill' | 'transaction'
  rawBill?: Bill
  rawTx?: Transaction
  description: string
  category: string
  value: number
  dueDate: string // YYYY-MM-DD
  paymentDate?: string
  accountId?: string
  accountName?: string
  status: 'pago' | 'pendente' | 'vencido'
  type: 'receita' | 'despesa'
  isRecurring?: boolean
}

type SectionKey =
  | 'todas'
  | 'receitas_recebidas'
  | 'receitas_pendentes'
  | 'receitas_vencidas'
  | 'despesas_pagas'
  | 'despesas_pendentes'
  | 'despesas_vencidas'

type SortBy = 'vencimento_asc' | 'vencimento_desc' | 'valor_desc' | 'valor_asc'

interface FormState {
  description: string
  value: string
  dueDate: string
  category: string
  type: BillType
  accountId: string
  recurring: boolean
  frequency: RecurringFrequency
  repetitions: string
}

const emptyForm: FormState = {
  description: '',
  value: '',
  dueDate: new Date().toISOString().slice(0, 10),
  category: 'Moradia',
  type: 'pagar',
  accountId: '',
  recurring: false,
  frequency: 'mensal',
  repetitions: '12',
}

export default function BillsPage() {
  const {
    bills,
    transactions,
    accounts,
    isLoading,
    loadError,
    refreshAll,
    createBill,
    updateBill,
    deleteBill,
    markBillAsPaid,
    markBillAsUnpaid,
    createRecurringBill,
    toggleTransactionStatus,
    updateTransaction,
    deleteTransaction,
  } = useFinance()
  const { hideValues } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<SectionKey>('todas')
  const [modalOpen, setModalOpen] = useState(false)
  const [editItem, setEditItem] = useState<UnifiedAccountItem | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('todas')
  const [accountFilter, setAccountFilter] = useState('todas')
  const [monthFilter, setMonthFilter] = useState('todos')
  const [sortBy, setSortBy] = useState<SortBy>('vencimento_asc')

  // Modais de Ação Rápida
  const [payModalItem, setPayModalItem] = useState<UnifiedAccountItem | null>(null)
  const [payAccount, setPayAccount] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deleteItemObj, setDeleteItemObj] = useState<UnifiedAccountItem | null>(null)

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])
  const currentMonthPrefix = useMemo(() => new Date().toISOString().slice(0, 7), [])

  // 1. Unificação de `bills` e `transactions` sem duplicação
  const unifiedItems = useMemo<UnifiedAccountItem[]>(() => {
    const list: UnifiedAccountItem[] = []
    const generatedTxIds = new Set<string>()

    // Processa bills
    bills.forEach((b) => {
      if (b.generated_transaction) {
        generatedTxIds.add(b.generated_transaction)
      }
      const due = (b.due_date || '').slice(0, 10)
      const isPaid = b.status === 'pago'
      const isReceita = b.type === 'receber'
      const isOverdue = !isPaid && due && due < todayStr

      let computedStatus: 'pago' | 'pendente' | 'vencido' = 'pendente'
      if (isPaid) computedStatus = 'pago'
      else if (isOverdue) computedStatus = 'vencido'
      else computedStatus = 'pendente'

      const accObj = accounts.find((a) => a.id === b.account)

      list.push({
        id: `bill-${b.id}`,
        origin: 'bill',
        rawBill: b,
        description: b.description || 'Sem descrição',
        category: b.category || (isReceita ? 'Outras Receitas' : 'Outros'),
        value: Number(b.value || 0),
        dueDate: due || todayStr,
        paymentDate: b.paid_at ? b.paid_at.slice(0, 10) : undefined,
        accountId: b.account || undefined,
        accountName: accObj?.name,
        status: computedStatus,
        type: isReceita ? 'receita' : 'despesa',
        isRecurring: !!b.recurring,
      })
    })

    // Processa transactions que NÃO foram geradas por bills
    transactions.forEach((tx) => {
      if (generatedTxIds.has(tx.id)) return // evita duplicar o que já veio de bill
      if (tx.type === 'ajuste') return // ajustes de saldo ficam no extrato

      const txDate = (tx.date || '').slice(0, 10)
      const isRealizado = tx.status === 'realizado'
      const isReceita = tx.type === 'receita'
      const isOverdue = !isRealizado && txDate && txDate < todayStr

      let computedStatus: 'pago' | 'pendente' | 'vencido' = 'pendente'
      if (isRealizado) computedStatus = 'pago'
      else if (isOverdue) computedStatus = 'vencido'
      else computedStatus = 'pendente'

      const accObj = accounts.find((a) => a.id === tx.account)

      list.push({
        id: `tx-${tx.id}`,
        origin: 'transaction',
        rawTx: tx,
        description: tx.description || 'Sem descrição',
        category: tx.category || (isReceita ? 'Outras Receitas' : 'Outros'),
        value: Number(tx.value || 0),
        dueDate: txDate || todayStr,
        paymentDate: tx.paid_at ? tx.paid_at.slice(0, 10) : isRealizado ? txDate : undefined,
        accountId: tx.account || undefined,
        accountName: accObj?.name,
        status: computedStatus,
        type: isReceita ? 'receita' : 'despesa',
        isRecurring: tx.source === 'recorrência',
      })
    })

    return list
  }, [bills, transactions, accounts, todayStr])

  // Categorias disponíveis para filtro
  const categories = useMemo(() => {
    const s = new Set<string>()
    unifiedItems.forEach((i) => {
      if (i.category) s.add(i.category)
    })
    return Array.from(s).sort((a, b) => a.localeCompare(b))
  }, [unifiedItems])

  // Meses disponíveis para filtro
  const availableMonths = useMemo(() => {
    const s = new Set<string>()
    unifiedItems.forEach((i) => {
      if (i.dueDate && i.dueDate.length >= 7) {
        s.add(i.dueDate.slice(0, 7))
      }
    })
    return Array.from(s).sort((a, b) => b.localeCompare(a))
  }, [unifiedItems])

  // 2. Classificação nas 6 seções obrigatórias
  const sections = useMemo(() => {
    // Aplica filtros globais (busca, categoria, conta, mês)
    let filtered = unifiedItems

    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (item) =>
          item.description.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.accountName && item.accountName.toLowerCase().includes(q)),
      )
    }

    if (categoryFilter !== 'todas') {
      filtered = filtered.filter((i) => i.category === categoryFilter)
    }

    if (accountFilter !== 'todas') {
      filtered = filtered.filter((i) => i.accountId === accountFilter)
    }

    if (monthFilter !== 'todos') {
      filtered = filtered.filter((i) => (i.dueDate || '').startsWith(monthFilter))
    }

    // Ordenação
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'vencimento_asc') return (a.dueDate || '').localeCompare(b.dueDate || '')
      if (sortBy === 'vencimento_desc') return (b.dueDate || '').localeCompare(a.dueDate || '')
      if (sortBy === 'valor_desc') return b.value - a.value
      if (sortBy === 'valor_asc') return a.value - b.value
      return 0
    })

    // 1. Receitas Recebidas
    const receitasRecebidas = filtered.filter((i) => i.type === 'receita' && i.status === 'pago')
    // 2. Receitas Pendentes (não pagas e data >= hoje)
    const receitasPendentes = filtered.filter(
      (i) => i.type === 'receita' && i.status === 'pendente' && i.dueDate >= todayStr,
    )
    // 3. Receitas Vencidas (não pagas e data < hoje)
    const receitasVencidas = filtered.filter(
      (i) =>
        i.type === 'receita' &&
        (i.status === 'vencido' || (i.status === 'pendente' && i.dueDate < todayStr)),
    )

    // 4. Despesas Pagas
    const despesasPagas = filtered.filter((i) => i.type === 'despesa' && i.status === 'pago')
    // 5. Despesas Pendentes (não pagas e data >= hoje)
    const despesasPendentes = filtered.filter(
      (i) => i.type === 'despesa' && i.status === 'pendente' && i.dueDate >= todayStr,
    )
    // 6. Despesas Vencidas (não pagas e data < hoje)
    const despesasVencidas = filtered.filter(
      (i) =>
        i.type === 'despesa' &&
        (i.status === 'vencido' || (i.status === 'pendente' && i.dueDate < todayStr)),
    )

    return {
      all: filtered,
      receitasRecebidas,
      receitasPendentes,
      receitasVencidas,
      despesasPagas,
      despesasPendentes,
      despesasVencidas,
      // Totais monetários
      totais: {
        receitasRecebidasVal: receitasRecebidas.reduce((s, i) => s + i.value, 0),
        receitasPendentesVal: receitasPendentes.reduce((s, i) => s + i.value, 0),
        receitasVencidasVal: receitasVencidas.reduce((s, i) => s + i.value, 0),
        despesasPagasVal: despesasPagas.reduce((s, i) => s + i.value, 0),
        despesasPendentesVal: despesasPendentes.reduce((s, i) => s + i.value, 0),
        despesasVencidasVal: despesasVencidas.reduce((s, i) => s + i.value, 0),
      },
    }
  }, [unifiedItems, search, categoryFilter, accountFilter, monthFilter, sortBy, todayStr])

  // Abertura de modal Nova Conta
  const openCreate = (defaultType: BillType = 'pagar') => {
    setEditItem(null)
    setForm({
      ...emptyForm,
      type: defaultType,
      accountId: accounts[0]?.id || '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  // Abertura de modal Edição
  const openEdit = (item: UnifiedAccountItem) => {
    setEditItem(item)
    setForm({
      description: item.description,
      value: String(item.value || ''),
      dueDate: item.dueDate || todayStr,
      category: item.category || 'Moradia',
      type: item.type === 'receita' ? 'receber' : 'pagar',
      accountId: item.accountId || '',
      recurring: !!item.isRecurring,
      frequency: item.rawBill?.expand?.recurring_bill?.frequency || 'mensal',
      repetitions: '12',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.description.trim()) errs.description = 'Descrição é obrigatória'
    const num = parseFloat(form.value.replace(',', '.'))
    if (isNaN(num) || num <= 0) errs.value = 'Informe um valor positivo'
    if (!form.dueDate) errs.dueDate = 'Data de vencimento obrigatória'
    if (form.recurring) {
      const reps = parseInt(form.repetitions, 10)
      if (isNaN(reps) || reps < 1) errs.repetitions = 'Quantidade inválida (mínimo 1)'
    }
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const num = parseFloat(form.value.replace(',', '.'))
      const dueIso = `${form.dueDate} 12:00:00.000Z`

      if (editItem) {
        if (editItem.origin === 'bill' && editItem.rawBill) {
          await updateBill(editItem.rawBill.id, {
            description: form.description.trim(),
            value: num,
            due_date: dueIso,
            category: form.category,
            type: form.type,
            account: form.accountId || undefined,
          })
        } else if (editItem.origin === 'transaction' && editItem.rawTx) {
          await updateTransaction(editItem.rawTx.id, {
            description: form.description.trim(),
            value: num,
            date: dueIso,
            category: form.category,
            type: form.type === 'receber' ? 'receita' : 'despesa',
            account: form.accountId || undefined,
          })
        }
        toast({ title: 'Item atualizado com sucesso' })
      } else {
        await createBill({
          description: form.description.trim(),
          value: num,
          due_date: dueIso,
          category: form.category,
          type: form.type,
          account: form.accountId || undefined,
          recurring: form.recurring,
          status: 'não_pago',
        })
        if (form.recurring) {
          const reps = parseInt(form.repetitions, 10) || 12
          const startDate = new Date(dueIso)
          await createRecurringBill({
            description: form.description.trim(),
            value: num,
            type: form.type,
            category: form.category,
            frequency: form.frequency,
            due_day: startDate.getUTCDate(),
            payment_method: 'Boleto',
            account: form.accountId || undefined,
            active: true,
            start_date: dueIso,
            next_date: (() => {
              const n = new Date(startDate)
              if (form.frequency === 'semanal') n.setDate(n.getDate() + 7)
              else if (form.frequency === 'trimestral') n.setMonth(n.getMonth() + 3)
              else if (form.frequency === 'anual') n.setFullYear(n.getFullYear() + 1)
              else n.setMonth(n.getMonth() + 1)
              return n.toISOString()
            })(),
            repetitions: reps,
            generated_count: 1,
          })
        }
        toast({ title: 'Conta cadastrada com sucesso' })
      }
      setModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setFormErrors({ form: errorObj?.message || 'Erro ao salvar conta.' })
    } finally {
      setLoading(false)
    }
  }

  // Ação rápida: marcar como pago / recebido
  const handleToggleStatus = async (item: UnifiedAccountItem) => {
    setTogglingId(item.id)
    try {
      if (item.origin === 'bill' && item.rawBill) {
        if (item.status === 'pago') {
          await markBillAsUnpaid(item.rawBill)
          toast({ title: 'Conta marcada como pendente' })
        } else {
          // Se já tem conta bancária vinculada, executa direto; senão abre modal de seleção de conta
          if (item.accountId) {
            await markBillAsPaid(item.rawBill, item.accountId)
            toast({
              title: item.type === 'receita' ? 'Recebimento confirmado' : 'Pagamento confirmado',
            })
          } else {
            setPayAccount(accounts[0]?.id || '')
            setPayModalItem(item)
          }
        }
      } else if (item.origin === 'transaction' && item.rawTx) {
        await toggleTransactionStatus(item.rawTx)
        toast({
          title:
            item.status === 'pago'
              ? 'Lançamento marcado como pendente'
              : item.type === 'receita'
                ? 'Receita marcada como recebida'
                : 'Despesa marcada como paga',
        })
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      toast({
        title: 'Erro',
        description: errorObj?.message || 'Não foi possível atualizar o status.',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  // Confirmar pagamento pelo modal com escolha de conta
  const handleConfirmPayModal = async () => {
    if (!payModalItem) return
    setLoading(true)
    try {
      if (payModalItem.origin === 'bill' && payModalItem.rawBill) {
        await markBillAsPaid(payModalItem.rawBill, payAccount || undefined)
        toast({
          title:
            payModalItem.type === 'receita' ? 'Recebimento confirmado' : 'Pagamento confirmado',
        })
      }
      setPayModalItem(null)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      toast({
        title: 'Erro ao confirmar',
        description: errorObj?.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  // Excluir item
  const handleConfirmDelete = async () => {
    if (!deleteItemObj) return
    setLoading(true)
    try {
      if (deleteItemObj.origin === 'bill' && deleteItemObj.rawBill) {
        await deleteBill(deleteItemObj.rawBill.id)
      } else if (deleteItemObj.origin === 'transaction' && deleteItemObj.rawTx) {
        await deleteTransaction(deleteItemObj.rawTx.id)
      }
      toast({ title: 'Item excluído com sucesso' })
      setDeleteItemObj(null)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      toast({
        title: 'Erro ao excluir',
        description: errorObj?.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const renderItemRow = (item: UnifiedAccountItem) => {
    const isReceita = item.type === 'receita'
    const isPago = item.status === 'pago'
    const isVencido = item.status === 'vencido'
    const isHoje = !isPago && item.dueDate === todayStr
    const catColor = CATEGORY_COLORS[item.category] || CATEGORY_COLORS['Outros']

    return (
      <div
        key={item.id}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group"
      >
        {/* Esquerda: Ícone de Ação + Descrição + Metadados */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => handleToggleStatus(item)}
            disabled={togglingId === item.id}
            title={
              isPago
                ? 'Marcar como pendente'
                : isReceita
                  ? 'Marcar como recebida'
                  : 'Marcar como paga'
            }
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold transition-transform active:scale-95 disabled:opacity-50 ${
              isPago
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 border border-emerald-500/30'
                : isVencido
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/40 border border-red-500/30 animate-pulse'
                  : isHoje
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 border border-amber-500/30'
                    : isReceita
                      ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/40'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {isPago ? (
              <Check className="w-4 h-4 stroke-[3]" />
            ) : isReceita ? (
              <ArrowDownCircle className="w-4 h-4" />
            ) : (
              <Receipt className="w-4 h-4" />
            )}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {item.description}
              </span>
              {item.isRecurring && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 text-slate-500">
                  <Repeat className="w-2.5 h-2.5 mr-0.5" /> Recorrente
                </Badge>
              )}
              {item.category && (
                <Badge
                  variant="outline"
                  className="text-[9px] py-0 px-1.5 font-medium"
                  style={{ color: catColor, borderColor: catColor + '55' }}
                >
                  {item.category}
                </Badge>
              )}
            </div>

            {/* Linha de campos detalhados: Vencimento, Pagamento, Conta bancária, Origem */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-400 mt-0.5">
              <span>Vencimento: {formatDate(item.dueDate)}</span>
              {item.paymentDate && (
                <span className="text-emerald-600 dark:text-emerald-400">
                  • {isReceita ? 'Recebido em' : 'Pago em'}: {formatDate(item.paymentDate)}
                </span>
              )}
              {item.accountName && (
                <span className="flex items-center gap-0.5 text-slate-500 dark:text-slate-400">
                  • <Building2 className="w-3 h-3 inline" /> {item.accountName}
                </span>
              )}
              <span className="text-[10px] text-slate-400 uppercase tracking-wider">
                ({item.origin === 'bill' ? 'Boleto/Conta' : 'Transação'})
              </span>
            </div>
          </div>
        </div>

        {/* Direita: Valor + Status + Ações */}
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="text-right">
            <div
              className={`text-sm sm:text-base font-extrabold tabular-nums ${
                isPago
                  ? 'text-emerald-600'
                  : isVencido
                    ? 'text-red-600'
                    : isReceita
                      ? 'text-teal-600'
                      : 'text-slate-900 dark:text-white'
              }`}
            >
              {isReceita ? '+' : '−'}
              {formatCurrency(item.value, hideValues)}
            </div>
            <button
              onClick={() => handleToggleStatus(item)}
              disabled={togglingId === item.id}
              className={`text-[10px] font-bold block ml-auto hover:underline cursor-pointer disabled:opacity-50 ${
                isPago
                  ? 'text-emerald-600'
                  : isVencido
                    ? 'text-red-600'
                    : isHoje
                      ? 'text-amber-600'
                      : isReceita
                        ? 'text-teal-600'
                        : 'text-blue-600'
              }`}
            >
              {isPago
                ? isReceita
                  ? 'Recebido'
                  : 'Pago'
                : isVencido
                  ? 'Vencido (Liquidar)'
                  : isHoje
                    ? 'Vence Hoje'
                    : isReceita
                      ? 'Pendente (Receber)'
                      : 'Pendente (Pagar)'}
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(item)}
            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600 rounded-lg"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteItemObj(item)}
            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 rounded-lg"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  const renderSectionBox = (
    title: string,
    count: number,
    totalVal: number,
    items: UnifiedAccountItem[],
    color: 'emerald' | 'teal' | 'amber' | 'red' | 'blue' | 'slate',
    icon: React.ReactNode,
    emptyMessage: string,
  ) => {
    const colorStyles = {
      emerald: 'border-emerald-500/30 bg-emerald-50/20 dark:bg-emerald-950/10 text-emerald-600',
      teal: 'border-teal-500/30 bg-teal-50/20 dark:bg-teal-950/10 text-teal-600',
      amber: 'border-amber-500/30 bg-amber-50/20 dark:bg-amber-950/10 text-amber-600',
      red: 'border-red-500/30 bg-red-50/20 dark:bg-red-950/10 text-red-600',
      blue: 'border-blue-500/30 bg-blue-50/20 dark:bg-blue-950/10 text-blue-600',
      slate: 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300',
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between px-1">
          <div
            className={`flex items-center gap-2 text-xs font-extrabold ${colorStyles[color].split(' ').pop()}`}
          >
            {icon}
            <span>
              {title} ({count})
            </span>
          </div>
          <span className="text-xs font-bold tabular-nums text-slate-700 dark:text-slate-300">
            Total: {formatCurrency(totalVal, hideValues)}
          </span>
        </div>

        <div
          className={`bg-white dark:bg-[#121A2B] rounded-2xl border-2 ${colorStyles[color]} shadow-xs divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden`}
        >
          {items.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">{emptyMessage}</div>
          ) : (
            items.map(renderItemRow)
          )}
        </div>
      </div>
    )
  }

  if (isLoading && unifiedItems.length === 0) {
    return <LoadingState message="Carregando Contas a Pagar e Receber..." />
  }
  if (loadError) {
    return (
      <ErrorState
        message="Não foi possível carregar as contas a pagar e receber."
        onRetry={refreshAll}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
            Contas a Pagar e Receber
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Central unificada de controle de fluxo de caixa, vencimentos e liquidações
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => openCreate('receber')}
            variant="outline"
            className="rounded-xl font-semibold gap-1.5 text-teal-700 dark:text-teal-300 border-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/30"
          >
            <ArrowDownCircle className="w-4 h-4 text-teal-600" /> Nova Receita
          </Button>
          <Button
            onClick={() => openCreate('pagar')}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nova Despesa
          </Button>
        </div>
      </div>

      {/* Grid Resumo das 6 Seções */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Receitas Recebidas */}
        <SummaryMiniCard
          label="Receitas Recebidas"
          value={formatCurrency(sections.totais.receitasRecebidasVal, hideValues)}
          count={sections.receitasRecebidas.length}
          color="emerald"
        />
        {/* Receitas Pendentes */}
        <SummaryMiniCard
          label="Receitas Pendentes"
          value={formatCurrency(sections.totais.receitasPendentesVal, hideValues)}
          count={sections.receitasPendentes.length}
          color="teal"
        />
        {/* Receitas Vencidas */}
        <SummaryMiniCard
          label="Receitas Vencidas"
          value={formatCurrency(sections.totais.receitasVencidasVal, hideValues)}
          count={sections.receitasVencidas.length}
          color="amber"
        />
        {/* Despesas Pagas */}
        <SummaryMiniCard
          label="Despesas Pagas"
          value={formatCurrency(sections.totais.despesasPagasVal, hideValues)}
          count={sections.despesasPagas.length}
          color="blue"
        />
        {/* Despesas Pendentes */}
        <SummaryMiniCard
          label="Despesas Pendentes"
          value={formatCurrency(sections.totais.despesasPendentesVal, hideValues)}
          count={sections.despesasPendentes.length}
          color="slate"
        />
        {/* Despesas Vencidas */}
        <SummaryMiniCard
          label="Despesas Vencidas"
          value={formatCurrency(sections.totais.despesasVencidasVal, hideValues)}
          count={sections.despesasVencidas.length}
          color="red"
        />
      </div>

      {/* Barra de Filtros */}
      <Card className="bg-white dark:bg-[#121A2B] border-slate-200 dark:border-slate-800 shadow-xs">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por descrição, categoria ou conta bancária..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={accountFilter} onValueChange={setAccountFilter}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Conta bancária" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as contas</SelectItem>
                {accounts.map((acc) => (
                  <SelectItem key={acc.id} value={acc.id}>
                    {acc.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={monthFilter} onValueChange={setMonthFilter}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os meses</SelectItem>
                {availableMonths.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vencimento_asc">Vencimento (Próximos)</SelectItem>
                <SelectItem value="vencimento_desc">Vencimento (Distantes)</SelectItem>
                <SelectItem value="valor_desc">Maior valor</SelectItem>
                <SelectItem value="valor_asc">Menor valor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Tabs com as 6 seções + Visão Todas */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as SectionKey)}
        className="space-y-4"
      >
        <TabsList className="w-full h-auto p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl flex flex-wrap gap-1">
          <TabsTrigger
            value="todas"
            className="flex-1 min-w-[120px] rounded-xl text-xs py-2 font-semibold"
          >
            Todas ({sections.all.length})
          </TabsTrigger>
          <TabsTrigger
            value="receitas_recebidas"
            className="flex-1 min-w-[130px] rounded-xl text-xs py-2 font-semibold text-emerald-700 dark:text-emerald-300"
          >
            Receitas Recebidas ({sections.receitasRecebidas.length})
          </TabsTrigger>
          <TabsTrigger
            value="receitas_pendentes"
            className="flex-1 min-w-[130px] rounded-xl text-xs py-2 font-semibold text-teal-700 dark:text-teal-300"
          >
            Receitas Pendentes ({sections.receitasPendentes.length})
          </TabsTrigger>
          <TabsTrigger
            value="receitas_vencidas"
            className="flex-1 min-w-[130px] rounded-xl text-xs py-2 font-semibold text-amber-700 dark:text-amber-300"
          >
            Receitas Vencidas ({sections.receitasVencidas.length})
          </TabsTrigger>
          <TabsTrigger
            value="despesas_pagas"
            className="flex-1 min-w-[130px] rounded-xl text-xs py-2 font-semibold text-blue-700 dark:text-blue-300"
          >
            Despesas Pagas ({sections.despesasPagas.length})
          </TabsTrigger>
          <TabsTrigger
            value="despesas_pendentes"
            className="flex-1 min-w-[130px] rounded-xl text-xs py-2 font-semibold text-slate-700 dark:text-slate-300"
          >
            Despesas Pendentes ({sections.despesasPendentes.length})
          </TabsTrigger>
          <TabsTrigger
            value="despesas_vencidas"
            className="flex-1 min-w-[130px] rounded-xl text-xs py-2 font-semibold text-red-700 dark:text-red-300"
          >
            Despesas Vencidas ({sections.despesasVencidas.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab: TODAS (agrupadas em blocos) */}
        <TabsContent value="todas" className="space-y-6 pt-2">
          {sections.despesasVencidas.length > 0 &&
            renderSectionBox(
              'Despesas Vencidas',
              sections.despesasVencidas.length,
              sections.totais.despesasVencidasVal,
              sections.despesasVencidas,
              'red',
              <AlertTriangle className="w-4 h-4" />,
              'Nenhuma despesa vencida.',
            )}

          {sections.receitasVencidas.length > 0 &&
            renderSectionBox(
              'Receitas Vencidas (Atrasadas)',
              sections.receitasVencidas.length,
              sections.totais.receitasVencidasVal,
              sections.receitasVencidas,
              'amber',
              <AlertTriangle className="w-4 h-4" />,
              'Nenhuma receita em atraso.',
            )}

          {sections.despesasPendentes.length > 0 &&
            renderSectionBox(
              'Despesas Pendentes',
              sections.despesasPendentes.length,
              sections.totais.despesasPendentesVal,
              sections.despesasPendentes,
              'slate',
              <Clock className="w-4 h-4" />,
              'Nenhuma despesa pendente.',
            )}

          {sections.receitasPendentes.length > 0 &&
            renderSectionBox(
              'Receitas Pendentes',
              sections.receitasPendentes.length,
              sections.totais.receitasPendentesVal,
              sections.receitasPendentes,
              'teal',
              <ArrowDownCircle className="w-4 h-4" />,
              'Nenhuma receita pendente.',
            )}

          {sections.receitasRecebidas.length > 0 &&
            renderSectionBox(
              'Receitas Recebidas',
              sections.receitasRecebidas.length,
              sections.totais.receitasRecebidasVal,
              sections.receitasRecebidas,
              'emerald',
              <CheckCircle2 className="w-4 h-4" />,
              'Nenhuma receita recebida.',
            )}

          {sections.despesasPagas.length > 0 &&
            renderSectionBox(
              'Despesas Pagas',
              sections.despesasPagas.length,
              sections.totais.despesasPagasVal,
              sections.despesasPagas,
              'blue',
              <CheckCircle2 className="w-4 h-4" />,
              'Nenhuma despesa paga.',
            )}

          {sections.all.length === 0 && (
            <EmptyState
              icon={Receipt}
              title="Nenhuma conta encontrada"
              description="Cadastre receitas e despesas para acompanhar suas contas a pagar e receber."
              actionLabel="Nova Despesa"
              onAction={() => openCreate('pagar')}
            />
          )}
        </TabsContent>

        {/* Tab: Receitas Recebidas */}
        <TabsContent value="receitas_recebidas" className="pt-2">
          {renderSectionBox(
            'Receitas Recebidas',
            sections.receitasRecebidas.length,
            sections.totais.receitasRecebidasVal,
            sections.receitasRecebidas,
            'emerald',
            <CheckCircle2 className="w-4 h-4" />,
            'Nenhuma receita recebida neste filtro.',
          )}
        </TabsContent>

        {/* Tab: Receitas Pendentes */}
        <TabsContent value="receitas_pendentes" className="pt-2">
          {renderSectionBox(
            'Receitas Pendentes',
            sections.receitasPendentes.length,
            sections.totais.receitasPendentesVal,
            sections.receitasPendentes,
            'teal',
            <ArrowDownCircle className="w-4 h-4" />,
            'Nenhuma receita pendente.',
          )}
        </TabsContent>

        {/* Tab: Receitas Vencidas */}
        <TabsContent value="receitas_vencidas" className="pt-2">
          {renderSectionBox(
            'Receitas Vencidas',
            sections.receitasVencidas.length,
            sections.totais.receitasVencidasVal,
            sections.receitasVencidas,
            'amber',
            <AlertTriangle className="w-4 h-4" />,
            'Nenhuma receita vencida. Tudo em dia!',
          )}
        </TabsContent>

        {/* Tab: Despesas Pagas */}
        <TabsContent value="despesas_pagas" className="pt-2">
          {renderSectionBox(
            'Despesas Pagas',
            sections.despesasPagas.length,
            sections.totais.despesasPagasVal,
            sections.despesasPagas,
            'blue',
            <CheckCircle2 className="w-4 h-4" />,
            'Nenhuma despesa paga neste filtro.',
          )}
        </TabsContent>

        {/* Tab: Despesas Pendentes */}
        <TabsContent value="despesas_pendentes" className="pt-2">
          {renderSectionBox(
            'Despesas Pendentes',
            sections.despesasPendentes.length,
            sections.totais.despesasPendentesVal,
            sections.despesasPendentes,
            'slate',
            <Clock className="w-4 h-4" />,
            'Nenhuma despesa pendente.',
          )}
        </TabsContent>

        {/* Tab: Despesas Vencidas */}
        <TabsContent value="despesas_vencidas" className="pt-2">
          {renderSectionBox(
            'Despesas Vencidas',
            sections.despesasVencidas.length,
            sections.totais.despesasVencidasVal,
            sections.despesasVencidas,
            'red',
            <AlertTriangle className="w-4 h-4" />,
            'Nenhuma despesa vencida. Excelente controle!',
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Cadastro/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              {editItem
                ? `Editar ${form.type === 'receber' ? 'Receita' : 'Conta a Pagar'}`
                : `Nova ${form.type === 'receber' ? 'Receita' : 'Conta a Pagar'}`}
            </DialogTitle>
          </DialogHeader>

          {formErrors.form && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {formErrors.form}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label htmlFor="bill-desc">Descrição *</Label>
              <Input
                id="bill-desc"
                placeholder="Ex: Aluguel, Salário, Internet, Cliente X"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="h-10 rounded-xl"
              />
              {formErrors.description && (
                <p className="text-[11px] text-red-500">{formErrors.description}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bill-val">Valor (R$) *</Label>
                <Input
                  id="bill-val"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: e.target.value })}
                  className="h-10 rounded-xl font-bold"
                />
                {formErrors.value && <p className="text-[11px] text-red-500">{formErrors.value}</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="bill-due">Vencimento *</Label>
                <Input
                  id="bill-due"
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                  className="h-10 rounded-xl"
                />
                {formErrors.dueDate && (
                  <p className="text-[11px] text-red-500">{formErrors.dueDate}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v as BillType })}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pagar">Despesa (A Pagar)</SelectItem>
                    <SelectItem value="receber">Receita (A Receber)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Categoria</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {CATEGORY_SUGGESTIONS.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label>Conta bancária vinculada</Label>
              <Select
                value={form.accountId}
                onValueChange={(v) => setForm({ ...form, accountId: v })}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Selecione uma conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: {formatCurrency(acc.current_balance, hideValues)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editItem && (
              <>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      É recorrente?
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Agenda lançamentos automáticos nos próximos períodos
                    </span>
                  </div>
                  <Switch
                    checked={form.recurring}
                    onCheckedChange={(v) => setForm({ ...form, recurring: v })}
                  />
                </div>

                {form.recurring && (
                  <div className="grid grid-cols-2 gap-3 p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                    <div className="space-y-1">
                      <Label>Frequência</Label>
                      <Select
                        value={form.frequency}
                        onValueChange={(v) =>
                          setForm({ ...form, frequency: v as RecurringFrequency })
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mensal">Mensal</SelectItem>
                          <SelectItem value="semanal">Semanal</SelectItem>
                          <SelectItem value="trimestral">Trimestral</SelectItem>
                          <SelectItem value="anual">Anual</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Repetições</Label>
                      <Input
                        type="number"
                        min={1}
                        value={form.repetitions}
                        onChange={(e) => setForm({ ...form, repetitions: e.target.value })}
                        className="h-10 rounded-xl"
                      />
                      {formErrors.repetitions && (
                        <p className="text-[11px] text-red-500">{formErrors.repetitions}</p>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              >
                {loading ? 'Salvando...' : editItem ? 'Atualizar' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Pagamento com Seleção de Conta */}
      <Dialog open={payModalItem !== null} onOpenChange={(open) => !open && setPayModalItem(null)}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              {payModalItem?.type === 'receita' ? 'Confirmar Recebimento' : 'Confirmar Pagamento'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {payModalItem?.description}
              </div>
              <div className="text-emerald-600 font-extrabold text-base tabular-nums">
                {formatCurrency(payModalItem?.value, hideValues)}
              </div>
              <p className="text-[11px] text-slate-400">
                Uma transação será gerada no seu extrato e o item será marcado como concluído.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                {payModalItem?.type === 'receita'
                  ? 'Em qual conta bancária entrou o valor?'
                  : 'De qual conta bancária saiu o valor?'}
              </Label>
              <Select value={payAccount} onValueChange={setPayAccount}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: {formatCurrency(acc.current_balance, hideValues)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setPayModalItem(null)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmPayModal}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
              >
                {loading ? 'Gravando...' : 'Confirmar'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir */}
      <AlertDialog
        open={deleteItemObj !== null}
        onOpenChange={(open) => !open && setDeleteItemObj(null)}
      >
        <AlertDialogContent className="rounded-2xl bg-white dark:bg-[#121A2B]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              Excluir item
            </AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir "{deleteItemObj?.description}" no valor de{' '}
              {formatCurrency(deleteItemObj?.value, hideValues)}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
            >
              {loading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

function SummaryMiniCard({
  label,
  value,
  count,
  color,
}: {
  label: string
  value: string
  count: number
  color: 'emerald' | 'teal' | 'amber' | 'blue' | 'slate' | 'red'
}) {
  const colorMap = {
    emerald:
      'border-emerald-300 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
    teal: 'border-teal-300 dark:border-teal-900/50 bg-teal-50/40 dark:bg-teal-950/20 text-teal-700 dark:text-teal-300',
    amber:
      'border-amber-300 dark:border-amber-900/50 bg-amber-50/40 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
    blue: 'border-blue-300 dark:border-blue-900/50 bg-blue-50/40 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300',
    slate:
      'border-slate-300 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-900/20 text-slate-700 dark:text-slate-300',
    red: 'border-red-300 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 text-red-700 dark:text-red-300',
  }

  return (
    <Card
      className={`border-2 ${colorMap[color].split(' ')[0]} ${colorMap[color].split(' ')[2]} dark:${colorMap[color].split(' ')[3]} bg-white dark:bg-[#121A2B] shadow-xs`}
    >
      <CardContent className="p-3">
        <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-tight text-slate-500 dark:text-slate-400 truncate">
          {label}
        </p>
        <p
          className={`text-base sm:text-lg font-extrabold tabular-nums mt-1 ${colorMap[color].split(' ').slice(4).join(' ')}`}
        >
          {value}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {count} {count === 1 ? 'item' : 'itens'}
        </p>
      </CardContent>
    </Card>
  )
}
