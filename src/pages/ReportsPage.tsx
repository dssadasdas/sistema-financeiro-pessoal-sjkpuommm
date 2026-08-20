import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, formatMonthYear, CATEGORY_COLORS } from '@/lib/constants'
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Award,
  CalendarClock,
  Download,
  FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { exportDrePdf, exportComparativePdf } from '@/lib/pdfExporter'
import { calculateDreReport, calculateMonthlyComparative } from '@/lib/dreEngine'
import { useToast } from '@/hooks/use-toast'
import { Link } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { LoadingState, ErrorState } from '@/components/States'
import { useChartTheme } from '@/hooks/use-chart-theme'
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  LineChart,
} from 'recharts'

const MONTHS_PT_SHORT = [
  'Jan',
  'Fev',
  'Mar',
  'Abr',
  'Mai',
  'Jun',
  'Jul',
  'Ago',
  'Set',
  'Out',
  'Nov',
  'Dez',
]

export default function ReportsPage() {
  const { transactions, bills, customCategories, isLoading, loadError, refreshAll } = useFinance()
  const { user, hideValues } = useAuth()
  const { toast } = useToast()
  const chart = useChartTheme()

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))

  const handleExportQuickPdf = () => {
    const dre = calculateDreReport(transactions, { month: selectedMonth, customCategories })
    exportDrePdf(dre, user?.name || 'Usuário')
    toast({
      title: 'Relatório Exportado',
      description: 'DRE e Relatório Executivo gerados em PDF para impressão.',
    })
  }

  // Transações do mês selecionado
  const monthTxns = useMemo(() => {
    return transactions.filter((t) => (t.date || '').startsWith(selectedMonth))
  }, [transactions, selectedMonth])

  // Métricas do Mês
  const monthIncome = monthTxns
    .filter(
      (t) =>
        t.type === 'receita' &&
        t.status === 'realizado' &&
        !t.transfer_group_id &&
        t.category !== 'Transferência',
    )
    .reduce((acc, t) => acc + Number(t.value || 0), 0)

  const monthExpenses = monthTxns
    .filter(
      (t) =>
        t.type === 'despesa' &&
        t.status === 'realizado' &&
        !t.transfer_group_id &&
        t.category !== 'Transferência',
    )
    .reduce((acc, t) => acc + Number(t.value || 0), 0)

  const monthResult = monthIncome - monthExpenses
  const savingsRate = monthIncome > 0 ? Math.round((monthResult / monthIncome) * 100) : 0

  // Gasto por categoria
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>()
    monthTxns
      .filter(
        (t) =>
          t.type === 'despesa' &&
          t.status === 'realizado' &&
          !t.transfer_group_id &&
          t.category !== 'Transferência',
      )
      .forEach((t) => {
        const cat = t.category || 'Outros'
        map.set(cat, (map.get(cat) || 0) + Number(t.value || 0))
      })

    const list = Array.from(map.entries()).map(([category, total]) => ({
      category,
      total,
      percentage: monthExpenses > 0 ? Math.round((total / monthExpenses) * 100) : 0,
      color: CATEGORY_COLORS[category] || '#64748B',
    }))

    return list.sort((a, b) => b.total - a.total)
  }, [monthTxns, monthExpenses])

  const topCategory = categoryStats[0] || null

  // Maior gasto individual do mês
  const topExpense = useMemo(() => {
    const list = monthTxns.filter(
      (t) =>
        t.type === 'despesa' &&
        t.status === 'realizado' &&
        !t.transfer_group_id &&
        t.category !== 'Transferência',
    )
    if (list.length === 0) return null
    return list.reduce(
      (prev, curr) => (Number(curr.value) > Number(prev.value) ? curr : prev),
      list[0],
    )
  }, [monthTxns])

  // Top 10 maiores despesas do mês
  const top10Expenses = useMemo(() => {
    return monthTxns
      .filter(
        (t) =>
          t.type === 'despesa' &&
          t.status === 'realizado' &&
          !t.transfer_group_id &&
          t.category !== 'Transferência',
      )
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
      .slice(0, 10)
  }, [monthTxns])

  // Comparativo dos últimos 6 meses (Receitas x Despesas)
  const last6MonthsData = useMemo(() => {
    const result = []
    const [selY, selM] = selectedMonth.split('-').map((n) => parseInt(n, 10))
    const base = new Date(selY, selM - 1, 1)

    for (let i = 5; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      const label = MONTHS_PT_SHORT[d.getMonth()]

      const inMonth = transactions.filter((t) => (t.date || '').startsWith(key))
      const inc = inMonth
        .filter(
          (t) =>
            t.type === 'receita' &&
            t.status === 'realizado' &&
            !t.transfer_group_id &&
            t.category !== 'Transferência',
        )
        .reduce((acc, t) => acc + Number(t.value || 0), 0)
      const exp = inMonth
        .filter(
          (t) =>
            t.type === 'despesa' &&
            t.status === 'realizado' &&
            !t.transfer_group_id &&
            t.category !== 'Transferência',
        )
        .reduce((acc, t) => acc + Number(t.value || 0), 0)

      result.push({ monthKey: key, label, income: inc, expenses: exp })
    }
    return result
  }, [transactions, selectedMonth])

  // Evolução dos últimos 12 meses (receitas, despesas, saldo)
  const last12MonthsData = useMemo(() => {
    const result = []
    const [selY, selM] = selectedMonth.split('-').map((n) => parseInt(n, 10))
    const base = new Date(selY, selM - 1, 1)

    for (let i = 11; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7)
      const label = MONTHS_PT_SHORT[d.getMonth()]

      const inMonth = transactions.filter((t) => (t.date || '').startsWith(key))
      const inc = inMonth
        .filter(
          (t) =>
            t.type === 'receita' &&
            t.status === 'realizado' &&
            !t.transfer_group_id &&
            t.category !== 'Transferência',
        )
        .reduce((acc, t) => acc + Number(t.value || 0), 0)
      const exp = inMonth
        .filter(
          (t) =>
            t.type === 'despesa' &&
            t.status === 'realizado' &&
            !t.transfer_group_id &&
            t.category !== 'Transferência',
        )
        .reduce((acc, t) => acc + Number(t.value || 0), 0)

      result.push({ label, receitas: inc, despesas: exp, saldo: inc - exp })
    }
    return result
  }, [transactions, selectedMonth])

  // Comparativo com mês anterior
  const prevMonthComparison = useMemo(() => {
    const [selY, selM] = selectedMonth.split('-').map((n) => parseInt(n, 10))
    const prev = new Date(selY, selM - 2, 1)
    const prevKey = prev.toISOString().slice(0, 7)
    const prevExp = transactions
      .filter(
        (t) =>
          (t.date || '').startsWith(prevKey) &&
          t.type === 'despesa' &&
          t.status === 'realizado' &&
          !t.transfer_group_id &&
          t.category !== 'Transferência',
      )
      .reduce((acc, t) => acc + Number(t.value || 0), 0)
    const diff = monthExpenses - prevExp
    const pct = prevExp > 0 ? (diff / prevExp) * 100 : 0
    return { prevExp, diff, pct }
  }, [transactions, selectedMonth, monthExpenses])

  // Valores a receber e a pagar no mês
  const monthBillsToReceive = bills
    .filter(
      (b) =>
        b.type === 'receber' &&
        b.status !== 'pago' &&
        (b.due_date || '').slice(0, 7) === selectedMonth,
    )
    .reduce((acc, b) => acc + Number(b.value || 0), 0)

  const monthBillsToPay = bills
    .filter(
      (b) =>
        (b.type || 'pagar') === 'pagar' &&
        b.status !== 'pago' &&
        (b.due_date || '').slice(0, 7) === selectedMonth,
    )
    .reduce((acc, b) => acc + Number(b.value || 0), 0)

  // Resumo em linguagem simples
  const simpleSummary = useMemo(() => {
    const trend =
      prevMonthComparison.prevExp === 0
        ? null
        : prevMonthComparison.diff > 0
          ? 'aumentaram'
          : prevMonthComparison.diff < 0
            ? 'diminuíram'
            : 'permaneceram estáveis'
    const trendPct = Math.abs(prevMonthComparison.pct).toFixed(1)
    return {
      income: monthIncome,
      expenses: monthExpenses,
      topCategory: topCategory?.category || '—',
      topCategoryValue: topCategory?.total || 0,
      savingsRate,
      trend,
      trendPct,
    }
  }, [monthIncome, monthExpenses, topCategory, savingsRate, prevMonthComparison])

  if (isLoading) {
    return <LoadingState message="Carregando relatórios..." />
  }

  if (loadError) {
    return (
      <ErrorState
        message="Não foi possível carregar os relatórios. Tente novamente."
        onRetry={refreshAll}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Relatórios Financeiros
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Análises visuais, distribuição de despesas e evolução mensal
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 w-40 rounded-xl font-bold text-xs"
          />
          <Button
            onClick={handleExportQuickPdf}
            variant="outline"
            size="sm"
            className="h-10 rounded-xl font-bold text-xs gap-1.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" /> Exportar PDF
          </Button>
          <Button
            asChild
            size="sm"
            className="h-10 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
          >
            <Link to="/dre">
              <FileText className="w-3.5 h-3.5" /> Ver DRE Completa
            </Link>
          </Button>
        </div>
      </div>

      {/* Resumo em Linguagem Simples */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border shadow-xs">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Resumo de {formatMonthYear(selectedMonth)}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
              Neste mês, você recebeu{' '}
              <strong className="text-emerald-600">
                {formatCurrency(simpleSummary.income, hideValues)}
              </strong>{' '}
              e gastou{' '}
              <strong className="text-orange-600">
                {formatCurrency(simpleSummary.expenses, hideValues)}
              </strong>
              . Sua maior despesa foi{' '}
              <strong className="text-slate-900 dark:text-white">
                {simpleSummary.topCategory}
              </strong>{' '}
              com{' '}
              <strong className="text-slate-900 dark:text-white">
                {formatCurrency(simpleSummary.topCategoryValue, hideValues)}
              </strong>
              . Você economizou{' '}
              <strong className="text-emerald-600">{simpleSummary.savingsRate}%</strong> da sua
              renda.
              {simpleSummary.trend && (
                <>
                  {' '}
                  Comparado ao mês passado, seus gastos{' '}
                  <strong
                    className={
                      simpleSummary.trend === 'aumentaram' ? 'text-red-600' : 'text-emerald-600'
                    }
                  >
                    {simpleSummary.trend} {simpleSummary.trendPct}%
                  </strong>
                  .
                </>
              )}
            </p>
          </div>
        </div>
      </Card>

      {/* 4 Cards de Resumo Mensal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap block">
            Receitas Recebidas
          </span>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums mt-1.5 whitespace-nowrap truncate">
            +{formatCurrency(monthIncome, hideValues)}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap block">
            Gastos Pagos
          </span>
          <div className="text-xl sm:text-2xl font-black text-orange-600 tabular-nums mt-1.5 whitespace-nowrap truncate">
            −{formatCurrency(monthExpenses, hideValues)}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap block">
            Resultado do Mês
          </span>
          <div
            className={`text-xl sm:text-2xl font-black tabular-nums mt-1.5 whitespace-nowrap truncate ${
              monthResult >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {monthResult >= 0 ? '+' : ''}
            {formatCurrency(monthResult, hideValues)}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between">
          <span className="text-xs text-slate-400 font-semibold whitespace-nowrap block">
            Taxa de Economia
          </span>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-1.5 whitespace-nowrap truncate">
            {savingsRate}%
          </div>
        </Card>
      </div>

      {/* Cards: Maior Gasto & Maior Categoria & A Receber / A Pagar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold">Maior Despesa do Mês</span>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1 truncate max-w-[140px]">
              {topExpense ? topExpense.description : 'Nenhuma'}
            </div>
            {topExpense && (
              <span className="text-xs text-slate-400">
                {topExpense.category} • {formatDate(topExpense.date)}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-orange-600 tabular-nums">
              {topExpense ? formatCurrency(topExpense.value, hideValues) : 'R$ 0,00'}
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold">Maior Categoria de Gasto</span>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1 truncate max-w-[140px]">
              {topCategory ? topCategory.category : 'Nenhuma'}
            </div>
            {topCategory && (
              <span className="text-xs text-slate-400">{topCategory.percentage}% do total</span>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
              {topCategory ? formatCurrency(topCategory.total, hideValues) : 'R$ 0,00'}
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <ArrowDownRight className="w-3 h-3 text-emerald-600" /> A Receber no Mês
            </span>
            <div className="text-lg font-black text-emerald-600 tabular-nums mt-1">
              {formatCurrency(monthBillsToReceive, hideValues)}
            </div>
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3 h-3 text-red-600" /> A Pagar no Mês
            </span>
            <div className="text-lg font-black text-red-600 tabular-nums mt-1">
              {formatCurrency(monthBillsToPay, hideValues)}
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos: Donut + Barras agrupadas 6 meses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut: Gastos por Categoria */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-600" />
            Gastos por Categoria
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Distribuição percentual em {formatMonthYear(selectedMonth)}
          </p>

          {categoryStats.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Sem despesas realizadas neste mês.
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryStats}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {categoryStats.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(
                        v: number,
                        _n: string,
                        item: { payload?: { percentage?: number } },
                      ) => [
                        `${formatCurrency(v, hideValues)} (${item?.payload?.percentage || 0}%)`,
                        '',
                      ]}
                      contentStyle={chart.tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-full mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {categoryStats.map((item) => (
                  <div
                    key={item.category}
                    className="flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center gap-1.5 min-w-0">
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600 dark:text-slate-300 truncate">
                        {item.category}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                      {item.percentage}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Barras agrupadas: Receitas x Despesas 6 meses */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Receitas x Despesas (6 meses)
          </h3>
          <p className="text-xs text-slate-400 mb-4">Histórico comparativo de entradas e saídas</p>

          <div className="w-full h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last6MonthsData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: chart.axisStroke }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: chart.axisStroke }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => (hideValues ? '•••' : `R$${(v / 1000).toFixed(0)}k`)}
                />
                <Tooltip
                  formatter={(v: number) => formatCurrency(v, hideValues)}
                  contentStyle={chart.tooltipStyle}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="income" name="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="Despesas" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Evolução 12 meses (receitas, despesas, saldo) */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-emerald-600" />
          Evolução Mensal (Últimos 12 meses)
        </h3>
        <p className="text-xs text-slate-400 mb-4">Receitas, despesas e saldo líquido por mês</p>

        <div className="w-full h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={last12MonthsData}>
              <CartesianGrid strokeDasharray="3 3" stroke={chart.gridStroke} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: chart.axisStroke }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: chart.axisStroke }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => (hideValues ? '•••' : `R$${(v / 1000).toFixed(0)}k`)}
              />
              <Tooltip
                formatter={(v: number) => formatCurrency(v, hideValues)}
                contentStyle={chart.tooltipStyle}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
              <Line
                type="monotone"
                dataKey="receitas"
                name="Receitas"
                stroke="#10b981"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="despesas"
                name="Despesas"
                stroke="#f97316"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
              <Line
                type="monotone"
                dataKey="saldo"
                name="Saldo"
                stroke="#6366f1"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Top 10 Maiores Despesas do Mês */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          10 Maiores Despesas de {formatMonthYear(selectedMonth)}
        </h3>

        {top10Expenses.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Nenhuma despesa registrada no período.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {top10Expenses.map((t, index) => (
              <div
                key={t.id}
                className="py-3 flex items-center justify-between text-xs hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-slate-400 w-4">
                    #{index + 1}
                  </span>
                  <div>
                    <span className="font-semibold text-slate-900 dark:text-white text-sm block">
                      {t.description}
                    </span>
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      {t.category} • {formatDate(t.date)} • {t.payment_method}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-extrabold text-orange-600 text-sm tabular-nums">
                    −{formatCurrency(t.value, hideValues)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Footer nota */}
      <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <CalendarClock className="w-3 h-3" />
        Relatórios calculados com base nas transações realizadas do período selecionado.
      </div>
    </div>
  )
}
