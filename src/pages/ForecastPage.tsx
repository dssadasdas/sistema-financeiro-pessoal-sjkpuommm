import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/constants'
import {
  calculateCashFlowProjection,
  ProjectionSimulation,
  formatDayMonth,
} from '@/lib/projectionEngine'
import {
  TrendingUp,
  ArrowUp,
  ArrowDown,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Calculator,
  RefreshCw,
  Sparkles,
  Info,
  Layers,
  Receipt,
  CreditCard,
  Repeat,
  RotateCcw,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LoadingState, ErrorState } from '@/components/States'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts'

export default function ForecastPage() {
  const {
    accounts,
    transactions,
    bills,
    recurringBills,
    recurrences,
    installments,
    invoices,
    isLoading,
    loadError,
    refreshAll,
  } = useFinance()
  const { hideValues } = useAuth()

  // Seletor de período: 30 dias | 60 dias | 90 dias (default: 30)
  const [selectedDays, setSelectedDays] = useState<30 | 60 | 90>(30)

  // Estado do Simulador "E se?"
  const [simValue, setSimValue] = useState<string>('')
  const [simDate, setSimDate] = useState<string>(() => {
    const d = new Date()
    d.setDate(d.getDate() + 5)
    return d.toISOString().slice(0, 10)
  })
  const [simType, setSimType] = useState<'income' | 'expense'>('expense')
  const [activeSimulation, setActiveSimulation] = useState<ProjectionSimulation | null>(null)

  // Executa o cálculo central da projeção via ProjectionEngine puro
  const projection = useMemo(() => {
    return calculateCashFlowProjection({
      accounts,
      transactions,
      bills,
      recurringBills,
      recurrences,
      installments,
      invoices,
      days: selectedDays,
      simulation: activeSimulation,
    })
  }, [
    accounts,
    transactions,
    bills,
    recurringBills,
    recurrences,
    installments,
    invoices,
    selectedDays,
    activeSimulation,
  ])

  // Dados formatados para o gráfico Recharts
  const chartData = useMemo(() => {
    return projection.dailyProjections.map((dp) => {
      return {
        date: dp.date,
        dayLabel: dp.dayLabel,
        saldo: dp.endBalance,
        negativo: dp.endBalance < 0 ? dp.endBalance : null,
        incomeTotal: dp.incomeTotal,
        expenseTotal: dp.expenseTotal,
        hasIncome: dp.incomeTotal > 0,
        hasExpense: dp.expenseTotal > 0,
        eventCount: dp.events.length,
      }
    })
  }, [projection.dailyProjections])

  // Determina valores mínimos e máximos para o eixo Y com folga visual
  const yDomain = useMemo(() => {
    const allVals = projection.dailyProjections.map((p) => p.endBalance)
    allVals.push(projection.startingBalance)
    const minVal = Math.min(...allVals, 0)
    const maxVal = Math.max(...allVals, 100)
    const margin = Math.max((maxVal - minVal) * 0.1, 100)
    return [Math.floor(minVal - margin), Math.ceil(maxVal + margin)]
  }, [projection])

  // Manipuladores da Simulação
  const handleApplySimulation = (e: React.FormEvent) => {
    e.preventDefault()
    const num = Number(simValue.replace(',', '.'))
    if (!num || num <= 0) return
    setActiveSimulation({
      value: num,
      date: simDate || new Date().toISOString().slice(0, 10),
      type: simType,
    })
  }

  const handleClearSimulation = () => {
    setActiveSimulation(null)
    setSimValue('')
  }

  if (isLoading) return <LoadingState message="Calculando fluxo de caixa projetado..." />
  if (loadError) {
    return (
      <ErrorState
        message="Não foi possível carregar a projeção de fluxo de caixa."
        onRetry={refreshAll}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header com Seletor de Período */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Previsão Financeira
            </h2>
            <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-0 font-bold text-xs gap-1">
              <TrendingUp className="w-3.5 h-3.5" /> Fluxo de Caixa Projetado
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Projeção dinâmica dia a dia baseada no seu saldo consolidado real e compromissos futuros
          </p>
        </div>

        {/* Pills de seleção de período: 30 dias | 60 dias | 90 dias */}
        <div className="flex items-center p-1 rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 shadow-sm">
          {([30, 60, 90] as const).map((d) => (
            <button
              key={d}
              onClick={() => setSelectedDays(d)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedDays === d
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {d} dias
            </button>
          ))}
        </div>
      </div>

      {/* Banner de Simulação Ativa (se houver) */}
      {projection.simulationApplied && activeSimulation && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border-2 border-dashed border-amber-400 dark:border-amber-500/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold flex-shrink-0">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                  Modo Simulação Ativo
                </span>
                <Badge className="bg-amber-200 text-amber-900 dark:bg-amber-900/60 dark:text-amber-200 border-0 text-[10px] font-bold">
                  Simulação
                </Badge>
              </div>
              <p className="text-xs text-slate-700 dark:text-slate-300 mt-0.5">
                {activeSimulation.type === 'income' ? 'Receita extra' : 'Despesa extra'} de{' '}
                <strong>{formatCurrency(activeSimulation.value)}</strong> no dia{' '}
                <strong>{formatDate(activeSimulation.date)}</strong>. Nenhuma transação real foi
                criada.
              </p>
            </div>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleClearSimulation}
            className="rounded-xl text-xs font-semibold h-8 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-950/40 text-amber-900 dark:text-amber-200"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" /> Limpar simulação
          </Button>
        </div>
      )}

      {/* Cards Resumidos no Topo (3 cards lado a lado) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Entradas Previstas */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-600 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600">
                <ArrowUp className="w-3.5 h-3.5" />
              </div>
              Entradas previstas
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Próximos {selectedDays} dias
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 tabular-nums mt-2">
            +{formatCurrency(projection.totalIncome, hideValues)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Receitas pendentes e recorrentes</span>
            {projection.simulationApplied && projection.originalSummary && (
              <span className="font-medium text-slate-500">
                Original: +{formatCurrency(projection.originalSummary.totalIncome, hideValues)}
              </span>
            )}
          </div>
        </Card>

        {/* Card 2: Saídas Previstas */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <div className="flex items-center justify-between text-xs text-red-600 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-lg bg-red-50 dark:bg-red-950/40 flex items-center justify-center text-red-600">
                <ArrowDown className="w-3.5 h-3.5" />
              </div>
              Saídas previstas
            </span>
            <span className="text-[11px] text-slate-400 font-normal">
              Próximos {selectedDays} dias
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-red-600 tabular-nums mt-2">
            −{formatCurrency(projection.totalExpense, hideValues)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Boletos, faturas, despesas e parcelas</span>
            {projection.simulationApplied && projection.originalSummary && (
              <span className="font-medium text-slate-500">
                Original: −{formatCurrency(projection.originalSummary.totalExpense, hideValues)}
              </span>
            )}
          </div>
        </Card>

        {/* Card 3: Saldo Projetado (cor condicional) */}
        <Card
          className={`rounded-2xl border p-5 shadow-sm ${
            projection.isPositive
              ? 'border-emerald-200 dark:border-emerald-900/50 bg-gradient-to-br from-white to-emerald-50/40 dark:from-[#121A2B] dark:to-emerald-950/20'
              : 'border-red-200 dark:border-red-900/50 bg-gradient-to-br from-white to-red-50/40 dark:from-[#121A2B] dark:to-red-950/20'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span
              className={`flex items-center gap-1.5 ${
                projection.isPositive
                  ? 'text-emerald-700 dark:text-emerald-300'
                  : 'text-red-700 dark:text-red-300'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-lg flex items-center justify-center ${
                  projection.isPositive
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                    : 'bg-red-100 dark:bg-red-950/60 text-red-600'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
              </div>
              Saldo projetado ({selectedDays}d)
            </span>
            <Badge
              className={`text-[10px] font-bold border-0 ${
                projection.isPositive
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
              }`}
            >
              {projection.isPositive ? 'Positivo' : 'Negativo'}
            </Badge>
          </div>
          <div
            className={`text-2xl sm:text-3xl font-black tabular-nums mt-2 ${
              projection.isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {formatCurrency(projection.projectedEndBalance, hideValues)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Saldo atual: {formatCurrency(projection.startingBalance, hideValues)}</span>
            {projection.simulationApplied && projection.originalSummary && (
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Original:{' '}
                {formatCurrency(projection.originalSummary.projectedEndBalance, hideValues)}
              </span>
            )}
          </div>
        </Card>
      </div>

      {/* DETECÇÃO DE RISCO DE CAIXA (Card com destaque visual) */}
      {projection.risk.hasRisk ? (
        <Card className="rounded-2xl border-red-300 dark:border-red-900/60 bg-red-50/80 dark:bg-red-950/30 p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 flex items-center justify-center font-bold flex-shrink-0 mt-0.5">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-bold text-sm sm:text-base text-red-900 dark:text-red-200">
                  ⚠️ ATENÇÃO: Risco de Caixa Detectado
                </h4>
                <Badge className="bg-red-600 text-white font-bold text-[10px]">
                  Déficit Previsto
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-red-800 dark:text-red-300 mt-1">
                Mantendo as movimentações previstas, seu saldo poderá ficar negativo em{' '}
                <strong>
                  {formatCurrency(Math.abs(projection.risk.firstNegativeBalance || 0))}
                </strong>{' '}
                no dia <strong>{formatDayMonth(projection.risk.firstNegativeDate || '')}</strong>.
              </p>

              <div className="mt-3 pt-3 border-t border-red-200/60 dark:border-red-900/40 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="bg-white/60 dark:bg-black/20 rounded-xl p-2.5">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                    Primeiro dia negativo
                  </span>
                  <span className="font-bold text-red-700 dark:text-red-300">
                    {formatDate(projection.risk.firstNegativeDate || '')} (
                    {formatDayMonth(projection.risk.firstNegativeDate || '')})
                  </span>
                </div>
                <div className="bg-white/60 dark:bg-black/20 rounded-xl p-2.5">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                    Maior déficit previsto
                  </span>
                  <span className="font-bold text-red-700 dark:text-red-300 tabular-nums">
                    −{formatCurrency(projection.risk.maxDeficit)}
                  </span>
                </div>
                <div className="bg-white/60 dark:bg-black/20 rounded-xl p-2.5">
                  <span className="text-slate-500 dark:text-slate-400 block text-[11px]">
                    Dias com saldo negativo
                  </span>
                  <span className="font-bold text-red-700 dark:text-red-300">
                    {projection.risk.negativeDaysCount}{' '}
                    {projection.risk.negativeDaysCount === 1 ? 'dia' : 'dias'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="rounded-2xl border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/60 dark:bg-emerald-950/20 p-4 shadow-sm flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center font-bold flex-shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-xs sm:text-sm text-emerald-900 dark:text-emerald-200">
              ✅ Fluxo de Caixa Saudável
            </h4>
            <p className="text-xs text-emerald-800 dark:text-emerald-300">
              Seu fluxo de caixa permanece positivo nos próximos {selectedDays} dias com base nos
              compromissos atuais.
            </p>
          </div>
        </Card>
      )}

      {/* GRÁFICO DE PROJEÇÃO DINÂMICO */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mb-6">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Evolução do Saldo Projetado (dia a dia)
            </h3>
            <p className="text-xs text-slate-500">
              Acompanhamento da curva de saldo com destaque automático para períodos de déficit
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-emerald-600 inline-block" />
              <span>Saldo Projetado</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-500/30 border border-red-500 inline-block" />
              <span>Zona de Risco (&lt; 0)</span>
            </div>
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSaldo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
                <linearGradient id="colorNegativo" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.2} />
              <XAxis
                dataKey="dayLabel"
                tick={{ fontSize: 11, fill: '#888' }}
                tickLine={false}
                axisLine={false}
                interval={selectedDays > 30 ? (selectedDays > 60 ? 6 : 3) : 1}
              />
              <YAxis
                domain={yDomain}
                tick={{ fontSize: 11, fill: '#888' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) =>
                  hideValues
                    ? '•••'
                    : v >= 1000 || v <= -1000
                      ? `R$ ${(v / 1000).toFixed(0)}k`
                      : `R$ ${v}`
                }
              />
              <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="3 3" opacity={0.6} />

              <RechartsTooltip
                content={({ active, payload }) => {
                  if (!active || !payload || !payload.length) return null
                  const data = payload[0].payload
                  const isNeg = data.saldo < 0
                  return (
                    <div className="p-3 rounded-xl bg-slate-900/95 text-white shadow-xl text-xs backdrop-blur border border-slate-700 min-w-[180px]">
                      <div className="font-bold border-b border-slate-800 pb-1.5 mb-1.5 flex items-center justify-between">
                        <span>{formatDate(data.date)}</span>
                        <span className="text-slate-400 font-normal">{data.dayLabel}</span>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Saldo Projetado:</span>
                          <span
                            className={`font-bold tabular-nums ${
                              isNeg ? 'text-red-400' : 'text-emerald-400'
                            }`}
                          >
                            {formatCurrency(data.saldo, hideValues)}
                          </span>
                        </div>
                        {data.incomeTotal > 0 && (
                          <div className="flex items-center justify-between text-emerald-400">
                            <span>+ Entradas no dia:</span>
                            <span className="font-semibold tabular-nums">
                              +{formatCurrency(data.incomeTotal, hideValues)}
                            </span>
                          </div>
                        )}
                        {data.expenseTotal > 0 && (
                          <div className="flex items-center justify-between text-red-400">
                            <span>− Saídas no dia:</span>
                            <span className="font-semibold tabular-nums">
                              −{formatCurrency(data.expenseTotal, hideValues)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                }}
              />

              {/* Área verde positiva */}
              <Area
                type="monotone"
                dataKey="saldo"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#colorSaldo)"
              />

              {/* Área de destaque vermelha se ficar negativo */}
              <Area
                type="monotone"
                dataKey="negativo"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#colorNegativo)"
              />

              <Line
                type="monotone"
                dataKey="saldo"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 5, fill: '#10b981' }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* LINHA DO TEMPO FINANCEIRA (Timeline Vertical) */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Linha do Tempo Financeira
            </h3>
            <p className="text-xs text-slate-500">
              Eventos programados em ordem cronológica com saldo acumulado após cada movimento
            </p>
          </div>

          <Badge variant="outline" className="text-xs font-semibold">
            {projection.timelineEvents.length}{' '}
            {projection.timelineEvents.length === 1 ? 'evento previsto' : 'eventos previstos'}
          </Badge>
        </div>

        {/* Ponto inicial: Hoje - Saldo atual */}
        <div className="relative pl-6 pb-6 border-l-2 border-emerald-500 dark:border-emerald-500/80">
          <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-100 dark:ring-emerald-950/60" />
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Hoje — Saldo Consolidado Atual
              </span>
              <span className="text-[11px] text-slate-400 block">
                Soma dos saldos de todas as contas cadastradas
              </span>
            </div>
            <div className="text-sm font-black text-emerald-600 tabular-nums">
              {formatCurrency(projection.startingBalance, hideValues)}
            </div>
          </div>
        </div>

        {projection.timelineEvents.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhum evento financeiro agendado nos próximos {selectedDays} dias.
          </div>
        ) : (
          <div className="space-y-4">
            {projection.timelineEvents.map((ev, idx) => {
              const isIncome = ev.type === 'income'
              const isNegativeAfter = ev.runningBalance < 0
              const isLast = idx === projection.timelineEvents.length - 1

              return (
                <div
                  key={ev.id}
                  className={`relative pl-6 ${
                    isLast ? '' : 'pb-4 border-l-2 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {/* Ícone no nó da linha */}
                  <div
                    className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] ${
                      isIncome ? 'bg-emerald-600' : 'bg-red-500'
                    }`}
                  >
                    {isIncome ? (
                      <ArrowUp className="w-2.5 h-2.5 stroke-[3]" />
                    ) : (
                      <ArrowDown className="w-2.5 h-2.5 stroke-[3]" />
                    )}
                  </div>

                  {/* Card do evento */}
                  <div
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                      ev.isSimulation
                        ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800/80 border-dashed'
                        : 'bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800 hover:border-slate-200'
                    }`}
                  >
                    <div className="flex items-start sm:items-center gap-3 min-w-0">
                      <div className="flex-shrink-0 text-center px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg min-w-[50px]">
                        <span className="text-[10px] text-slate-400 uppercase font-semibold block leading-tight">
                          Data
                        </span>
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                          {formatDayMonth(ev.date)}
                        </span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                            {ev.description}
                          </span>
                          {ev.isSimulation && (
                            <Badge className="bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-100 border-0 text-[9px] py-0 font-bold">
                              Simulação
                            </Badge>
                          )}
                          {ev.category && (
                            <span className="text-[10px] text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                              {ev.category}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400">{formatDate(ev.date)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 flex-shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                      <div className="text-left sm:text-right">
                        <span
                          className={`text-xs sm:text-sm font-extrabold tabular-nums block ${
                            isIncome ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {isIncome ? '+' : '−'}
                          {formatCurrency(ev.value, hideValues)}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {isIncome ? 'Entrada prevista' : 'Saída prevista'}
                        </span>
                      </div>

                      <div className="text-right pl-3 sm:border-l border-slate-200 dark:border-slate-800">
                        <div className="flex items-center gap-1">
                          <span className="text-[10px] text-slate-400">Saldo:</span>
                          <span
                            className={`text-xs sm:text-sm font-black tabular-nums ${
                              isNegativeAfter ? 'text-red-600' : 'text-emerald-600'
                            }`}
                          >
                            {formatCurrency(ev.runningBalance, hideValues)}
                          </span>
                        </div>
                        {isNegativeAfter && (
                          <span className="text-[9px] text-red-500 font-bold block">
                            ⚠️ Saldo negativo
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* SIMULADOR "E SE?" */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Calculator className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Simular Decisão ("E se?")
              </h3>
              <p className="text-xs text-slate-500">
                Teste o impacto de uma receita extra ou despesa antes de tomar uma decisão
                financeira
              </p>
            </div>
          </div>

          {projection.simulationApplied && (
            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 font-bold text-xs border-0">
              Simulação aplicada
            </Badge>
          )}
        </div>

        <form onSubmit={handleApplySimulation} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Campo Valor */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Valor (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="Ex: 2000.00"
                value={simValue}
                onChange={(e) => setSimValue(e.target.value)}
                className="h-10 rounded-xl font-bold text-xs"
                required
              />
            </div>

            {/* Campo Data */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Data do evento
              </label>
              <Input
                type="date"
                value={simDate}
                onChange={(e) => setSimDate(e.target.value)}
                className="h-10 rounded-xl font-bold text-xs"
                required
              />
            </div>

            {/* Toggle Receita extra / Despesa extra */}
            <div>
              <label className="text-xs font-semibold text-slate-600 dark:text-slate-300 block mb-1">
                Tipo da simulação
              </label>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl h-10">
                <button
                  type="button"
                  onClick={() => setSimType('income')}
                  className={`rounded-lg text-xs font-bold transition-all ${
                    simType === 'income'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  + Receita extra
                </button>
                <button
                  type="button"
                  onClick={() => setSimType('expense')}
                  className={`rounded-lg text-xs font-bold transition-all ${
                    simType === 'expense'
                      ? 'bg-red-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  − Despesa extra
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold h-9 px-4 gap-1.5"
            >
              <Calculator className="w-3.5 h-3.5" /> Simular
            </Button>
            {projection.simulationApplied && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearSimulation}
                className="rounded-xl text-xs font-semibold h-9 px-4"
              >
                Limpar simulação
              </Button>
            )}
          </div>
        </form>

        {/* Comparativo lado a lado pós-simulação */}
        {projection.simulationApplied && projection.originalSummary && (
          <div className="mt-5 p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 text-xs">
            <div className="font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Comparativo de Impacto no Saldo Final ({selectedDays} dias):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Saldo original previsto:</span>
                <span className="font-extrabold text-sm tabular-nums text-slate-800 dark:text-slate-200">
                  {formatCurrency(projection.originalSummary.projectedEndBalance, hideValues)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Novo saldo com simulação:</span>
                <span
                  className={`font-black text-sm tabular-nums ${
                    projection.isPositive ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {formatCurrency(projection.projectedEndBalance, hideValues)}
                </span>
              </div>
              <div className="bg-white dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Diferença líquida:</span>
                <span className="font-extrabold text-sm tabular-nums text-amber-600">
                  {activeSimulation?.type === 'income' ? '+' : '−'}
                  {formatCurrency(activeSimulation?.value || 0, hideValues)}
                </span>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
