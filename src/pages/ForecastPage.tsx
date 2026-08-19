import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/constants'
import {
  Compass,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Receipt,
  Wallet,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { LoadingState, ErrorState } from '@/components/States'

export default function ForecastPage() {
  const {
    totalCurrentBalance,
    monthIncomePending,
    monthExpensePending,
    monthOpenInvoicesTotal,
    invoices,
    bills,
    creditCards,
    transactions,
    isLoading,
    loadError,
    refreshAll,
  } = useFinance()
  const { hideValues } = useAuth()

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))

  // Cálculo da Projeção de Fim de Mês:
  // saldo atual + a receber − a pagar − faturas
  const toPay = monthExpensePending + monthOpenInvoicesTotal
  const projectedEndMonthBalance = totalCurrentBalance + monthIncomePending - toPay
  const isPositive = projectedEndMonthBalance >= 0

  // Dias restantes no mês
  const daysRemaining = useMemo(() => {
    const now = new Date()
    const [y, m] = selectedMonth.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    const today = now.getDate()
    return Math.max(0, lastDay - today)
  }, [selectedMonth])

  // Geração de projeção diária visual para o restante do mês
  const dailyProjection = useMemo(() => {
    const [y, m] = selectedMonth.split('-').map(Number)
    const lastDay = new Date(y, m, 0).getDate()
    const now = new Date()
    const today = now.getDate()
    // Pontos de amostragem: hoje + alguns dias até o fim do mês
    const sampleDays: number[] = []
    const step = Math.max(1, Math.floor((lastDay - today) / 6))
    for (let d = today; d <= lastDay; d += step) sampleDays.push(d)
    if (sampleDays[sampleDays.length - 1] !== lastDay) sampleDays.push(lastDay)

    let running = totalCurrentBalance
    const remainingDays = Math.max(1, lastDay - today)
    return sampleDays.map((d) => {
      const elapsed = d - today
      const fraction = elapsed / remainingDays
      // distribui linearmente receitas (+) e despesas+faturas (-)
      running = totalCurrentBalance + monthIncomePending * fraction - toPay * fraction
      return {
        day: d,
        label: `Dia ${d}`,
        projected: running,
      }
    })
  }, [totalCurrentBalance, monthIncomePending, toPay, selectedMonth])

  // Próximos compromissos: boletos pendentes + faturas abertas, ordenados por vencimento
  const upcomingCommitments = useMemo(() => {
    type Commitment = {
      id: string
      description: string
      dueDate: string
      value: number
      type: 'boleto' | 'fatura'
      category?: string
    }
    const list: Commitment[] = []

    bills
      .filter((b) => b.status === 'não_pago')
      .forEach((b) => {
        list.push({
          id: b.id,
          description: b.description,
          dueDate: b.due_date || '',
          value: b.value || 0,
          type: 'boleto',
          category: b.category,
        })
      })

    invoices
      .filter((i) => i.status === 'aberta')
      .forEach((i) => {
        const cardName = i.expand?.credit_card?.name || 'Cartão'
        list.push({
          id: i.id,
          description: `Fatura ${cardName}`,
          dueDate: i.due_date || '',
          value: i.total || 0,
          type: 'fatura',
        })
      })

    return list
      .sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0))
      .slice(0, 6)
  }, [bills, invoices])

  // Resumo de cartões (total das faturas atuais)
  const cardsTotal = monthOpenInvoicesTotal

  if (isLoading) return <LoadingState message="Calculando previsão..." />
  if (loadError)
    return (
      <ErrorState message="Não foi possível carregar a previsão financeira." onRetry={refreshAll} />
    )

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

      {/* 4 Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saldo Atual */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold">
            <Wallet className="w-4 h-4 text-slate-500" /> Saldo Atual
          </div>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-2">
            {formatCurrency(totalCurrentBalance, hideValues)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Soma dos saldos das contas</span>
        </Card>

        {/* A Receber */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
            <ArrowUpRight className="w-4 h-4" /> A Receber
          </div>
          <div className="text-2xl font-black text-emerald-600 tabular-nums mt-2">
            +{formatCurrency(monthIncomePending, hideValues)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Receitas pendentes do mês</span>
        </Card>

        {/* A Pagar */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <div className="flex items-center gap-2 text-xs text-orange-600 font-semibold">
            <ArrowDownRight className="w-4 h-4" /> A Pagar
          </div>
          <div className="text-2xl font-black text-orange-600 tabular-nums mt-2">
            −{formatCurrency(toPay, hideValues)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">
            Despesas pendentes + faturas + boletos
          </span>
        </Card>

        {/* Cartões */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <div className="flex items-center gap-2 text-xs text-purple-600 font-semibold">
            <CreditCard className="w-4 h-4" /> Cartões
          </div>
          <div className="text-2xl font-black text-purple-600 tabular-nums mt-2">
            {formatCurrency(cardsTotal, hideValues)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block">Total das faturas abertas</span>
        </Card>
      </div>

      {/* Painel Central de Projeção */}
      <Card
        className={`rounded-2xl p-6 shadow-sm border ${
          isPositive
            ? 'bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-emerald-700'
            : 'bg-gradient-to-br from-red-600 to-rose-700 text-white border-red-700'
        }`}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase opacity-80">
              Saldo projetado ao final de {formatMonthYear(selectedMonth)}
            </span>
            <div className="text-3xl sm:text-4xl font-black tabular-nums mt-1">
              {formatCurrency(projectedEndMonthBalance, hideValues)}
            </div>
            <p className="text-xs opacity-80 mt-1">Saldo atual + a receber − a pagar − faturas</p>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-2">
            <Badge className="text-xs font-bold py-1.5 px-3 rounded-xl bg-white/20 backdrop-blur text-white border-0 flex items-center gap-1.5">
              {isPositive ? (
                <>
                  <CheckCircle2 className="w-4 h-4" /> Você deve terminar o mês no azul
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4" /> Atenção: projeção negativa
                </>
              )}
            </Badge>
            <span className="text-[11px] opacity-80 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {daysRemaining} dias restantes no mês
            </span>
          </div>
        </div>

        {/* Equação */}
        <div className="mt-6 pt-5 border-t border-white/20 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-white/10 rounded-xl p-3">
            <span className="opacity-80 block">Saldo atual</span>
            <span className="font-bold tabular-nums">
              {formatCurrency(totalCurrentBalance, hideValues)}
            </span>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <span className="opacity-80 block">+ A receber</span>
            <span className="font-bold tabular-nums">
              +{formatCurrency(monthIncomePending, hideValues)}
            </span>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <span className="opacity-80 block">− A pagar</span>
            <span className="font-bold tabular-nums">
              −{formatCurrency(monthExpensePending, hideValues)}
            </span>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <span className="opacity-80 block">− Faturas</span>
            <span className="font-bold tabular-nums">
              −{formatCurrency(monthOpenInvoicesTotal, hideValues)}
            </span>
          </div>
        </div>
      </Card>

      {/* Gráfico de Projeção Diária */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-1">
          Evolução prevista do saldo
        </h3>
        <p className="text-xs text-slate-500 mb-6">
          Projeção do seu saldo até o fim do mês considerando receitas e compromissos agendados
        </p>

        <div className="flex items-end gap-2 sm:gap-4 h-44 pt-4 border-b border-slate-100 dark:border-slate-800">
          {dailyProjection.map((item, idx) => {
            const values = dailyProjection.map((p) => p.projected)
            const min = Math.min(...values)
            const max = Math.max(...values)
            const heightPct =
              max > min
                ? Math.max(
                    20,
                    Math.min(100, Math.round(((item.projected - min) / (max - min)) * 80 + 20)),
                  )
                : 60
            const positive = item.projected >= 0

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col items-center gap-2 h-full justify-end min-w-0"
              >
                <span
                  className={`text-[10px] font-bold tabular-nums hidden sm:block ${
                    positive ? 'text-emerald-600' : 'text-red-500'
                  }`}
                >
                  {formatCurrency(item.projected, hideValues)}
                </span>
                <div
                  style={{ height: `${heightPct}%` }}
                  className={`w-full max-w-[44px] rounded-t-lg transition-all ${
                    positive
                      ? 'bg-gradient-to-t from-emerald-600 to-teal-400'
                      : 'bg-gradient-to-t from-red-500 to-rose-400'
                  }`}
                />
                <span className="text-[11px] font-medium text-slate-400">{item.label}</span>
              </div>
            )
          })}
        </div>
      </Card>

      {/* Próximos compromissos */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Próximos compromissos
            </h3>
            <p className="text-xs text-slate-500">Boletos e faturas ordenados por vencimento</p>
          </div>
          <TrendingUp className="w-5 h-5 text-slate-400" />
        </div>

        {upcomingCommitments.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            Nenhum compromisso pendente. Você está em dia! 🎉
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {upcomingCommitments.map((c) => {
              const todayStr = new Date().toISOString().slice(0, 10)
              const dueDay = (c.dueDate || '').slice(0, 10)
              const isOverdue = dueDay < todayStr
              return (
                <div key={c.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        c.type === 'fatura'
                          ? 'bg-purple-50 text-purple-600 dark:bg-purple-950/40'
                          : 'bg-orange-50 text-orange-600 dark:bg-orange-950/40'
                      }`}
                    >
                      {c.type === 'fatura' ? (
                        <CreditCard className="w-4 h-4" />
                      ) : (
                        <Receipt className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate block">
                        {c.description}
                      </span>
                      <span
                        className={`text-[11px] ${
                          isOverdue ? 'text-red-500 font-semibold' : 'text-slate-400'
                        }`}
                      >
                        {isOverdue ? 'Vencida · ' : ''}Venc: {formatDate(c.dueDate)}
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-sm font-extrabold tabular-nums text-slate-900 dark:text-white">
                      {formatCurrency(c.value, hideValues)}
                    </div>
                    <Badge
                      variant="outline"
                      className={`text-[9px] py-0 px-1.5 font-medium ${
                        c.type === 'fatura'
                          ? 'text-purple-600 border-purple-200'
                          : 'text-orange-600 border-orange-200'
                      }`}
                    >
                      {c.type === 'fatura' ? 'Fatura' : 'Boleto'}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>
    </div>
  )
}
