import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { WeeklyAnalysis } from '@/types/finance'
import {
  generateWeeklySummary,
  WeeklyFinancialSummary,
  FinancialContextData,
} from '@/lib/anomalyDetector'
import { formatCurrency, formatDate } from '@/lib/constants'
import {
  FileText,
  Calendar,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Sparkles,
  Bot,
  RefreshCw,
  Clock,
  CheckCircle2,
  ChevronRight,
  ShieldAlert,
  HelpCircle,
  Copy,
  Check,
  Target,
  PiggyBank,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { LoadingState, ErrorState } from '@/components/States'
import { useToast } from '@/hooks/use-toast'

export default function WeeklyAnalysisPage() {
  const {
    accounts,
    transactions,
    bills,
    recurringBills,
    recurrences,
    installments,
    invoices,
    budgets,
    goals,
    investments,
    customCategories,
    isLoading,
    loadError,
    refreshAll,
  } = useFinance()
  const { user, hideValues } = useAuth()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'this-week' | 'prev-week' | 'history'>('this-week')
  const [historyList, setHistoryList] = useState<WeeklyAnalysis[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [copied, setCopied] = useState(false)

  const financialContext: FinancialContextData = useMemo(() => {
    return {
      accounts,
      transactions,
      bills,
      recurringBills,
      recurrences,
      installments,
      invoices,
      budgets,
      goals,
      investments,
      customCategories,
    }
  }, [
    accounts,
    transactions,
    bills,
    recurringBills,
    recurrences,
    installments,
    invoices,
    budgets,
    goals,
    investments,
    customCategories,
  ])

  // Resumo desta semana
  const thisWeekSummary = useMemo(() => {
    return generateWeeklySummary(financialContext, new Date())
  }, [financialContext])

  // Resumo da semana anterior
  const prevWeekSummary = useMemo(() => {
    const prevDate = new Date()
    prevDate.setDate(prevDate.getDate() - 7)
    return generateWeeklySummary(financialContext, prevDate)
  }, [financialContext])

  // Carrega histórico do PocketBase (apenas do usuário logado)
  const loadHistory = useCallback(async () => {
    if (!user) return
    setLoadingHistory(true)
    try {
      const records = await pb.collection('weekly_analyses').getFullList<WeeklyAnalysis>({
        filter: `user = "${user.id}"`,
        sort: '-week_start',
      })
      setHistoryList(records)
    } catch (err) {
      console.log('[WeeklyAnalysisPage] Erro ao carregar histórico:', err)
    } finally {
      setLoadingHistory(false)
    }
  }, [user])

  // Salva no PocketBase se ainda não salvo para esta semana (idempotente)
  const autoSaveThisWeekAnalysis = useCallback(async () => {
    if (!user || !thisWeekSummary) return
    try {
      // Checa se já existe registro para este week_start
      const existing = await pb.collection('weekly_analyses').getList(1, 1, {
        filter: `user = "${user.id}" && week_start = "${thisWeekSummary.weekStart}"`,
      })

      if (existing.totalItems === 0) {
        await pb.collection('weekly_analyses').create({
          user: user.id,
          week_start: thisWeekSummary.weekStart,
          week_end: thisWeekSummary.weekEnd,
          summary_json: thisWeekSummary,
        })
        loadHistory()
      }
    } catch (err) {
      console.log('[WeeklyAnalysisPage] autoSave falhou silenciosamente:', err)
    }
  }, [user, thisWeekSummary, loadHistory])

  useEffect(() => {
    if (user && !isLoading) {
      loadHistory()
      autoSaveThisWeekAnalysis()
    }
  }, [user, isLoading, loadHistory, autoSaveThisWeekAnalysis])

  const handleCopySummary = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    toast({
      title: 'Resumo copiado!',
      description: 'O texto do resumo financeiro foi copiado para sua área de transferência.',
    })
    setTimeout(() => setCopied(false), 2500)
  }

  if (isLoading) {
    return <LoadingState message="Gerando relatórios e resumos da semana..." />
  }

  if (loadError) {
    return (
      <ErrorState message="Não foi possível carregar os dados financeiros." onRetry={refreshAll} />
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Análises Semanais</h2>
            <Badge className="bg-emerald-500 text-white gap-1 text-[11px] font-bold py-0.5">
              <Sparkles className="w-3 h-3 fill-current" /> Semeia IA
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Resumos executivos automáticos de receitas, despesas, alertas e previsões de caixa
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as any)}
        className="w-full space-y-5"
      >
        <TabsList className="grid grid-cols-3 max-w-md bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl">
          <TabsTrigger value="this-week" className="rounded-lg text-xs font-semibold">
            Esta Semana
          </TabsTrigger>
          <TabsTrigger value="prev-week" className="rounded-lg text-xs font-semibold">
            Semana Anterior
          </TabsTrigger>
          <TabsTrigger value="history" className="rounded-lg text-xs font-semibold">
            Histórico ({historyList.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Esta Semana */}
        <TabsContent value="this-week" className="space-y-5">
          <WeeklySummaryView
            summary={thisWeekSummary}
            hideValues={hideValues}
            onCopy={() => handleCopySummary(thisWeekSummary.formattedSummaryText)}
            copied={copied}
          />
        </TabsContent>

        {/* Tab 2: Semana Anterior */}
        <TabsContent value="prev-week" className="space-y-5">
          <WeeklySummaryView
            summary={prevWeekSummary}
            hideValues={hideValues}
            onCopy={() => handleCopySummary(prevWeekSummary.formattedSummaryText)}
            copied={copied}
          />
        </TabsContent>

        {/* Tab 3: Histórico de Análises */}
        <TabsContent value="history" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-600" /> Histórico de Resumos Salvos
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={loadHistory}
              disabled={loadingHistory}
              className="text-xs h-8 rounded-xl"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loadingHistory ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>

          {historyList.length === 0 ? (
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-8 text-center bg-white dark:bg-[#121A2B]">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3 opacity-50" />
              <p className="font-bold text-sm text-slate-700 dark:text-slate-300">
                Nenhuma análise anterior registrada ainda
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Suas análises semanais são salvas automaticamente no banco de dados para consulta
                histórica.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {historyList.map((item) => {
                const s = item.summary_json as WeeklyFinancialSummary
                return (
                  <Card
                    key={item.id}
                    className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm hover:border-emerald-400 transition-all"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                      <div>
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Semana de {formatDate(item.week_start)} a {formatDate(item.week_end)}
                        </span>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          Gerado automaticamente em {formatDate(item.created)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          className={`text-xs font-bold border-0 ${
                            (s?.result || 0) >= 0
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300'
                              : 'bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300'
                          }`}
                        >
                          Resultado: {(s?.result || 0) >= 0 ? '+' : ''}
                          {formatCurrency(s?.result || 0, hideValues)}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopySummary(s?.formattedSummaryText || '')}
                          className="text-xs h-7 px-2 text-slate-500"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mb-3">
                      <div>
                        <span className="text-slate-400">Entradas:</span>
                        <div className="font-bold text-emerald-600">
                          +{formatCurrency(s?.income || 0, hideValues)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Saídas:</span>
                        <div className="font-bold text-orange-600">
                          −{formatCurrency(s?.expense || 0, hideValues)}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Maior Gasto:</span>
                        <div className="font-bold text-slate-700 dark:text-slate-300 truncate">
                          {s?.topExpenseCategory?.category || 'N/A'}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400">Variação vs anterior:</span>
                        <div className="font-bold text-slate-700 dark:text-slate-300">
                          Despesas {s?.expenseVariationPct >= 0 ? '↑' : '↓'}{' '}
                          {Math.abs(s?.expenseVariationPct || 0).toFixed(1)}%
                        </div>
                      </div>
                    </div>

                    {s?.aiInsightText && (
                      <div className="p-3 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/20 text-xs text-slate-700 dark:text-slate-200 border border-emerald-100 dark:border-emerald-900/40">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400">
                          Insight:
                        </span>{' '}
                        {s.aiInsightText}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function WeeklySummaryView({
  summary,
  hideValues,
  onCopy,
  copied,
}: {
  summary: WeeklyFinancialSummary
  hideValues?: boolean
  onCopy: () => void
  copied: boolean
}) {
  return (
    <div className="space-y-5">
      {/* Bloco Destaque Formato Resumo */}
      <Card className="rounded-2xl border-emerald-200 dark:border-emerald-800/80 bg-gradient-to-br from-white via-emerald-50/20 to-teal-50/30 dark:from-[#121A2B] dark:via-[#121A2B] dark:to-emerald-950/20 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-emerald-100 dark:border-emerald-900/40">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Resumo da Semana
              </span>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                {summary.weekLabel}
              </h3>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={onCopy}
            className="text-xs font-semibold rounded-xl gap-1.5 self-start sm:self-auto"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" /> Copiado!
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" /> Copiar Resumo
              </>
            )}
          </Button>
        </div>

        {/* 3 Métricas Principais */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-5">
          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1 gap-1">
                <span className="whitespace-nowrap truncate font-semibold">Entrou na Semana</span>
                <ArrowUpRight className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums whitespace-nowrap truncate mt-1">
                +{formatCurrency(summary.income, hideValues)}
              </div>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block whitespace-nowrap truncate">
              vs semana anterior ({summary.incomeVariationPct >= 0 ? '+' : ''}
              {summary.incomeVariationPct.toFixed(1)}%)
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1 gap-1">
                <span className="whitespace-nowrap truncate font-semibold">Saiu na Semana</span>
                <ArrowDownRight className="w-4 h-4 text-orange-600 flex-shrink-0" />
              </div>
              <div className="text-xl sm:text-2xl font-black text-orange-600 tabular-nums whitespace-nowrap truncate mt-1">
                −{formatCurrency(summary.expense, hideValues)}
              </div>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block whitespace-nowrap truncate">
              Despesas {summary.expenseVariationPct >= 0 ? '↑' : '↓'}{' '}
              {Math.abs(summary.expenseVariationPct).toFixed(1)}% vs anterior
            </span>
          </div>

          <div className="p-4 rounded-xl bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between text-xs text-slate-500 mb-1 gap-1">
                <span className="whitespace-nowrap truncate font-semibold">Resultado Líquido</span>
                <TrendingUp className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              </div>
              <div
                className={`text-xl sm:text-2xl font-black tabular-nums whitespace-nowrap truncate mt-1 ${
                  summary.result >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {summary.result >= 0 ? '+' : ''}
                {formatCurrency(summary.result, hideValues)}
              </div>
            </div>
            <span className="text-[11px] text-slate-400 mt-2 block whitespace-nowrap truncate">
              {summary.result >= 0 ? 'Fechamento positivo' : 'Déficit no período'}
            </span>
          </div>
        </div>

        {/* Resumo Formatado Executivo */}
        <div className="p-4 rounded-xl bg-slate-900 text-slate-100 dark:bg-slate-950 font-mono text-xs leading-relaxed overflow-x-auto space-y-2">
          <div className="text-emerald-400 font-bold">RESUMO DA SEMANA ({summary.weekLabel})</div>
          <div>
            Entrou: {formatCurrency(summary.income, hideValues)} | Saiu:{' '}
            {formatCurrency(summary.expense, hideValues)} | Resultado:{' '}
            <span className={summary.result >= 0 ? 'text-emerald-400' : 'text-red-400'}>
              {summary.result >= 0 ? '+' : ''}
              {formatCurrency(summary.result, hideValues)}
            </span>
          </div>
          <div>
            Comparado à semana anterior: Despesas {summary.expenseVariationPct >= 0 ? '↑' : '↓'}{' '}
            {Math.abs(summary.expenseVariationPct).toFixed(1)}%
          </div>
          <div>
            MAIOR GASTO:{' '}
            {summary.topExpenseCategory
              ? `${summary.topExpenseCategory.category} — ${formatCurrency(
                  summary.topExpenseCategory.value,
                  hideValues,
                )} (${summary.topExpenseCategory.percentage.toFixed(0)}% do total)`
              : 'Nenhum gasto registrado'}
          </div>
          <div>
            ATENÇÃO:{' '}
            {summary.upcomingWeekBills.length > 0
              ? `${summary.upcomingWeekBills.length} conta(s) a pagar na próxima semana (${formatCurrency(
                  summary.upcomingWeekBills.reduce((acc, b) => acc + b.value, 0),
                  hideValues,
                )}).`
              : summary.upcomingInvoices.length > 0
                ? `Fatura ${summary.upcomingInvoices[0].cardName} de ${formatCurrency(
                    summary.upcomingInvoices[0].total,
                    hideValues,
                  )} próxima.`
                : 'Sem pendências críticas para a próxima semana.'}
          </div>
          <div>
            PREVISÃO: {summary.cashForecast30d.isPositive ? 'Caixa saudável' : 'Alerta de déficit'}{' '}
            ({formatCurrency(summary.cashForecast30d.projectedBalance, hideValues)} em 30d)
          </div>
          <div className="text-emerald-300 font-sans pt-1">
            <strong>INSIGHT SEMEIA:</strong> {summary.aiInsightText}
          </div>
        </div>
      </Card>

      {/* Grid de Detalhes da Semana */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Maior despesa individual & Categoria em alta */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm space-y-4">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-orange-600" /> Destaques de Gastos da Semana
          </h4>

          {summary.biggestIndividualExpense && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400">
                  Maior Despesa Individual
                </span>
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                  {summary.biggestIndividualExpense.description}
                </div>
                <div className="text-[10px] text-slate-400">
                  {formatDate(summary.biggestIndividualExpense.date)} •{' '}
                  {summary.biggestIndividualExpense.category || 'Geral'}
                </div>
              </div>
              <div className="text-sm font-black text-orange-600 tabular-nums">
                {formatCurrency(summary.biggestIndividualExpense.value, hideValues)}
              </div>
            </div>
          )}

          {summary.fastestGrowingCategory ? (
            <div className="p-3.5 rounded-xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-amber-700 dark:text-amber-400">
                  Categoria que mais aumentou
                </span>
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200 mt-0.5">
                  {summary.fastestGrowingCategory.category}
                </div>
                <div className="text-[10px] text-slate-400">
                  Atual: {formatCurrency(summary.fastestGrowingCategory.current, hideValues)} vs
                  Anterior: {formatCurrency(summary.fastestGrowingCategory.previous, hideValues)}
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-bold text-xs">
                +{summary.fastestGrowingCategory.pct.toFixed(0)}%
              </Badge>
            </div>
          ) : (
            <div className="text-xs text-slate-400 py-3 text-center">
              Nenhuma categoria com aumento relevante vs semana anterior.
            </div>
          )}
        </Card>

        {/* Contas Importantes da Próxima Semana */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" /> Contas da Próxima Semana
            </h4>
            <Badge variant="outline" className="text-xs">
              {summary.upcomingWeekBills.length} item(ns)
            </Badge>
          </div>

          {summary.upcomingWeekBills.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center flex flex-col items-center gap-1">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              <span>Nenhum vencimento previsto para os próximos 7 dias.</span>
            </div>
          ) : (
            <div className="space-y-2">
              {summary.upcomingWeekBills.map((b, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200">
                      {b.description}
                    </div>
                    <div className="text-[10px] text-slate-400">
                      Vence em {formatDate(b.dueDate)}
                    </div>
                  </div>
                  <div
                    className={`font-bold tabular-nums ${
                      b.type === 'receber' ? 'text-emerald-600' : 'text-orange-600'
                    }`}
                  >
                    {b.type === 'receber' ? '+' : '−'}
                    {formatCurrency(b.value, hideValues)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
