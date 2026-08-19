import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/constants'
import { Investment, InvestmentType } from '@/types/finance'
import {
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  ShieldCheck,
  Percent,
  Award,
  AlertCircle,
  Loader2,
  ArrowDownUp,
  Bitcoin,
  Coins,
  Building2,
  Banknote,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'
import { useChartTheme } from '@/hooks/use-chart-theme'

// CDI anual estimado (taxa SELIC/CDI aproximada)
const CDI_ANNUAL_RATE = 0.1099

const TYPE_LABELS: Record<InvestmentType, string> = {
  bitcoin: 'Bitcoin',
  ethereum: 'Ethereum',
  acao: 'Ação',
  fii: 'FII',
  renda_fixa: 'Renda Fixa',
  cdi100: 'CDI 100%',
}

const TYPE_META: Record<
  InvestmentType,
  { label: string; icon: React.ComponentType<{ className?: string }>; bg: string; glyph: string }
> = {
  bitcoin: { label: 'Bitcoin', icon: Bitcoin, bg: 'bg-amber-500', glyph: '₿' },
  ethereum: { label: 'Ethereum', icon: Coins, bg: 'bg-indigo-600', glyph: 'Ξ' },
  acao: { label: 'Ação', icon: Building2, bg: 'bg-blue-600', glyph: '📈' },
  fii: { label: 'FII', icon: Building2, bg: 'bg-teal-600', glyph: '🏢' },
  renda_fixa: { label: 'Renda Fixa', icon: Banknote, bg: 'bg-slate-600', glyph: '%' },
  cdi100: { label: 'CDI 100%', icon: Percent, bg: 'bg-emerald-600', glyph: '%' },
}

type SortKey = 'current' | 'profit' | 'date'

// Cálculo Regressivo de IR para CDB (dias aplicados)
function calculateCdbTaxes(appliedDateStr?: string, grossProfit = 0) {
  if (!appliedDateStr || grossProfit <= 0)
    return { days: 0, irPct: 22.5, irValue: 0, iofValue: 0, netProfit: 0 }
  const start = new Date(appliedDateStr).getTime()
  const now = Date.now()
  const days = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)))

  let irPct = 22.5
  if (days > 720) irPct = 15.0
  else if (days > 360) irPct = 17.5
  else if (days > 180) irPct = 20.0

  let iofPct = 0
  if (days < 30) {
    iofPct = Math.max(0, (30 - days) * 3)
  }

  const iofValue = (grossProfit * iofPct) / 100
  const taxableAfterIof = Math.max(0, grossProfit - iofValue)
  const irValue = (taxableAfterIof * irPct) / 100

  return { days, irPct, irValue, iofValue, netProfit: grossProfit - irValue - iofValue }
}

// Projeção de evolução de CDB 100% CDI mês a mês
function buildCdiProjection(appliedValue: number, applicationDateStr?: string) {
  const start = applicationDateStr ? new Date(applicationDateStr) : new Date()
  const now = new Date()
  const monthsElapsed = Math.max(
    0,
    (now.getFullYear() - start.getFullYear()) * 12 + (now.getMonth() - start.getMonth()),
  )
  const monthlyRate = Math.pow(1 + CDI_ANNUAL_RATE, 1 / 12) - 1

  const points: { month: string; value: number }[] = []
  const totalMonths = Math.max(monthsElapsed + 6, 12)
  let value = appliedValue
  const startDate = new Date(start.getFullYear(), start.getMonth(), 1)

  for (let i = 0; i <= totalMonths; i++) {
    if (i > 0) value = value * (1 + monthlyRate)
    const d = new Date(startDate.getFullYear(), startDate.getMonth() + i, 1)
    const label = d.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })
    points.push({ month: label, value: Number(value.toFixed(2)) })
  }
  return {
    points,
    currentValue: points[Math.min(monthsElapsed, points.length - 1)]?.value || appliedValue,
  }
}

