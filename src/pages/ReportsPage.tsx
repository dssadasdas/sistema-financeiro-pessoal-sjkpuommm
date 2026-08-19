import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatMonthYear, CATEGORY_COLORS } from '@/lib/constants'
import {
  BarChart3,
  PieChart as PieIcon,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Award,
  Layers,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'

export default function ReportsPage() {
  const { transactions } = useFinance()
  const { hideValues } = useAuth()

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))

  // Transações do mês selecionado
  const monthTxns = useMemo(() => {
    return transactions.filter((t) => (t.date || '').startsWith(selectedMonth))
  }, [transactions, selectedMonth])

  // Métricas do Mês
  const monthIncome = monthTxns
    .filter((t) => t.type === 'receita' && t.status === 'realizado')
    .reduce((acc, t) => acc + Number(t.value || 0), 0)

  const monthExpenses = monthTxns
    .filter((t) => t.type === 'despesa' && t.status === 'realizado')
    .reduce((acc, t) => acc + Number(t.value || 0), 0)

  const monthResult = monthIncome - monthExpenses
  const savingsRate =
    monthIncome > 0 ? Math.max(0, Math.round((monthResult / monthIncome) * 100)) : 0

  // Gasto por categoria (Donut e Barras Horizontais)
  const categoryStats = useMemo(() => {
    const map = new Map<string, number>()
    monthTxns
      .filter((t) => t.type === 'despesa' && t.status === 'realizado')
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
    const list = monthTxns.filter((t) => t.type === 'despesa' && t.status === 'realizado')
    if (list.length === 0) return null
    return list.reduce(
      (prev, curr) => (Number(curr.value) > Number(prev.value) ? curr : prev),
      list[0],
    )
  }, [monthTxns])

  // Top 10 maiores despesas do mês
  const top10Expenses = useMemo(() => {
    return monthTxns
      .filter((t) => t.type === 'despesa' && t.status === 'realizado')
      .sort((a, b) => Number(b.value || 0) - Number(a.value || 0))
      .slice(0, 10)
  }, [monthTxns])

  // Comparativo dos últimos 6 meses (Receitas x Despesas)
  const last6MonthsData = useMemo(() => {
    const result = []
    const now = new Date()

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const key = d.toISOString().slice(0, 7) // "YYYY-MM"
      const label = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')

      const inMonth = transactions.filter((t) => (t.date || '').startsWith(key))
      const inc = inMonth
        .filter((t) => t.type === 'receita' && t.status === 'realizado')
        .reduce((acc, t) => acc + Number(t.value || 0), 0)
      const exp = inMonth
        .filter((t) => t.type === 'despesa' && t.status === 'realizado')
        .reduce((acc, t) => acc + Number(t.value || 0), 0)

      result.push({
        monthKey: key,
        label: label.charAt(0).toUpperCase() + label.slice(1),
        income: inc,
        expenses: exp,
      })
    }
    return result
  }, [transactions])

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Relatórios Financeiros
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Análises visuais, distribuição de despesas por categoria e evolução semestral
          </p>
        </div>

        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="h-10 w-44 rounded-xl font-bold text-xs"
        />
      </div>

      {/* Resumo em Linguagem Simples */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-blue-500/10 border shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold flex-shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">
              Resumo Inteligente de {formatMonthYear(selectedMonth)}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
              Em {formatMonthYear(selectedMonth)} você ganhou{' '}
              <strong className="text-emerald-600">
                {formatCurrency(monthIncome, hideValues)}
              </strong>
              , gastou{' '}
              <strong className="text-orange-600">
                {formatCurrency(monthExpenses, hideValues)}
              </strong>{' '}
              e economizou{' '}
              <strong className="text-slate-900 dark:text-white">{savingsRate}%</strong> da sua
              receita.
            </p>
          </div>
        </div>
      </Card>

      {/* 4 Cards de Resumo Mensal */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">Receitas Recebidas</span>
          <div className="text-2xl font-black text-emerald-600 tabular-nums mt-1">
            +{formatCurrency(monthIncome, hideValues)}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">Gastos Pagos</span>
          <div className="text-2xl font-black text-orange-600 tabular-nums mt-1">
            −{formatCurrency(monthExpenses, hideValues)}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">Resultado do Mês</span>
          <div
            className={`text-2xl font-black tabular-nums mt-1 ${
              monthResult >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {monthResult >= 0 ? '+' : ''}
            {formatCurrency(monthResult, hideValues)}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <span className="text-xs text-slate-400 font-semibold">Taxa de Economia</span>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
            {savingsRate}%
          </div>
        </Card>
      </div>

      {/* Destaques: Maior Gasto & Maior Categoria */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 font-semibold">Maior Despesa do Mês</span>
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {topExpense ? topExpense.description : 'Nenhuma'}
            </div>
            {topExpense && <span className="text-xs text-slate-400">{topExpense.category}</span>}
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
            <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
              {topCategory ? topCategory.category : 'Nenhuma'}
            </div>
            {topCategory && (
              <span className="text-xs text-slate-400">
                {topCategory.percentage}% do total gasto
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
              {topCategory ? formatCurrency(topCategory.total, hideValues) : 'R$ 0,00'}
            </div>
          </div>
        </Card>
      </div>

      {/* Gráficos: Gasto por Categoria (Barras Horizontais) + Receitas x Despesas 6 Meses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Distribuição por Categoria */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-600" />
            Gastos por Categoria
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Percentual consumido em cada setor em {formatMonthYear(selectedMonth)}
          </p>

          {categoryStats.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              Sem despesas realizadas neste mês.
            </div>
          ) : (
            <div className="space-y-4">
              {categoryStats.map((item) => (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-800 dark:text-slate-200">{item.category}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold tabular-nums text-slate-900 dark:text-white">
                        {formatCurrency(item.total, hideValues)}
                      </span>
                      <span className="text-slate-400">({item.percentage}%)</span>
                    </div>
                  </div>
                  <Progress value={item.percentage} className="h-2 rounded-full" />
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Comparativo Últimos 6 Meses */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Receitas x Despesas (Últimos 6 Meses)
          </h3>
          <p className="text-xs text-slate-400 mb-6">
            Histórico semestral comparativo de entradas e saídas
          </p>

          <div className="grid grid-cols-6 gap-2 sm:gap-3 items-end h-48 pt-4 border-b border-slate-100 dark:border-slate-800">
            {last6MonthsData.map((m, idx) => {
              const maxVal = Math.max(
                ...last6MonthsData.map((x) => Math.max(x.income, x.expenses)),
                1000,
              )
              const incPct = Math.min(100, Math.round((m.income / maxVal) * 100))
              const expPct = Math.min(100, Math.round((m.expenses / maxVal) * 100))

              return (
                <div
                  key={idx}
                  className="flex-1 flex flex-col items-center gap-2 h-full justify-end"
                >
                  <div className="w-full flex items-end justify-center gap-1.5 h-44">
                    {/* Barra Receita */}
                    <div
                      className="w-4 bg-emerald-500 rounded-t-md transition-all hover:bg-emerald-600"
                      style={{ height: `${Math.max(8, incPct)}%` }}
                      title={`Receita: ${formatCurrency(m.income)}`}
                    />
                    {/* Barra Despesa */}
                    <div
                      className="w-4 bg-orange-500 rounded-t-md transition-all hover:bg-orange-600"
                      style={{ height: `${Math.max(8, expPct)}%` }}
                      title={`Despesa: ${formatCurrency(m.expenses)}`}
                    />
                  </div>
                  <span className="text-[10px] font-semibold text-slate-400">{m.label}</span>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 text-xs font-semibold text-slate-500">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-emerald-500" />
              <span>Receitas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded bg-orange-500" />
              <span>Despesas</span>
            </div>
          </div>
        </Card>
      </div>

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
                    <span className="text-[11px] text-slate-400">
                      {t.category} • {t.payment_method}
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
    </div>
  )
}
