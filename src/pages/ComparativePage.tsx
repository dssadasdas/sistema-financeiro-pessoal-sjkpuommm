import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatMonthYear } from '@/lib/constants'
import {
  calculateMonthlyComparative,
  calculateComparativeHistory,
  MonthlyComparative,
} from '@/lib/dreEngine'
import { exportComparativePdf } from '@/lib/pdfExporter'
import { LoadingState, ErrorState } from '@/components/States'
import {
  ArrowLeftRight,
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart as PieIcon,
  BarChart2,
  Info,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts'
import { useChartTheme } from '@/hooks/use-chart-theme'

export default function ComparativePage() {
  const { transactions, customCategories, isLoading, loadError, refreshAll } = useFinance()
  const { user, hideValues } = useAuth()
  const { toast } = useToast()
  const chartTheme = useChartTheme()

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [historyPeriod, setHistoryPeriod] = useState<6 | 12>(6)

  // Comparativo Mês Atual vs Anterior
  const comp = useMemo<MonthlyComparative>(() => {
    return calculateMonthlyComparative(transactions, selectedMonth, customCategories)
  }, [transactions, selectedMonth, customCategories])

  // Histórico para gráficos (6 ou 12 meses)
  const historyData = useMemo(() => {
    return calculateComparativeHistory(transactions, selectedMonth, historyPeriod, customCategories)
  }, [transactions, selectedMonth, historyPeriod, customCategories])

  const handleExportPdf = () => {
    exportComparativePdf(comp, user?.name || 'Usuário')
    toast({
      title: 'Comparativo Exportado',
      description: 'Relatório em PDF gerado com sucesso para impressão/download.',
    })
  }

  if (isLoading) {
    return <LoadingState message="Calculando comparativo mensal e histórico..." />
  }

  if (loadError) {
    return (
      <ErrorState
        message="Não foi possível carregar os dados para o comparativo."
        onRetry={refreshAll}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              Comparativo Mensal
            </h2>
            <Badge className="bg-indigo-600 text-white gap-1 text-[11px] font-bold py-0.5">
              <ArrowLeftRight className="w-3 h-3" /> Mês a Mês
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Análise evolutiva entre <strong>{comp.currentMonthLabel}</strong> e{' '}
            <strong>{comp.previousMonthLabel}</strong> com histórico de 6 e 12 meses.
          </p>
        </div>

        {/* Seleção do Mês + Exportar PDF */}
        <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 w-36 rounded-xl font-bold text-xs"
          />

          <Button
            onClick={handleExportPdf}
            variant="outline"
            size="sm"
            className="h-9 rounded-xl font-bold text-xs gap-1.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
          >
            <Download className="w-3.5 h-3.5 text-indigo-600" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Box de Insights Automáticos (Matemáticos, 100% Reais) */}
      {comp.insights.length > 0 && (
        <Card className="rounded-2xl border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/40 dark:bg-indigo-950/20 p-4 sm:p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-2.5">
            <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs sm:text-sm font-bold text-indigo-950 dark:text-indigo-200 uppercase tracking-wider">
              Insights Automáticos do Período
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs sm:text-[13px] text-indigo-900 dark:text-indigo-300">
            {comp.insights.map((ins, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0 mt-0.5" />
                <span>{ins}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 3 Cards de Comparativo: Receitas / Despesas / Resultado */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 1. Receitas */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap block">
              Receitas
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-1 whitespace-nowrap truncate">
              {formatCurrency(comp.incomeCurrent, hideValues)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
            <div className="flex items-center justify-between text-slate-500 gap-1">
              <span className="truncate">{comp.previousMonthLabel}:</span>
              <span className="font-semibold whitespace-nowrap">
                {formatCurrency(comp.incomePrevious, hideValues)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="whitespace-nowrap">Variação:</span>
              <span
                className={`font-bold flex items-center gap-0.5 whitespace-nowrap truncate ${
                  comp.incomeDiff >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {comp.incomeDiff >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                {comp.incomeDiff >= 0 ? '+' : ''}
                {formatCurrency(comp.incomeDiff, hideValues)} (
                {comp.incomeVariationPct >= 0 ? '+' : ''}
                {comp.incomeVariationPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </Card>

        {/* 2. Despesas */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap block">
              Despesas Totais
            </span>
            <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-1 whitespace-nowrap truncate">
              {formatCurrency(comp.expenseCurrent, hideValues)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
            <div className="flex items-center justify-between text-slate-500 gap-1">
              <span className="truncate">{comp.previousMonthLabel}:</span>
              <span className="font-semibold whitespace-nowrap">
                {formatCurrency(comp.expensePrevious, hideValues)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="whitespace-nowrap">Variação:</span>
              <span
                className={`font-bold flex items-center gap-0.5 whitespace-nowrap truncate ${
                  comp.expenseDiff <= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {comp.expenseDiff > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                {comp.expenseDiff >= 0 ? '+' : ''}
                {formatCurrency(comp.expenseDiff, hideValues)} (
                {comp.expenseVariationPct >= 0 ? '+' : ''}
                {comp.expenseVariationPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </Card>

        {/* 3. Resultado Líquido */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider whitespace-nowrap block">
              Resultado Líquido
            </span>
            <div
              className={`text-xl sm:text-2xl font-black tabular-nums mt-1 whitespace-nowrap truncate ${
                comp.resultCurrent >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {comp.resultCurrent >= 0 ? '+' : ''}
              {formatCurrency(comp.resultCurrent, hideValues)}
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1 text-xs">
            <div className="flex items-center justify-between text-slate-500 gap-1">
              <span className="truncate">{comp.previousMonthLabel}:</span>
              <span className="font-semibold whitespace-nowrap">
                {formatCurrency(comp.resultPrevious, hideValues)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="whitespace-nowrap">Variação:</span>
              <span
                className={`font-bold flex items-center gap-0.5 whitespace-nowrap truncate ${
                  comp.resultDiff >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {comp.resultDiff >= 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5 flex-shrink-0" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 flex-shrink-0" />
                )}
                {comp.resultDiff >= 0 ? '+' : ''}
                {formatCurrency(comp.resultDiff, hideValues)} (
                {comp.resultVariationPct >= 0 ? '+' : ''}
                {comp.resultVariationPct.toFixed(1)}%)
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Destaques de Categorias: Maior Gasto, Que Mais Cresceu, Que Mais Caiu */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Categoria com maior gasto */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-[#121A2B] shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            Maior Despesa do Mês
          </span>
          {comp.topExpenseCategory ? (
            <div className="mt-2">
              <span className="text-base font-bold text-slate-900 dark:text-white block truncate">
                {comp.topExpenseCategory.category}
              </span>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="font-mono text-red-600 font-bold">
                  {formatCurrency(comp.topExpenseCategory.value, hideValues)}
                </span>
                <Badge variant="outline" className="text-[10px] text-slate-500">
                  {comp.topExpenseCategory.percentage.toFixed(1)}% do total
                </Badge>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400 mt-2 block">Nenhuma despesa no mês.</span>
          )}
        </Card>

        {/* Categoria que mais cresceu */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-[#121A2B] shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            Despesa que Mais Cresceu
          </span>
          {comp.fastestGrowingCategory ? (
            <div className="mt-2">
              <span className="text-base font-bold text-slate-900 dark:text-white block truncate">
                {comp.fastestGrowingCategory.category}
              </span>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="font-mono text-red-600 font-bold">
                  +{formatCurrency(comp.fastestGrowingCategory.diff, hideValues)}
                </span>
                <Badge className="bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-300 text-[10px]">
                  +{comp.fastestGrowingCategory.pct.toFixed(1)}%
                </Badge>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400 mt-2 block">Nenhum aumento relevante.</span>
          )}
        </Card>

        {/* Categoria que mais caiu */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-4 bg-white dark:bg-[#121A2B] shadow-sm">
          <span className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider block">
            Despesa que Mais Reduziu
          </span>
          {comp.fastestFallingCategory ? (
            <div className="mt-2">
              <span className="text-base font-bold text-slate-900 dark:text-white block truncate">
                {comp.fastestFallingCategory.category}
              </span>
              <div className="flex items-center justify-between text-xs mt-1">
                <span className="font-mono text-emerald-600 font-bold">
                  −{formatCurrency(Math.abs(comp.fastestFallingCategory.diff), hideValues)}
                </span>
                <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 text-[10px]">
                  {comp.fastestFallingCategory.pct.toFixed(1)}%
                </Badge>
              </div>
            </div>
          ) : (
            <span className="text-xs text-slate-400 mt-2 block">Nenhuma redução relevante.</span>
          )}
        </Card>
      </div>

      {/* Gráficos de Evolução 6 e 12 Meses */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
              Evolução Histórica de Receitas, Despesas e Resultado
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Acompanhamento mês a mês dos resultados apurados
            </p>
          </div>

          {/* Seletor 6 vs 12 Meses */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
            <Button
              variant={historyPeriod === 6 ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setHistoryPeriod(6)}
              className="rounded-lg text-xs font-bold h-7 px-3"
            >
              6 Meses
            </Button>
            <Button
              variant={historyPeriod === 12 ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setHistoryPeriod(12)}
              className="rounded-lg text-xs font-bold h-7 px-3"
            >
              12 Meses
            </Button>
          </div>
        </div>

        {/* Gráfico de Barras com Recharts */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={historyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridStroke} />
              <XAxis dataKey="label" stroke={chartTheme.axisStroke} tick={{ fontSize: 11 }} />
              <YAxis
                stroke={chartTheme.axisStroke}
                tick={{ fontSize: 11 }}
                tickFormatter={(val) => `R$${val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}`}
              />
              <RechartsTooltip
                formatter={(value: any) => [formatCurrency(Number(value), hideValues), '']}
                contentStyle={{
                  ...chartTheme.tooltipStyle,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                }}
              />
              <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }} />
              <Bar dataKey="receitas" name="Receitas" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar
                dataKey="resultado"
                name="Resultado Líquido"
                fill="#6366F1"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top 5 Despesas e Top 5 Receitas do Mês */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Top 5 Despesas */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center justify-between">
            <span>Top 5 Despesas ({comp.currentMonthLabel})</span>
            <span className="text-xs text-slate-400 font-normal">Participação %</span>
          </h4>

          {comp.top5Expenses.length > 0 ? (
            <div className="space-y-3">
              {comp.top5Expenses.map((exp, i) => (
                <div key={exp.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {i + 1}. {exp.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(exp.value, hideValues)}
                      </span>
                      <span className="text-[10px] text-slate-400 w-10 text-right">
                        {exp.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-red-500 rounded-full"
                      style={{ width: `${Math.min(100, exp.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Nenhuma despesa registrada.</p>
          )}
        </Card>

        {/* Top 5 Receitas */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-3 flex items-center justify-between">
            <span>Top 5 Fontes de Receita ({comp.currentMonthLabel})</span>
            <span className="text-xs text-slate-400 font-normal">Participação %</span>
          </h4>

          {comp.top5Incomes.length > 0 ? (
            <div className="space-y-3">
              {comp.top5Incomes.map((inc, i) => (
                <div key={inc.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {i + 1}. {inc.category}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(inc.value, hideValues)}
                      </span>
                      <span className="text-[10px] text-slate-400 w-10 text-right">
                        {inc.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${Math.min(100, inc.percentage)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400">Nenhuma receita registrada.</p>
          )}
        </Card>
      </div>
    </div>
  )
}
