import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Investment, InvestmentContributionType } from '@/types/finance'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useToast } from '@/hooks/use-toast'
import { Loader2, PlusCircle, ArrowDownCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/constants'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  investment: Investment | null
}

export default function AporteModal({ open, onOpenChange, investment }: Props) {
  const { createContribution } = useFinance()
  const { toast } = useToast()

  const [type, setType] = useState<InvestmentContributionType>('compra')
  const [value, setValue] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  if (!investment) return null

  const isVariableOrCrypto =
    [
      'acao',
      'fii',
      'etf',
      'bdr',
      'fiagro',
      'bitcoin',
      'ethereum',
      'cripto_alt',
      'acao_us',
      'etf_internacional',
    ].includes(investment.type) ||
    investment.category_group === 'cripto' ||
    investment.category_group === 'renda_variavel'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const qtyNum = parseFloat(quantity.replace(',', '.')) || undefined
    const unitPriceNum = parseFloat(unitPrice.replace(',', '.')) || undefined
    let valNum = parseFloat(value.replace(',', '.')) || 0

    if (valNum === 0 && qtyNum && unitPriceNum) {
      valNum = qtyNum * unitPriceNum
    }

    if (valNum <= 0 && (!qtyNum || !unitPriceNum)) {
      toast({
        title: 'Valor obrigatório',
        description: 'Informe o valor total do aporte ou quantidade e preço unitário.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      await createContribution({
        investment: investment.id,
        type,
        value: valNum,
        quantity: qtyNum,
        unit_price: unitPriceNum,
        date: new Date(date).toISOString(),
        notes: notes.trim() || undefined,
      })

      toast({
        title: type === 'compra' ? 'Aporte registrado!' : 'Venda/Resgate registrado!',
        description: 'Os saldos e preço médio foram recalculados.',
      })
      onOpenChange(false)
      setValue('')
      setQuantity('')
      setUnitPrice('')
      setNotes('')
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar aporte',
        description: err.message || 'Falha ao salvar movimentação.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-white dark:bg-[#0f1626] border-slate-200 dark:border-slate-800 p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {type === 'compra' ? (
              <PlusCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <ArrowDownCircle className="w-5 h-5 text-rose-500" />
            )}
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              {type === 'compra' ? 'Novo Aporte' : 'Registrar Resgate / Venda'}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs text-slate-500 dark:text-slate-400">
            Ativo:{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {investment.name}
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Tipo de Operação */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tipo de Movimentação
            </Label>
            <div className="grid grid-cols-2 gap-2 mt-1">
              <button
                type="button"
                onClick={() => setType('compra')}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                  type === 'compra'
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                + Compra / Aporte
              </button>
              <button
                type="button"
                onClick={() => setType('venda')}
                className={`py-2 rounded-xl text-xs font-bold border transition-colors ${
                  type === 'venda'
                    ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-500 text-rose-700 dark:text-rose-300'
                    : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                }`}
              >
                - Venda / Resgate
              </button>
            </div>
          </div>

          {/* Quantidade e Preço Unitário para RV / Cripto */}
          {isVariableOrCrypto ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Quantidade
                </Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="Ex: 50 ou 0.01"
                  value={quantity}
                  onChange={(e) => {
                    setQuantity(e.target.value)
                    const q = parseFloat(e.target.value) || 0
                    const p = parseFloat(unitPrice) || 0
                    if (q > 0 && p > 0) setValue(String((q * p).toFixed(2)))
                  }}
                  className="mt-1 text-sm"
                  required
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Preço Unitário (R$)
                </Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="Ex: 35.20"
                  value={unitPrice}
                  onChange={(e) => {
                    setUnitPrice(e.target.value)
                    const p = parseFloat(e.target.value) || 0
                    const q = parseFloat(quantity) || 0
                    if (q > 0 && p > 0) setValue(String((q * p).toFixed(2)))
                  }}
                  className="mt-1 text-sm"
                  required
                />
              </div>
            </div>
          ) : null}

          {/* Valor Total */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Valor Total (R$) *
            </Label>
            <Input
              type="number"
              step="any"
              placeholder="Ex: 1000.00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
              required
            />
          </div>

          {/* Data */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Data da Operação
            </Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 text-sm"
              required
            />
          </div>

          {/* Notas */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Notas / Motivo (opcional)
            </Label>
            <Textarea
              placeholder="Ex: Aporte mensal recorrente..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 text-sm resize-none h-16"
            />
          </div>

          <DialogFooter className="pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