export default function InvestmentsPage() {
  const {
    investments,
    totalInvested,
    totalInvestmentsResult,
    isLoading,
    loadError,
    refreshAll,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    refreshCryptoQuotes,
  } = useFinance()
  const { hideValues } = useAuth()
  const chart = useChartTheme()

  const [modalOpen, setModalOpen] = useState(false)
  const [invToEdit, setInvToEdit] = useState<Investment | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('current')
  const [confirmDelete, setConfirmDelete] = useState<Investment | null>(null)

  // Form states
  const [type, setType] = useState<InvestmentType>('cdi100')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [appliedValue, setAppliedValue] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [applicationDate, setApplicationDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [currentPrice, setCurrentPrice] = useState('')
  const [loading, setLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const sortedInvestments = useMemo(() => {
    const list = [...investments]
    if (sortKey === 'current') {
      list.sort((a, b) => (b.current_total_value || 0) - (a.current_total_value || 0))
    } else if (sortKey === 'profit') {
      list.sort((a, b) => (b.profit_loss_pct || 0) - (a.profit_loss_pct || 0))
    } else {
      list.sort(
        (a, b) =>
          new Date(b.application_date || b.created).getTime() -
          new Date(a.application_date || a.created).getTime(),
      )
    }
    return list
  }, [investments, sortKey])

  const totalCurrentValue = totalInvested + totalInvestmentsResult
  const avgReturnPct = totalInvested > 0 ? (totalInvestmentsResult / totalInvested) * 100 : 0

  const bestInvestment = useMemo(() => {
    if (investments.length === 0) return null
    return [...investments].sort((a, b) => (b.profit_loss_pct || 0) - (a.profit_loss_pct || 0))[0]
  }, [investments])

  const handleOpenCreate = () => {
    setInvToEdit(null)
    setType('cdi100')
    setName('CDB 100% CDI')
    setSymbol('CDI')
    setAppliedValue('5000')
    setQuantity('')
    setUnitPrice('')
    setApplicationDate(new Date().toISOString().slice(0, 10))
    setCurrentPrice('')
    setFormError(null)
    setModalOpen(true)
  }

  const handleOpenEdit = (inv: Investment) => {
    setInvToEdit(inv)
    setType(inv.type)
    setName(inv.name)
    setSymbol(inv.symbol || '')
    setAppliedValue(String(inv.applied_value || 0))
    setQuantity(inv.quantity ? String(inv.quantity) : '')
    setUnitPrice(inv.unit_price ? String(inv.unit_price) : '')
    setApplicationDate(
      inv.application_date
        ? inv.application_date.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    )
    setCurrentPrice(inv.current_price ? String(inv.current_price) : '')
    setFormError(null)
    setModalOpen(true)
  }

  const handleRefreshQuotes = async () => {
    setIsRefreshing(true)
    try {
      await refreshCryptoQuotes()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    const applied = parseFloat(appliedValue.replace(',', '.')) || 0
    if (!name.trim()) {
      setFormError('Informe o nome do ativo.')
      return
    }
    if (applied <= 0) {
      setFormError('Valor aplicado deve ser maior que zero.')
      return
    }
    const qty = parseFloat(quantity.replace(',', '.')) || undefined
    const unitP = parseFloat(unitPrice.replace(',', '.')) || undefined
    const curP = parseFloat(currentPrice.replace(',', '.')) || undefined

    setLoading(true)
    try {
      const payload: Partial<Investment> = {
        type,
        name: name.trim(),
        symbol: symbol.trim().toUpperCase() || undefined,
        applied_value: applied,
        quantity: qty,
        unit_price: unitP,
        application_date: `${applicationDate} 12:00:00.000Z`,
        current_price: curP,
      }

      if (invToEdit) {
        await updateInvestment(invToEdit.id, payload)
      } else {
        await createInvestment(payload)
      }
      setModalOpen(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar investimento.'
      setFormError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteInvestment(confirmDelete.id)
    } catch (err) {
      console.error(err)
    } finally {
      setConfirmDelete(null)
    }
  }

  if (isLoading) {
    return <LoadingState message="Carregando seus investimentos..." />
  }

  if (loadError) {
    return (
      <ErrorState
        message="Não foi possível carregar seus investimentos. Verifique sua conexão e tente novamente."
        onRetry={refreshAll}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Investimentos</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe Criptomoedas, Ações, FIIs, Renda Fixa e CDI 100% em tempo real
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefreshQuotes}
            disabled={isRefreshing}
            variant="outline"
            className="rounded-xl text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar Cripto'}
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
          >
            <Plus className="w-4 h-4" /> Novo Ativo
          </Button>
        </div>
      </div>

      {/* Cards Resumo (4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Patrimônio Total Investido */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">
              Patrimônio Investido
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-2">
            {formatCurrency(totalCurrentValue, hideValues)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Aplicado: {formatCurrency(totalInvested, hideValues)}
          </span>
        </Card>

        {/* Ganho/Perda Total */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">
              Ganho/Perda Total
            </span>
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                totalInvestmentsResult >= 0
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600'
                  : 'bg-red-50 dark:bg-red-950/40 text-red-600'
              }`}
            >
              {totalInvestmentsResult >= 0 ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
            </div>
          </div>
          <div
            className={`text-2xl font-black tabular-nums mt-2 ${
              totalInvestmentsResult >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {totalInvestmentsResult >= 0 ? '+' : ''}
            {formatCurrency(totalInvestmentsResult, hideValues)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Resultado estimado</span>
        </Card>

        {/* Rentabilidade Média */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">
              Rentabilidade Média
            </span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black tabular-nums mt-2 ${
              avgReturnPct >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {avgReturnPct >= 0 ? '+' : ''}
            {avgReturnPct.toFixed(2)}%
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Sobre o total aplicado</span>
        </Card>

        {/* Melhor Investimento */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase text-slate-400">
              Melhor Investimento
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </div>
          {bestInvestment ? (
            <>
              <div className="text-base font-black text-slate-900 dark:text-white truncate mt-2">
                {bestInvestment.name}
              </div>
              <span className="text-xs font-bold text-emerald-600 tabular-nums">
                +{(bestInvestment.profit_loss_pct || 0).toFixed(2)}%
              </span>
            </>
          ) : (
            <div className="text-base font-black text-slate-400 mt-2">—</div>
          )}
        </Card>
      </div>

      {/* Ordenação */}
      {investments.length > 0 && (
        <div className="flex items-center gap-2">
          <ArrowDownUp className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Ordenar por:</span>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-8 w-44 rounded-xl text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current">Maior valor atual</SelectItem>
              <SelectItem value="profit">Maior rentabilidade</SelectItem>
              <SelectItem value="date">Data de aplicação</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Grid de Ativos */}
      {investments.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="Nenhum investimento cadastrado"
          description="Adicione seu primeiro investimento e comece a acompanhar a evolução do seu patrimônio."
          actionLabel="Adicione seu primeiro investimento"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedInvestments.map((inv) => {
            const meta = TYPE_META[inv.type]
            const isCrypto = inv.type === 'bitcoin' || inv.type === 'ethereum'
            const isCdi = inv.type === 'cdi100' || inv.type === 'renda_fixa'
            const applied = inv.applied_value || 0
            const currentTotal = inv.current_total_value || applied
            const profit = inv.profit_loss || 0
            const pct = inv.profit_loss_pct || 0
            const qty = Number(inv.quantity || 0)
            const unitP = Number(inv.unit_price || 0)
            const curP = Number(inv.current_price || 0)

            const cdbTaxInfo = isCdi ? calculateCdbTaxes(inv.application_date, profit) : null
            const projection = isCdi ? buildCdiProjection(applied, inv.application_date) : null

            return (
              <Card
                key={inv.id}
                className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs text-white ${meta.bg}`}
                      >
                        {meta.glyph}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {inv.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {TYPE_LABELS[inv.type]}
                          </Badge>
                          {inv.symbol && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {inv.symbol}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(inv)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
                        aria-label="Editar"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(inv)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg"
                        aria-label="Excluir"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-slate-400">Valor Atual:</span>
                      <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(currentTotal, hideValues)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Aplicado:</span>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatCurrency(applied, hideValues)}
                      </div>
                    </div>
                  </div>

                  {/* Detalhes por tipo */}
                  {(isCrypto || inv.type === 'acao' || inv.type === 'fii') && qty > 0 && (
                    <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <span className="text-slate-400 block">Quantidade</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                          {qty.toLocaleString('pt-BR', { maximumFractionDigits: 8 })}
                        </span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50">
                        <span className="text-slate-400 block">Preço médio</span>
                        <span className="font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                          {formatCurrency(unitP, hideValues)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Cotação atual para cripto/ações */}
                  {curP > 0 && (isCrypto || inv.type === 'acao' || inv.type === 'fii') && (
                    <div className="flex items-center justify-between text-[11px] mb-3 px-2 py-1.5 rounded-lg bg-blue-50/50 dark:bg-blue-950/20">
                      <span className="text-slate-500">Cotação atual:</span>
                      <span className="font-mono font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                        {formatCurrency(curP, hideValues)}
                      </span>
                    </div>
                  )}

                  {/* Rentabilidade Chip */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Rentabilidade:</span>
                    <span
                      className={`font-extrabold tabular-nums ${
                        profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {profit >= 0 ? '+' : ''}
                      {formatCurrency(profit, hideValues)} ({pct.toFixed(2)}%)
                    </span>
                  </div>

                  {/* Indicador de atualização para cripto */}
                  {isCrypto && inv.last_price_update && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-400">
                      <RefreshCw className="w-3 h-3" />
                      <span>Atualizado em {formatDate(inv.last_price_update)}</span>
                    </div>
                  )}

                  {/* Informações Fiscais para CDI */}
                  {cdbTaxInfo && cdbTaxInfo.days > 0 && (
                    <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-500/20 text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between font-medium">
                        <span>Tempo de aplicação:</span>
                        <span>{cdbTaxInfo.days} dias</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Alíquota IR Regressivo:</span>
                        <span className="font-bold">{cdbTaxInfo.irPct}%</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-bold">
                        <span>Líquido estimado:</span>
                        <span>
                          {formatCurrency(applied + (cdbTaxInfo.netProfit || 0), hideValues)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Gráfico de projeção CDI */}
                  {projection && projection.points.length > 1 && (
                    <div className="mt-3">
                      <div className="text-[10px] text-slate-400 font-medium mb-1">
                        Projeção de evolução (CDI 100%)
                      </div>
                      <div className="h-28 -ml-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={projection.points}>
                            <defs>
                              <linearGradient id={`grad-${inv.id}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="0%" stopColor="#10b981" stopOpacity={0.4} />
                                <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <XAxis dataKey="month" hide />
                            <YAxis hide domain={['dataMin', 'dataMax']} />
                            <Tooltip
                              formatter={(v: number) => [formatCurrency(v, hideValues), 'Valor']}
                              contentStyle={{
                                ...chart.tooltipStyle,
                                fontSize: 11,
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="value"
                              stroke="#10b981"
                              strokeWidth={2}
                              fill={`url(#grad-${inv.id})`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Desde: {formatDate(inv.application_date || inv.created)}</span>
                  {isCdi && (
                    <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                      <ShieldCheck className="w-3 h-3" /> Renda Fixa
                    </span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Novo / Editar Investimento */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              {invToEdit ? 'Editar Ativo' : 'Adicionar Ativo de Investimento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label>Tipo de Investimento</Label>
              <Select value={type} onValueChange={(v) => setType(v as InvestmentType)}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cdi100">CDB 100% CDI / Renda Fixa</SelectItem>
                  <SelectItem value="bitcoin">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ethereum">Ethereum (ETH)</SelectItem>
                  <SelectItem value="acao">Ação Brasileira (B3)</SelectItem>
                  <SelectItem value="fii">Fundo Imobiliário (FII)</SelectItem>
                  <SelectItem value="renda_fixa">Tesouro / LCI / LCA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="inv-name">Nome do Ativo *</Label>
              <Input
                id="inv-name"
                placeholder="Ex: CDB Liquidez Diária, Bitcoin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="inv-sym">Símbolo (Ticker)</Label>
                <Input
                  id="inv-sym"
                  placeholder="BTC, ETH, PETR4, HGLG11"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="h-10 rounded-xl font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="inv-val">Valor Aplicado (R$) *</Label>
                <Input
                  id="inv-val"
                  type="number"
                  step="0.01"
                  value={appliedValue}
                  onChange={(e) => setAppliedValue(e.target.value)}
                  required
                  className="h-10 rounded-xl font-bold"
                />
              </div>
            </div>

            {(type === 'bitcoin' || type === 'ethereum' || type === 'acao' || type === 'fii') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="inv-qty">Quantidade</Label>
                  <Input
                    id="inv-qty"
                    type="number"
                    step="0.00000001"
                    placeholder="Ex: 0.0125 ou 100"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="inv-unitp">Preço Médio (R$)</Label>
                  <Input
                    id="inv-unitp"
                    type="number"
                    step="0.01"
                    placeholder="Preço de compra"
                    value={unitPrice}
                    onChange={(e) => setUnitPrice(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="inv-curp">Preço Atual / Cotação (R$)</Label>
                <Input
                  id="inv-curp"
                  type="number"
                  step="0.01"
                  placeholder={
                    type === 'cdi100' || type === 'renda_fixa'
                      ? 'Valor estimado atual'
                      : 'Atualizado auto'
                  }
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="inv-date">Data da Aplicação</Label>
                <Input
                  id="inv-date"
                  type="date"
                  value={applicationDate}
                  onChange={(e) => setApplicationDate(e.target.value)}
                  required
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            {(type === 'bitcoin' || type === 'ethereum') && (
              <p className="text-[11px] text-slate-400 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                Cotações de criptomoedas são atualizadas automaticamente a cada hora via Binance.
              </p>
            )}

            {formError && (
              <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg p-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {formError}
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? 'Salvando...' : 'Salvar Ativo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de exclusão */}
      <Dialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <DialogContent className="max-w-sm rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-base text-slate-900 dark:text-white">
              Excluir investimento?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-slate-500">
            Tem certeza que deseja excluir{' '}
            <strong className="text-slate-700 dark:text-slate-200">{confirmDelete?.name}</strong>?
            Esta ação não pode ser desfeita.
          </p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConfirmDelete(null)} className="rounded-xl">
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
