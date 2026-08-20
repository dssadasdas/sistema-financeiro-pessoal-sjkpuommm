import React, { useMemo, useState } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, CATEGORY_COLORS } from '@/lib/constants'
import { getCategoryEmoji } from '@/lib/categoryEmojis'
import { PieChart as PieChartIcon, ArrowRight, ShoppingBag } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { CategoryItem, Transaction } from '@/types/finance'
import { useChartTheme } from '@/hooks/use-chart-theme'

const FALLBACK_PALETTE = [
  '#F59E0B',
  '#EF4444',
  '#0EA5E9',
  '#EC4899',
  '#8B5CF6',
  '#10B981',
  '#6366F1',
  '#F97316',
  '#14B8A6',
  '#EAB308',
  '#06B6D4',
  '#64748B',
  '#A855F7',
  '#3B82F6',
]

interface CategoryExpenseItem {
  category: string
  emoji: string
  value: number
  percentage: number
  color: string
}

interface CategoryExpensesWidgetProps {
  transactions: Transaction[]
  customCategories?: CategoryItem[]
  hideValues?: boolean
  currentMonthKey?: string
}

export default function CategoryExpensesWidget({
  transactions,
  customCategories = [],
  hideValues = false,
  currentMonthKey,
}: CategoryExpensesWidgetProps) {
  const navigate = useNavigate()
  const { isDark, tooltipStyle } = useChartTheme()
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  const monthKey = useMemo(() => {
    return currentMonthKey || new Date().toISOString().slice(0, 7)
  }, [currentMonthKey])

  // Processar transações de despesa do mês atual agrupadas por categoria
  const { items, totalExpenses } = useMemo(() => {
    const categoryTotals: Record<string, number> = {}
    let total = 0

    // Filtra transações do mês atual e tipo "despesa"
    transactions.forEach((tx) => {
      const txMonth = (tx.date || '').slice(0, 7)
      if (txMonth !== monthKey) return
      if (tx.type !== 'despesa') return

      const val = Number(tx.value || 0)
      if (val <= 0) return

      const cat = (tx.category && tx.category.trim()) || 'Outros'
      categoryTotals[cat] = (categoryTotals[cat] || 0) + val
      total += val
    })

    // Mapa de cores de categorias customizadas se houver
    const customColorMap: Record<string, string> = {}
    customCategories.forEach((c) => {
      if (c.color) {
        customColorMap[c.name] = c.color
      }
    })

    const list: CategoryExpenseItem[] = Object.entries(categoryTotals)
      .map(([cat, val], idx) => {
        const percentage = total > 0 ? (val / total) * 100 : 0
        const color =
          customColorMap[cat] ||
          CATEGORY_COLORS[cat] ||
          FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length]
        const emoji = getCategoryEmoji(cat)
        return {
          category: cat,
          emoji,
          value: val,
          percentage,
          color,
        }
      })
      .sort((a, b) => b.value - a.value)

    return { items: list, totalExpenses: total }
  }, [transactions, customCategories, monthKey])

  return (
    <Card className="rounded-2xl border-slate-200/90 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-xs p-4 sm:p-5 flex flex-col justify-between">
      {/* Header do Widget */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <PieChartIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h2 className="text-sm font-bold text-slate-900 dark:text-white">Gastos por Categoria</h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/transacoes')}
          className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 h-7 px-2 gap-0.5"
        >
          Ver lançamentos →
        </Button>
      </div>

      {/* Conteúdo: Gráfico ou Estado Vazio */}
      {items.length === 0 || totalExpenses === 0 ? (
        <div className="py-8 px-4 flex flex-col items-center justify-center text-center my-auto rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-2.5">
            <ShoppingBag className="w-6 h-6 stroke-[1.75]" />
          </div>
          <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
            Sem gastos este mês
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs">
            Nenhuma despesa registrada neste mês. Suas categorias de gastos aparecerão aqui conforme
            você lançar.
          </p>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
          {/* Lado do Gráfico de Rosca (Donut Chart) */}
          <div className="relative w-44 h-44 sm:w-48 sm:h-48 shrink-0 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload as CategoryExpenseItem
                      return (
                        <div
                          style={tooltipStyle}
                          className="px-2.5 py-1.5 shadow-lg rounded-xl flex items-center gap-2"
                        >
                          <span className="text-base">{data.emoji}</span>
                          <div className="text-left">
                            <p className="font-bold text-xs">{data.category}</p>
                            <p className="text-[11px] opacity-90 tabular-nums font-semibold">
                              {formatCurrency(data.value, hideValues)} ({data.percentage.toFixed(1)}
                              %)
                            </p>
                          </div>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Pie
                  data={items}
                  dataKey="value"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={48}
                  outerRadius={70}
                  paddingAngle={3}
                  onMouseEnter={(_, index) => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                >
                  {items.map((entry, index) => (
                    <Cell
                      key={`cell-${entry.category}-${index}`}
                      fill={entry.color}
                      stroke={isDark ? '#121A2B' : '#ffffff'}
                      strokeWidth={2}
                      className="cursor-pointer transition-transform duration-200"
                      style={{
                        transform: activeIndex === index ? 'scale(1.04)' : 'scale(1)',
                        transformOrigin: 'center center',
                      }}
                    />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            {/* Total no centro da rosca */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 leading-none">
                Total
              </span>
              <span className="text-xs sm:text-sm font-black tabular-nums text-slate-900 dark:text-white mt-0.5 max-w-[90px] truncate px-1 text-center">
                {formatCurrency(totalExpenses, hideValues)}
              </span>
            </div>
          </div>

          {/* Lado da Legenda com Emojis, Nomes, Porcentagens e Valores */}
          <div className="w-full flex-1 min-w-0 space-y-1.5 max-h-52 overflow-y-auto pr-1">
            {items.map((item, index) => {
              const isHovered = activeIndex === index
              return (
                <div
                  key={item.category}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  className={`flex items-center justify-between gap-2 p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                    isHovered
                      ? 'bg-slate-100 dark:bg-slate-800/80 font-semibold'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  {/* Categoria + Emoji + Cor */}
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span
                      className="text-sm shrink-0 leading-none"
                      role="img"
                      aria-label={item.category}
                    >
                      {item.emoji}
                    </span>
                    <span className="text-slate-800 dark:text-slate-200 truncate font-medium text-xs">
                      {item.category}
                    </span>
                  </div>

                  {/* Porcentagem + Valor */}
                  <div className="flex items-center gap-2 shrink-0 text-right">
                    <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 tabular-nums">
                      {item.percentage < 1 ? '<1%' : `${item.percentage.toFixed(0)}%`}
                    </span>
                    <span className="text-xs font-bold text-slate-900 dark:text-white tabular-nums">
                      {formatCurrency(item.value, hideValues)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </Card>
  )
}
