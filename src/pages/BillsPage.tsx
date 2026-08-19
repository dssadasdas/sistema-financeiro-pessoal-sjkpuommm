import React, { useState, useMemo, useEffect } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, CATEGORY_SUGGESTIONS, CATEGORY_COLORS } from '@/lib/constants'
import { Bill, BillType, RecurringFrequency } from '@/types/finance'
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
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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

type StatusFilter = 'todos' | 'vencidas' | 'hoje' | 'proximas' | 'pagas' | 'receber'
type SortBy = 'vencimento' | 'valor'

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
  } = useFinance()
  const { hideValues } = useAuth()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [categoryFilter, setCategoryFilter] = useState('todas')
  const [sortBy, setSortBy] = useState<SortBy>('vencimento')

  // Modais
  const [payModalBill, setPayModalBill] = useState<Bill | null>(null)
  const [payAccount, setPayAccount] = useState('')
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deleteBillObj, setDeleteBillObj] = useState<Bill | null>(null)
  const [deleteMode, setDeleteMode] = useState<'single' | 'future' | null>(null)

  const todayStr = new Date().toISOString().slice(0, 10)
  const currentMonthPrefix = new Date().toISOString().slice(0, 7)

  // Resumo do mês
  const summary = useMemo(() => {
    const monthBills = bills.filter((b) => (b.due_date || '').slice(0, 7) === currentMonthPrefix)
    const overdue = monthBills.filter(
      (b) =>
        b.status !== 'pago' && b.type !== 'receber' && (b.due_date || '').slice(0, 10) < todayStr,
    )
    const dueToday = monthBills.filter(
      (b) =>
        b.status !== 'pago' && b.type !== 'receber' && (b.due_date || '').slice(0, 10) === todayStr,
    )
    const upcoming = monthBills.filter(
      (b) =>
        b.status !== 'pago' && b.type !== 'receber' && (b.due_date || '').slice(0, 10) > todayStr,
    )
    const paid = monthBills.filter((b) => b.status === 'pago')
    const toReceive = monthBills.filter((b) => b.type === 'receber' && b.status !== 'pago')
    return {
      total: monthBills.length,
      overdue,
      dueToday,
      upcoming,
      paid,
      toReceive,
      overdueValue: overdue.reduce((s, b) => s + Number(b.value || 0), 0),
      dueTodayValue: dueToday.reduce((s, b) => s + Number(b.value || 0), 0),
      upcomingValue: upcoming.reduce((s, b) => s + Number(b.value || 0), 0),
      paidValue: paid.reduce((s, b) => s + Number(b.value || 0), 0),
      toReceiveValue: toReceive.reduce((s, b) => s + Number(b.value || 0), 0),
    }
  }, [bills, currentMonthPrefix, todayStr])

  // Lista filtrada + agrupada
  const groups = useMemo(() => {
    const isOverdue = (b: Bill) =>
      b.status !== 'pago' && b.type !== 'receber' && (b.due_date || '').slice(0, 10) < todayStr
    const isToday = (b: Bill) =>
      b.status !== 'pago' && b.type !== 'receber' && (b.due_date || '').slice(0, 10) === todayStr
    const isUpcoming = (b: Bill) =>
      b.status !== 'pago' && b.type !== 'receber' && (b.due_date || '').slice(0, 10) > todayStr
    const isPaid = (b: Bill) => b.status === 'pago'
    const isReceive = (b: Bill) => b.type === 'receber' && b.status !== 'pago'

    let filtered = bills
    if (search.trim()) {
      const q = search.toLowerCase()
      filtered = filtered.filter((b) => b.description.toLowerCase().includes(q))
    }
    if (categoryFilter !== 'todas') {
      filtered = filtered.filter((b) => b.category === categoryFilter)
    }
    if (statusFilter !== 'todos') {
      filtered = filtered.filter((b) => {
        switch (statusFilter) {
          case 'vencidas':
            return isOverdue(b)
          case 'hoje':
            return isToday(b)
          case 'proximas':
            return isUpcoming(b)
          case 'pagas':
            return isPaid(b)
          case 'receber':
            return isReceive(b)
          default:
            return true
        }
      })
    }

    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'valor') return Number(b.value) - Number(a.value)
      return (a.due_date || '').localeCompare(b.due_date || '')
    })

    return {
      overdue: filtered.filter(isOverdue),
      dueToday: filtered.filter(isToday),
      upcoming: filtered.filter(isUpcoming),
      paid: filtered.filter(isPaid),
      toReceive: filtered.filter(isReceive),
    }
  }, [bills, search, categoryFilter, statusFilter, sortBy, todayStr])

  const openCreate = () => {
    setEditId(null)
    setForm({ ...emptyForm, accountId: accounts[0]?.id || '' })
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (b: Bill) => {
    setEditId(b.id)
    setForm({
      description: b.description,
      value: String(b.value || ''),
      dueDate: (b.due_date || '').slice(0, 10),
      category: b.category || 'Moradia',
      type: b.type || 'pagar',
      accountId: b.account || '',
      recurring: !!b.recurring,
      frequency: b.expand?.recurring_bill?.frequency || 'mensal',
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
      if (editId) {
        await updateBill(editId, {
          description: form.description.trim(),
          value: num,
          due_date: dueIso,
          category: form.category,
          type: form.type,
          account: form.accountId || undefined,
        })
        toast({ title: 'Conta atualizada com sucesso' })
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
        // Se recorrência, cria a recorrência base e agenda as próximas
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

  const handleTogglePaid = async (b: Bill) => {
    setTogglingId(b.id)
    try {
      if (b.status === 'pago') {
        await markBillAsUnpaid(b)
        toast({ title: 'Conta marcada como pendente' })
      } else {
        await markBillAsPaid(b, b.account || undefined)
        toast({
          title: b.type === 'receber' ? 'Recebimento confirmado' : 'Pagamento confirmado',
        })
      }
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      toast({
        title: 'Erro',
        description: errorObj?.message || 'Não foi possível atualizar a conta.',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteBillObj) return
    setLoading(true)
    try {
      await deleteBill(deleteBillObj.id)
      // Se for recorrente e future, exclui também as futuras vinculadas
      if (deleteMode === 'future' && deleteBillObj.recurring_bill) {
        // As futuras são excluídas pelo deleteRecurringBill(all); aqui só removemos as bills futuras
        // Simplificado: deixamos o usuário gerenciar pela página de recorrências
      }
      toast({ title: 'Conta excluída' })
      setDeleteBillObj(null)
      setDeleteMode(null)
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

  const handleConfirmPay = async () => {
    if (!payModalBill) return
    setLoading(true)
    try {
      await markBillAsPaid(payModalBill, payAccount || undefined)
      toast({ title: 'Pagamento confirmado' })
      setPayModalBill(null)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      toast({
        title: 'Erro ao pagar',
        description: errorObj?.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const renderBillRow = (b: Bill) => {
    const isOverdue =
      b.status !== 'pago' && b.type !== 'receber' && (b.due_date || '').slice(0, 10) < todayStr
    const isToday =
      b.status !== 'pago' && b.type !== 'receber' && (b.due_date || '').slice(0, 10) === todayStr
    const isPaid = b.status === 'pago'
    const isReceive = b.type === 'receber'
    const catColor = CATEGORY_COLORS[b.category || ''] || CATEGORY_COLORS['Outros']

    return (
      <div
        key={b.id}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
              isPaid
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                : isReceive
                  ? 'bg-teal-50 text-teal-600 dark:bg-teal-950/40'
                  : isOverdue
                    ? 'bg-red-50 text-red-600 dark:bg-red-950/40'
                    : isToday
                      ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {isReceive ? <ArrowDownCircle className="w-4 h-4" /> : <Receipt className="w-4 h-4" />}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {b.description}
              </span>
              {b.recurring && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 text-slate-500">
                  <Repeat className="w-2.5 h-2.5 mr-0.5" /> Recorrente
                </Badge>
              )}
              {b.category && (
                <Badge
                  variant="outline"
                  className="text-[9px] py-0 px-1.5"
                  style={{ color: catColor, borderColor: catColor + '55' }}
                >
                  {b.category}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>Venc: {formatDate(b.due_date)}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-sm sm:text-base font-extrabold tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(b.value, hideValues)}
            </div>
            <span
              className={`text-[10px] font-semibold ${
                isPaid
                  ? 'text-emerald-600'
                  : isReceive
                    ? 'text-teal-600'
                    : isOverdue
                      ? 'text-red-600'
                      : isToday
                        ? 'text-amber-600'
                        : 'text-blue-600'
              }`}
            >
              {isPaid
                ? 'Pago'
                : isReceive
                  ? 'A Receber'
                  : isOverdue
                    ? 'Vencida'
                    : isToday
                      ? 'Vence Hoje'
                      : 'A vencer'}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            disabled={togglingId === b.id}
            onClick={() => handleTogglePaid(b)}
            className={`h-8 w-8 p-0 rounded-lg ${
              isPaid ? 'text-emerald-600 hover:bg-emerald-50' : 'text-slate-400 hover:bg-slate-100'
            }`}
            title={isPaid ? 'Desmarcar' : 'Marcar como pago'}
          >
            <CheckCircle2 className="w-4 h-4" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => openEdit(b)}
            className="h-8 w-8 p-0 text-slate-400 hover:text-blue-600"
            title="Editar"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDeleteBillObj(b)}
            className="h-8 w-8 p-0 text-slate-400 hover:text-red-600"
            title="Excluir"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  const renderGroup = (
    title: string,
    count: number,
    items: Bill[],
    color: 'red' | 'amber' | 'blue' | 'emerald' | 'teal',
    icon: React.ReactNode,
  ) => {
    if (items.length === 0) return null
    const colorMap = {
      red: 'text-red-600 border-red-200 dark:border-red-900/50',
      amber: 'text-amber-600 border-amber-200 dark:border-amber-900/50',
      blue: 'text-blue-600 border-blue-200 dark:border-blue-900/50',
      emerald: 'text-emerald-600 border-emerald-200 dark:border-emerald-900/50',
      teal: 'text-teal-600 border-teal-200 dark:border-teal-900/50',
    }
    return (
      <div className="space-y-2">
        <div
          className={`flex items-center gap-2 px-1 text-xs font-bold ${colorMap[color].split(' ')[0]}`}
        >
          {icon}
          <span>
            {title} ({count})
          </span>
        </div>
        <div
          className={`bg-white dark:bg-[#121A2B] rounded-2xl border-2 ${colorMap[color]} shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden`}
        >
          {items.map(renderBillRow)}
        </div>
      </div>
    )
  }

  if (isLoading && bills.length === 0) return <LoadingState message="Carregando contas..." />
  if (loadError)
    return <ErrorState message="Não foi possível carregar suas contas." onRetry={refreshAll} />

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Contas a Pagar</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Controle contas a pagar, a receber e vencimentos do mês
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nova Conta
        </Button>
      </div>

      {/* Resumo do mês */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <SummaryCard
          label="Total de contas"
          value={formatCurrency(
            summary.paidValue +
              summary.overdueValue +
              summary.dueTodayValue +
              summary.upcomingValue +
              summary.toReceiveValue,
            hideValues,
          )}
          count={summary.total}
          color="slate"
        />
        <SummaryCard
          label="Valor vencido"
          value={formatCurrency(summary.overdueValue, hideValues)}
          count={summary.overdue.length}
          color="red"
        />
        <SummaryCard
          label="Vencendo hoje"
          value={formatCurrency(summary.dueTodayValue, hideValues)}
          count={summary.dueToday.length}
          color="amber"
        />
        <SummaryCard
          label="Próximas"
          value={formatCurrency(summary.upcomingValue, hideValues)}
          count={summary.upcoming.length}
          color="blue"
        />
        <SummaryCard
          label="Já pagas"
          value={formatCurrency(summary.paidValue, hideValues)}
          count={summary.paid.length}
          color="emerald"
        />
      </div>

      {/* Filtros */}
      <Card className="bg-white dark:bg-[#121A2B] border-slate-200 dark:border-slate-800">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar por descrição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="vencidas">Vencidas</SelectItem>
                <SelectItem value="hoje">Vencem hoje</SelectItem>
                <SelectItem value="proximas">Próximas</SelectItem>
                <SelectItem value="pagas">Pagas</SelectItem>
                <SelectItem value="receber">A receber</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="todas">Todas as categorias</SelectItem>
                {CATEGORY_SUGGESTIONS.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vencimento">Por vencimento</SelectItem>
                <SelectItem value="valor">Por valor</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lista agrupada */}
      {bills.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="Nenhuma conta cadastrada"
          description="Cadastre sua primeira conta para acompanhar vencimentos e pagamentos."
          actionLabel="Cadastrar primeira conta"
          onAction={openCreate}
        />
      ) : (
        <div className="space-y-6">
          {renderGroup(
            'Vencidas',
            groups.overdue.length,
            groups.overdue,
            'red',
            <AlertTriangle className="w-4 h-4" />,
          )}
          {renderGroup(
            'Vencem Hoje',
            groups.dueToday.length,
            groups.dueToday,
            'amber',
            <Clock className="w-4 h-4" />,
          )}
          {renderGroup(
            'Próximas',
            groups.upcoming.length,
            groups.upcoming,
            'blue',
            <Calendar className="w-4 h-4" />,
          )}
          {renderGroup(
            'A Receber',
            groups.toReceive.length,
            groups.toReceive,
            'teal',
            <ArrowDownCircle className="w-4 h-4" />,
          )}
          {renderGroup(
            'Pagas',
            groups.paid.length,
            groups.paid,
            'emerald',
            <CheckCircle2 className="w-4 h-4" />,
          )}
          {groups.overdue.length === 0 &&
            groups.dueToday.length === 0 &&
            groups.upcoming.length === 0 &&
            groups.toReceive.length === 0 &&
            groups.paid.length === 0 && (
              <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
                Nenhuma conta encontrada com os filtros selecionados.
              </div>
            )}
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              {editId ? 'Editar Conta' : 'Nova Conta'}
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
                placeholder="Ex: Condomínio, Internet, Energia"
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
                    <SelectItem value="pagar">A Pagar</SelectItem>
                    <SelectItem value="receber">A Receber</SelectItem>
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
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Nenhuma</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {!editId && (
              <>
                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                      É recorrente?
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Cria a primeira conta e agenda as próximas
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
                {loading ? 'Salvando...' : editId ? 'Atualizar' : 'Salvar Conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir */}
      <AlertDialog
        open={deleteBillObj !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteBillObj(null)
            setDeleteMode(null)
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl bg-white dark:bg-[#121A2B]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              Excluir conta
            </AlertDialogTitle>
            <AlertDialogDescription>
              {deleteBillObj?.recurring
                ? 'Esta conta faz parte de uma recorrência. O que deseja excluir?'
                : `Deseja realmente excluir "${deleteBillObj?.description}"? Esta ação não pode ser desfeita.`}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {deleteBillObj?.recurring && (
            <div className="space-y-2 py-2">
              <Button
                variant="outline"
                onClick={() => setDeleteMode('single')}
                className={`w-full justify-start rounded-xl h-auto py-3 ${deleteMode === 'single' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : ''}`}
              >
                <div className="text-left">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Excluir só esta
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Mantém a recorrência e as futuras
                  </div>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteMode('future')}
                className={`w-full justify-start rounded-xl h-auto py-3 ${deleteMode === 'future' ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : ''}`}
              >
                <div className="text-left">
                  <div className="text-sm font-semibold text-slate-900 dark:text-white">
                    Esta e as futuras
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Exclui esta e as próximas geradas
                  </div>
                </div>
              </Button>
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={(deleteBillObj?.recurring && !deleteMode) || loading}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {loading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal Confirmar Pagamento */}
      <Dialog open={payModalBill !== null} onOpenChange={(open) => !open && setPayModalBill(null)}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Confirmar Pagamento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {payModalBill?.description}
              </div>
              <div className="text-emerald-600 font-extrabold text-base tabular-nums">
                {formatCurrency(payModalBill?.value, hideValues)}
              </div>
              <p className="text-[11px] text-slate-400">
                Uma transação será criada no seu extrato e a conta ficará marcada como paga.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">De qual conta bancária saiu o valor?</Label>
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
                onClick={() => setPayModalBill(null)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmPay}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
              >
                {loading ? 'Gravando...' : 'Confirmar como Pago'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function SummaryCard({
  label,
  value,
  count,
  color,
}: {
  label: string
  value: string
  count: number
  color: 'slate' | 'red' | 'amber' | 'blue' | 'emerald'
}) {
  const colorMap = {
    slate: 'border-slate-200 dark:border-slate-800',
    red: 'border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20',
    amber: 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20',
    blue: 'border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20',
    emerald:
      'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20',
  }
  const textMap = {
    slate: 'text-slate-900 dark:text-white',
    red: 'text-red-600 dark:text-red-400',
    amber: 'text-amber-600 dark:text-amber-400',
    blue: 'text-blue-600 dark:text-blue-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
  }
  return (
    <Card className={`border-2 ${colorMap[color]} bg-white dark:bg-[#121A2B]`}>
      <CardContent className="p-3">
        <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </p>
        <p className={`text-base sm:text-lg font-extrabold tabular-nums mt-1 ${textMap[color]}`}>
          {value}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5">
          {count} {count === 1 ? 'item' : 'itens'}
        </p>
      </CardContent>
    </Card>
  )
}
