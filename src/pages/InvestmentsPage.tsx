import React, { useState } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/constants'
import { Investment, InvestmentCategoryGroup } from '@/types/finance'
import {
  TrendingUp,
  TrendingDown,
  Plus,
  RefreshCw,
  MoreVertical,
  Calendar,
  Clock,
  Landmark,
  ChevronDown,
  ChevronRight,
  PieChart as PieChartIcon,
  ShieldCheck,
  Coins,
  Globe2,
  Building2,
  Sparkles,
  ArrowUpRight,
  Layers,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts'
import InvestmentFormModal from '@/components/investments/InvestmentFormModal'
import InvestmentDetailModal from '@/components/investments/InvestmentDetailModal'
import AporteModal from '@/components/investments/AporteModal'
import EarningsModal from '@/components/investments/EarningsModal'
import { useToast } from '@/hooks/use-toast'

const CATEGORY_META: Record<
  InvestmentCategoryGroup,
  { label: string; icon: string; color: string; desc: string }
> = {
  renda_fixa: {
    label: 'Renda Fixa',
    icon: '💰',
    color: '#10B981', // emerald-500
    desc: 'CDBs, LCIs, LCAs, Tesouro Direto, Debêntures',
  },
  renda_variavel: {
    label: 'Renda Variável',
    icon: '📊',
    color: '#3B82F6', // blue-500
    desc: 'Ações BR, FIIs, Fiagros, BDRs, ETFs',
  },
  fundos: {
    label: 'Fundos de Investimento',
    icon: '🏦',
    color: '#8B5CF6', // purple-500
    desc: 'Multimercados, RF, Ações, Cambiais',
  },
  cripto: {
    label: 'Criptomoedas',
    icon: '₿',
    color: '#F59E0B', // amber-500
    desc: 'Bitcoin, Ethereum e Altcoins',
  },
  previdencia: {
    label: 'Previdência Privada',
    icon: '🏛️',
    color: '#06B6D4', // cyan-500
    desc: 'PGBL e VGBL',
  },
  internacional: {
    label: 'Internacional',
    icon: '🌎',
    color: '#EC4899', // pink-500
    desc: 'Stocks EUA, ETFs Globais, Dólar, Euro',
  },
  outros: {
    label: 'Outros Ativos',
    icon: '✨',
    color: '#64748B', // slate-500
    desc: 'Ouro, Ativos Alternativos e Personalizados',
  },
}

export default function InvestmentsPage() {
  const { hideValues } = useAuth()
  const {
    investments,
    totalInvested,
    totalInvestmentsCurrent,
    totalInvestmentsResult,
    rentabilidadeMes,
    rentabilidadeAno,
    totalProventos,
    refreshAllPrices,
  } = useFinance()
  const { toast } = useToast()

  // State de modais
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [detailModalOpen, setDetailModalOpen] = useState(false)
  const [aporteModalOpen, setAporteModalOpen] = useState(false)
  const [earningsModalOpen, setEarningsModalOpen] = useState(false)
  const [selectedInvestment, setSelectedInvestment] = useState<Investment | null>(null)
  const [investmentToEdit, setInvestmentToEdit] = useState<Investment | null>(null)

  // Collapse sections
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)

  const toggleGroup = (group: string) => {
    setCollapsedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const handleRefreshPrices = async () => {
    setIsRefreshing(true)
    try {
      const res = await refreshAllPrices()
      toast({
        title: 'Cotações atualizadas!',
        description: `${res.updated} ativos atualizados com preços online (Binance / Brapi / BCB).`,
      })
    } catch (err: any) {
      toast({
        title: 'Cotações mantidas',
        description: 'Usando últimos preços conhecidos.',
        variant: 'default',
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  // Agrupamento de investimentos por category_group
  const groupedInvestments: Record<InvestmentCategoryGroup, Investment[]> = {
    renda_fixa: [],
    renda_variavel: [],
    fundos: [],
    cripto: [],
    previdencia: [],
    internacional: [],
    outros: [],
  }

  investments.forEach((inv) => {
    const grp = (inv.category_group || 'outros') as InvestmentCategoryGroup
    if (groupedInvestments[grp]) {
      groupedInvestments[grp].push(inv)
    } else {
      groupedInvestments.outros.push(inv)
    }
  })

  // Dados para o Gráfico Donut de Distribuição
  const chartData = (Object.keys(groupedInvestments) as InvestmentCategoryGroup[])
    .map((grp) => {
      const list = groupedInvestments[grp]
      const totalVal = list.reduce(
        (sum, i) => sum + (i.current_total_value || i.applied_value || 0),
        0,
      )
      return {
        name: CATEGORY_META[grp].label,
        key: grp,
        value: totalVal,
        color: CATEGORY_META[grp].color,
        icon: CATEGORY_META[grp].icon,
        count: list.length,
      }
    })
    .filter((d) => d.value > 0)

  // Próximos Vencimentos de Renda Fixa (top 3)
  const upcomingMaturities = investments
    .filter(
      (i) => i.maturity_date && (i.days_until_maturity === undefined || i.days_until_maturity >= 0),
    )
    .sort((a, b) => {
      const da = new Date(a.maturity_date!).getTime()
      const db = new Date(b.maturity_date!).getTime()
      return da - db
    })
    .slice(0, 3)

  const isTotalProfit = totalInvestmentsResult >= 0

  return (
    <div className="space-y-5 pb-16">
      {/* Top Header com Botão de Adicionar e Atualizar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <span>📈</span> Investimentos & Carteira
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Acompanhe o rendimento, cotações automáticas e distribuição do seu patrimônio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshPrices}
            disabled={isRefreshing}
            className="text-xs gap-1.5 h-9 bg-white dark:bg-[#0f1626] border-slate-200 dark:border-slate-800 hover:bg-slate-50"
            title="Atualizar cotações agora"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-emerald-600' : ''}`}
            />
            <span className="hidden sm:inline">Atualizar Cotações</span>
            <span className="sm:hidden">Atualizar</span>
          </Button>

          <Button
            onClick={() => {
              setInvestmentToEdit(null)
              setFormModalOpen(true)
            }}
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 h-9 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Investimento</span>
          </Button>
        </div>
      </div>

      {/* 3.1.1 Cabeçalho — Resumo Financeiro */}
      <div className="rounded-2xl bg-white dark:bg-[#0f1626] border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Patrimônio Investido
            </span>
            <div className="flex items-baseline gap-3 mt-1">
              <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                {formatCurrency(totalInvestmentsCurrent, hideValues)}
              </h2>
              <span
                className={`text-xs sm:text-sm font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                  isTotalProfit
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                    : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600'
                }`}
              >
                {isTotalProfit ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {isTotalProfit ? '+' : ''}
                {formatCurrency(totalInvestmentsResult, hideValues)} (
                {totalInvested > 0
                  ? ((totalInvestmentsResult / totalInvested) * 100).toFixed(2)
                  : '0.00'}
                %)
              </span>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              Total aplicado:{' '}
              <span className="font-semibold text-slate-600 dark:text-slate-300">
                {formatCurrency(totalInvested, hideValues)}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className="text-xs py-1 px-2.5 bg-slate-50 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700"
            >
              {investments.length}{' '}
              {investments.length === 1 ? 'ativo cadastrado' : 'ativos cadastrados'}
            </Badge>
          </div>
        </div>

        {/* 4 Cards de Métricas Lado a Lado (2x2 mobile, 4 desktop) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
              Ganho / Perda Total
            </span>
            <p
              className={`text-base sm:text-lg font-bold mt-1 ${
                isTotalProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
              }`}
            >
              {isTotalProfit ? '+' : ''}
              {formatCurrency(totalInvestmentsResult, hideValues)}
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
              Rentabilidade Estimada (Mês)
            </span>
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
              {rentabilidadeMes >= 0 ? '+' : ''}
              {rentabilidadeMes.toFixed(2)}%
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
              Rentabilidade Acumulada
            </span>
            <p className="text-base sm:text-lg font-bold text-slate-900 dark:text-white mt-1">
              {rentabilidadeAno >= 0 ? '+' : ''}
              {rentabilidadeAno.toFixed(2)}%
            </p>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80">
            <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium block">
              Total de Proventos
            </span>
            <p className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              {formatCurrency(totalProventos, hideValues)}
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Distribuição da Carteira + Próximos Vencimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* 3.1.2 Distribuição da Carteira (Gráfico Donut) */}
        <div className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#0f1626] border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <PieChartIcon className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Distribuição da Carteira por Categoria
            </h3>
            <span className="text-xs text-slate-400">Alocação de Ativos</span>
          </div>

          {chartData.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
                <PieChartIcon className="w-6 h-6" />
              </div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nenhum investimento cadastrado ainda
              </p>
              <p className="text-xs text-slate-400 max-w-xs mt-1">
                Adicione seu primeiro ativo para visualizar o gráfico de diversificação.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center py-4 flex-1">
              {/* Gráfico Donut */}
              <div className="h-52 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry) => (
                        <Cell key={`cell-${entry.key}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(val: number) => formatCurrency(val, hideValues)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    Diversificação
                  </span>
                  <span className="text-sm font-black text-slate-800 dark:text-white">
                    {chartData.length} {chartData.length === 1 ? 'classe' : 'classes'}
                  </span>
                </div>
              </div>

              {/* Legenda Customizada com % e Valor */}
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {chartData.map((d) => {
                  const pct =
                    totalInvestmentsCurrent > 0 ? (d.value / totalInvestmentsCurrent) * 100 : 0
                  return (
                    <div
                      key={d.key}
                      className="flex items-center justify-between p-2 rounded-xl bg-slate-50/70 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800/60"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: d.color }}
                        />
                        <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                          {d.name}
                        </span>
                        <span className="text-[10px] text-slate-400">({d.count})</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {pct.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-slate-400 block">
                          {formatCurrency(d.value, hideValues)}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* 3.1.4 Próximos Vencimentos de Renda Fixa */}
        <div className="rounded-2xl bg-white dark:bg-[#0f1626] border border-slate-200/80 dark:border-slate-800 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Próximos Vencimentos
              </h3>
              <span className="text-xs text-slate-400">Renda Fixa</span>
            </div>

            <div className="space-y-2.5 mt-3">
              {upcomingMaturities.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhum vencimento próximo registrado.
                </div>
              ) : (
                upcomingMaturities.map((inv) => (
                  <div
                    key={inv.id}
                    onClick={() => {
                      setSelectedInvestment(inv)
                      setDetailModalOpen(true)
                    }}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60 hover:border-emerald-500/50 cursor-pointer transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                        {inv.name}
                      </p>
                      <Badge
                        variant="outline"
                        className="text-[10px] text-emerald-600 border-emerald-500/30"
                      >
                        {inv.days_until_maturity !== undefined
                          ? `${inv.days_until_maturity} dias`
                          : 'Vencimento'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span>Vence: {formatDate(inv.maturity_date || '')}</span>
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        {formatCurrency(inv.current_total_value || inv.applied_value, hideValues)}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 mt-3">
            <p className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> FGC cobre até R$ 250k por
              CPF/instituição.
            </p>
          </div>
        </div>
      </div>

      {/* 3.1.3 Lista de Investimentos (Minha Carteira) — Seções Recolhíveis */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Minha Carteira de Ativos
          </h2>
          <span className="text-xs text-slate-400">Seções agrupadas por categoria</span>
        </div>

        {(Object.keys(groupedInvestments) as InvestmentCategoryGroup[]).map((groupKey) => {
          const list = groupedInvestments[groupKey]
          if (list.length === 0) return null

          const isCollapsed = collapsedGroups[groupKey]
          const groupMeta = CATEGORY_META[groupKey]
          const groupTotal = list.reduce(
            (sum, i) => sum + (i.current_total_value || i.applied_value || 0),
            0,
          )
          const groupApplied = list.reduce((sum, i) => sum + (i.applied_value || 0), 0)
          const groupProfit = groupTotal - groupApplied
          const groupProfitPct = groupApplied > 0 ? (groupProfit / groupApplied) * 100 : 0

          return (
            <div
              key={groupKey}
              className="rounded-2xl bg-white dark:bg-[#0f1626] border border-slate-200/80 dark:border-slate-800 overflow-hidden shadow-xs"
            >
              {/* Header da Categoria (Clicável para recolher) */}
              <button
                type="button"
                onClick={() => toggleGroup(groupKey)}
                className="w-full flex items-center justify-between p-4 bg-slate-50/70 dark:bg-slate-850 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors text-left"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-xl select-none">{groupMeta.icon}</span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {groupMeta.label}
                      </h3>
                      <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                        {list.length}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 hidden sm:block">
                      {groupMeta.desc}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-sm font-black text-slate-900 dark:text-white block">
                      {formatCurrency(groupTotal, hideValues)}
                    </span>
                    <span
                      className={`text-[11px] font-semibold ${
                        groupProfit >= 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-rose-500'
                      }`}
                    >
                      {groupProfit >= 0 ? '+' : ''}
                      {formatCurrency(groupProfit, hideValues)} ({groupProfitPct.toFixed(2)}%)
                    </span>
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </button>

              {/* Lista de Ativos da Categoria */}
              {!isCollapsed && (
                <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                  {list.map((inv) => {
                    const isItemProfit = (inv.profit_loss || 0) >= 0

                    return (
                      <div
                        key={inv.id}
                        className="p-3.5 sm:p-4 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        {/* Identificação do Ativo */}
                        <div
                          className="flex items-center gap-3 min-w-0 flex-1 cursor-pointer"
                          onClick={() => {
                            setSelectedInvestment(inv)
                            setDetailModalOpen(true)
                          }}
                        >
                          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-lg shrink-0 border border-slate-200/60 dark:border-slate-700">
                            {inv.symbol ? inv.symbol.slice(0, 3) : groupMeta.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                                {inv.name}
                              </p>
                              {inv.symbol && (
                                <span className="text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded">
                                  {inv.symbol}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5 flex-wrap">
                              {inv.institution && (
                                <span className="flex items-center gap-1">
                                  <Landmark className="w-3 h-3" /> {inv.institution}
                                </span>
                              )}
                              {inv.quantity !== undefined && inv.quantity > 0 && (
                                <span>• {inv.quantity} cotas</span>
                              )}
                              {inv.maturity_date && (
                                <span>• Vence {formatDate(inv.maturity_date)}</span>
                              )}
                              {inv.yield_type === 'cdi_pct' && inv.yield_rate && (
                                <span>• {inv.yield_rate}% CDI</span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Valores e Rentabilidade */}
                        <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pl-12 sm:pl-0">
                          <div className="text-left sm:text-right">
                            <p className="text-sm font-bold text-slate-900 dark:text-white">
                              {formatCurrency(
                                inv.current_total_value || inv.applied_value || 0,
                                hideValues,
                              )}
                            </p>
                            <p className="text-[11px] text-slate-400">
                              Aplicado: {formatCurrency(inv.applied_value || 0, hideValues)}
                            </p>
                          </div>

                          <div className="text-right">
                            <span
                              className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-bold ${
                                isItemProfit
                                  ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600'
                              }`}
                            >
                              {isItemProfit ? (
                                <TrendingUp className="w-3 h-3" />
                              ) : (
                                <TrendingDown className="w-3 h-3" />
                              )}
                              {isItemProfit ? '+' : ''}
                              {(inv.profit_loss_pct || 0).toFixed(2)}%
                            </span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">
                              {isItemProfit ? '+' : ''}
                              {formatCurrency(inv.profit_loss || 0, hideValues)}
                            </span>
                          </div>

                          {/* Menu de Ações (•••) */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 hover:text-slate-800 dark:hover:text-white"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedInvestment(inv)
                                  setDetailModalOpen(true)
                                }}
                              >
                                Ver Detalhes
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedInvestment(inv)
                                  setAporteModalOpen(true)
                                }}
                              >
                                Novo Aporte / Venda
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setSelectedInvestment(inv)
                                  setEarningsModalOpen(true)
                                }}
                              >
                                Registrar Rendimento
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setInvestmentToEdit(inv)
                                  setFormModalOpen(true)
                                }}
                              >
                                Editar Ativo
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* FAB Mobile Flutuante para Adicionar Investimento (+) */}
      <div className="lg:hidden fixed bottom-20 right-4 z-30">
        <button
          onClick={() => {
            setInvestmentToEdit(null)
            setFormModalOpen(true)
          }}
          className="w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white flex items-center justify-center shadow-xl shadow-emerald-600/40"
          aria-label="Adicionar Investimento"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* Modais da Aplicação */}
      <InvestmentFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        investmentToEdit={investmentToEdit}
      />

      <InvestmentDetailModal
        open={detailModalOpen}
        onOpenChange={setDetailModalOpen}
        investment={selectedInvestment}
        onEdit={(inv) => {
          setInvestmentToEdit(inv)
          setFormModalOpen(true)
        }}
      />

      <AporteModal
        open={aporteModalOpen}
        onOpenChange={setAporteModalOpen}
        investment={selectedInvestment}
      />

      <EarningsModal
        open={earningsModalOpen}
        onOpenChange={setEarningsModalOpen}
        investment={selectedInvestment}
      />
    </div>
  )
}
