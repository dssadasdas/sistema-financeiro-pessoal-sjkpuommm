import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  formatCurrency,
  formatMonthYear,
  CATEGORY_SUGGESTIONS,
  CATEGORY_COLORS,
  formatDate,
} from '@/lib/constants'
import { PieChart, Plus, Edit2, ChevronDown, Loader2 } from 'lucide-react'
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
import { LoadingState, ErrorState, EmptyState } from '@/components/States'
import { Transaction } from '@/types/finance'

type FilterKey = 'all' | 'within' | 'over'

// Cores: verde < 60%, amarelo 60-85%, vermelho > 85%, laranja > 100%
function budgetColor(pct: number): { bar: string; text: string; badge: string; label: string } {
  if (pct > 100) {
    return {
      bar: 'bg-orange-500',
      text: 'text-orange-600',
      badge: 'bg-orange-50 text-orange-700 dark:bg-orange-950/60 dark:text-orange-300',
      label: 'Estourado',
    }
  }
  if (pct > 85) {
    return {
      bar: 'bg-red-500',
      text: 'text-red-600',
      badge: 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300',
      label: 'Atenção',
    }
  }
  if (pct >= 60) {
    return {
      bar: 'bg-amber-400',
      text: 'text-amber-600',
      badge: 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      label: 'Alerta',
    }
  }
  return {
    bar: 'bg-emerald-500',
    text: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    label: 'No limite',
  }
}

