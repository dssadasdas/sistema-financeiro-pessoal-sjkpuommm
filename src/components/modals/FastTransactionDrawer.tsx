import React, { useState, useEffect, useMemo } from 'react'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
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
  ChevronRight,
  Delete,
  Loader2,
  Repeat,
  Layers,
  CreditCard as CreditCardIcon,
  Building2,
  Tag,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react'

// Sugestões padrão separadas por tipo para melhorar a experiência
const DEFAULT_EXPENSE_CATEGORIES = [
  'Alimentação',
  'Moradia',
  'Transporte',
  'Saúde',
  'Educação',
  'Lazer',
  'Assinaturas',
  'Luz',
  'Água',
  'Combustível',
  'Taxas e tarifas',
  'Compras',
  'Casa',
  'Outros',
]

const DEFAULT_INCOME_CATEGORIES = [
  'Salário',
  'Investimentos',
  'Renda Extra',
  'Vendas',
  'Freelance',
  'Pró-labore',
  'Reembolso',
  'Outros',
]

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

  // Steps: 1 = Valor, 2 = Configuração (Data, Parcelado, Recorrente), 3 = Detalhes (Título, Categoria, Conta/Cartão, Já paguei/recebi)
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [type, setType] = useState<TransactionType | 'transferencia'>('despesa')

  // Step 1: Valor em centavos / string calculadora
  const [rawAmountCents, setRawAmountCents] = useState<number>(0)

  // Step 2: Configurações
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [isParcelada, setIsParcelada] = useState(false)
  const [totalInstallments, setTotalInstallments] = useState(2)
  const [installmentCreditCardId, setInstallmentCreditCardId] = useState('')

  const [isRecorrente, setIsRecorrente] = useState(false)
  const [recurrentFrequency, setRecurrentFrequency] = useState<'mensal' | 'semanal' | 'anual'>(
    'mensal',
  )

  // Step 3: Detalhes
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [accountId, setAccountId] = useState('')
  const [targetAccountId, setTargetAccountId] = useState('') // Para transferências
  const [creditCardId, setCreditCardId] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX')
  const [isPaid, setIsPaid] = useState(false) // Padrão: desligado (não recebeu/pagou ainda)

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
      setIsPaid(false) // Desligado por padrão conforme especificação
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

      // Cartões padrão
      if (creditCards.length > 0) {
        setCreditCardId('none')
        setInstallmentCreditCardId(creditCards[0].id)
      } else {
        setCreditCardId('none')
        setInstallmentCreditCardId('none')
      }
    }
  }, [open, initialType, accounts, creditCards])

  // Se o usuário seleciona um cartão no step 2 para parcelamento, sincronizamos com creditCardId
  useEffect(() => {
    if (isParcelada && installmentCreditCardId && installmentCreditCardId !== 'none') {
      setCreditCardId(installmentCreditCardId)
      setPaymentMethod('Crédito')
    }
  }, [isParcelada, installmentCreditCardId])

  // Categorias filtradas de acordo com o tipo
  const relevantCategories = useMemo(() => {
    if (type === 'transferencia') {
      return ['Transferência']
    }

    let defaultList = CATEGORY_SUGGESTIONS
    if (type === 'receita') {
      defaultList = DEFAULT_INCOME_CATEGORIES
    } else if (type === 'despesa') {
      defaultList = DEFAULT_EXPENSE_CATEGORIES
    }

    const customMatching = customCategories
      .filter((c) => (type === 'receita' || type === 'despesa' ? c.type === type : true))
      .map((c) => c.name)

    const combined = Array.from(new Set([...defaultList, ...customMatching]))
    return combined.sort((a, b) => a.localeCompare(b))
  }, [customCategories, type])

  // Formatação do valor (ex: 5000 centavos -> "R$ 50,00")
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

  const handleAdvanceToStep2 = () => {
    if (rawAmountCents <= 0) {
      setError('Informe um valor maior que zero')
      return
    }
    setError('')
    setStep(2)
  }

  const handleAdvanceToStep3 = () => {
    if (!date) {
      setError('Selecione uma data válida')
      return
    }
    setError('')
    setStep(3)
  }

  const handleGoBack = () => {
    setError('')
    if (step === 3) setStep(2)
    else if (step === 2) setStep(1)
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
        const defaultDesc =
          type === 'receita'
            ? 'Receita rápida'
            : type === 'despesa'
              ? 'Despesa rápida'
              : 'Ajuste rápido'
        const desc = description.trim() || defaultDesc
        const chosenAcc = accountId && accountId !== 'none' ? accountId : undefined

        // Se marcou parcelada
        if (isParcelada && type === 'despesa' && totalInstallments > 1) {
          const chosenCard =
            installmentCreditCardId && installmentCreditCardId !== 'none'
              ? installmentCreditCardId
              : creditCardId && creditCardId !== 'none'
                ? creditCardId
                : undefined

          const installmentVal = Number((numericAmount / totalInstallments).toFixed(2))
          await createInstallment({
            description: desc,
            total_value: numericAmount,
            installment_value: installmentVal,
            total_installments: totalInstallments,
            current_installment: isPaid ? 1 : 1, // Mantém inicial
            category: category || 'Outros',
            credit_card: chosenCard,
            start_date: date,
          })
        } else if (isRecorrente) {
          // Criar conta recorrente
          const chosenCard =
            type === 'despesa' && creditCardId && creditCardId !== 'none' ? creditCardId : undefined
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
          const chosenCard =
            type === 'despesa' && creditCardId && creditCardId !== 'none' ? creditCardId : undefined
          const status = isPaid ? 'realizado' : 'pendente'
          const paid_at = isPaid ? new Date().toISOString() : undefined

          let effectivePaymentMethod = paymentMethod
          if (chosenCard) {
            effectivePaymentMethod = 'Crédito'
          }

          await createTransaction({
            description: desc,
            value: numericAmount,
            category: category || 'Outros',
            date: `${date} 12:00:00.000Z`,
            payment_method: effectivePaymentMethod,
            status,
            type: type as TransactionType,
            account: chosenAcc,
            credit_card: chosenCard,
            source: 'manual',
            paid_at,
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
      colorText: 'text-emerald-600 dark:text-emerald-400',
      bgBadge: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
      icon: ArrowUpRight,
      actionBtn:
        'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-emerald-600/30',
      paidLabel: 'Já recebi',
      unpaidLabel: 'A receber',
      paidDescription: 'Marcar receita como recebida',
    },
    despesa: {
      title: 'Adicionar Despesa',
      prompt: 'qual o valor da sua despesa?',
      colorText: 'text-rose-600 dark:text-rose-400',
      bgBadge: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
      icon: ArrowDownLeft,
      actionBtn: 'bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-rose-600/30',
      paidLabel: 'Já paguei',
      unpaidLabel: 'A pagar',
      paidDescription: 'Marcar despesa como já paga',
    },
    transferencia: {
      title: 'Criar Transferência',
      prompt: 'qual o valor da transferência?',
      colorText: 'text-blue-600 dark:text-blue-400',
      bgBadge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon: ArrowLeftRight,
      actionBtn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-600/30',
      paidLabel: 'Já transferido',
      unpaidLabel: 'Pendente',
      paidDescription: 'Transferência concluída',
    },
    ajuste: {
      title: 'Ajuste de Saldo',
      prompt: 'qual o valor do ajuste?',
      colorText: 'text-blue-600 dark:text-blue-400',
      bgBadge: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
      icon: Repeat,
      actionBtn: 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-blue-600/30',
      paidLabel: 'Já efetivado',
      unpaidLabel: 'Pendente',
      paidDescription: 'Marcar ajuste como efetivado',
    },
  }[type]

  const TypeIcon = typeConfig.icon

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-w-md mx-auto rounded-t-3xl border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] text-slate-900 dark:text-white shadow-2xl p-0 overflow-hidden max-h-[calc(var(--viewport-height,100dvh)-1.5rem)]">
        {/* Top bar com indicador de arrastar, botão voltar e progresso de passos */}
        <div className="pt-3 pb-2.5 px-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="flex items-center gap-2">
            {step > 1 && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleGoBack}
                className="h-8 w-8 rounded-full text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 -ml-1"
                aria-label="Voltar passo"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>
            )}
            <div className="flex items-center gap-2">
              <span className={`p-1.5 rounded-lg ${typeConfig.bgBadge} border`}>
                <TypeIcon className="w-4 h-4" />
              </span>
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                {typeConfig.title}
              </span>
            </div>
          </div>

          {/* Indicador de passos visual */}
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    s === step
                      ? 'w-5 bg-emerald-500'
                      : s < step
                        ? 'w-2 bg-emerald-500/60'
                        : 'w-2 bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium ml-1">
              Passo {step} de 3
            </span>
          </div>
        </div>

        {error && (
          <div className="mx-6 mt-3 p-2.5 text-xs text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800/80 rounded-xl shrink-0">
            {error}
          </div>
        )}

        <div className="p-6 pt-4 overflow-y-auto max-h-[calc(var(--viewport-height,100dvh)-5rem)]">
          {/* ========================================================================= */}
          {/* PASSO 1: CALCULADORA / ENTRADA DE VALOR */}
          {/* ========================================================================= */}
          {step === 1 && (
            <div className="flex flex-col justify-between min-h-[420px] space-y-4">
              {/* Pergunta e Valor Gigante */}
              <div className="py-2">
                <p className="text-xs sm:text-sm font-medium text-slate-600 dark:text-slate-300 mb-1 sm:mb-2">
                  {typeConfig.prompt}
                </p>
                <div className="flex items-baseline gap-1.5 min-w-0 flex-wrap">
                  <span className="text-xl sm:text-2xl font-extrabold text-slate-400 dark:text-slate-500 shrink-0">
                    R$
                  </span>
                  <span
                    className={`text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight tabular-nums break-all ${
                      rawAmountCents > 0
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-400 dark:text-slate-600'
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
                  className="h-13 sm:h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 active:scale-95 text-slate-700 dark:text-slate-300 font-bold text-base flex items-center justify-center transition-all border border-slate-200/60 dark:border-transparent"
                >
                  AC
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Dividir por 2
                    setRawAmountCents((prev) => Math.floor(prev / 2))
                  }}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 active:scale-95 text-slate-700 dark:text-slate-300 font-bold text-base flex items-center justify-center transition-all border border-slate-200/60 dark:border-transparent"
                >
                  ½
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Duplicar
                    setRawAmountCents((prev) => prev * 2)
                  }}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 active:scale-95 text-slate-700 dark:text-slate-300 font-bold text-base flex items-center justify-center transition-all border border-slate-200/60 dark:border-transparent"
                >
                  2x
                </button>
                <button
                  type="button"
                  onClick={handleBackspace}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 active:scale-95 text-rose-600 dark:text-rose-400 font-bold text-lg flex items-center justify-center transition-all border border-slate-200/60 dark:border-transparent"
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
                    className="h-13 sm:h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 active:scale-95 text-slate-900 dark:text-white font-bold text-xl flex items-center justify-center transition-all shadow-xs border border-slate-200/60 dark:border-slate-700/40"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRawAmountCents((prev) => prev + 1000)}
                  className="h-13 sm:h-14 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 active:scale-95 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center transition-all border border-emerald-200/60 dark:border-transparent"
                >
                  +10
                </button>

                {/* Linha 3 */}
                {['4', '5', '6'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleNumClick(digit)}
                    className="h-13 sm:h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 active:scale-95 text-slate-900 dark:text-white font-bold text-xl flex items-center justify-center transition-all shadow-xs border border-slate-200/60 dark:border-slate-700/40"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRawAmountCents((prev) => prev + 5000)}
                  className="h-13 sm:h-14 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 active:scale-95 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center transition-all border border-emerald-200/60 dark:border-transparent"
                >
                  +50
                </button>

                {/* Linha 4 */}
                {['1', '2', '3'].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => handleNumClick(digit)}
                    className="h-13 sm:h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 active:scale-95 text-slate-900 dark:text-white font-bold text-xl flex items-center justify-center transition-all shadow-xs border border-slate-200/60 dark:border-slate-700/40"
                  >
                    {digit}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setRawAmountCents((prev) => prev + 10000)}
                  className="h-13 sm:h-14 rounded-2xl bg-emerald-50 hover:bg-emerald-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 active:scale-95 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center transition-all border border-emerald-200/60 dark:border-transparent"
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
                  className="h-13 sm:h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 active:scale-95 text-slate-700 dark:text-slate-300 font-bold text-base flex items-center justify-center transition-all shadow-xs border border-slate-200/60 dark:border-slate-700/40"
                >
                  00
                </button>
                <button
                  type="button"
                  onClick={() => handleNumClick('0')}
                  className="h-13 sm:h-14 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-700/60 active:scale-95 text-slate-900 dark:text-white font-bold text-xl flex items-center justify-center transition-all shadow-xs border border-slate-200/60 dark:border-slate-700/40"
                >
                  0
                </button>
                <button
                  type="button"
                  onClick={handleAdvanceToStep2}
                  disabled={rawAmountCents <= 0}
                  className={`col-span-2 h-13 sm:h-14 rounded-2xl ${typeConfig.actionBtn} disabled:opacity-40 disabled:cursor-not-allowed font-extrabold text-base flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95`}
                >
                  <span>Avançar</span>
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASSO 2: CONFIGURAÇÃO (Data, Parcelado, Recorrente) */}
          {/* ========================================================================= */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Resumo do Valor */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 gap-2">
                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
                  Valor selecionado:
                </span>
                <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tabular-nums break-all text-right">
                  {formattedValue}
                </span>
              </div>

              {/* Seletor de Data */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="fast-date-step2"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                >
                  <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Data do lançamento</span>
                </Label>
                <Input
                  id="fast-date-step2"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="h-11 w-full rounded-2xl bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-base"
                  required
                />
              </div>

              {/* Switches para Receita/Despesa */}
              {type !== 'transferencia' ? (
                <div className="space-y-3 pt-1">
                  {/* Switch Parcelado (Disponível para Despesas) */}
                  {type === 'despesa' && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/40 hover:border-slate-300 dark:hover:border-slate-600/60 transition-colors">
                        <div className="flex items-center gap-2.5">
                          <Layers className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                          <div>
                            <span className="text-sm font-medium text-slate-800 dark:text-slate-200 block">
                              É{' '}
                              <strong className="text-slate-900 dark:text-white">parcelado?</strong>
                            </span>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400">
                              Dividir a compra em parcelas
                            </span>
                          </div>
                        </div>
                        <Switch
                          checked={isParcelada}
                          onCheckedChange={(val) => {
                            setIsParcelada(val)
                            if (val) setIsRecorrente(false)
                          }}
                        />
                      </div>

                      {/* Campos extras se Parcelado estiver ligado */}
                      {isParcelada && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/40 animate-in fade-in-50 duration-200">
                          <div className="space-y-1">
                            <Label className="text-xs text-slate-700 dark:text-slate-300">
                              Nº de Parcelas
                            </Label>
                            <Select
                              value={String(totalInstallments)}
                              onValueChange={(val) => setTotalInstallments(Number(val))}
                            >
                              <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-h-48">
                                {[2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 24, 36, 48].map((n) => (
                                  <SelectItem key={n} value={String(n)}>
                                    {n}x de R${' '}
                                    {(rawAmountCents / 100 / n).toFixed(2).replace('.', ',')}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="space-y-1">
                            <Label className="text-xs text-slate-700 dark:text-slate-300">
                              Cartão de Crédito
                            </Label>
                            <Select
                              value={installmentCreditCardId}
                              onValueChange={setInstallmentCreditCardId}
                            >
                              <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                                <SelectValue placeholder="Selecione o cartão" />
                              </SelectTrigger>
                              <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                                <SelectItem value="none">Nenhum cartão</SelectItem>
                                {creditCards.map((c) => (
                                  <SelectItem key={c.id} value={c.id}>
                                    {c.name} (•••• {c.last_four})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Switch Recorrente (Para Despesas e Receitas) */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/40 hover:border-slate-300 dark:hover:border-slate-600/60 transition-colors">
                      <div className="flex items-center gap-2.5">
                        <Repeat className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <div>
                          <span className="text-sm font-medium text-slate-800 dark:text-slate-200 block">
                            É{' '}
                            <strong className="text-slate-900 dark:text-white">recorrente?</strong>
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400">
                            Repetir automaticamente periodicamente
                          </span>
                        </div>
                      </div>
                      <Switch
                        checked={isRecorrente}
                        onCheckedChange={(val) => {
                          setIsRecorrente(val)
                          if (val) setIsParcelada(false)
                        }}
                      />
                    </div>

                    {/* Frequência se Recorrente estiver ligado */}
                    {isRecorrente && (
                      <div className="p-3.5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/40 animate-in fade-in-50 duration-200">
                        <Label className="text-xs text-slate-700 dark:text-slate-300 mb-1.5 block">
                          Frequência
                        </Label>
                        <Select
                          value={recurrentFrequency}
                          onValueChange={(val: 'mensal' | 'semanal' | 'anual') =>
                            setRecurrentFrequency(val)
                          }
                        >
                          <SelectTrigger className="h-10 rounded-xl bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                            <SelectItem value="mensal">Mensal (todo mês)</SelectItem>
                            <SelectItem value="semanal">Semanal (toda semana)</SelectItem>
                            <SelectItem value="anual">Anual (todo ano)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* Informação para Transferência no Passo 2 */
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/40 text-xs text-slate-700 dark:text-slate-300 space-y-1">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Transferência entre contas
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    Defina a data acima e prossiga para o próximo passo para selecionar a conta de
                    origem e destino.
                  </p>
                </div>
              )}

              {/* Botões do Passo 2: Voltar e Avançar */}
              <div className="pt-4 space-y-2.5">
                <Button
                  type="button"
                  onClick={handleAdvanceToStep3}
                  className={`w-full h-12 rounded-2xl ${typeConfig.actionBtn} font-bold text-base shadow-lg flex items-center justify-center gap-2`}
                >
                  <span>Avançar para Detalhes</span>
                  <ChevronRight className="w-5 h-5" />
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoBack}
                  className="w-full h-11 rounded-2xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent"
                >
                  Voltar ao Valor
                </Button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* PASSO 3: DETALHES (Título, Categoria, Conta/Cartão, Já paguei/recebi) */}
          {/* ========================================================================= */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Resumo do Valor + Data */}
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 gap-2">
                <div className="min-w-0">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 block">
                    Total & Data
                  </span>
                  <span className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tabular-nums break-all">
                    {formattedValue}
                  </span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs text-slate-600 dark:text-slate-300 font-medium">
                    {date.split('-').reverse().join('/')}
                  </span>
                  {isParcelada && (
                    <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold">
                      {totalInstallments}x de R${' '}
                      {(rawAmountCents / 100 / totalInstallments).toFixed(2).replace('.', ',')}
                    </span>
                  )}
                  {isRecorrente && (
                    <span className="text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 block font-semibold capitalize">
                      Recorrente ({recurrentFrequency})
                    </span>
                  )}
                </div>
              </div>

              {/* Título / Descrição */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="fast-desc-step3"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Título / Descrição
                </Label>
                <Input
                  id="fast-desc-step3"
                  placeholder={
                    type === 'transferencia'
                      ? 'Ex: Transferência p/ Poupança'
                      : type === 'receita'
                        ? 'Ex: Salário, Venda, Freelance'
                        : 'Ex: Supermercado, Almoço, Combustível'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="h-11 rounded-2xl bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-emerald-500 text-base"
                />
              </div>

              {/* Se for transferência: Origem e Destino */}
              {type === 'transferencia' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                      Conta de Origem
                    </Label>
                    <Select value={accountId} onValueChange={setAccountId}>
                      <SelectTrigger className="h-11 rounded-2xl bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                        <SelectValue placeholder="Selecione origem" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                        {accounts.map((acc) => (
                          <SelectItem key={acc.id} value={acc.id}>
                            {acc.name} ({acc.bank})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      Conta de Destino
                    </Label>
                    <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                      <SelectTrigger className="h-11 rounded-2xl bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                        <SelectValue placeholder="Selecione destino" />
                      </SelectTrigger>
                      <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
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
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Categoria */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        Categoria
                      </Label>
                      <Select value={category} onValueChange={setCategory}>
                        <SelectTrigger className="h-11 rounded-2xl bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white max-h-56">
                          {relevantCategories.map((cat) => (
                            <SelectItem key={cat} value={cat}>
                              {cat}
                            </SelectItem>
                          ))}
                          <SelectItem value="Outros">Outros</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Conta Bancária */}
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        Conta Bancária
                      </Label>
                      <Select value={accountId} onValueChange={setAccountId}>
                        <SelectTrigger className="h-11 rounded-2xl bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                          <SelectValue placeholder="Selecione conta" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
                          <SelectItem value="none">Nenhuma conta</SelectItem>
                          {accounts.map((acc) => (
                            <SelectItem key={acc.id} value={acc.id}>
                              {acc.name} ({acc.bank})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Cartão de Crédito (apenas para despesas avulsas/não parceladas, ou se quiser vincular) */}
                  {type === 'despesa' && !isParcelada && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                        <CreditCardIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        Cartão de Crédito (opcional)
                      </Label>
                      <Select value={creditCardId} onValueChange={setCreditCardId}>
                        <SelectTrigger className="h-11 rounded-2xl bg-white dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white">
                          <SelectValue placeholder="Selecione o cartão" />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white">
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
              )}

              {/* Switch "Já recebi" / "Já paguei" */}
              {type !== 'transferencia' && !isRecorrente && (
                <div className="pt-1">
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/40 hover:border-slate-300 dark:hover:border-slate-600/60 transition-colors">
                    <div className="flex items-center gap-2.5">
                      {isPaid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                      ) : (
                        <Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      )}
                      <div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200 block">
                          {typeConfig.paidLabel}{' '}
                          <strong className="text-slate-900 dark:text-white">?</strong>
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          {isPaid ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              Lançamento efetivado no saldo
                            </span>
                          ) : (
                            <span>{typeConfig.unpaidLabel} (pendente)</span>
                          )}
                        </span>
                      </div>
                    </div>
                    <Switch checked={isPaid} onCheckedChange={setIsPaid} />
                  </div>
                </div>
              )}

              {/* Botões do Passo 3: Salvar / Voltar */}
              <div className="pt-3 space-y-2.5">
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
                    <span className="flex items-center gap-2">
                      <Check className="w-5 h-5 stroke-[2.5]" />
                      Salvar
                    </span>
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleGoBack}
                  className="w-full h-11 rounded-2xl border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 bg-transparent"
                >
                  Voltar às Configurações
                </Button>
              </div>
            </form>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
