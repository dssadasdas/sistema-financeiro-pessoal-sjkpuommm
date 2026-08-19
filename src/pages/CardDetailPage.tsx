import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, BANK_CONFIGS, CATEGORY_COLORS } from '@/lib/constants'
import { CreditCard, Invoice, InvoiceItem } from '@/types/finance'
import {
  ArrowLeft,
  CreditCard as CreditCardIcon,
  UploadCloud,
  CheckCircle2,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  DollarSign,
  AlertCircle,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import InvoiceImportModal from '@/components/modals/InvoiceImportModal'
import pb from '@/lib/pocketbase/client'

export default function CardDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { creditCards, accounts, invoices, payInvoice, refreshAll } = useFinance()
  const { hideValues } = useAuth()

  const card = creditCards.find((c) => c.id === id)

  const [importModalOpen, setImportModalOpen] = useState(false)
  const [payModalOpen, setPayModalOpen] = useState(false)
  const [selectedPayAccount, setSelectedPayAccount] = useState('')
  const [payLoading, setPayLoading] = useState(false)
  const [payError, setPayError] = useState('')

  // Itens da fatura do cartão
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([])
  const [activeInvoice, setActiveInvoice] = useState<Invoice | null>(null)
  const [loadingItems, setLoadingItems] = useState(true)

  // Busca faturas do cartão
  const cardInvoices = invoices.filter((i) => i.credit_card === id)
  const currentOpenInvoice = cardInvoices.find((i) => i.status === 'aberta') || cardInvoices[0]

  const loadInvoiceItems = useCallback(async (invId: string) => {
    setLoadingItems(true)
    try {
      const items = await pb.collection('invoice_items').getFullList<InvoiceItem>({
        filter: `invoice = "${invId}"`,
        sort: '-date',
      })
      setInvoiceItems(items)
    } catch (err) {
      console.warn('Erro ao buscar itens da fatura:', err)
    } finally {
      setLoadingItems(false)
    }
  }, [])

  useEffect(() => {
    if (currentOpenInvoice) {
      setActiveInvoice(currentOpenInvoice)
      loadInvoiceItems(currentOpenInvoice.id)
    } else {
      setLoadingItems(false)
    }
  }, [currentOpenInvoice, loadInvoiceItems])

  if (!card) {
    return (
      <div className="p-8 text-center space-y-4">
        <p className="text-slate-500">Cartão de crédito não encontrado.</p>
        <Button onClick={() => navigate('/cartoes')} variant="outline">
          Voltar para Cartões
        </Button>
      </div>
    )
  }

  const config = BANK_CONFIGS[card.bank] || BANK_CONFIGS['Outro']

  const handlePayInvoice = async () => {
    if (!activeInvoice || !selectedPayAccount) return
    setPayLoading(true)
    setPayError('')
    try {
      await payInvoice(activeInvoice.id, selectedPayAccount)
      setPayModalOpen(false)
      await refreshAll()
      await loadInvoiceItems(activeInvoice.id)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setPayError(errorObj?.message || 'Erro ao processar pagamento da fatura.')
    } finally {
      setPayLoading(false)
    }
  }

  // Limpar apenas importados
  const handleClearImported = async () => {
    if (!activeInvoice) return
    const confirm = window.confirm(
      'Deseja remover todos os lançamentos importados desta fatura? Lançamentos manuais serão mantidos.',
    )
    if (!confirm) return

    try {
      const importedItems = invoiceItems.filter((it) => it.is_imported)
      for (const item of importedItems) {
        await pb
          .collection('invoice_items')
          .delete(item.id)
          .catch(() => {})
      }
      await refreshAll()
      await loadInvoiceItems(activeInvoice.id)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Navigation */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate('/cartoes')}
          className="rounded-xl"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            {card.name}
          </h2>
          <span className="text-xs text-slate-500">
            {card.bank} · Final {card.last_four}
          </span>
        </div>
      </div>

      {/* Cartão Estilizado no Topo */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div
          className={`lg:col-span-1 rounded-2xl p-6 text-white bg-gradient-to-tr ${config.bgGradient} shadow-xl flex flex-col justify-between h-52 relative overflow-hidden`}
        >
          <div className="flex items-center justify-between z-10">
            <span className="font-black text-lg tracking-wider">{config.logoText}</span>
            <Badge className="bg-black/20 text-white border-0 font-mono">
              {card.brand || 'Crédito'}
            </Badge>
          </div>

          <div className="z-10 font-mono text-base tracking-widest text-white/90">
            •••• •••• •••• {card.last_four}
          </div>

          <div className="flex items-end justify-between z-10 text-xs">
            <div>
              <span className="text-[10px] uppercase text-white/70 block">Titular</span>
              <span className="font-bold">{card.name}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase text-white/70 block">Fech / Venc</span>
              <span className="font-bold font-mono">
                {card.closing_day} / {card.due_day}
              </span>
            </div>
          </div>
        </div>

        {/* Resumo da Fatura & Ações */}
        <Card className="lg:col-span-2 rounded-2xl border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between bg-white dark:bg-[#121A2B] shadow-sm">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <span className="text-xs text-slate-400 font-semibold uppercase">
                  Fatura Atual ({activeInvoice?.reference || 'Atual'})
                </span>
                <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
                  {formatCurrency(activeInvoice?.total || card.current_invoice_total, hideValues)}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  className={`text-xs font-bold ${
                    activeInvoice?.status === 'paga'
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                      : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                  }`}
                >
                  {activeInvoice?.status === 'paga' ? 'Fatura Paga' : 'Fatura Aberta'}
                </Badge>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
              <div>
                <span className="text-slate-400">Limite Total:</span>
                <div className="font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                  {formatCurrency(card.limit, hideValues)}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Limite Disponível:</span>
                <div className="font-bold text-emerald-600 tabular-nums">
                  {formatCurrency(card.available_limit, hideValues)}
                </div>
              </div>
              <div>
                <span className="text-slate-400">Vencimento:</span>
                <div className="font-bold text-slate-700 dark:text-slate-300">
                  {formatDate(activeInvoice?.due_date) || `Dia ${card.due_day}`}
                </div>
              </div>
            </div>
          </div>

          {/* Botões Importar Fatura / Pagar Fatura / Limpar */}
          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setImportModalOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 shadow-sm"
              >
                <Sparkles className="w-4 h-4" /> Importar Fatura (IA)
              </Button>

              {invoiceItems.some((it) => it.is_imported) && (
                <Button
                  onClick={handleClearImported}
                  variant="outline"
                  className="rounded-xl text-xs text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/60 dark:hover:bg-red-950/40"
                >
                  Limpar Importação
                </Button>
              )}
            </div>

            {activeInvoice?.status !== 'paga' && (
              <Button
                onClick={() => {
                  setSelectedPayAccount(accounts[0]?.id || '')
                  setPayModalOpen(true)
                }}
                className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-xl text-xs font-bold gap-1.5"
              >
                <DollarSign className="w-4 h-4" /> Pagar Fatura
              </Button>
            )}
          </div>
        </Card>
      </div>

      {/* Lista de Compras da Fatura Atual */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 shadow-sm bg-white dark:bg-[#121A2B]">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-5 h-5 text-purple-600" />
            Compras da Fatura Atual ({invoiceItems.length})
          </h3>
        </div>

        {loadingItems ? (
          <div className="p-8 text-center text-xs text-slate-400">Carregando compras...</div>
        ) : invoiceItems.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-xs">
            Nenhuma compra lançada ou importada nesta fatura. Use o botão "Importar Fatura" acima.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
            {invoiceItems.map((item) => (
              <div
                key={item.id}
                className="py-3 sm:py-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center font-bold text-xs flex-shrink-0">
                    <CreditCardIcon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-900 dark:text-white truncate">
                        {item.description}
                      </span>
                      {item.is_imported && (
                        <Badge className="text-[9px] py-0 px-1 bg-teal-100 text-teal-800 dark:bg-teal-950/60 dark:text-teal-300 border-0 font-medium">
                          importado
                        </Badge>
                      )}
                      {item.installments && (
                        <span className="text-[10px] font-mono text-slate-400 font-bold">
                          ({item.installments})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>{formatDate(item.date)}</span>
                      {item.category && (
                        <span
                          className="font-medium px-1.5 py-0.2 rounded-full text-[10px]"
                          style={{
                            backgroundColor: (CATEGORY_COLORS[item.category] || '#64748B') + '20',
                            color: CATEGORY_COLORS[item.category] || '#64748B',
                          }}
                        >
                          {item.category}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div className="text-sm font-bold text-slate-900 dark:text-white tabular-nums">
                    {formatCurrency(item.value, hideValues)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Histórico de Faturas Passadas */}
      {cardInvoices.length > 0 && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 shadow-sm bg-white dark:bg-[#121A2B]">
          <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-600" />
            Histórico de Faturas do Cartão
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {cardInvoices.map((inv) => (
              <div
                key={inv.id}
                onClick={() => {
                  setActiveInvoice(inv)
                  loadInvoiceItems(inv.id)
                }}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                  activeInvoice?.id === inv.id
                    ? 'border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/20'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40'
                }`}
              >
                <div>
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                    Fatura {inv.reference}
                  </span>
                  <span className="text-[10px] text-slate-400 block">
                    Venc: {formatDate(inv.due_date)}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-xs tabular-nums text-slate-900 dark:text-white">
                    {formatCurrency(inv.total, hideValues)}
                  </div>
                  <Badge
                    variant="outline"
                    className={`text-[9px] py-0 px-1 font-semibold ${
                      inv.status === 'paga'
                        ? 'text-emerald-600 border-emerald-300'
                        : 'text-amber-600 border-amber-300'
                    }`}
                  >
                    {inv.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Modal Importar Fatura */}
      <InvoiceImportModal
        open={importModalOpen}
        onOpenChange={setImportModalOpen}
        card={card}
        onSuccess={async () => {
          await refreshAll()
          if (activeInvoice) {
            await loadInvoiceItems(activeInvoice.id)
          }
        }}
      />

      {/* Modal Pagar Fatura */}
      <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              Pagar Fatura · {card.name}
            </DialogTitle>
          </DialogHeader>

          {payError && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {payError}
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs">
              <div className="flex justify-between font-semibold">
                <span>Valor Total da Fatura:</span>
                <span className="font-extrabold text-emerald-600 tabular-nums">
                  {formatCurrency(activeInvoice?.total, hideValues)}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                Uma única despesa será criada na conta bancária selecionada sem duplicar seus
                lançamentos.
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                De qual conta saiu o dinheiro? *
              </label>
              <Select value={selectedPayAccount} onValueChange={setSelectedPayAccount}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecione a conta de débito" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: {formatCurrency(acc.current_balance, hideValues)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setPayModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handlePayInvoice}
                disabled={payLoading || !selectedPayAccount}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
              >
                {payLoading ? 'Processando...' : 'Confirmar Pagamento'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
