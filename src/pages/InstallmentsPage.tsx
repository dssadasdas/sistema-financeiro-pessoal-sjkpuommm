import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { formatCurrency, formatDate, CATEGORY_SUGGESTIONS, CATEGORY_COLORS } from '@/lib/constants'
import { Installment, Transaction } from '@/types/finance'
import {
  Layers,
  Plus,
  Trash2,
  Calendar,
  CreditCard as CreditCardIcon,
  CheckCircle2,
  Search,
  Pencil,
  ChevronDown,
  Circle,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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

const todayStr = new Date().toISOString().slice(0, 10)

interface InstForm {
  description: string
  totalValue: string
  totalInstallments: string
  startDate: string
  category: string
  creditCardId: string
}

const emptyForm: InstForm = {
  description: '',
  totalValue: '',
  totalInstallments: '12',
  startDate: new Date().toISOString().slice(0, 10),
  category: 'Eletrônicos',
  creditCardId: '',
}

export default function InstallmentsPage() {
  const {
    installments,
    transactions,
    creditCards,
    isLoading,
    loadError,
    refreshAll,
    createInstallment,
    updateInstallment,
    deleteInstallment,
    toggleInstallmentParcel,
  } = useFinance()
  const { hideValues } = useAuth()
  const { toast } = useToast()

  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState<InstForm>(emptyForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [togglingKey, setTogglingKey] = useState<string | null>(null)

  const [deleteInst, setDeleteInst] = useState<Installment | null>(null)
  const [deleteMode, setDeleteMode] = useState<'all' | 'future' | null>(null)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'andamento' | 'concluidos'>('todos')
  const [sortBy, setSortBy] = useState<'date' | 'value' | 'description'>('date')

  const openCreate = () => {
    setEditId(null)
    setForm({ ...emptyForm, creditCardId: creditCards[0]?.id || '' })
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (inst: Installment) => {
    setEditId(inst.id)
    setForm({
      description: inst.description,
      totalValue: String(inst.total_value || ''),
      totalInstallments: String(inst.total_installments || ''),
      startDate: (inst.start_date || '').slice(0, 10),
      category: inst.category || 'Eletrônicos',
      creditCardId: inst.credit_card || '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.description.trim()) errs.description = 'Descrição obrigatória'
    const total = parseFloat(form.totalValue.replace(',', '.'))
    if (isNaN(total) || total <= 0) errs.totalValue = 'Valor total inválido'
    const count = parseInt(form.totalInstallments, 10)
    if (isNaN(count) || count < 1) errs.totalInstallments = 'Mínimo 1 parcela'
    if (!form.startDate) errs.startDate = 'Data obrigatória'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      const total = parseFloat(form.totalValue.replace(',', '.'))
      const count = parseInt(form.totalInstallments, 10)
      const instValue = Number((total / count).toFixed(2))
      if (editId) {
        // Editar: só descrição, categoria e cartão
        await updateInstallment(editId, {
          description: form.description.trim(),
          category: form.category,
          credit_card: form.creditCardId || undefined,
        })
        toast({ title: 'Parcelamento atualizado' })
      } else {
        await createInstallment({
          description: form.description.trim(),
          total_value: total,
          installment_value: instValue,
          total_installments: count,
          current_installment: 1,
          category: form.category,
          credit_card: form.creditCardId || undefined,
          start_date: `${form.startDate} 12:00:00.000Z`,
        })
        toast({ title: 'Parcelamento criado' })
      }
      setModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setFormErrors({ form: errorObj?.message || 'Erro ao salvar parcelamento.' })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteInst || !deleteMode) return
    setLoading(true)
    try {
      await deleteInstallment(deleteInst.id, deleteMode)
      toast({ title: 'Parcelamento excluído' })
      setDeleteInst(null)
      setDeleteMode(null)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      toast({ title: 'Erro', description: errorObj?.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleParcel = async (installmentId: string, parcelNumber: number) => {
    setTogglingKey(`${installmentId}-${parcelNumber}`)
    try {
      await toggleInstallmentParcel(installmentId, parcelNumber)
      toast({ title: 'Status da parcela atualizado' })
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      toast({ title: 'Erro', description: errorObj?.message, variant: 'destructive' })
    } finally {
      setTogglingKey(null)
    }
  }

  // Parcelas vinculadas a um parcelamento (transactions com installment_group)
  const getParcels = (installmentId: string): Transaction[] =>
    transactions
      .filter((t) => t.installment_group === installmentId && t.source === 'parcela')
      .sort((a, b) => (a.date < b.date ? -1 : 1))

  const filtered = useMemo(() => {
    let list = [...installments]
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((i) => i.description.toLowerCase().includes(q))
    }
    if (statusFilter !== 'todos') {
      list = list.filter((i) => {
        const current = i.current_installment || 1
        const total = i.total_installments || 1
        const done = current >= total && getParcels(i.id).every((p) => p.status === 'realizado')
        return statusFilter === 'concluidos' ? done : !done
      })
    }
    list.sort((a, b) => {
      if (sortBy === 'value') return Number(b.total_value) - Number(a.total_value)
      if (sortBy === 'description') return a.description.localeCompare(b.description)
      return (a.start_date || '').localeCompare(b.start_date || '')
    })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [installments, transactions, search, statusFilter, sortBy])

  if (isLoading && installments.length === 0)
    return <LoadingState message="Carregando parcelamentos..." />
  if (loadError)
    return (
      <ErrorState message="Não foi possível carregar seus parcelamentos." onRetry={refreshAll} />
    )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Parcelamentos</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe compras parceladas, parcelas pagas e restantes
          </p>
        </div>
        <Button
          onClick={openCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" /> Novo Parcelamento
        </Button>
      </div>

      {/* Filtros */}
      <Card className="bg-white dark:bg-[#121A2B] border-slate-200 dark:border-slate-800">
        <CardContent className="p-3 sm:p-4 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar parcelamento..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
            >
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="andamento">Em andamento</SelectItem>
                <SelectItem value="concluidos">Concluídos</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
              <SelectTrigger className="h-10 rounded-xl">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Por data</SelectItem>
                <SelectItem value="value">Por valor</SelectItem>
                <SelectItem value="description">Por descrição</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {installments.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="Nenhum parcelamento cadastrado"
          description="Registre uma compra parcelada para acompanhar as parcelas mensais."
          actionLabel="Cadastrar parcelamento"
          onAction={openCreate}
        />
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
          Nenhum parcelamento encontrado com os filtros selecionados.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((inst) => {
            const cardName = creditCards.find((c) => c.id === inst.credit_card)?.name
            const parcels = getParcels(inst.id)
            const paidCount = parcels.filter((p) => p.status === 'realizado').length
            const total = inst.total_installments || parcels.length || 1
            const current = Math.min(total, paidCount + 1)
            const progress = Math.min(100, Math.round((paidCount / total) * 100))
            const catColor = CATEGORY_COLORS[inst.category || ''] || CATEGORY_COLORS['Outros']
            const isExpanded = expandedId === inst.id
            const nextParcel = parcels.find((p) => p.status !== 'realizado')
            const isDone = paidCount >= total

            return (
              <Card
                key={inst.id}
                className={`bg-white dark:bg-[#121A2B] border-2 ${
                  isDone
                    ? 'border-emerald-200 dark:border-emerald-900/50'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: catColor + '22', color: catColor }}
                      >
                        <Layers className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white truncate">
                          {inst.description}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-mono">
                            {paidCount}/{total}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[9px] py-0 px-1.5"
                            style={{ color: catColor, borderColor: catColor + '55' }}
                          >
                            {inst.category}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(inst)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600"
                      >
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteInst(inst)}
                        className="h-7 w-7 p-0 text-slate-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400 text-[10px]">Valor total</span>
                      <div className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(inst.total_value, hideValues)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px]">Valor da parcela</span>
                      <div className="font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(inst.installment_value, hideValues)}
                      </div>
                    </div>
                  </div>

                  {nextParcel && (
                    <div className="flex items-center justify-between text-[11px] p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                      <span className="text-slate-500 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Próx. parcela: {formatDate(nextParcel.date)}
                      </span>
                      <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCurrency(nextParcel.value, hideValues)}
                      </span>
                    </div>
                  )}

                  {/* Progresso */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>
                        {paidCount} paga(s) de {total}
                      </span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 rounded-full" />
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setExpandedId(isExpanded ? null : inst.id)}
                      className="h-7 text-[11px] text-slate-500 hover:text-slate-700 gap-1"
                    >
                      <ChevronDown
                        className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                      Ver parcelas
                    </Button>
                    {cardName ? (
                      <span className="text-[10px] text-purple-600 flex items-center gap-1">
                        <CreditCardIcon className="w-3 h-3" /> {cardName}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-400">Sem cartão</span>
                    )}
                  </div>

                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                      {parcels.length === 0 ? (
                        <p className="text-[11px] text-slate-400 text-center py-2">
                          Nenhuma parcela gerada.
                        </p>
                      ) : (
                        parcels.map((p, idx) => {
                          const isPaid = p.status === 'realizado'
                          const isOverdue = !isPaid && (p.date || '').slice(0, 10) < todayStr
                          const key = `${inst.id}-${idx + 1}`
                          return (
                            <div
                              key={p.id}
                              className="flex items-center justify-between text-[11px] py-1.5 px-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-900/40"
                            >
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleParcel(inst.id, idx + 1)}
                                  disabled={togglingKey === key}
                                  className={`w-5 h-5 rounded-full flex items-center justify-center ${
                                    isPaid
                                      ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40'
                                      : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                  }`}
                                >
                                  {isPaid ? (
                                    <CheckCircle2 className="w-3 h-3" />
                                  ) : (
                                    <Circle className="w-3 h-3" />
                                  )}
                                </button>
                                <span className="text-slate-500">
                                  {idx + 1}/{total} • {formatDate(p.date)}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                                  {formatCurrency(p.value, hideValues)}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[8px] py-0 px-1 ${
                                    isPaid
                                      ? 'text-emerald-600 border-emerald-300'
                                      : isOverdue
                                        ? 'text-red-600 border-red-300'
                                        : 'text-amber-600 border-amber-300'
                                  }`}
                                >
                                  {isPaid ? 'Paga' : isOverdue ? 'Vencida' : 'Pendente'}
                                </Badge>
                              </div>
                            </div>
                          )
                        })
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
              {editId ? 'Editar Parcelamento' : 'Novo Parcelamento'}
            </DialogTitle>
          </DialogHeader>

          {formErrors.form && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {formErrors.form}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label htmlFor="inst-desc">Descrição da compra *</Label>
              <Input
                id="inst-desc"
                placeholder="Ex: Notebook Dell, Sofá, Fone"
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
                <Label htmlFor="inst-total">Valor total (R$) *</Label>
                <Input
                  id="inst-total"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={form.totalValue}
                  onChange={(e) => setForm({ ...form, totalValue: e.target.value })}
                  disabled={!!editId}
                  className="h-10 rounded-xl font-bold"
                />
                {formErrors.totalValue && (
                  <p className="text-[11px] text-red-500">{formErrors.totalValue}</p>
                )}
                {editId && <p className="text-[10px] text-slate-400">Não editável</p>}
              </div>
              <div className="space-y-1">
                <Label htmlFor="inst-count">Nº de parcelas *</Label>
                <Input
                  id="inst-count"
                  type="number"
                  min={1}
                  value={form.totalInstallments}
                  onChange={(e) => setForm({ ...form, totalInstallments: e.target.value })}
                  disabled={!!editId}
                  className="h-10 rounded-xl"
                />
                {formErrors.totalInstallments && (
                  <p className="text-[11px] text-red-500">{formErrors.totalInstallments}</p>
                )}
                {editId && <p className="text-[10px] text-slate-400">Não editável</p>}
              </div>
            </div>

            {!editId && (
              <div className="space-y-1">
                <Label htmlFor="inst-start">Data da primeira parcela *</Label>
                <Input
                  id="inst-start"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  className="h-10 rounded-xl"
                />
                {formErrors.startDate && (
                  <p className="text-[11px] text-red-500">{formErrors.startDate}</p>
                )}
              </div>
            )}

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
                <Label>Cartão vinculado</Label>
                <Select
                  value={form.creditCardId}
                  onValueChange={(v) => setForm({ ...form, creditCardId: v })}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {creditCards.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!editId && form.totalValue && form.totalInstallments && (
              <div className="p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-[11px]">
                {parseFloat(form.totalValue.replace(',', '.')) > 0 &&
                  parseInt(form.totalInstallments, 10) > 0 && (
                    <p className="text-slate-600 dark:text-slate-300">
                      Serão geradas <strong>{form.totalInstallments} parcelas</strong> de{' '}
                      <strong className="text-emerald-600">
                        {formatCurrency(
                          parseFloat(form.totalValue.replace(',', '.')) /
                            parseInt(form.totalInstallments, 10),
                          hideValues,
                        )}
                      </strong>
                      .
                    </p>
                  )}
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
                {loading ? 'Salvando...' : editId ? 'Atualizar' : 'Criar Parcelamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Excluir */}
      <AlertDialog
        open={deleteInst !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteInst(null)
            setDeleteMode(null)
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl bg-white dark:bg-[#121A2B]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              Excluir parcelamento
            </AlertDialogTitle>
            <AlertDialogDescription>
              O que deseja excluir do parcelamento "{deleteInst?.description}"?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2 py-2">
            <Button
              variant="outline"
              onClick={() => setDeleteMode('future')}
              className={`w-full justify-start rounded-xl h-auto py-3 ${deleteMode === 'future' ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/30' : ''}`}
            >
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Só as parcelas futuras (não pagas)
                </div>
                <div className="text-[11px] text-slate-500">
                  Mantém o grupo e o histórico de parcelas pagas
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteMode('all')}
              className={`w-full justify-start rounded-xl h-auto py-3 ${deleteMode === 'all' ? 'border-red-500 bg-red-50 dark:bg-red-950/30' : ''}`}
            >
              <div className="text-left">
                <div className="text-sm font-semibold text-slate-900 dark:text-white">
                  Excluir todas as parcelas
                </div>
                <div className="text-[11px] text-slate-500">
                  Remove o grupo e todas as parcelas (pagas e futuras)
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
