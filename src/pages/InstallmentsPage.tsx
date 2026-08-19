import React, { useState } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, CATEGORY_SUGGESTIONS } from '@/lib/constants'
import { Installment } from '@/types/finance'
import {
  Layers,
  Plus,
  Trash2,
  Calendar,
  CreditCard as CreditCardIcon,
  CheckCircle2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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

export default function InstallmentsPage() {
  const { installments, creditCards, createInstallment, deleteInstallment } = useFinance()
  const { hideValues } = useAuth()

  const [modalOpen, setModalOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [totalValue, setTotalValue] = useState('')
  const [totalInstallments, setTotalInstallments] = useState('12')
  const [category, setCategory] = useState('Compras')
  const [creditCardId, setCreditCardId] = useState('')
  const [startDate, setStartDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const total = parseFloat(totalValue.replace(',', '.'))
    const count = parseInt(totalInstallments, 10)

    if (isNaN(total) || total <= 0 || isNaN(count) || count < 2) {
      setError('Informe um valor total e número de parcelas (mínimo 2x).')
      return
    }

    const instValue = Number((total / count).toFixed(2))

    setLoading(true)
    try {
      await createInstallment({
        description: description.trim(),
        total_value: total,
        installment_value: instValue,
        total_installments: count,
        current_installment: 1,
        category,
        credit_card: creditCardId || undefined,
        start_date: `${startDate} 12:00:00.000Z`,
      })
      setModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setError(errorObj?.message || 'Erro ao registrar parcelamento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Parcelamentos</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe compras parceladas, parcelas restantes e prazos
          </p>
        </div>
        <Button
          onClick={() => {
            setDescription('')
            setTotalValue('')
            setTotalInstallments('12')
            setCategory('Compras')
            setCreditCardId(creditCards[0]?.id || '')
            setStartDate(new Date().toISOString().slice(0, 10))
            setError('')
            setModalOpen(true)
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" /> Novo Parcelamento
        </Button>
      </div>

      {installments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-sm">Nenhum parcelamento ativo.</p>
          <Button onClick={() => setModalOpen(true)} variant="outline" className="mt-4 rounded-xl">
            Registrar Compra Parcelada
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {installments.map((inst) => {
            const cardName = creditCards.find((c) => c.id === inst.credit_card)?.name
            const current = inst.current_installment || 1
            const total = inst.total_installments || 1
            const progress = Math.min(100, Math.round((current / total) * 100))

            return (
              <Card
                key={inst.id}
                className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-[#121A2B] p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        {inst.description}
                      </h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-[10px] font-mono">
                          Parcela {current}/{total}
                        </Badge>
                        {inst.category && (
                          <span className="text-[10px] text-slate-400">• {inst.category}</span>
                        )}
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteInstallment(inst.id)}
                      className="h-7 w-7 text-slate-400 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-slate-400">Total da Compra:</span>
                      <div className="font-bold text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(inst.total_value, hideValues)}
                      </div>
                    </div>
                    <div>
                      <span className="text-slate-400">Valor Parcela:</span>
                      <div className="font-bold text-emerald-600 tabular-nums">
                        {formatCurrency(inst.installment_value, hideValues)}
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="mt-4 space-y-1">
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Progresso do pagamento</span>
                      <span>{progress}%</span>
                    </div>
                    <Progress value={progress} className="h-2 rounded-full" />
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Início: {formatDate(inst.start_date)}</span>
                  {cardName && <span className="font-semibold text-purple-600">{cardName}</span>}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Novo Parcelamento */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              Novo Parcelamento
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label htmlFor="inst-desc">Descrição da Compra *</Label>
              <Input
                id="inst-desc"
                placeholder="Ex: Notebook Dell, Smartphone, Sofá"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="inst-val">Valor Total (R$) *</Label>
                <Input
                  id="inst-val"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                  required
                  className="h-10 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="inst-count">Nº de Parcelas *</Label>
                <Input
                  id="inst-count"
                  type="number"
                  min={2}
                  max={72}
                  value={totalInstallments}
                  onChange={(e) => setTotalInstallments(e.target.value)}
                  required
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                <Label>Cartão Utilizado</Label>
                <Select value={creditCardId} onValueChange={setCreditCardId}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhum</SelectItem>
                    {creditCards.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="inst-start">Data da 1ª Parcela</Label>
              <Input
                id="inst-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="h-10 rounded-xl"
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
                {loading ? 'Criando parcelas...' : 'Gerar Parcelamento'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
