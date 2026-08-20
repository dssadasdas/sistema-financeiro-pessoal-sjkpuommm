import React, { useState, useEffect, useMemo } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFinance } from '@/contexts/FinanceDataContext'
import { CATEGORY_SUGGESTIONS } from '@/lib/constants'
import { TransactionType, PaymentMethod } from '@/types/finance'
import {
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  Delete,
  Loader2,
  Repeat,
  Layers,
} from 'lucide-react'

interface FastTransactionDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialType?: TransactionType | 'transferencia'
  onSuccess?: () => void
}

export default function FastTransactionDrawer({
  open,
  onOpenChange,
  initialType = 'despesa',
  onSuccess,
}: FastTransactionDrawerProps) {
  const {
    createTransaction,
    createTransfer,
    createRecurringBill,
    createInstallment,
    accounts,
    creditCards,
    customCategories,
  } = useFinance()

  // Steps: 1 = Valor (Calculadora/NumPad), 2 = Detalhes (Descrição, Categoria, Data, Conta/Cartão, Switches)
  const [step, setStep] = useState<1 | 2>(1)
  const [type, setType] = useState<TransactionType | 'transferencia'>('despesa')

  // Step 1: Valor em centavos / string calculadora
  const [rawAmountCents, setRawAmountCents] = useState<number>(0)
  // Step 2: Form fields
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [accountId, setAccountId] = useState('')
  const [targetAccountId, setTargetAccountId] = useState('')
  const [creditCardId, setCreditCardId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX')

  // Switches
  const [isParcelada, setIsParcelada] = useState(false)
  const [totalInstallments, setTotalInstallments] = useState(2)

  const [isRecorrente, setIsRecorrente] = useState(false)
  const [recurrentFrequency, setRecurrentFrequency] = useState<'mensal' | 'semanal' | 'anual'>(
    'mensal',
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Reseta estado quando abre ou quando muda initialType
  useEffect(() => {
    if (open) {
      setStep(1)
      const effectiveType = initialType || 'despesa'
      setType(effectiveType)
      setRawAmountCents(0)
      setDescription('')
      setDate(new Date().toISOString().slice(0, 10))
      setIsParcelada(false)
      setTotalInstallments(2)
      setIsRecorrente(false)
      setRecurrentFrequency('mensal')
      setError('')

      // Categoria padrão
      if (effectiveType === 'receita') {
        setCategory('Salário')
        setPaymentMethod('PIX')
      } else if (effectiveType === 'despesa') {
        setCategory('Alimentação')
        setPaymentMethod('PIX')
      } else if (effectiveType === 'transferencia') {
        setCategory('Transferência')
        setPaymentMethod('Transferência')
      } else {
        setCategory('Ajuste')
        setPaymentMethod('Transferência')
      }

      // Contas padrão
      if (accounts.length > 0) {
        setAccountId(accounts[0].id)
        if (accounts.length > 1) {
          setTargetAccountId(accounts[1].id)
        } else {
          setTargetAccountId(accounts[0].id)
        }
      } else {
        setAccountId('')
        setTargetAccountId('')
      }

      if (creditCards.length > 0) {
        setCreditCardId(creditCards[0].id)
      } else {
        setCreditCardId('none')
      }
    }
  }, [open, initialType, accounts, creditCards])

  // Categorias combinadas
  const allCategories = useMemo(() => {
    const defaultCats = CATEGORY_SUGGESTIONS
    const customNames = customCategories.map((c) => c.name)
    const combined = Array.from(new Set([...defaultCats, ...customNames]))
    return combined.sort((a, b) => a.localeCompare(b))
  }, [customCategories])

  // Formatação do valor (ex: 5000 centavos -> "50,00")
  const formattedValue = useMemo(() => {
    const val = rawAmountCents / 100
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val)
  }, [rawAmountCents])

  // NumPad actions
  const handleNumClick = (digit: string) => {
    // Máximo 9 dígitos (R$ 9.999.999,99)
    if (rawAmountCents > 99999999) return
    const nextVal = rawAmountCents * 10 + parseInt(digit, 10)
    setRawAmountCents(nextVal)
  }

  const handleBackspace = () => {
    setRawAmountCents(Math.floor(rawAmountCents / 10))
  }

  const handleClear = () => {
    setRawAmountCents(0)
  }

  const handleAdvanceToDetails = () => {
    if (rawAmountCents <= 0) {
      setError('Informe um valor maior que zero')
      return
    }
    setError('')
    setStep(2)
  }

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError('')

    const numericAmount = rawAmountCents / 100
    if (numericAmount <= 0) {
      setError('Informe um valor válido maior que zero.')
      return
    }

    setLoading(true)

    try {
      if (type === 'transferencia') {
        if (!accountId || !targetAccountId) {
          throw new Error('Selecione as contas de origem e destino')
        }
        if (accountId === targetAccountId) {
          throw new Error('A conta de origem e destino devem ser diferentes')
        }
        await createTransfer(
          accountId,
          targetAccountId,
          numericAmount,
          date,
          description.trim() || undefined,
        )
      } else {
        const desc =
          description.trim() || (type === 'receita' ? 'Receita rápida' : 'Despesa rápida')
        const chosenAcc = accountId && accountId !== 'none' ? accountId : undefined
        const chosenCard =
          type === 'despesa' && creditCardId && creditCardId !== 'none' ? creditCardId : undefined

        // Se marcou parcelada
        if (isParcelada && type === 'despesa' && totalInstallments > 1) {
          const installmentVal = Number((numericAmount / totalInstallments).toFixed(2))
          await createInstallment({
            description: desc,
            total_value: numericAmount,
            installment_value: installmentVal,
            total_installments: totalInstallments,
            current_installment: 1,
            category: category || 'Outros',
            credit_card: chosenCard,
            start_date: date,
          })
        } else if (isRecorrente) {
          // Criar conta recorrente
          const day = parseInt(date.split('-')[2] || '1', 10)
          await createRecurringBill({
            description: desc,
            value: numericAmount,
            type: type === 'receita' ? 'receber' : 'pagar',
            category: category || 'Outros',
            frequency: recurrentFrequency,
            due_day: day,
            account: chosenAcc,
            credit_card: chosenCard,
            active: true,
            start_date: date,
            next_date: date,
          })
        } else {
          // Lançamento avulso padrão
          await createTransaction({
            description: desc,
            value: numericAmount,
            category: category || 'Outros',
            date: `${date} 12:00:00.000Z`,
            payment_method: paymentMethod,
            status: 'realizado',
            type: type as TransactionType,
            account: chosenAcc,
            credit_card: chosenCard,
            source: 'manual',
            paid_at: new Date().toISOString(),
          })
        }
      }

      if (onSuccess) onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setError(errorObj?.message || 'Erro ao processar lançamento.')
    } finally {
      setLoading(false)
    }
  }

  // Título e cores dependendo do tipo
  const typeConfig = {
    receita: {
      title: 'Adicionar Receita',
      prompt: 'qual o valor da sua receita?',
      colorText: 'text-emerald-500 dark:text-emerald-400',
      bgBadge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: ArrowUpRight,
      actionBtn:
        'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/30',
    },
    despesa: {
      title: 'Adicionar Despesa',
      prompt: 'qual o valor da sua despesa?',
      colorText: 'text-rose-500 dark:text-rose-400',
      bgBadge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      icon: ArrowDownLeft,
      actionBtn: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-600/30',
    },
    transferencia: {
      title: 'Criar Transferência',
      prompt: 'qual o valor da transferência?',
      colorText: 'text-blue-500 dark:text-blue-400',
      bgBadge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon: ArrowLeftRight,
      actionBtn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-600/30',
    },
    ajuste: {
      title: 'Ajuste de Saldo',
      prompt: 'qual o valor do ajuste?',
      colorText: 'text-blue-500 dark:text-blue-400',
      bgBadge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon: Repeat,
      actionBtn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-600/30',
    },
  }[type]

  const TypeIcon = typeConfig.icon

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-md mx-auto rounded-t-3xl border-t border-slate-200 dark:border-slate-800 bg-[#0f172a] text-white shadow-2xl p-0 overflow-hidden max-h-[92vh]">
        {/* Top bar com indicador de arrastar e título sutil */}
        <div className="pt-3 pb-2 px-6 flex items-center justify-between border-b border-slate-800/60">
          <div className="flex items-center gap-2">
            {step === 2 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setStep(1)}
                className="h-8 w-8 rounded-full text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${typeConfig.bgBadge} border`}>
                <TypeIcon className="w-4 h-4" />
              </span>
              <span className="font-semibold text-sm text-slate-200">{typeConfig.title}</span>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-medium">Passo {step} de 2</div>
        </div>

        {error && (
          <div className="mx-6 mt-3 p-2.5 text-xs text-rose-300 bg-rose-950/60 border border-rose-800/80 rounded-xl">
            {error}
          </div>
        )}

        <div className="p-6 pt-4 overflow-y-auto">
          {/* PASSO 1: CALCULADORA / ENTRADA DE VALOR */}
          {step === 1 && (
            <div className="flex flex-col justify-between min-h-[420px] space-y-4">
              {/* Pergunta e Valor Gigante */}
              <div className="py-2">
                <p className="text-sm font-medium text-slate-300 mb-2">{typeConfig.prompt}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-400">R$</span>
                  <span
                    className={`text-4xl sm:text-5xl font-extrabold tracking-tight tabular-nums ${
                      rawAmountCents > 0 ? 'text-white' : 'text-slate-500'
                    }`}
                  >
                    {(rawAmountCents / 100).toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>

              {/* Teclado Numérico Estilo Calculadora */}
              <div className="grid grid-cols-4 gap-2.5 select-none pt-2">
                {/* Linha 1 */}
                <button
                  type="button"
                  onClick={handleClear}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-slate-300 font-bold text-base flex items-center justify-center transition-all"
                >
                  AC
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Dividir por 2
                    setRawAmountCents((prev) => Math.floor(prev / 2))
                  }}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-slate-300 font-bold text-base flex items-center justify-center transition-all"
                >
                  ½
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Duplicar
                    setRawAmountCents((prev) => prev * 2)
                  }}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-slate-300 font-bold text-base flex items-center justify-center transition-all"
                >
                  2x
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-rose-400 font-bold text-lg flex items-center justify-center transition-all"
                  aria-label="Apagar dígito"
                >
                  <Delete className="w-5 h-5" />
                </button>

                {/* Linha 2 */}
                {['7', '8', '9'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleNumClick(digit)}
                    className="h-13 sm:h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-700/60 active:scale-95 text-white font-bold text-xl flex items-center justify-center transition-all shadow-sm"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRawAmountCents((prev) => prev + 1000)}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-emerald-400 font-bold text-xs flex items-center justify-center transition-all"
                >
                  +10
                </button>

                {/* Linha 3 */}
                {['4', '5', '6'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleNumClick(digit)}
                    className="h-13 sm:h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-700/60 active:scale-95 text-white font-bold text-xl flex items-center justify-center transition-all shadow-sm"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRawAmountCents((prev) => prev + 5000)}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-emerald-400 font-bold text-xs flex items-center justify-center transition-all"
                >
                  +50
                </button>

                {/* Linha 4 */}
                {['1', '2', '3'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleNumClick(digit)}
                    className="h-13 sm:h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-700/60 active:scale-95 text-white font-bold text-xl flex items-center justify-center transition-all shadow-sm"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRawAmountCents((prev) => prev + 10000)}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-800/80 hover:bg-slate-700/80 active:scale-95 text-emerald-400 font-bold text-xs flex items-center justify-center transition-all"
                >
                  +100
                </button>

                {/* Linha 5: 00, 0, avançar */}
                <button
                  type="button"
                  onClick={() => {
                    if (rawAmountCents > 0 && rawAmountCents <= 999999) {
                      setRawAmountCents(rawAmountCents * 100)
                    }
                  }}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-700/60 active:scale-95 text-slate-300 font-bold text-base flex items-center justify-center transition-all shadow-sm"
                >
                  00
                </button>
                <button
                  type="button"
                  onClick={() => handleNumClick('0')}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-800/60 hover:bg-slate-700/60 active:scale-95 text-white font-bold text-xl flex items-center justify-center transition-all shadow-sm"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleAdvanceToDetails}
                  disabled={rawAmountCents <= 0}
                  className={`col-span-2 h-13 sm:h-14 rounded-2xl ${typeConfig.actionBtn} disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95`}
                >
                  <span>Avançar</span>
                  <Check className="w-5 h-5 stroke-[3]" />
                </button>
              </div>
            </div>
          )}

          {/* PASSO 2: DETALHES (Descrição, Categoria, Data, Conta/Cartão, Switches) */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Resumo do Valor */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-800/60 border border-slate-700/60">
                <span className="text-xs text-slate-400 font-medium">Valor selecionado:</span>
                <span className="text-lg font-bold text-white tabular-nums">{formattedValue}</span>
              </div>

              {/* Descrição */}
              <div className="space-y-1.5">
                <Label htmlFor="fast-desc" className="text-xs text-slate-300">
                  Descrição
                </Label>
                <Input
                  id="fast-desc"
                  placeholder={
                    type === 'transferencia'
                      ? 'Ex: Transferência p/ Poupança'
                      : type === 'receita'
                        ? 'Ex: Salário, Venda, Freelance'
                        : 'Ex: Supermercado, Almoço, Combustível'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-11 rounded-2xl bg-slate-800/80 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500"
                  autoFocus
                />
              </div>

              {/* Se for transferência: Origem e Destino */}
              {type === 'transferencia' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Conta Origem</Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                      <SelectTrigger className="h-11 rounded-2xl bg-slate-800/80 border-slate-700 text-white">
                        <SelectValue placeholder="Selecione origem" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({acc.bank})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Conta Destino</Label>
                    <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                      <SelectTrigger className="h-11 rounded-2xl bg-slate-800/80 border-slate-700 text-white">
                        <SelectValue placeholder="Selecione destino" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({acc.bank})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                /* Se for Receita ou Despesa */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Categoria</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-11 rounded-2xl bg-slate-800/80 border-slate-700 text-white">
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-56">
                        {allCategories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-300">Conta Bancária</Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                      <SelectTrigger className="h-11 rounded-2xl bg-slate-800/80 border-slate-700 text-white">
                        <SelectValue placeholder="Selecione conta" />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="none">Nenhuma conta</SelectItem>
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Data */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="fast-date"
                  className="text-xs text-slate-300 flex items-center gap-1.5"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                  qual a data?
                </Label>
                <Input
                  id="fast-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 rounded-2xl bg-slate-800/80 border-slate-700 text-white"
                  required
                />
              </div>

              {/* Seção de Switches estilo screenshot */}
              {type !== 'transferencia' && (
                <div className="space-y-3 pt-2">
                  {type === 'despesa' && (
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40">
                      <div className="flex items-center gap-2.5">
                        <Layers className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-200">
                          ela é <strong className="text-white">parcelada?</strong>
                        </span>
                      </div>
                      <Switch
                        checked={isParcelada}
                        onCheckedChange={(val) => {
                          setIsParcelada(val)
                          if (val) setIsRecorrente(false)
                        }}
                      />
                    </div>
                  )}

                  {isParcelada && type === 'despesa' && (
                    <div className="grid grid-cols-2 gap-3 p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
                      <div className="space-y-1">
                        <Label className="text-xs text-slate-300">Nº de Parcelas</Label>
                        <Select
                          value={String(totalInstallments)}
                          onValueChange={(val) => setTotalInstallments(Number(val))}
                        >
                          <SelectTrigger className="h-10 rounded-xl bg-slate-800 border-slate-700 text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white max-h-48">
                            {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 24, 36, 48].map((n) => (
                              <SelectItem key={n} value={String(n)}>
                                {n}x de R$ {(rawAmountCents / 100 / n).toFixed(2).replace('.', ',')}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-xs text-slate-300">Cartão (opcional)</Label>
                        <Select value={creditCardId} onValueChange={setCreditCardId}>
                          <SelectTrigger className="h-10 rounded-xl bg-slate-800 border-slate-700 text-white">
                            <SelectValue placeholder="Nenhum" />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="none">Nenhum cartão</SelectItem>
                            {creditCards.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-800/50 border border-slate-700/40">
                    <div className="flex items-center gap-2.5">
                      <Repeat className="w-4 h-4 text-slate-400" />
                      <span className="text-sm font-medium text-slate-200">
                        ela é <strong className="text-white">recorrente?</strong>
                      </span>
                    </div>
                    <Switch
                      checked={isRecorrente}
                      onCheckedChange={(val) => {
                        setIsRecorrente(val)
                        if (val) setIsParcelada(false)
                      }}
                    />
                  </div>

                  {isRecorrente && (
                    <div className="p-3 rounded-2xl bg-slate-800/40 border border-slate-700/40">
                      <Label className="text-xs text-slate-300 mb-1.5 block">Frequência</Label>
                      <Select
                        value={recurrentFrequency}
                        onValueChange={(val: 'mensal' | 'semanal' | 'anual') =>
                          setRecurrentFrequency(val)
                        }
                      >
                        <SelectTrigger className="h-10 rounded-xl bg-slate-800 border-slate-700 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                          <SelectItem value="mensal">Mensal (todo mês)</SelectItem>
                          <SelectItem value="semanal">Semanal (toda semana)</SelectItem>
                          <SelectItem value="anual">Anual (todo ano)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              )}

              {/* Botões Salvar / Voltar */}
              <div className="pt-4 space-y-2.5">
                <Button
                  type="submit"
                  disabled={loading}
                  className={`w-full h-12 rounded-2xl ${typeConfig.actionBtn} font-bold text-base shadow-lg`}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" /> Salvando...
                    </span>
                  ) : (
                    'Confirmar Lançamento'
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="w-full h-11 rounded-2xl border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 bg-transparent"
                >
                  Voltar
                </Button>
              </div>
            </form>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
