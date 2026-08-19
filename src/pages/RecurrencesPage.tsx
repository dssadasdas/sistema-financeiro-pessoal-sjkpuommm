import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, CATEGORY_SUGGESTIONS, CATEGORY_COLORS } from '@/lib/constants'
import { RecurringBill, BillType, RecurringFrequency } from '@/types/finance'
import {
  Repeat,
  Plus,
  Trash2,
  Pencil,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Calendar,
  Pause,
  Play,
  ChevronDown,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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

const FREQUENCY_LABELS: Record<RecurringFrequency, string> = {
  mensal: 'Mensal',
  semanal: 'Semanal',
  trimestral: 'Trimestral',
  anual: 'Anual',
}

interface RecForm {
  description: string
  value: string
  type: BillType
  category: string
  frequency: RecurringFrequency
  dueDay: string
  accountId: string
  active: boolean
  repetitions: string
}

const emptyForm: RecForm = {
  description: '',
  value: '',
  type: 'pagar',
  category: 'Moradia',
  frequency: 'mensal',
  dueDay: '10',
  accountId: '',
  active: true,
  repetitions: '0',
}

// Calcula as próximas N ocorrências a partir de uma data base
function computeNextDates(base: Date, frequency: RecurringFrequency, count: number): Date[] {
  const dates: Date[] = []
  for (let i = 1; i <= count; i++) {
    const d = new Date(base)
    if (frequency === 'semanal') d.setDate(d.getDate() + i * 7)
    else if (frequency === 'trimestral') d.setMonth(d.getMonth() + i * 3)
    else if (frequency === 'anual') d.setFullYear(d.getFullYear() + i)
    else d.setMonth(d.getMonth() + i)
    dates.push(d)
  }
  return dates
}

export default function RecurrencesPage() {
  const {
    recurringBills,
    bills,
    accounts,
    isLoading,
    loadError,
    refreshAll,
    createRecurringBill,
    updateRecurringBill,
    deleteRecurringBill,
    generateRecurringBills,
  } = useFinance()
  const { hideValues } = useAuth()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<RecForm>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  // Modais de exclusão / edição
  const [deleteRec, setDeleteRec] = useState<RecurringBill | null>(null)
  const [deleteMode, setDeleteMode] = useState<'base' | 'all' | null>(null)
  const [editMode, setEditMode] = useState<'future' | 'keep' | null>(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [freqFilter, setFreqFilter] = useState('todas')
  const [catFilter, setCatFilter] = useState('todas')
  const [statusFilter, setStatusFilter] = useState('todas')
  const [sortBy, setSortBy] = useState<'next_date' | 'value' | 'description'>('next_date')

  const openCreate = () => {
    setEditId(null)
    setForm({ ...emptyForm, accountId: accounts[0]?.id || '' })
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (r: RecurringBill) => {
    setEditId(r.id)
    setForm({
      description: r.description,
      value: String(r.value || ''),
      type: r.type,
      category: r.category || 'Moradia',
      frequency: r.frequency,
      dueDay: String(r.due_day || 10),
      accountId: r.account || '',
      active: r.active,
      repetitions: String(r.repetitions || 0),
    })
    setFormErrors({})
    setEditMode(null)
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.description.trim()) errs.description = 'Descrição obrigatória'
    const num = parseFloat(form.value.replace(',', '.'))
    if (isNaN(num) || num <= 0) errs.value = 'Valor inválido'
    const day = parseInt(form.dueDay, 10)
    if (isNaN(day) || day < 1 || day > 31) errs.dueDay = 'Dia inválido (1-31)'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const num = parseFloat(form.value.replace(',', '.'))
      const day = parseInt(form.dueDay, 10)
      const now = new Date()
      const startDate = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), Math.min(day, 28), 12, 0, 0),
      )
      const nextDate = new Date(startDate)
      if (form.frequency === 'semanal') nextDate.setDate(nextDate.getDate() + 7)
      else if (form.frequency === 'trimestral') nextDate.setMonth(nextDate.getMonth() + 3)
      else if (form.frequency === 'anual') nextDate.setFullYear(nextDate.getFullYear() + 1)
      else nextDate.setMonth(nextDate.getMonth() + 1)

      const payload: Partial<RecurringBill> = {
        description: form.description.trim(),
        value: num,
        type: form.type,
        category: form.category,
        frequency: form.frequency,
        due_day: day,
        payment_method: 'PIX',
        account: form.accountId || undefined,
        active: form.active,
        repetitions: parseInt(form.repetitions, 10) || 0,
      }

      if (editId) {
        if (!form.active) payload.active = false
        await updateRecurringBill(editId, payload)
        toast({ title: 'Recorrência atualizada' })
      } else {
        payload.start_date = startDate.toISOString()
        payload.next_date = nextDate.toISOString()
        payload.generated_count = 0
        await createRecurringBill(payload)
        toast({ title: 'Recorrência criada' })
      }
      setModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setFormErrors({ form: errorObj?.message || 'Erro ao salvar recorrência.' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (r: RecurringBill) => {
    try {
      await updateRecurringBill(r.id, { active: !r.active })
      toast({ title: r.active ? 'Recorrência pausada' : 'Recorrência reativada' })
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      toast({ title: 'Erro', description: errorObj?.message, variant: 'destructive' })
    }
  }

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const count = await generateRecurringBills()
      toast({
        title: count > 0 ? `${count} conta(s) gerada(s)` : 'Nenhuma conta nova para gerar',
      })
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      toast({ title: 'Erro ao gerar', description: errorObj?.message, variant: 'destructive' })
    } finally {
      setGenerating(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteRec || !deleteMode) return
    setLoading(true)
    try {
      await deleteRecurringBill(deleteRec.id, deleteMode)
      toast({ title: 'Recorrência excluída' })
      setDeleteRec(null)
      setDeleteMode(null)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      toast({ title: 'Erro', description: errorObj?.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  // Histórico das últimas 6 ocorrências geradas (bills vinculadas)
  const getHistory = (recId: string) =>
    bills
      .filter((b) => b.recurring_bill === recId)
      .sort((a, b) => (a.due_date < b.due_date ? 1 : -1))
      .slice(0, 6)

  const filtered = useMemo(() => {
    let list = [...recurringBills]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((r) => r.description.toLowerCase().includes(q))
    }
    if (freqFilter !== 'todas') list = list.filter((r) => r.frequency === freqFilter)
    if (catFilter !== 'todas') list = list.filter((r) => r.category === catFilter)
    if (statusFilter !== 'todas')
      list = list.filter((r) => (statusFilter === 'ativas' ? r.active : !r.active))
    list.sort((a, b) => {
      if (sortBy === 'value') return Number(b.value) - Number(a.value)
      if (sortBy === 'description') return a.description.localeCompare(b.description)
      return (a.next_date || '').localeCompare(b.next_date || '')
    })
    return list
  }, [recurringBills, search, freqFilter, catFilter, statusFilter, sortBy])

  // Preview das próximas 3 ocorrências no modal
  const previewDates = useMemo(() => {
    const day = parseInt(form.dueDay, 10) || 10
    const now = new Date()
    const base = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), Math.min(day, 28), 12, 0, 0),
    )
    return computeNextDates(base, form.frequency, 3)
  }, [form.dueDay, form.frequency])

  if (isLoading && recurringBills.length === 0)
    return <LoadingState message="Carregando recorrências..." />
  if (loadError)
    return (
      <ErrorState message="Não foi possível carregar suas recorrências." onRetry={refreshAll} />
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recorrências</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Contas fixas geradas automaticamente conforme a frequência
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleGenerate}
            disabled={generating}
            variant="outline"
            className="rounded-xl font-semibold gap-1.5"
          >
            <Zap className="w-4 h-4" /> {generating ? 'Gerando...' : 'Gerar agora'}
          </Button>
          <Button
            onClick={openCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nova Recorrência
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="bg-white dark:bg-[#121A2B] border-slate-200 dark:border-slate-800">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar recorrência..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Select value={freqFilter} onValueChange={setFreqFilter}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Frequência" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="mensal">Mensal</SelectItem>
                <SelectItem value="semanal">Semanal</SelectItem>
                <SelectItem value="trimestral">Trimestral</SelectItem>
                <SelectItem value="anual">Anual</SelectItem>
              </SelectContent>
            </Select>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent className="max-h-56">
                <SelectItem value="todas">Todas</SelectItem>
                {CATEGORY_SUGGESTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas</SelectItem>
                <SelectItem value="ativas">Ativas</SelectItem>
                <SelectItem value="pausadas">Pausadas</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="next_date">Próxima data</SelectItem>
                <SelectItem value="value">Valor</SelectItem>
                <SelectItem value="description">Descrição</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {recurringBills.length === 0 ? (
        <EmptyState
          icon={Repeat}
          title="Nenhuma recorrência cadastrada"
          description="Crie recorrências para gerar contas automaticamente todo mês."
          actionLabel="Criar primeira recorrência"
          onAction={openCreate}
        />
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
          Nenhuma recorrência encontrada com os filtros selecionados.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => {
            const isReceita = r.type === 'receber'
            const catColor = CATEGORY_COLORS[r.category || ''] || CATEGORY_COLORS['Outros']
            const history = getHistory(r.id)
            const isExpanded = expandedId === r.id
            return (
              <Card
                key={r.id}
                className={`bg-white dark:bg-[#121A2B] border-2 ${
                  r.active
                    ? 'border-slate-200 dark:border-slate-800'
                    : 'border-slate-200 dark:border-slate-800 opacity-70'
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                          isReceita
                            ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                            : 'bg-orange-50 text-orange-600 dark:bg-orange-950/40'
                        }`}
                      >
                        {isReceita ? (
                          <ArrowUpRight className="w-4 h-4" />
                        ) : (
                          <ArrowDownRight className="w-4 h-4" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {r.description}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 gap-0.5">
                            <Repeat className="w-2.5 h-2.5" />
                            {FREQUENCY_LABELS[r.frequency]}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[9px] py-0 px-1.5"
                            style={{ color: catColor, borderColor: catColor + '55' }}
                          >
                            {r.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Switch
                      checked={r.active}
                      onCheckedChange={() => handleToggleActive(r)}
                      title={r.active ? 'Pausar' : 'Ativar'}
                    />
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p
                        className={`text-lg font-extrabold tabular-nums ${
                          isReceita ? 'text-emerald-600' : 'text-orange-600'
                        }`}
                      >
                        {isReceita ? '+' : '−'}
                        {formatCurrency(r.value, hideValues)}
                      </p>
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3 h-3" />
                        Próx: {formatDate(r.next_date)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] py-0 px-1.5 ${
                        r.active
                          ? 'text-emerald-600 border-emerald-300'
                          : 'text-slate-400 border-slate-300'
                      }`}
                    >
                      {r.active ? 'Ativa' : 'Pausada'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className="h-7 text-[11px] text-slate-500 hover:text-slate-700 gap-1"
                    >
                      <Clock className="w-3 h-3" />
                      Histórico
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </Button>
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(r)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                    >
                      <Pencil className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteRec(r)}
                      className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      {history.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-2">
                          Nenhuma ocorrência gerada ainda.
                        </p>
                      ) : (
                        history.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between text-[11px] py-1"
                          >
                            <span className="text-slate-500">{formatDate(b.due_date)}</span>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                                {formatCurrency(b.value, hideValues)}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[8px] py-0 px-1 ${
                                  b.status === 'pago'
                                    ? 'text-emerald-600 border-emerald-300'
                                    : 'text-amber-600 border-amber-300'
                                }`}
                              >
                                {b.status === 'pago' ? 'Pago' : 'Pendente'}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Cadastro/Edição */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              {editId ? 'Editar Recorrência' : 'Nova Recorrência'}
            </DialogTitle>
          </DialogHeader>

          {formErrors.form && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {formErrors.form}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label htmlFor="rec-desc">Descrição *</Label>
              <Input
                id="rec-desc"
                placeholder="Ex: Aluguel, Salário, Netflix"
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
                <Label htmlFor="rec-val">Valor (R$) *</Label>
                <Input
                  id="rec-val"
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
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Frequência</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) => setForm({ ...form, frequency: v as RecurringFrequency })}
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
                <Label htmlFor="rec-day">Dia de vencimento *</Label>
                <Input
                  id="rec-day"
                  type="number"
                  min={1}
                  max={31}
                  value={form.dueDay}
                  onChange={(e) => setForm({ ...form, dueDay: e.target.value })}
                  className="h-10 rounded-xl"
                />
                {formErrors.dueDay && (
                  <p className="text-[11px] text-red-500">{formErrors.dueDay}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                    {CATEGORY_SUGGESTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Conta bancária</Label>
                <Select
                  value={form.accountId}
                  onValueChange={(v) => setForm({ ...form, accountId: v })}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rec-rep">Repetições (0 = infinito)</Label>
              <Input
                id="rec-rep"
                type="number"
                min={0}
                value={form.repetitions}
                onChange={(e) => setForm({ ...form, repetitions: e.target.value })}
                className="h-10 rounded-xl"
              />
            </div>

            {/* Preview próximas 3 */}
            <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
              <p className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-400 mb-1.5">
                Próximas 3 ocorrências:
              </p>
              <div className="space-y-1">
                {previewDates.map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-500">{formatDate(d.toISOString())}</span>
                    <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                      {formatCurrency(parseFloat(form.value.replace(',', '.')) || 0, hideValues)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {editId && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                    Ativa
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Se pausada, não gera novas contas
                  </span>
                </div>
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm({ ...form, active: v })}
                />
              </div>
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
                {loading ? 'Salvando...' : editId ? 'Atualizar' : 'Criar Recorrência'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir */}
      <AlertDialog
        open={deleteRec !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteRec(null)
            setDeleteMode(null)
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl bg-white dark:bg-[#121A2B]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              Excluir recorrência
            </AlertDialogTitle>
            <AlertDialogDescription>
              O que deseja excluir da recorrência "{deleteRec?.description}"?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Button
              variant="outline"
              onClick={() => setDeleteMode('base')}
              className={`w-full justify-start rounded-xl h-auto py-3 ${deleteMode === 'base' ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' : ''}`}
            >
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Só a recorrência base
                </div>
                <div className="text-[11px] text-slate-500">Mantém as contas já geradas</div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteMode('all')}
              className={`w-full justify-start rounded-xl h-auto py-3 ${deleteMode === 'all' ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : ''}`}
            >
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Tudo (base + contas futuras)
                </div>
                <div className="text-[11px] text-slate-500">
                  Exclui a recorrência e as contas futuras não pagas
                </div>
              </div>
            </Button>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={!deleteMode || loading}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl"
            >
              {loading ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
