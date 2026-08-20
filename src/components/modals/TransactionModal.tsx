import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { useFinance } from '@/contexts/FinanceDataContext'
import { CATEGORY_SUGGESTIONS } from '@/lib/constants'
import { Transaction, PaymentMethod, TransactionType, TransactionStatus } from '@/types/finance'
import { PlusCircle } from 'lucide-react'

interface TransactionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  transactionToEdit?: Transaction | null
  initialType?: TransactionType
}

export default function TransactionModal({
  open,
  onOpenChange,
  transactionToEdit,
  initialType = 'despesa',
}: TransactionModalProps) {
  const { createTransaction, updateTransaction, accounts, creditCards } = useFinance()

  const [description, setDescription] = useState('')
  const [value, setValue] = useState('')
  const [category, setCategory] = useState('')
  const [customCategory, setCustomCategory] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX')
  const [status, setStatus] = useState<TransactionStatus>('realizado')
  const [type, setType] = useState<TransactionType>(initialType)
  const [accountId, setAccountId] = useState('')
  const [creditCardId, setCreditCardId] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (transactionToEdit) {
      setDescription(transactionToEdit.description)
      setValue(String(transactionToEdit.value))
      setCategory(transactionToEdit.category || 'Outros')
      setDate(
        transactionToEdit.date
          ? transactionToEdit.date.slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      )
      setPaymentMethod(transactionToEdit.payment_method || 'PIX')
      setStatus(transactionToEdit.status || 'realizado')
      setType(transactionToEdit.type || 'despesa')
      setAccountId(transactionToEdit.account || 'none')
      setCreditCardId(transactionToEdit.credit_card || 'none')
    } else {
      setDescription('')
      setValue('')
      setCategory('Alimentação')
      setCustomCategory('')
      setDate(new Date().toISOString().slice(0, 10))
      setPaymentMethod('PIX')
      setStatus('realizado')
      setType(initialType)
      const primaryId = localStorage.getItem('semeia_primary_account_id')
      const defaultAcc = (primaryId && accounts.find((a) => a.id === primaryId)) || accounts[0]
      setAccountId(defaultAcc?.id || 'none')
      setCreditCardId(creditCards[0]?.id || 'none')
    }
  }, [transactionToEdit, initialType, accounts, creditCards, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const numValue = parseFloat(value.replace(',', '.'))
    if (isNaN(numValue) || numValue <= 0) {
      setError('Informe um valor numérico válido maior que zero.')
      return
    }

    const finalCategory = customCategory.trim() ? customCategory.trim() : category

    setLoading(true)
    try {
      const payload: Partial<Transaction> = {
        description: description.trim(),
        value: numValue,
        category: finalCategory,
        date: `${date} 12:00:00.000Z`,
        payment_method: paymentMethod,
        status,
        type,
        account: accountId && accountId !== 'none' ? accountId : undefined,
        credit_card:
          type === 'despesa' && creditCardId && creditCardId !== 'none' ? creditCardId : undefined,
        source: 'manual',
        paid_at: status === 'realizado' ? new Date().toISOString() : undefined,
      }

      if (transactionToEdit) {
        await updateTransaction(transactionToEdit.id, payload)
      } else {
        await createTransaction(payload)
      }

      onOpenChange(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setError(errorObj?.message || 'Erro ao salvar lançamento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] w-full rounded-2xl p-4 sm:p-6 bg-white dark:bg-[#121A2B] scrollbar-thin">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <PlusCircle className="w-5 h-5 text-emerald-600" />
            {transactionToEdit ? 'Editar Lançamento' : 'Novo Lançamento'}
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Tipo Selector */}
          <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setType('receita')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'receita'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              + Receita
            </button>
            <button
              type="button"
              onClick={() => setType('despesa')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'despesa'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              − Despesa
            </button>
            <button
              type="button"
              onClick={() => setType('ajuste')}
              className={`py-2 text-xs font-bold rounded-lg transition-all ${
                type === 'ajuste'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900'
              }`}
            >
              Ajuste
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="tx-desc">Descrição *</Label>
              <Input
                id="tx-desc"
                placeholder="Ex: Supermercado, Salário"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="h-10 rounded-xl text-base"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="tx-val">Valor (R$) *</Label>
              <Input
                id="tx-val"
                type="number"
                step="0.01"
                inputMode="decimal"
                placeholder="0,00"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                required
                className="h-10 rounded-xl font-bold text-base"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Selecione categoria" />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {CATEGORY_SUGGESTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                  <SelectItem value="Outro">Outro (Digitar)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="tx-date">Data</Label>
              <Input
                id="tx-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-10 w-full rounded-xl text-base"
              />
            </div>
          </div>

          {category === 'Outro' && (
            <div className="space-y-1">
              <Label htmlFor="tx-custom-cat">Nome da Categoria Livre</Label>
              <Input
                id="tx-custom-cat"
                placeholder="Digite a nova categoria"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Forma de Pagamento</Label>
              <Select
                value={paymentMethod}
                onValueChange={(val) => setPaymentMethod(val as PaymentMethod)}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="PIX">PIX</SelectItem>
                  <SelectItem value="Débito">Débito</SelectItem>
                  <SelectItem value="Crédito">Crédito</SelectItem>
                  <SelectItem value="Boleto">Boleto</SelectItem>
                  <SelectItem value="Transferência">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(val) => setStatus(val as TransactionStatus)}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realizado">Realizado (Efetivado)</SelectItem>
                  <SelectItem value="pendente">Pendente (Agendado)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Vínculo a Conta / Cartão */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Conta Bancária</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Selecione a conta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma conta</SelectItem>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({acc.bank})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {type === 'despesa' && (
              <div className="space-y-1">
                <Label>Cartão de Crédito</Label>
                <Select value={creditCardId || 'none'} onValueChange={setCreditCardId}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecione o cartão" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum cartão</SelectItem>
                    {creditCards.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} (•••• {c.last_four})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="pt-3 gap-2 flex-col-reverse sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="w-full sm:w-auto rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
            >
              {loading ? 'Salvando...' : 'Salvar Lançamento'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
