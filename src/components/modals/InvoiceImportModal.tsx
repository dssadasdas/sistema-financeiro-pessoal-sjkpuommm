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
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useFinance } from '@/contexts/FinanceDataContext'
import { formatCurrency, CATEGORY_SUGGESTIONS } from '@/lib/constants'
import { CreditCard, BankName } from '@/types/finance'
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Lock,
  Sparkles,
  BookmarkPlus,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'

interface ExtractedItem {
  id: string
  date: string
  description: string
  category: string
  value: number
  installments: string
}

interface InvoiceImportModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  card: CreditCard
  onSuccess: () => void
}

const BANKS_LIST: BankName[] = [
  'Nubank',
  'Caixa',
  'Itaú',
  'Bradesco',
  'Santander',
  'Banco do Brasil',
  'Inter',
  'C6',
  'Sicoob',
  'PicPay',
  'Mercado Pago',
  'Neon',
  'Banco CSF/Atacadão',
  'Outro',
]

export default function InvoiceImportModal({
  open,
  onOpenChange,
  card,
  onSuccess,
}: InvoiceImportModalProps) {
  const { saveRule } = useFinance()

  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [activeTab, setActiveTab] = useState<'file' | 'text'>('file')

  const [file, setFile] = useState<File | null>(null)
  const [pdfPassword, setPdfPassword] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [detectedBank, setDetectedBank] = useState<BankName>(card.bank || 'Nubank')

  const [isProcessing, setIsProcessing] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')

  // Preview data
  const [referenceMonth, setReferenceMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [invoiceTotal, setInvoiceTotal] = useState<number>(0)
  const [items, setItems] = useState<ExtractedItem[]>([])
  const [replaceExisting, setReplaceExisting] = useState(true)

  // Reset modal state on open
  useEffect(() => {
    if (open) {
      setStep('upload')
      setFile(null)
      setPdfPassword('')
      setPastedText('')
      setDetectedBank(card.bank || 'Nubank')
      setErrorMessage('')
      setItems([])
      setInvoiceTotal(0)
    }
  }, [open, card])

  // Soma calculada das linhas
  const sumOfItems = items.reduce((acc, it) => acc + (Number(it.value) || 0), 0)
  const mathDiff = Math.abs(sumOfItems - invoiceTotal)
  const isMathLocked = invoiceTotal > 0 && mathDiff > 0.5

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
    }
  }

  const handleProcess = async () => {
    setIsProcessing(true)
    setErrorMessage('')

    try {
      let textToSend = pastedText

      // Parsing nativo CSV/TXT client-side se for arquivo de texto
      if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
        const fileContent = await file.text()
        textToSend = fileContent
      } else if (file && file.name.endsWith('.pdf')) {
        // PDF
        textToSend = `Fatura em PDF enviada: ${file.name}. Detecção de compras para o banco ${card.bank}.`
      }

      if (!textToSend.trim() && !file) {
        setErrorMessage('Insira o arquivo ou cole o texto da fatura.')
        setIsProcessing(false)
        return
      }

      // Chama endpoint /backend/v1/invoices/parse
      const res = await fetch(`${import.meta.env.VITE_POCKETBASE_URL}/backend/v1/invoices/parse`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: pb.authStore.token,
        },
        body: JSON.stringify({
          text: textToSend,
          bank: detectedBank,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar fatura.')
      }

      if (data.detected_bank && BANKS_LIST.includes(data.detected_bank as BankName)) {
        setDetectedBank(data.detected_bank as BankName)
      }

      if (data.reference_month) setReferenceMonth(data.reference_month)
      if (data.due_date) setDueDate(data.due_date)

      const parsedItems: ExtractedItem[] = (data.items || []).map((it: any, index: number) => ({
        id: `item-${index}-${Date.now()}`,
        date: it.date || new Date().toISOString().slice(0, 10),
        description: it.description || 'Compra',
        category: it.category || 'Outros',
        value: Number(it.value) || 0,
        installments: it.installments || '',
      }))

      setItems(parsedItems)

      const detectedTot =
        Number(data.detected_total) || parsedItems.reduce((acc, it) => acc + it.value, 0)
      setInvoiceTotal(detectedTot)

      setStep('preview')
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setErrorMessage(errorObj?.message || 'Falha ao processar arquivo com a IA.')
    } finally {
      setIsProcessing(false)
    }
  }

  const handleUpdateItem = (id: string, field: keyof ExtractedItem, value: any) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleSaveRule = async (keyword: string, category: string) => {
    try {
      await saveRule(keyword, category)
      alert(
        `Regra salva: "${keyword}" será categorizado como "${category}" nas próximas importações.`,
      )
    } catch (e: unknown) {
      const err = e as { message?: string }
      alert(err?.message || 'Erro ao salvar regra.')
    }
  }

  const handleConfirmImport = async () => {
    if (isMathLocked) {
      setErrorMessage(
        `Trava matemática: A soma dos itens (${formatCurrency(sumOfItems)}) difere do total informado (${formatCurrency(invoiceTotal)}). Ajuste as linhas ou o total.`,
      )
      return
    }

    setIsProcessing(true)
    try {
      const authUser = pb.authStore.model
      if (!authUser) throw new Error('Usuário não autenticado')

      // 1. Busca ou cria fatura para este cartão + referenceMonth
      let invoiceRecord: any
      try {
        const existingInvoices = await pb.collection('invoices').getList(1, 1, {
          filter: `user = "${authUser.id}" && credit_card = "${card.id}" && reference = "${referenceMonth}"`,
        })
        if (existingInvoices.items.length > 0) {
          invoiceRecord = existingInvoices.items[0]
          // Atualiza total
          await pb.collection('invoices').update(invoiceRecord.id, {
            total: invoiceTotal,
            due_date: `${dueDate} 12:00:00.000Z`,
          })

          // Se escolheu substituir, apaga itens importados antigos
          if (replaceExisting) {
            const oldItems = await pb.collection('invoice_items').getFullList({
              filter: `invoice = "${invoiceRecord.id}" && is_imported = true`,
            })
            for (const oldIt of oldItems) {
              await pb
                .collection('invoice_items')
                .delete(oldIt.id)
                .catch(() => {})
            }
          }
        } else {
          invoiceRecord = await pb.collection('invoices').create({
            user: authUser.id,
            credit_card: card.id,
            reference: referenceMonth,
            due_date: `${dueDate} 12:00:00.000Z`,
            total: invoiceTotal,
            status: 'aberta',
          })
        }
      } catch (_) {
        invoiceRecord = await pb.collection('invoices').create({
          user: authUser.id,
          credit_card: card.id,
          reference: referenceMonth,
          due_date: `${dueDate} 12:00:00.000Z`,
          total: invoiceTotal,
          status: 'aberta',
        })
      }

      // 2. Salva itens da fatura na collection invoice_items + transactions despesas vinculadas
      for (const it of items) {
        await pb.collection('invoice_items').create({
          invoice: invoiceRecord.id,
          description: it.description,
          value: it.value,
          category: it.category,
          date: `${it.date} 12:00:00.000Z`,
          installments: it.installments,
          is_imported: true,
        })

        // Cria transação despesa correspondente se ainda não existir
        await pb.collection('transactions').create({
          user: authUser.id,
          description: it.description,
          value: it.value,
          category: it.category,
          date: `${it.date} 12:00:00.000Z`,
          payment_method: 'Crédito',
          status: 'realizado',
          type: 'despesa',
          credit_card: card.id,
          source: 'importado',
          paid_at: `${it.date} 12:00:00.000Z`,
        })
      }

      onSuccess()
      onOpenChange(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setErrorMessage(errorObj?.message || 'Erro ao persistir itens da fatura.')
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl bg-white dark:bg-[#121A2B] max-h-[90vh] overflow-y-auto p-6">
        <DialogHeader>
          <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Importação Inteligente de Fatura · {card.name}
          </DialogTitle>
        </DialogHeader>

        {errorMessage && (
          <div className="p-3.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {step === 'upload' ? (
          <div className="space-y-4 pt-2">
            {/* Emissor Detectado Chip Editável */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Emissor da fatura:
              </span>
              <Select value={detectedBank} onValueChange={(v) => setDetectedBank(v as BankName)}>
                <SelectTrigger className="h-8 w-48 text-xs rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {BANKS_LIST.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'file' | 'text')}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 w-full rounded-xl">
                <TabsTrigger value="file">Arquivo (PDF, Imagem, CSV, TXT)</TabsTrigger>
                <TabsTrigger value="text">Colar Texto da Fatura</TabsTrigger>
              </TabsList>

              {/* Aba Arquivo */}
              <TabsContent value="file" className="space-y-3 mt-3">
                <label className="border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 dark:bg-slate-900/30">
                  <UploadCloud className="w-10 h-10 text-emerald-600 mb-2" />
                  <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                    {file ? file.name : 'Clique para selecionar ou arraste o arquivo da fatura'}
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    Suporta PDF, Imagens (PNG/JPG), CSV ou TXT
                  </span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {/* Campo de Senha do PDF (Instrução especial) */}
                <div className="space-y-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="pdf-pass"
                      className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" /> Senha do PDF (se houver):
                    </Label>
                  </div>
                  <Input
                    id="pdf-pass"
                    type="password"
                    placeholder="Geralmente os 5 ou 6 primeiros dígitos do CPF..."
                    value={pdfPassword}
                    onChange={(e) => setPdfPassword(e.target.value)}
                    className="h-9 rounded-lg text-xs"
                  />
                  <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-tight">
                    * Nota: Se o seu PDF for criptografado pelo banco, você também pode colar o
                    texto ou tirar um screenshot da tela da fatura para leitura pela IA.
                  </p>
                </div>
              </TabsContent>

              {/* Aba Texto Colado */}
              <TabsContent value="text" className="space-y-2 mt-3">
                <Label htmlFor="pasted-area" className="text-xs text-slate-500">
                  Copie e cole o texto ou tabela da fatura do seu aplicativo bancário:
                </Label>
                <textarea
                  id="pasted-area"
                  rows={6}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Ex: 15/05 IFOOD *REFEICAO R$ 64,90&#10;18/05 POSTO SHELL R$ 150,00&#10;20/05 NETFLIX 1/1 R$ 55,90..."
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </TabsContent>
            </Tabs>

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleProcess}
                disabled={isProcessing || (!file && !pastedText.trim())}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
              >
                {isProcessing ? 'Processando com IA...' : 'Ler e Extrair Fatura'}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Step Preview com Trava Matemática */
          <div className="space-y-4 pt-2">
            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-500">Mês de Referência</span>
                <Input
                  type="month"
                  value={referenceMonth}
                  onChange={(e) => setReferenceMonth(e.target.value)}
                  className="h-8 w-36 rounded-lg text-xs font-bold"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500">Vencimento da Fatura</span>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-8 w-36 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-500 font-semibold">Total da Fatura (R$)</span>
                <Input
                  type="number"
                  step="0.01"
                  value={invoiceTotal}
                  onChange={(e) => setInvoiceTotal(parseFloat(e.target.value) || 0)}
                  className="h-8 w-36 rounded-lg text-xs font-bold text-slate-900 dark:text-white"
                />
              </div>

              <div className="space-y-1 text-right">
                <span className="text-xs text-slate-500">Soma das Linhas:</span>
                <div className="text-base font-extrabold tabular-nums text-emerald-600">
                  {formatCurrency(sumOfItems)}
                </div>
              </div>
            </div>

            {/* Alerta Trava Matemática */}
            {isMathLocked ? (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 flex items-center justify-between gap-2 font-medium">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Trava matemática ativada: A soma das compras ({formatCurrency(sumOfItems)}) não
                    bate com o total da fatura ({formatCurrency(invoiceTotal)}). Diferença:{' '}
                    {formatCurrency(mathDiff)}.
                  </span>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setInvoiceTotal(sumOfItems)}
                  className="h-7 text-[11px] rounded-lg border-red-300 text-red-700 dark:text-red-300"
                >
                  Ajustar total para soma
                </Button>
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2 font-medium">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Os valores estão matematicamente balanceados! Você já pode confirmar.</span>
              </div>
            )}

            {/* Tabela de Linhas Extraídas */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 font-bold">
                  <tr>
                    <th className="p-2.5">Data</th>
                    <th className="p-2.5">Descrição</th>
                    <th className="p-2.5">Categoria</th>
                    <th className="p-2.5">Parcelas</th>
                    <th className="p-2.5 text-right">Valor (R$)</th>
                    <th className="p-2.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {items.map((it) => (
                    <tr key={it.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="p-2">
                        <Input
                          type="date"
                          value={it.date}
                          onChange={(e) => handleUpdateItem(it.id, 'date', e.target.value)}
                          className="h-7 text-xs rounded-md w-28 p-1"
                        />
                      </td>
                      <td className="p-2">
                        <Input
                          value={it.description}
                          onChange={(e) => handleUpdateItem(it.id, 'description', e.target.value)}
                          className="h-7 text-xs rounded-md"
                        />
                      </td>
                      <td className="p-2">
                        <div className="flex items-center gap-1">
                          <Select
                            value={it.category}
                            onValueChange={(val) => handleUpdateItem(it.id, 'category', val)}
                          >
                            <SelectTrigger className="h-7 text-xs rounded-md w-28">
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
                          <button
                            onClick={() => handleSaveRule(it.description, it.category)}
                            title="Salvar como regra de aprendizado"
                            className="p-1 rounded text-slate-400 hover:text-emerald-600"
                          >
                            <BookmarkPlus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="p-2">
                        <Input
                          placeholder="Ex: 2/10"
                          value={it.installments}
                          onChange={(e) => handleUpdateItem(it.id, 'installments', e.target.value)}
                          className="h-7 text-xs rounded-md w-16 text-center"
                        />
                      </td>
                      <td className="p-2 text-right">
                        <Input
                          type="number"
                          step="0.01"
                          value={it.value}
                          onChange={(e) =>
                            handleUpdateItem(it.id, 'value', parseFloat(e.target.value) || 0)
                          }
                          className="h-7 text-xs rounded-md w-24 text-right font-bold ml-auto"
                        />
                      </td>
                      <td className="p-2 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(it.id)}
                          className="h-7 w-7 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <DialogFooter className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3">
              <Button variant="outline" onClick={() => setStep('upload')} className="rounded-xl">
                ← Voltar e Reenviar
              </Button>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  onClick={handleConfirmImport}
                  disabled={isMathLocked || isProcessing || items.length === 0}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex-1 sm:flex-initial"
                >
                  {isProcessing ? 'Salvando...' : 'Confirmar e Salvar Fatura'}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
