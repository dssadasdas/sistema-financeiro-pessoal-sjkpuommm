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
import { Investment, InvestmentEarningType } from '@/types/finance'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useToast } from '@/hooks/use-toast'
import { Loader2, DollarSign } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  investment: Investment | null
}

export default function EarningsModal({ open, onOpenChange, investment }: Props) {
  const { createEarning } = useFinance()
  const { toast } = useToast()

  const [type, setType] = useState<InvestmentEarningType>('dividendo')
  const [value, setValue] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  if (!investment) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const valNum = parseFloat(value.replace(',', '.')) || 0
    if (valNum <= 0) {
      toast({
        title: 'Valor obrigatório',
        description: 'Informe um valor de rendimento maior que zero.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      await createEarning({
        investment: investment.id,
        type,
        value: valNum,
        date: new Date(date).toISOString(),
        notes: notes.trim() || undefined,
      })

      toast({
        title: 'Provento registrado com sucesso!',
        description: 'O rendimento foi adicionado ao histórico do ativo.',
      })
      onOpenChange(false)
      setValue('')
      setNotes('')
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar rendimento',
        description: err.message || 'Falha ao salvar provento.',
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
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white">
              Registrar Rendimento / Provento
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
          {/* Tipo de Provento */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Tipo de Rendimento
            </Label>
            <Select value={type} onValueChange={(v) => setType(v as InvestmentEarningType)}>
              <SelectTrigger className="mt-1 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dividendo">Dividendo</SelectItem>
                <SelectItem value="jcp">Juros sobre Capital Próprio (JCP)</SelectItem>
                <SelectItem value="rendimento_fii">Rendimento de FII / Fiagro</SelectItem>
                <SelectItem value="cupom">Cupom Semestral / Anual</SelectItem>
                <SelectItem value="juros">Juros / Rendimento da Aplicação</SelectItem>
                <SelectItem value="outro">Outro Rendimento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Valor */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Valor Líquido Recebido (R$) *
            </Label>
            <Input
              type="number"
              step="any"
              placeholder="Ex: 150.00"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
              required
            />
          </div>

          {/* Data */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Data do Pagamento
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
              Notas / Observação (opcional)
            </Label>
            <Textarea
              placeholder="Ex: Pagamento referente ao 3º trimestre..."
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
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Rendimento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
