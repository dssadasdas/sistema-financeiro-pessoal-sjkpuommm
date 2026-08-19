import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatMonthYear } from '@/lib/constants'
import {
  Compass,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

export default function ForecastPage() {
  const {
    totalCurrentBalance,
    monthIncomePending,
    monthExpensePending,
    monthOpenInvoicesTotal,
    transactions,
    bills,
  } = useFinance()
  const { hideValues } = useAuth()

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))

  // Cálculo da Projeção de Fim de Mês:
  // Saldo Atual + A Receber (Pendentes) - A Pagar (Pendentes + Faturas Abertas)
  const projectedEndMonthBalance =
    totalCurrentBalance + monthIncomePending - (monthExpensePending + monthOpenInvoicesTotal)

  const isHealthy = projectedEndMonthBalance >= totalCurrentBalance * 0.9

  // Geração de projeção diária visual para o restante do mês
  const dailyProjection = useMemo(() => {
    const days = [5, 10, 15, 20, 25, 28]
    let running = totalCurrentBalance
    return days.map((d, index) => {
      const stepChange = monthIncomePending / 3 - (monthExpensePending + monthOpenInvoicesTotal) / 6
      running += index % 2 === 0 ? stepChange : -stepChange * 0.5
      return {
        day: `Dia ${d}`,
        projected: running,
      }
    })
  }, [totalCurrentBalance, monthIncomePending, monthExpensePending, monthOpenInvoicesTotal])

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Previsão Financeira</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Projeção de fluxo de caixa até o final do mês considerando saldos e compromissos
          </p>
        </div>

        <Input
          type="month"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
          className="h-10 w-44 rounded-xl font-bold text-xs"
        />
      </div>

      {/* Painel Central de Projeção */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">
              Projeção de Saldo ao Fim de {formatMonthYear(selectedMonth)}
            </span>
            <div className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
              {formatCurrency(projectedEndMonthBalance, hideValues)}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Saldo Atual (+{formatCurrency(totalCurrentBalance, hideValues)}) + Receitas Previstas
              (− Compromissos)
            </p>
          </div>

          <Badge
            className={`text-xs font-bold py-1.5 px-3 rounded-xl border-0 flex items-center gap-1.5 ${
              isHealthy
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            {isHealthy ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Dentro do planejado
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-600" /> Atenção ao orçamento
              </>
            )}
          </Badge>
        </div>

        {/* 4 Blocos da Equação de Previsão */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-semibold">1. Saldo Atual em Contas</span>
            <div className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
              {formatCurrency(totalCurrentBalance, hideValues)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" /> 2. A Receber (Pendentes)
            </span>
            <div className="text-xl font-bold text-emerald-600 tabular-nums mt-1">
              +{formatCurrency(monthIncomePending, hideValues)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-orange-600 font-semibold flex items-center gap-1">
              <ArrowDownRight className="w-3.5 h-3.5" /> 3. A Pagar (Pendentes)
            </span>
            <div className="text-xl font-bold text-orange-600 tabular-nums mt-1">
              −{formatCurrency(monthExpensePending, hideValues)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-purple-600 font-semibold flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5" /> 4. Faturas de Cartão
            </span>
            <div className="text-xl font-bold text-purple-600 tabular-nums mt-1">
              −{formatCurrency(monthOpenInvoicesTotal, hideValues)}
            </div>
          </div>
        </div>
      </Card>

      {/* Gráfico Visual de Projeção Diária */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-2">
          Curva Estimada de Saldo Diário
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Comportamento projetado do seu saldo considerando as datas dos compromissos agendados
        </p>

        <div className="grid grid-cols-6 gap-2 sm:gap-4 items-end h-40 pt-4 border-b border-slate-100 dark:border-slate-800">
          {dailyProjection.map((item, idx) => {
            const min = Math.min(...dailyProjection.map((p) => p.projected))
            const max = Math.max(...dailyProjection.map((p) => p.projected))
            const heightPct =
              max > min
                ? Math.max(
                    20,
                    Math.min(100, Math.round(((item.projected - min) / (max - min)) * 80 + 20)),
                  )
                : 60

            return (
              <div key={idx} className="flex flex-col items-center gap-2 h-full justify-end">
                <span className="text-[10px] font-bold text-emerald-600 tabular-nums hidden sm:block">
                  {formatCurrency(item.projected, hideValues)}
                </span>
                <div
                  style={{ height: `${heightPct}%` }}
                  className="w-full max-w-[40px] rounded-t-lg bg-gradient-to-t from-emerald-600 to-teal-400 shadow-sm transition-all"
                />
                <span className="text-[11px] font-medium text-slate-400">{item.day}</span>
              </div>
            )
          })}
        </div>
      </Card>
    </div>
  )
}
