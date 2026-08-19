import React, { useState } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import {
  formatCurrency,
  formatMonthYear,
  CATEGORY_SUGGESTIONS,
  CATEGORY_COLORS,
} from '@/lib/constants'
import { PieChart, Plus, Edit2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function BudgetPage() {
  const { budgets, saveBudget } = useFinance()
  const { hideValues } = useAuth()

  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [modalOpen, setModalOpen] = useState(false)
  const [category, setCategory] = useState('Alimentação')
  const [limitValue, setLimitValue] = useState('')
  const [loading, setLoading] = useState(false)

  // Filtra orçamentos do mês selecionado
  const monthBudgets = budgets.filter((b) => b.month === selectedMonth)

  const totalBudgeted = monthBudgets.reduce((acc, b) => acc + (b.limit_value || 0), 0)
  const totalSpent = monthBudgets.reduce((acc, b) => acc + (b.spent || 0), 0)
  const overallPercentage = totalBudgeted > 0 ? Math.round((totalSpent / totalBudgeted) * 100) : 0

  const handleOpenEdit = (cat: string, currentLimit: number) => {
    setCategory(cat)
    setLimitValue(String(currentLimit))
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(limitValue.replace(',', '.'))
    if (isNaN(num) || num <= 0) return

    setLoading(true)
    try {
      await saveBudget(category, num, selectedMonth)
      setModalOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
            Orçamento Mensal por Categoria
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Defina limites de gastos e monitore seu consumo em tempo real
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-10 w-44 rounded-xl font-bold text-xs"
          />
          <Button
            onClick={() => {
              setCategory('Alimentação')
              setLimitValue('1000')
              setModalOpen(true)
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
          >
            <Plus className="w-4 h-4" /> Definir Limite
          </Button>
        </div>
      </div>

      {/* Card Resumo Global do Mês */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase text-slate-400">
              Total Orçado em {formatMonthYear(selectedMonth)}
            </span>
            <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
              {formatCurrency(totalBudgeted, hideValues)}
            </div>
            <span className="text-xs text-slate-500 mt-1 block">
              Gasto realizado:{' '}
              <strong className="text-orange-600">{formatCurrency(totalSpent, hideValues)}</strong>
            </span>
          </div>

          <div className="text-right sm:w-64 space-y-1.5">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-slate-500">Consumo Geral:</span>
              <span
                className={`font-bold ${
                  overallPercentage > 90
                    ? 'text-red-600'
                    : overallPercentage >= 70
                      ? 'text-amber-600'
                      : 'text-emerald-600'
                }`}
              >
                {overallPercentage}%
              </span>
            </div>
            <Progress value={overallPercentage} className="h-3 rounded-full" />
          </div>
        </div>
      </Card>

      {/* Grid de Cards por Categoria */}
      {monthBudgets.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-sm">
            Nenhum orçamento configurado para {formatMonthYear(selectedMonth)}.
          </p>
          <Button onClick={() => setModalOpen(true)} variant="outline" className="mt-4 rounded-xl">
            Definir Primeiro Limite
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {monthBudgets.map((b) => {
            const spent = b.spent || 0
            const limit = b.limit_value || 1
            const pct = b.percentage || 0
            const remaining = Math.max(0, limit - spent)

            // Cores: <70% verde, 70-90% âmbar, >90% vermelho
            let statusColor = 'text-emerald-600'
            let badgeBg =
              'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
            if (pct > 90) {
              statusColor = 'text-red-600'
              badgeBg = 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
            } else if (pct >= 70) {
              statusColor = 'text-amber-600'
              badgeBg = 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
            }

            return (
              <Card
                key={b.id}
                className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: CATEGORY_COLORS[b.category] || '#64748B' }}
                      />
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {b.category}
                      </h3>
                    </div>

                    <button
                      onClick={() => handleOpenEdit(b.category, b.limit_value)}
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                      title="Editar Limite"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-slate-400">Gasto Atual:</span>
                      <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(spent, hideValues)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Limite Mensal:</span>
                      <div className="text-lg font-black text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatCurrency(limit, hideValues)}
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso Colorida */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Consumido:</span>
                      <span className={statusColor}>{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2 rounded-full" />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    Restante:{' '}
                    <strong className="text-slate-700 dark:text-slate-300 font-semibold">
                      {formatCurrency(remaining, hideValues)}
                    </strong>
                  </span>
                  <Badge className={`text-[10px] py-0 px-2 font-bold ${badgeBg} border-0`}>
                    {pct > 90 ? 'Atenção' : pct >= 70 ? 'Alerta' : 'No limite'}
                  </Badge>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Definir Limite */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              Definir Orçamento de Categoria
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {CATEGORY_SUGGESTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="bg-lim">
                Limite de Gastos para {formatMonthYear(selectedMonth)} (R$) *
              </Label>
              <Input
                id="bg-lim"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={limitValue}
                onChange={(e) => setLimitValue(e.target.value)}
                required
                className="h-11 rounded-xl font-bold text-base"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              >
                {loading ? 'Salvando...' : 'Salvar Orçamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
