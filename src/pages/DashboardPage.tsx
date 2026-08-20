import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/constants'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CreditCard as CreditCardIcon,
  AlertTriangle,
  AlertCircle,
  Flame,
  Info,
  ChevronRight,
  Sparkles,
  FileText,
  Target,
  CheckCircle2,
  Lock,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { calculateCashFlowProjection } from '@/lib/projectionEngine'
import { calculateMonthlyComparative } from '@/lib/dreEngine'
import {
  calculateHealthScore,
  detectAnomalies,
  identifySavingsOpportunities,
  FinancialContextData,
} from '@/lib/anomalyDetector'
import { useSmartAlerts, AlertLevel, getLevelConfig } from '@/components/CentralDeAlertas'

export default function DashboardPage() {
  const {
    totalCurrentBalance,
    monthIncomeReceived,
    monthExpensePaid,
    monthIncomePending,
    monthExpensePending,
    monthOpenInvoicesTotal,
    transactions,
    goals,
    bills,
    accounts,
    investments,
    budgets,
    recurringBills,
    recurrences,
    installments: financeInstallments,
    invoices,
    customCategories,
    isLoading,
    loadError,
    refreshAll,
  } = useFinance()

  const { user, hideValues } = useAuth()
  const navigate = useNavigate()

  // 1. Saudação dinâmica conforme horário + Nome do usuário
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'Bom dia'
    if (hour >= 12 && hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [])

  const userName = useMemo(() => {
    if (!user?.name) return 'Usuário'
    return user.name
  }, [user?.name])

  // Data por extenso capitalizada: "Agosto de 2026"
  const currentMonthYear = useMemo(() => {
    const now = new Date()
    const month = now.toLocaleDateString('pt-BR', { month: 'long' })
    const year = now.getFullYear()
    return `${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`
  }, [])

  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), [])

  // 2. Contas a pagar e receber do mês vindas da coleção bills
  const monthBillsToPay = useMemo(() => {
    return bills
      .filter(
        (b) =>
          (b.type || 'pagar') === 'pagar' &&
          b.status !== 'pago' &&
          (b.due_date || '').slice(0, 7) === currentMonthKey,
      )
      .reduce((acc, b) => acc + Number(b.value || 0), 0)
  }, [bills, currentMonthKey])

  const monthBillsToReceive = useMemo(() => {
    return bills
      .filter(
        (b) =>
          b.type === 'receber' &&
          b.status !== 'pago' &&
          (b.due_date || '').slice(0, 7) === currentMonthKey,
      )
      .reduce((acc, b) => acc + Number(b.value || 0), 0)
  }, [bills, currentMonthKey])

  // Valores calculados dos cards
  const totalAReceber = monthIncomePending + monthBillsToReceive
  const totalAPagar = monthBillsToPay + monthExpensePending
  const totalFaturasAbertas = monthOpenInvoicesTotal
  const totalComprometido = totalAPagar + totalFaturasAbertas

  // 3. Central de Alertas (máx 2)
  const allAlerts = useSmartAlerts()
  const topAlerts = useMemo(() => allAlerts.slice(0, 2), [allAlerts])

  // 4. Semeia IA (Saúde Financeira e Insights)
  const iaContext: FinancialContextData = useMemo(
    () => ({
      accounts,
      transactions,
      bills,
      recurringBills,
      recurrences,
      installments: financeInstallments,
      invoices,
      budgets,
      goals,
      investments,
      customCategories,
      currentMonthKey,
    }),
    [
      accounts,
      transactions,
      bills,
      recurringBills,
      recurrences,
      financeInstallments,
      invoices,
      budgets,
      goals,
      investments,
      customCategories,
      currentMonthKey,
    ],
  )

  const healthScore = useMemo(
    () => calculateHealthScore(iaContext, currentMonthKey),
    [iaContext, currentMonthKey],
  )

  const { anomalies } = useMemo(
    () => detectAnomalies(iaContext, currentMonthKey),
    [iaContext, currentMonthKey],
  )

  const opportunities = useMemo(() => identifySavingsOpportunities(iaContext), [iaContext])
  const topPriorityInsight = anomalies[0] || opportunities[0] || null

  // 5. Previsão 30 dias (Fluxo de Caixa)
  const forecast30 = useMemo(() => {
    return calculateCashFlowProjection({
      accounts,
      transactions,
      bills,
      recurringBills,
      recurrences,
      installments: financeInstallments,
      invoices,
      days: 30,
    })
  }, [accounts, transactions, bills, recurringBills, recurrences, financeInstallments, invoices])

  // 6. Resultado do Mês (DRE & Comparativo)
  const monthDreComp = useMemo(() => {
    return calculateMonthlyComparative(transactions, currentMonthKey, customCategories)
  }, [transactions, currentMonthKey, customCategories])

  // Metas (compacto)
  const topGoals = useMemo(() => goals.slice(0, 3), [goals])

  if (isLoading) {
    return <LoadingState message="Carregando seu resumo financeiro..." />
  }

  if (loadError) {
    return (
      <ErrorState
        message="Não foi possível carregar seus dados financeiros do servidor. Verifique sua conexão e tente novamente."
        onRetry={refreshAll}
      />
    )
  }

  return (
    <div className="space-y-8 pb-10">
      {/* 1. CABEÇALHO COM SAUDAÇÃO */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-1">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            {greeting}, {userName}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">
            {currentMonthYear}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 text-xs font-semibold text-emerald-700 dark:text-emerald-300 shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Atualizado</span>
          </div>
        </div>
      </div>

      {/* 2. CARDS PRINCIPAIS DE RESUMO */}
      <div className="space-y-4">
        {/* PRIMEIRA LINHA (3 cards) */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1: Saldo disponível */}
          <Card
            onClick={() => navigate('/contas')}
            className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer bg-white dark:bg-[#121A2B] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Saldo disponível
              </span>
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                  totalCurrentBalance >= 0
                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                    : 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                }`}
              >
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div
                className={`text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight ${
                  totalCurrentBalance >= 0
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-red-600 dark:text-red-400'
                }`}
              >
                {formatCurrency(totalCurrentBalance, hideValues)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Consolidado em todas as contas</p>
            </div>
          </Card>

          {/* Card 2: Recebido */}
          <Card
            onClick={() => navigate('/transacoes')}
            className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer bg-white dark:bg-[#121A2B] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Recebido</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center">
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                +{formatCurrency(monthIncomeReceived, hideValues)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Receitas pagas no mês</p>
            </div>
          </Card>

          {/* Card 3: Gastos pagos */}
          <Card
            onClick={() => navigate('/transacoes')}
            className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-md transition-all cursor-pointer bg-white dark:bg-[#121A2B] flex flex-col justify-between md:col-span-2 lg:col-span-1"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Gastos pagos</span>
              <div className="w-8 h-8 rounded-xl bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center">
                <ArrowDownRight className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold tabular-nums tracking-tight text-red-600 dark:text-red-400">
                −{formatCurrency(monthExpensePaid, hideValues)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Despesas pagas no mês</p>
            </div>
          </Card>
        </div>

        {/* SEGUNDA LINHA (4 cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: A receber */}
          <Card
            onClick={() => navigate('/transacoes')}
            className="rounded-2xl border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer bg-white dark:bg-[#121A2B] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">A receber</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-blue-600 dark:text-blue-400">
                {formatCurrency(totalAReceber, hideValues)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Pendentes / previstos</p>
            </div>
          </Card>

          {/* Card 2: A pagar */}
          <Card
            onClick={() => navigate('/contas-a-pagar')}
            className="rounded-2xl border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer bg-white dark:bg-[#121A2B] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">A pagar</span>
              <div className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400 flex items-center justify-center">
                <Clock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-orange-600 dark:text-orange-400">
                {formatCurrency(totalAPagar, hideValues)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Boletos e contas pendentes</p>
            </div>
          </Card>

          {/* Card 3: Faturas abertas */}
          <Card
            onClick={() => navigate('/cartoes')}
            className="rounded-2xl border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer bg-white dark:bg-[#121A2B] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                Faturas abertas
              </span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950/50 dark:text-purple-400 flex items-center justify-center">
                <CreditCardIcon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-purple-600 dark:text-purple-400">
                {formatCurrency(totalFaturasAbertas, hideValues)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Cartões de crédito</p>
            </div>
          </Card>

          {/* Card 4: Comprometido */}
          <Card
            onClick={() => navigate('/contas-a-pagar')}
            className="rounded-2xl border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs hover:shadow-md transition-all cursor-pointer bg-white dark:bg-[#121A2B] flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
              <span className="font-semibold text-slate-600 dark:text-slate-300">Comprometido</span>
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400 flex items-center justify-center">
                <Lock className="w-3.5 h-3.5" />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold tabular-nums tracking-tight text-red-600 dark:text-red-400">
                {formatCurrency(totalComprometido, hideValues)}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">A pagar + faturas abertas</p>
            </div>
          </Card>
        </div>
      </div>

      {/* 3. SEÇÃO DE ALERTAS (compacta) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Alertas Importantes
            </h2>
            {allAlerts.length > 0 && (
              <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">
                {allAlerts.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/contas-a-pagar')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-8 px-2.5 gap-1"
          >
            Ver todos os alertas <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        {topAlerts.length === 0 ? (
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-[#121A2B] shadow-xs flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Nenhum alerta crítico no momento
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                Suas contas, faturas e limites estão em dia e sob controle.
              </p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {topAlerts.map((alert) => {
              const cfg = getLevelConfig(alert.level)
              const isRisk = alert.level === 'critical' || alert.id.includes('forecast-negative')
              return (
                <div
                  key={alert.id}
                  onClick={() => navigate(alert.targetPath)}
                  className={`p-4 rounded-2xl border ${cfg.border} bg-white dark:bg-[#121A2B] hover:shadow-md transition-all cursor-pointer flex items-start justify-between gap-3 group ${
                    isRisk ? 'ring-1 ring-red-500/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className="mt-0.5 shrink-0">
                      {alert.level === 'critical' ? (
                        <Flame className="w-4 h-4 text-red-600 dark:text-red-400" />
                      ) : alert.level === 'high' ? (
                        <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      ) : alert.level === 'warning' ? (
                        <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      ) : (
                        <Info className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="font-bold text-xs text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">
                          {alert.title}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] py-0 px-1.5 font-bold ${cfg.badge}`}
                        >
                          {cfg.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2">
                        {alert.description}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-white group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 4. WIDGET "SEMEIA IA" */}
      <Card className="rounded-2xl border-emerald-200 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-50 dark:from-emerald-950/40 dark:via-[#121A2B] dark:to-slate-900/40 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-1 min-w-0">
            {/* Health Score Pill */}
            <div className="flex items-center gap-3.5 bg-white dark:bg-slate-900/90 border border-emerald-200/80 dark:border-emerald-900/60 rounded-2xl px-4 py-2.5 shadow-2xs shrink-0">
              <div className="flex flex-col justify-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 whitespace-nowrap leading-none mb-1">
                  Saúde Financeira
                </span>
                <div
                  className={`text-2xl font-black tabular-nums leading-none flex items-baseline gap-0.5 ${healthScore.color}`}
                >
                  <span>{healthScore.score}</span>
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                    /100
                  </span>
                </div>
              </div>
              <Badge
                className={`text-[11px] font-bold border-0 capitalize py-1 px-2.5 shrink-0 whitespace-nowrap self-center shadow-none ${
                  healthScore.level === 'excelente'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/80 dark:text-emerald-200'
                    : healthScore.level === 'boa'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/80 dark:text-green-200'
                      : healthScore.level === 'atencao'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/80 dark:text-amber-200'
                        : 'bg-red-100 text-red-800 dark:bg-red-900/80 dark:text-red-200'
                }`}
              >
                {healthScore.levelLabel}
              </Badge>
            </div>

            {/* Insight prioritário (máx 1) */}
            <div className="min-w-0 flex-1 text-xs">
              {topPriorityInsight ? (
                <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 min-w-0">
                  <Badge
                    variant="outline"
                    className="text-[10px] font-bold shrink-0 whitespace-nowrap px-2 py-0.5 border-emerald-500/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                  >
                    {'priority' in topPriorityInsight ? topPriorityInsight.priority : 'INSIGHT'}
                  </Badge>
                  <span className="font-semibold shrink-0 whitespace-nowrap text-slate-900 dark:text-white">
                    {topPriorityInsight.title}:
                  </span>
                  <span className="text-slate-600 dark:text-slate-300 truncate font-normal">
                    {topPriorityInsight.description}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 min-w-0">
                  <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border-0 text-[10px] font-bold shrink-0 whitespace-nowrap px-2 py-0.5">
                    POSITIVO
                  </Badge>
                  <span className="truncate font-medium">
                    Suas métricas financeiras e fluxo de caixa estão em ótimo equilíbrio.
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-end lg:self-center justify-end shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-emerald-100/50 dark:border-emerald-900/30">
            <Button
              size="sm"
              onClick={() => navigate('/analises')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-9 px-4 gap-1.5 shadow-xs whitespace-nowrap"
            >
              Ver análise completa <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 5 & 6. GRID WIDGETS: PREVISÃO 30 DIAS + RESULTADO DO MÊS (2 colunas desktop, 1 mobile) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* WIDGET PREVISÃO 30 DIAS (compacto) */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs p-5 bg-white dark:bg-[#121A2B] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                    forecast30.risk.hasRisk
                      ? 'bg-red-50 text-red-600 dark:bg-red-950/50 dark:text-red-400'
                      : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400'
                  }`}
                >
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Previsão 30 dias
                  </h3>
                  <p className="text-[11px] text-slate-400">Fluxo de caixa projetado</p>
                </div>
              </div>

              <Badge
                className={`text-[10px] font-bold border-0 ${
                  forecast30.risk.hasRisk
                    ? 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                }`}
              >
                {forecast30.risk.hasRisk ? '⚠️ Risco de Caixa' : '✅ Saudável'}
              </Badge>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3.5 flex items-center justify-between gap-4 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                  Saldo Atual
                </span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                  {formatCurrency(forecast30.startingBalance, hideValues)}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                  Saldo Projetado (30d)
                </span>
                <span
                  className={`text-sm font-extrabold tabular-nums ${
                    forecast30.isPositive
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(forecast30.projectedEndBalance, hideValues)}
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/previsao')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-8 px-3 gap-1"
            >
              Ver previsão completa <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>

        {/* WIDGET RESULTADO DO MÊS (compacto) */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-xs p-5 bg-white dark:bg-[#121A2B] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 flex items-center justify-center font-bold shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Resultado do Mês
                  </h3>
                  <p className="text-[11px] text-slate-400">{monthDreComp.currentMonthLabel}</p>
                </div>
              </div>

              <Badge
                className={`text-[10px] font-bold border-0 ${
                  monthDreComp.resultCurrent >= 0
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                }`}
              >
                {monthDreComp.resultCurrent >= 0 ? 'Lucro Líquido' : 'Déficit'}
              </Badge>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-xl p-3.5 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                  Receitas
                </span>
                <span className="text-xs sm:text-sm font-bold text-emerald-600 tabular-nums">
                  +{formatCurrency(monthDreComp.incomeCurrent, hideValues)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                  Despesas
                </span>
                <span className="text-xs sm:text-sm font-bold text-red-600 tabular-nums">
                  −{formatCurrency(monthDreComp.expenseCurrent, hideValues)}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">
                  Resultado
                </span>
                <span
                  className={`text-xs sm:text-sm font-extrabold tabular-nums ${
                    monthDreComp.resultCurrent >= 0 ? 'text-emerald-600' : 'text-red-600'
                  }`}
                >
                  {monthDreComp.resultCurrent >= 0 ? '+' : ''}
                  {formatCurrency(monthDreComp.resultCurrent, hideValues)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 px-1">
              <span>vs. Mês anterior:</span>
              <span
                className={`font-bold tabular-nums ${
                  monthDreComp.resultDiff >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {monthDreComp.resultDiff >= 0 ? '+' : ''}
                {monthDreComp.resultVariationPct.toFixed(1)}% (
                {monthDreComp.resultDiff >= 0 ? '+' : ''}
                {formatCurrency(monthDreComp.resultDiff, hideValues)})
              </span>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-end">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => navigate('/dre')}
              className="text-xs font-bold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-8 px-3 gap-1"
            >
              Ver relatório completo <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </Card>
      </div>

      {/* METAS (compacto, mantido se existirem) */}
      {topGoals.length > 0 && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 shadow-xs bg-white dark:bg-[#121A2B]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-400 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                Metas Financeiras
              </h3>
            </div>
            <Link to="/metas" className="text-xs text-emerald-600 font-semibold hover:underline">
              Ver todas
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topGoals.map((g) => (
              <div
                key={g.id}
                onClick={() => navigate('/metas')}
                className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 hover:bg-slate-100/80 dark:hover:bg-slate-900/80 transition-all cursor-pointer space-y-2"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-800 dark:text-slate-200 truncate pr-2">
                    {g.name}
                  </span>
                  <span className="font-bold text-emerald-600 tabular-nums">{g.percentage}%</span>
                </div>
                <Progress value={g.percentage} className="h-1.5 rounded-full" />
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="tabular-nums">{formatCurrency(g.accumulated, hideValues)}</span>
                  <span className="tabular-nums">
                    Meta: {formatCurrency(g.target_value, hideValues)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