export default function BudgetPage() {
  const { budgets, transactions, saveBudget, isLoading, loadError, refreshAll } = useFinance()
  const { hideValues } = useAuth()

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [filter, setFilter] = useState<FilterKey>('all')

  // Modal
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [category, setCategory] = useState('Alimentação')
  const [limitValue, setLimitValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Expandir categoria (mostra 3 maiores gastos)
  const [expandedCat, setExpandedCat] = useState<string | null>(null)

  const monthBudgets = useMemo(
    () => budgets.filter((b) => b.month === selectedMonth),
    [budgets, selectedMonth],
  )

  // Mapa de gastos por categoria para o mês
  const spendsByCategory = useMemo(() => {
    const map: Record<string, Transaction[]> = {}
    transactions.forEach((t) => {
      if (
        t.type === 'despesa' &&
        t.status === 'realizado' &&
        (t.date || '').startsWith(selectedMonth)
      ) {
        const cat = t.category || 'Outros'
        if (!map[cat]) map[cat] = []
        map[cat].push(t)
      }
    })
    return map
  }, [transactions, selectedMonth])

  const totalBudgeted = monthBudgets.reduce((acc, b) => acc + (b.limit_value || 0), 0)
  const totalSpent = monthBudgets.reduce((acc, b) => acc + (b.spent || 0), 0)
  const overallPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  const filteredBudgets = useMemo(() => {
    return monthBudgets.filter((b) => {
      const pct = b.percentage || 0
      if (filter === 'over') return pct > 85
      if (filter === 'within') return pct <= 85
      return true
    })
  }, [monthBudgets, filter])

  const handleOpenCreate = () => {
    setEditingId(null)
    setCategory('Alimentação')
    setLimitValue('')
    setFieldErrors({})
    setModalOpen(true)
  }

  const handleOpenEdit = (cat: string, currentLimit: number) => {
    setEditingId(cat)
    setCategory(cat)
    setLimitValue(String(currentLimit))
    setFieldErrors({})
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const num = parseFloat(limitValue.replace(',', '.'))
    if (isNaN(num) || num <= 0) {
      setFieldErrors({ limit_value: 'Informe um limite válido maior que zero.' })
      return
    }
    setLoading(true)
    try {
      await saveBudget(category, num, selectedMonth)
      setModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { data?: Record<string, { message: string }>; message?: string }
      if (errorObj?.data) {
        const fe: Record<string, string> = {}
        for (const [k, v] of Object.entries(errorObj.data)) fe[k] = v.message
        setFieldErrors(fe)
      } else {
        setFieldErrors({ limit_value: errorObj?.message || 'Erro ao salvar orçamento.' })
      }
    } finally {
      setLoading(false)
    }
  }

  const goToPrevMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 1, 1)
    d.setMonth(d.getMonth() - 1)
    setSelectedMonth(d.toISOString().slice(0, 7))
  }
  const goToNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const d = new Date(y, m - 1, 1)
    d.setMonth(d.getMonth() + 1)
    setSelectedMonth(d.toISOString().slice(0, 7))
  }

  if (isLoading) return <LoadingState message="Carregando orçamentos..." />
  if (loadError)
    return <ErrorState message="Não foi possível carregar seus orçamentos." onRetry={refreshAll} />

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Orçamento Mensal por Categoria
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Defina limites de gastos e monitore seu consumo em tempo real
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Navegação entre meses */}
          <div className="flex items-center gap-1 bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-700 rounded-xl p-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
              <ChevronDown className="w-4 h-4 rotate-90" />
            </Button>
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-8 w-36 border-0 bg-transparent font-bold text-xs focus-visible:ring-0 px-1"
            />
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
              <ChevronDown className="w-4 h-4 -rotate-90" />
            </Button>
          </div>
          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
          >
            <Plus className="w-4 h-4" /> Novo Orçamento
          </Button>
        </div>
      </div>

      {/* Card Resumo */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">
              Total Orçado em {formatMonthYear(selectedMonth)}
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
              {formatCurrency(totalBudgeted, hideValues)}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              Gasto realizado:{' '}
              <strong className="text-orange-600">{formatCurrency(totalSpent, hideValues)}</strong>
            </span>
          </div>

          <div className="text-right sm:w-64 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Consumo Geral:</span>
              <span
                className={`font-bold ${
                  overallPercentage > 100
                    ? 'text-orange-600'
                    : overallPercentage > 85
                      ? 'text-red-600'
                      : overallPercentage >= 60
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                }`}
              >
                {overallPercentage}%
              </span>
            </div>
            <div className="h-3 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  overallPercentage > 100
                    ? 'bg-orange-500'
                    : overallPercentage > 85
                      ? 'bg-red-500'
                      : overallPercentage >= 60
                        ? 'bg-amber-400'
                        : 'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, overallPercentage)}%` }}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Filtros */}
      {monthBudgets.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          {(
            [
              { key: 'all', label: 'Todas' },
              { key: 'within', label: 'Dentro do orçamento' },
              { key: 'over', label: 'Estouradas' },
            ] as { key: FilterKey; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setFilter(opt.key)}
              className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                filter === opt.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Grid de Categorias */}
      {monthBudgets.length === 0 ? (
        <EmptyState
          icon={PieChart}
          title="Nenhum orçamento configurado"
          description={`Você ainda não definiu limites de gastos para ${formatMonthYear(selectedMonth)}. Crie orçamentos por categoria e acompanhe seus gastos.`}
          actionLabel="Definir primeiro limite"
          onAction={handleOpenCreate}
        />
      ) : filteredBudgets.length === 0 ? (
        <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
          Nenhuma categoria corresponde ao filtro selecionado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredBudgets.map((b) => {
            const spent = b.spent || 0
            const limit = b.limit_value || 1
            const pct = b.percentage || 0
            const remaining = limit - spent
            const colors = budgetColor(pct)
            const isExpanded = expandedCat === b.id
            const topSpends = (spendsByCategory[b.category] || [])
              .sort((a, c) => (c.value || 0) - (a.value || 0))
              .slice(0, 3)

            return (
              <Card
                key={b.id}
                className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[b.category] || '#64748B' }}
                      />
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {b.category}
                      </h3>
                    </div>
                    <button
                      onClick={() => handleOpenEdit(b.category, b.limit_value)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      title="Editar Limite"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-slate-400">Gasto Atual:</span>
                      <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(spent, hideValues)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Limite Mensal:</span>
                      <div className="text-lg font-black text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatCurrency(limit, hideValues)}
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso Colorida */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Consumido:</span>
                      <span className={colors.text}>{pct}%</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    {remaining >= 0 ? (
                      <>
                        Restante:{' '}
                        <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                          {formatCurrency(remaining, hideValues)}
                        </strong>
                      </>
                    ) : (
                      <>
                        Excedido:{' '}
                        <strong className="text-orange-600 font-semibold">
                          {formatCurrency(Math.abs(remaining), hideValues)}
                        </strong>
                      </>
                    )}
                  </span>
                  <div className="flex items-center gap-2">
                    <Badge className={`text-[10px] py-0 px-2 font-bold ${colors.badge} border-0`}>
                      {colors.label}
                    </Badge>
                    {topSpends.length > 0 && (
                      <button
                        onClick={() => setExpandedCat(isExpanded ? null : b.id)}
                        className="text-slate-400 hover:text-emerald-600"
                        title="Ver maiores gastos"
                      >
                        <ChevronDown
                          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        />
                      </button>
                    )}
                  </div>
                </div>

                {/* 3 maiores gastos */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    <span className="text-[10px] uppercase font-bold text-slate-400">
                      Maiores gastos do mês
                    </span>
                    {topSpends.length === 0 ? (
                      <p className="text-xs text-slate-400 py-1">Nenhum gasto registrado ainda.</p>
                    ) : (
                      topSpends.map((t) => (
                        <div key={t.id} className="flex items-center justify-between text-xs py-1">
                          <div className="min-w-0">
                            <span className="truncate text-slate-600 dark:text-slate-300 block">
                              {t.description}
                            </span>
                            <span className="text-[10px] text-slate-400">{formatDate(t.date)}</span>
                          </div>
                          <span className="font-bold tabular-nums text-slate-700 dark:text-slate-300 flex-shrink-0">
                            {formatCurrency(t.value, hideValues)}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Definir Limite */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              {editingId ? 'Editar Orçamento' : 'Novo Orçamento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory} disabled={!!editingId}>
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
              {fieldErrors.category && (
                <span className="text-[11px] text-red-500">{fieldErrors.category}</span>
              )}
            </div>

            <div className="space-y-1">
              <Label htmlFor="bg-lim">
                Limite de Gastos para {formatMonthYear(selectedMonth)} (R$) *
              </Label>
              <Input
                id="bg-lim"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={limitValue}
                onChange={(e) => setLimitValue(e.target.value)}
                required
                className="h-11 rounded-xl font-bold text-base"
              />
              {fieldErrors.limit_value && (
                <span className="text-[11px] text-red-500">{fieldErrors.limit_value}</span>
              )}
            </div>

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
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : editingId ? (
                  'Salvar Alterações'
                ) : (
                  'Salvar Orçamento'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
