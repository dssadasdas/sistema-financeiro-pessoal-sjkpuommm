import React, { useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/constants'
import { LoadingState, ErrorState } from '@/components/States'
import pb from '@/lib/pocketbase/client'
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  AlertTriangle,
  AlertCircle,
  Flame,
  ChevronRight,
  Sparkles,
  CheckCircle2,
  Plus,
  Eye,
  EyeOff,
  ShieldCheck,
  Activity,
  Calendar,
  CreditCard as CreditCardIcon,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { BANK_CONFIGS } from '@/lib/constants'
import { calculateCashFlowProjection } from '@/lib/projectionEngine'
import {
  calculateHealthScore,
  detectAnomalies,
  identifySavingsOpportunities,
  FinancialContextData,
} from '@/lib/anomalyDetector'
import { useSmartAlerts, getLevelConfig } from '@/components/CentralDeAlertas'
import { BankLogoIcon } from '@/components/BankLogoIcon'
import { Progress } from '@/components/ui/progress'

function DashboardUserAvatar({
  user,
  size = 'w-10 h-10',
  textSize = 'text-sm',
}: {
  user: {
    id?: string
    name?: string
    display_name?: string
    avatar?: string
    email?: string
  } | null
  size?: string
  textSize?: string
}) {
  const avatarUrl =
    user?.avatar && user?.id ? pb.files.getURL(user, user.avatar, { thumb: '100x100' }) : null

  const displayName = user?.display_name || user?.name || user?.email || 'U'
  const initials = displayName.trim().slice(0, 2).toUpperCase()

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${size} rounded-full object-cover border border-emerald-500/30 shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${size} rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold ${textSize} border border-emerald-500/30 shrink-0 select-none`}
    >
      {initials}
    </div>
  )
}

export default function DashboardPage() {
  const {
    totalCurrentBalance,
    monthIncomeReceived,
    monthExpensePaid,
    monthIncomePending,
    monthExpensePending,
    monthOpenInvoicesTotal,
    transactions,
    accounts,
    creditCards,
    invoices,
    bills,
    recurringBills,
    recurrences,
    installments,
    budgets,
    goals,
    investments,
    customCategories,
    isLoading,
    loadError,
    refreshAll,
  } = useFinance()

  const { user, hideValues, toggleHideValues } = useAuth()
  const navigate = useNavigate()

  // 1. Saudação dinâmica conforme horário + Nome do usuário
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'Bom dia'
    if (hour >= 12 && hour < 18) return 'Boa tarde'
    return 'Boa noite'
  }, [])

  const userName = useMemo(() => {
    if (!user?.name && !user?.display_name) return 'Usuário'
    return user.display_name || user.name
  }, [user?.name, user?.display_name])

  const currentMonthYear = useMemo(() => {
    const now = new Date()
    const month = now.toLocaleDateString('pt-BR', { month: 'long' })
    const year = now.getFullYear()
    return `${month.charAt(0).toUpperCase() + month.slice(1)} de ${year}`
  }, [])

  const currentMonthKey = useMemo(() => new Date().toISOString().slice(0, 7), [])

  // 2. Valores calculados dos 4 cards compactos
  // Entradas = soma de receitas do mês atual
  // Saídas = soma de despesas do mês atual
  // A pagar = contas a pagar pendentes
  // A receber = contas a receber pendentes
  const totalEntradasMes = monthIncomeReceived + monthIncomePending
  const totalSaidasMes = monthExpensePaid + monthExpensePending
  const totalAPagar = monthExpensePending
  const totalAReceber = monthIncomePending

  // 4. "Este mês": Receitas (realizadas/mês), Despesas (realizadas/mês), Resultado
  const mesReceitas = monthIncomeReceived
  const mesDespesas = monthExpensePaid
  const mesResultado = mesReceitas - mesDespesas
  const totalMovimentado = mesReceitas + mesDespesas
  const percentReceitas = totalMovimentado > 0 ? (mesReceitas / totalMovimentado) * 100 : 50

  // 5. Contexto Semeia IA (Saúde Financeira, Anomalias, Oportunidades)
  const iaContext: FinancialContextData = useMemo(
    () => ({
      accounts,
      transactions,
      bills,
      recurringBills,
      recurrences,
      installments,
      invoices,
      creditCards,
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
      installments,
      invoices,
      creditCards,
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
      installments,
      invoices,
      days: 30,
    })
  }, [accounts, transactions, bills, recurringBills, recurrences, installments, invoices])

  // 6. Central de Alertas (máx 2 prioritários)
  const allAlerts = useSmartAlerts()
  const top2Alerts = useMemo(() => allAlerts.slice(0, 2), [allAlerts])

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
    <div className="space-y-4 sm:space-y-5 pb-6">
      {/* ========================================================================= */}
      {/* 1. SAUDAÇÃO + SALDO DISPONÍVEL */}
      {/* ========================================================================= */}
      <Card className="rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          {/* Saudação e Usuário */}
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/perfil" className="shrink-0 hover:opacity-90 transition-opacity">
              <DashboardUserAvatar user={user} size="w-11 h-11" textSize="text-sm" />
            </Link>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-slate-900 dark:text-white truncate">
                {greeting}, {userName}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                {currentMonthYear}
              </p>
            </div>
          </div>

          {/* Saldo disponível com olho para ocultar/mostrar */}
          <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800/80">
            <div className="text-left sm:text-right">
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 block leading-tight">
                Saldo disponível
              </span>
              <div className="flex items-center gap-2 mt-0.5">
                <span
                  className={`text-xl sm:text-2xl md:text-3xl font-black tabular-nums tracking-tight ${
                    totalCurrentBalance >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCurrency(totalCurrentBalance, hideValues)}
                </span>
                <button
                  type="button"
                  onClick={toggleHideValues}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                  title={hideValues ? 'Mostrar saldo' : 'Ocultar saldo'}
                  aria-label={hideValues ? 'Mostrar saldo' : 'Ocultar saldo'}
                >
                  {hideValues ? (
                    <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" />
                  ) : (
                    <Eye className="w-4 h-4 sm:w-5 sm:h-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* ========================================================================= */}
      {/* 2. 4 CARDS COMPACTOS: ENTRADAS | SAÍDAS | A PAGAR | A RECEBER */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3">
        {/* ENTRADAS */}
        <Card
          onClick={() => navigate('/transacoes')}
          className="rounded-xl sm:rounded-2xl border-slate-200/90 dark:border-slate-800 p-3 sm:p-3.5 bg-white dark:bg-[#121A2B] shadow-2xs hover:shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all cursor-pointer flex flex-col justify-between min-w-0"
        >
          <div className="flex items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Entradas
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-base sm:text-lg md:text-xl font-black tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400 truncate">
            {formatCurrency(totalEntradasMes, hideValues)}
          </div>
        </Card>

        {/* SAÍDAS */}
        <Card
          onClick={() => navigate('/transacoes')}
          className="rounded-xl sm:rounded-2xl border-slate-200/90 dark:border-slate-800 p-3 sm:p-3.5 bg-white dark:bg-[#121A2B] shadow-2xs hover:shadow-sm hover:border-red-300 dark:hover:border-red-700/60 transition-all cursor-pointer flex flex-col justify-between min-w-0"
        >
          <div className="flex items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              Saídas
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
              <ArrowDownRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-base sm:text-lg md:text-xl font-black tabular-nums tracking-tight text-red-600 dark:text-red-400 truncate">
            {formatCurrency(totalSaidasMes, hideValues)}
          </div>
        </Card>

        {/* A PAGAR */}
        <Card
          onClick={() => navigate('/transacoes')}
          className="rounded-xl sm:rounded-2xl border-slate-200/90 dark:border-slate-800 p-3 sm:p-3.5 bg-white dark:bg-[#121A2B] shadow-2xs hover:shadow-sm hover:border-orange-300 dark:hover:border-orange-700/60 transition-all cursor-pointer flex flex-col justify-between min-w-0"
        >
          <div className="flex items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              A Pagar
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-orange-50 dark:bg-orange-950/50 text-orange-600 dark:text-orange-400 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-base sm:text-lg md:text-xl font-black tabular-nums tracking-tight text-orange-600 dark:text-orange-400 truncate">
            {formatCurrency(totalAPagar, hideValues)}
          </div>
        </Card>

        {/* A RECEBER */}
        <Card
          onClick={() => navigate('/transacoes')}
          className="rounded-xl sm:rounded-2xl border-slate-200/90 dark:border-slate-800 p-3 sm:p-3.5 bg-white dark:bg-[#121A2B] shadow-2xs hover:shadow-sm hover:border-blue-300 dark:hover:border-blue-700/60 transition-all cursor-pointer flex flex-col justify-between min-w-0"
        >
          <div className="flex items-center justify-between gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-1">
            <span className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
              A Receber
            </span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-base sm:text-lg md:text-xl font-black tabular-nums tracking-tight text-blue-600 dark:text-blue-400 truncate">
            {formatCurrency(totalAReceber, hideValues)}
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 3. SEÇÃO DE CARTÕES DE CRÉDITO */}
      {/* ========================================================================= */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2">
            <CreditCardIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">Cartões</h2>
            {creditCards.length > 0 && (
              <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0">
                {creditCards.length}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/cartoes')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-7 px-2 gap-0.5"
          >
            Ver todos →
          </Button>
        </div>

        {creditCards.length === 0 ? (
          <Card className="rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-2xs p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CreditCardIcon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Você ainda não cadastrou nenhum cartão
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Cadastre seus cartões para acompanhar faturas e limites.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => navigate('/cartoes')}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-8 px-3.5 gap-1.5 shadow-xs shrink-0 justify-center"
            >
              <Plus className="w-3.5 h-3.5" /> Cadastrar cartão
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
            {creditCards.map((card) => {
              const config = BANK_CONFIGS[card.bank] || BANK_CONFIGS['Outro']
              const brandLabel = card.brand || 'Crédito'
              const invoiceTotal = card.current_invoice_total || 0

              return (
                <Card
                  key={card.id}
                  onClick={() => navigate(`/cartoes/${card.id}`)}
                  className="rounded-xl sm:rounded-2xl border-slate-200/90 dark:border-slate-800 p-3.5 bg-white dark:bg-[#121A2B] shadow-2xs hover:shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700/60 transition-all cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <BankLogoIcon
                        bankName={card.bank}
                        size={28}
                        className="w-7 h-7 rounded-lg shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                          {card.name}
                        </p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {config.logoText || card.bank} • {brandLabel}
                          {card.last_four ? ` • •••• ${card.last_four}` : ''}
                        </p>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                  </div>

                  <div className="space-y-1.5 pt-1 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[10px] sm:text-[11px] uppercase font-bold text-slate-400">
                        Fatura atual
                      </span>
                      <span className="text-sm sm:text-base font-black tabular-nums tracking-tight text-slate-900 dark:text-white">
                        {formatCurrency(invoiceTotal, hideValues)}
                      </span>
                    </div>

                    {card.limit ? (
                      <div className="space-y-1">
                        <Progress
                          value={card.used_percentage || 0}
                          className="h-1.5 rounded-full"
                        />
                        <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium">
                          <span>Limite {formatCurrency(card.limit, hideValues)}</span>
                          <span>{card.used_percentage || 0}% usado</span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* 4. "ESTE MÊS" + 5. PREVISÃO & SAÚDE FINANCEIRA */}
      {/* Grid inteligente no desktop: 2 colunas lado a lado */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
        {/* 4. BLOCO COMPACTO "ESTE MÊS" */}
        <Card className="rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">Este mês</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/transacoes')}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-7 px-2 gap-0.5"
              >
                Ver relatório →
              </Button>
            </div>

            {/* Valores horizontais */}
            <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 text-center">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                  Receitas
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 tabular-nums block truncate mt-0.5">
                  {formatCurrency(mesReceitas, hideValues)}
                </span>
              </div>
              <div className="border-x border-slate-200/70 dark:border-slate-800">
                <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                  Despesas
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-red-600 dark:text-red-400 tabular-nums block truncate mt-0.5">
                  {formatCurrency(mesDespesas, hideValues)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                  Resultado
                </span>
                <span
                  className={`text-xs sm:text-sm font-black tabular-nums block truncate mt-0.5 ${
                    mesResultado >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {mesResultado >= 0 ? '+' : ''}
                  {formatCurrency(mesResultado, hideValues)}
                </span>
              </div>
            </div>

            {/* Barra visual pequena de proporção Receitas x Despesas */}
            <div className="mt-3 space-y-1">
              <div className="h-2 w-full rounded-full bg-red-200 dark:bg-red-950/60 overflow-hidden flex">
                <div
                  className="h-full bg-emerald-500 transition-all duration-500 rounded-l-full"
                  style={{ width: `${Math.min(100, Math.max(0, percentReceitas))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400 font-medium px-0.5">
                <span>
                  Receitas {totalMovimentado > 0 ? `${percentReceitas.toFixed(0)}%` : '0%'}
                </span>
                <span>
                  Despesas {totalMovimentado > 0 ? `${(100 - percentReceitas).toFixed(0)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* 5. PREVISÃO + SAÚDE FINANCEIRA (combinados em UMA área) */}
        <Card className="rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-xs p-4 sm:p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                  Previsão & Saúde
                </h2>
              </div>
              <Badge
                variant="outline"
                className={`text-[10px] font-bold border-0 px-2 py-0.5 ${
                  healthScore.level === 'excelente'
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300'
                    : healthScore.level === 'boa'
                      ? 'bg-green-100 text-green-800 dark:bg-green-950/80 dark:text-green-300'
                      : healthScore.level === 'atencao'
                        ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300'
                        : 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300'
                }`}
              >
                {healthScore.levelLabel}
              </Badge>
            </div>

            {/* Grid lado a lado: Previsão (esquerda) + Saúde (direita) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Lado esquerdo: Previsão */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  <span className="uppercase tracking-wider">Previsão</span>
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Hoje:</span>
                    <strong className="text-slate-800 dark:text-slate-200 tabular-nums">
                      {formatCurrency(forecast30.startingBalance, hideValues)}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">30 dias:</span>
                    <strong
                      className={`tabular-nums font-black ${
                        forecast30.isPositive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-red-600 dark:text-red-400'
                      }`}
                    >
                      {formatCurrency(forecast30.projectedEndBalance, hideValues)}
                    </strong>
                  </div>
                </div>
              </div>

              {/* Lado direito: Saúde Financeira */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">
                  <span className="uppercase tracking-wider">Saúde</span>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Score:</span>
                    <strong className="text-slate-900 dark:text-white tabular-nums font-black">
                      {healthScore.score}/100
                    </strong>
                  </div>
                  <div className="flex items-center justify-between truncate">
                    {forecast30.risk.hasRisk ? (
                      <span className="text-red-600 dark:text-red-400 font-bold text-[11px] flex items-center gap-1 truncate">
                        ⚠️ Risco{' '}
                        {forecast30.risk.firstNegativeDayLabel
                          ? `em ${forecast30.risk.firstNegativeDayLabel}`
                          : 'em 30 dias'}
                      </span>
                    ) : (
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[11px] flex items-center gap-1 truncate">
                        ✓ Fluxo saudável
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ========================================================================= */}
      {/* 6. ALERTAS PRIORITÁRIOS (máximo 2) */}
      {/* ========================================================================= */}
      <Card className="rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-xs p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Atenção
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
            onClick={() => navigate('/transacoes')}
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-7 px-2 gap-0.5"
          >
            Ver todos os alertas →
          </Button>
        </div>

        {top2Alerts.length === 0 ? (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200/60 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 text-xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">✓ Nenhum alerta prioritário no momento.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {top2Alerts.map((alert) => {
              const cfg = getLevelConfig(alert.level)
              return (
                <div
                  key={alert.id}
                  onClick={() => navigate(alert.targetPath)}
                  className={`p-3 rounded-xl border ${cfg.border} bg-white dark:bg-[#121A2B] hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2.5 group`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="shrink-0">
                      {alert.level === 'critical' ? (
                        <Flame className="w-4 h-4 text-red-600 dark:text-red-400" />
                      ) : alert.level === 'high' ? (
                        <AlertTriangle className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 text-xs">
                      <p className="font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 transition-colors">
                        ⚠ {alert.title}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {alert.value ? `${formatCurrency(alert.value)} — ` : ''}
                        {alert.badgeText ||
                          (alert.date ? formatDate(alert.date) : alert.description)}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* ========================================================================= */}
      {/* 7. SEMEIA IA — INSIGHT MAIS IMPORTANTE */}
      {/* ========================================================================= */}
      <Card className="rounded-2xl border-emerald-200/90 dark:border-emerald-800/80 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-slate-50 dark:from-emerald-950/40 dark:via-[#121A2B] dark:to-slate-900/40 shadow-xs p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-300 flex items-center gap-1">
                  SEMEIA IA ✦
                </span>
                {topPriorityInsight && 'priority' in topPriorityInsight && (
                  <Badge
                    variant="outline"
                    className="text-[9px] py-0 px-1.5 font-bold border-emerald-400 text-emerald-700 dark:text-emerald-300"
                  >
                    {topPriorityInsight.priority}
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 line-clamp-2">
                {topPriorityInsight ? (
                  <>
                    <strong className="font-bold text-slate-900 dark:text-white">
                      {topPriorityInsight.title}:{' '}
                    </strong>
                    <span className="text-slate-600 dark:text-slate-300 font-normal">
                      {topPriorityInsight.description}
                    </span>
                  </>
                ) : (
                  'Suas métricas e fluxo de caixa estão em ótimo equilíbrio neste mês.'
                )}
              </p>
            </div>
          </div>

          <Button
            size="sm"
            onClick={() => navigate('/ia-financeira')}
            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-8 px-3.5 gap-1 shadow-xs shrink-0 justify-center"
          >
            Ver análise →
          </Button>
        </div>
      </Card>
    </div>
  )
}
