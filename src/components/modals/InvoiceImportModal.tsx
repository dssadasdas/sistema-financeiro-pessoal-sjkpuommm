import React, { useState, useEffect, useRef } from 'react'
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
import { formatCurrency, CATEGORY_SUGGESTIONS } from '@/lib/constants'
import { CreditCard, BankName } from '@/types/finance'
import {
  UploadCloud,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Lock,
  Sparkles,
  BookmarkPlus,
  Loader2,
  FileText,
  ImageIcon,
  ScanLine,
} from 'lucide-react'
import pb from '@/lib/pocketbase/client'
import {
  extractTextFromFile,
  parseInvoiceText,
  saveLearnedRule,
  loadLearnedRules,
  type ParsedItem,
} from '@/lib/invoiceParser'

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
  const { rules, saveRule } = useFinance()

  const [step, setStep] = useState<'upload' | 'preview'>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [pdfPassword, setPdfPassword] = useState('')
  const [pastedText, setPastedText] = useState('')
  const [detectedBank, setDetectedBank] = useState<BankName>(card.bank || 'Nubank')

  const [isProcessing, setIsProcessing] = useState(false)
  const [progressLabel, setProgressLabel] = useState('')
  const [ocrProgress, setOcrProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')

  // Preview data
  const [referenceMonth, setReferenceMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [invoiceTotal, setInvoiceTotal] = useState<number>(0)
  const [items, setItems] = useState<ParsedItem[]>([])

  // Rastreamento de categoria original para detectar mudanças e oferecer salvar regra
  const [originalCategories, setOriginalCategories] = useState<Record<string, string>>({})
  const [askedRules, setAskedRules] = useState<Set<string>>(new Set())

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [dragOver, setDragOver] = useState(false)

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
      setOcrProgress(0)
      setProgressLabel('')
      setOriginalCategories({})
      setAskedRules(new Set())
    }
  }, [open, card])

  // Soma calculada das linhas
  const sumOfItems = items.reduce((acc, it) => acc + (Number(it.value) || 0), 0)
  const mathDiff = Math.abs(sumOfItems - invoiceTotal)
  // Trava matemática: se diferir do total em mais de 5% (e houver total informado)
  const tolerance = invoiceTotal > 0 ? invoiceTotal * 0.05 : 0.5
  const isMathLocked = invoiceTotal > 0 && mathDiff > tolerance

  const handleFileChange = (f: File | null) => {
    if (f) setFile(f)
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileChange(f)
  }

  const handleProcess = async () => {
    setIsProcessing(true)
    setErrorMessage('')
    setOcrProgress(0)

    try {
      let text = pastedText.trim()

      if (file) {
        const name = file.name.toLowerCase()
        if (name.endsWith('.pdf') || file.type === 'application/pdf') {
          setProgressLabel('Lendo PDF...')
        } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp)$/.test(name)) {
          setProgressLabel('Reconhecendo texto da imagem (OCR)...')
        } else {
          setProgressLabel('Lendo arquivo...')
        }
        const extracted = await extractTextFromFile(file, {
          pdfPassword,
          onOcrProgress: (p) => setOcrProgress(p),
        })
        text = (text ? text + '\n' : '') + extracted
      }

      if (!text.trim()) {
        setErrorMessage(
          file
            ? 'Não foi possível extrair texto do arquivo. Tente colar o texto manualmente na aba "Colar Texto".'
            : 'Insira o arquivo ou cole o texto da fatura.',
        )
        setIsProcessing(false)
        return
      }

      const learnedRules = loadLearnedRules()
      const serverRules = rules.map((r) => ({ keyword: r.keyword, category: r.category }))
      const result = parseInvoiceText(text, {
        learnedRules,
        serverRules,
        bankHint: detectedBank,
      })

      if (result.detectedBank && BANKS_LIST.includes(result.detectedBank)) {
        setDetectedBank(result.detectedBank)
      }
      if (result.referenceMonth) setReferenceMonth(result.referenceMonth)
      if (result.dueDate) setDueDate(result.dueDate)

      setItems(result.items)
      setOriginalCategories(
        result.items.reduce(
          (acc, it) => {
            acc[it.id] = it.category
            return acc
          },
          {} as Record<string, string>,
        ),
      )
      setAskedRules(new Set())

      const total = result.detectedTotal || result.items.reduce((a, it) => a + it.value, 0)
      setInvoiceTotal(total)

      if (result.items.length === 0) {
        setErrorMessage(
          'Nenhuma compra identificada no texto. Tente colar o texto da fatura manualmente na aba "Colar Texto" no formato: DD/MM Descrição R$ valor',
        )
      }

      setStep('preview')
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setErrorMessage(
        errorObj?.message ||
          'Falha ao processar arquivo. Se for um PDF protegido, informe a senha ou cole o texto manualmente.',
      )
    } finally {
      setIsProcessing(false)
      setProgressLabel('')
      setOcrProgress(0)
    }
  }

  const handleUpdateItem = (id: string, field: keyof ParsedItem, value: string | number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const handleRemoveItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  // Pergunta se deseja salvar regra quando usuário muda a categoria
  const handleCategoryChange = (id: string, newCategory: string) => {
    handleUpdateItem(id, 'category', newCategory)
    const item = items.find((i) => i.id === id)
    if (!item) return
    const original = originalCategories[id]
    if (original !== newCategory && !askedRules.has(id) && item.description.trim()) {
      setAskedRules((prev) => new Set(prev).add(id))
      setTimeout(() => {
        const confirmSave = window.confirm(
          `Deseja salvar esta regra para futuras importações?\n\n"${item.description}" → ${newCategory}`,
        )
        if (confirmSave) {
          saveLearnedRule(item.description, newCategory)
          saveRule(item.description, newCategory).catch(() => {})
        }
      }, 100)
    }
  }

  const handleConfirmImport = async () => {
    if (isMathLocked) {
      setErrorMessage(
        `Os valores não conferem. Total da fatura: ${formatCurrency(invoiceTotal)}. Soma das compras: ${formatCurrency(sumOfItems)}. Verifique os lançamentos antes de importar.`,
      )
      return
    }

    if (items.length === 0) {
      setErrorMessage('Nenhuma compra para importar.')
      return
    }

    setIsProcessing(true)
    setErrorMessage('')
    try {
      const authUser = pb.authStore.model
      if (!authUser) throw new Error('Usuário não autenticado')

      // 1. Busca fatura existente para este cartão + referenceMonth
      let invoiceRecord: { id: string } | null = null
      try {
        const existingInvoices = await pb.collection('invoices').getList(1, 1, {
          filter: `user = "${authUser.id}" && credit_card = "${card.id}" && reference = "${referenceMonth}"`,
        })
        if (existingInvoices.items.length > 0) {
          invoiceRecord = existingInvoices.items[0] as { id: string }
        }
      } catch (_) {
        // ignora
      }

      if (invoiceRecord) {
        // Pergunta sobre substituição
        const replace = window.confirm(
          'Já existe uma fatura importada neste cartão para este mês. Deseja substituir os lançamentos importados anteriores?',
        )
        if (replace) {
          // Atualiza total e remove itens importados antigos + transações importadas antigas
          await pb.collection('invoices').update(invoiceRecord.id, {
            total: invoiceTotal,
            due_date: `${dueDate} 12:00:00.000Z`,
          })
          const oldItems = await pb.collection('invoice_items').getFullList({
            filter: `invoice = "${invoiceRecord.id}" && is_imported = true`,
          })
          for (const oldIt of oldItems) {
            await pb
              .collection('invoice_items')
              .delete(oldIt.id)
              .catch(() => {})
          }
          // Remove transações importadas antigas deste cartão neste mês
          const oldTxns = await pb.collection('transactions').getFullList({
            filter: `user = "${authUser.id}" && credit_card = "${card.id}" && source = "importado" && date >= "${referenceMonth}-01 00:00:00.000Z"`,
          })
          for (const oldTx of oldTxns) {
            await pb
              .collection('transactions')
              .delete(oldTx.id)
              .catch(() => {})
          }
        }
      } else {
        // Cria nova fatura
        const created = await pb.collection('invoices').create({
          user: authUser.id,
          credit_card: card.id,
          reference: referenceMonth,
          due_date: `${dueDate} 12:00:00.000Z`,
          total: invoiceTotal,
          status: 'aberta',
        })
        invoiceRecord = { id: created.id }
      }

      // 2. Salva itens + transações
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

  const fileIcon = file
    ? file.name.toLowerCase().endsWith('.pdf')
      ? FileText
      : file.type.startsWith('image/')
        ? ImageIcon
        : ScanLine
    : UploadCloud

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-full rounded-2xl bg-white dark:bg-[#121A2B] p-4 sm:p-6 scrollbar-thin">
        <DialogHeader>
          <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-600" />
            Importação de Fatura · {card.name}
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
            {/* Emissor Detectado */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                Emissor da fatura (ajustável):
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

            {/* Área de Upload (arrastar ou clicar) */}
            <label
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${
                dragOver
                  ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20'
                  : 'border-slate-200 dark:border-slate-700 hover:border-emerald-500/50 bg-slate-50/50 dark:bg-slate-900/30'
              }`}
            >
              {(() => {
                const Icon = fileIcon
                return <Icon className="w-10 h-10 text-emerald-600 mb-2" />
              })()}
              <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 text-center">
                {file ? file.name : 'Clique para selecionar ou arraste o arquivo da fatura'}
              </span>
              <span className="text-xs text-slate-400 mt-1">Aceita: PDF, PNG, JPG, CSV, TXT</span>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.csv,.txt"
                onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                className="hidden"
              />
            </label>

            {/* Senha do PDF */}
            {file && file.name.toLowerCase().endsWith('.pdf') && (
              <div className="space-y-1.5 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60">
                <Label
                  htmlFor="pdf-pass"
                  className="text-xs font-semibold text-amber-900 dark:text-amber-200 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" /> Senha do PDF (opcional)
                </Label>
                <Input
                  id="pdf-pass"
                  type="password"
                  placeholder="Geralmente os 5 ou 6 primeiros dígitos do CPF..."
                  value={pdfPassword}
                  onChange={(e) => setPdfPassword(e.target.value)}
                  className="h-9 rounded-lg text-xs"
                />
                <p className="text-[11px] text-amber-700 dark:text-amber-300 leading-tight">
                  Se o PDF for criptografado pelo banco, informe a senha. Como alternativa, cole o
                  texto da fatura abaixo.
                </p>
              </div>
            )}

            {/* Colar texto */}
            <div className="space-y-2">
              <Label htmlFor="pasted-area" className="text-xs text-slate-500">
                Ou cole o texto da fatura (opcional):
              </Label>
              <textarea
                id="pasted-area"
                rows={4}
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Ex: 15/05 IFOOD *REFEICAO R$ 64,90&#10;18/05 POSTO SHELL R$ 150,00&#10;20/05 NETFLIX 1/1 R$ 55,90..."
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {isProcessing && (
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>
                  {progressLabel}
                  {ocrProgress > 0 ? ` ${Math.round(ocrProgress * 100)}%` : '...'}
                </span>
              </div>
            )}

            <DialogFooter className="pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
                Cancelar
              </Button>
              <Button
                onClick={handleProcess}
                disabled={isProcessing || (!file && !pastedText.trim())}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processando...
                  </>
                ) : (
                  <>
                    <ScanLine className="w-4 h-4" /> Ler e Extrair Fatura
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          /* Step Preview */
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
                <span className="text-xs text-slate-500">Vencimento</span>
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

            {/* Trava Matemática 5% */}
            {isMathLocked ? (
              <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-600 flex items-center justify-between gap-2 font-medium">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                  <span>
                    Os valores não conferem. Total da fatura: {formatCurrency(invoiceTotal)}. Soma
                    das compras: {formatCurrency(sumOfItems)}. Verifique os lançamentos antes de
                    importar.
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
                <span>Os valores estão coerentes! Você já pode confirmar a importação.</span>
              </div>
            )}

            {/* Tabela editável */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 sticky top-0 font-bold">
                  <tr>
                    <th className="p-2.5">Data</th>
                    <th className="p-2.5">Descrição</th>
                    <th className="p-2.5">Categoria</th>
                    <th className="p-2.5">Parcelas</th>
                    <th className="p-2.5 text-right">Valor (R$)</th>
                    <th className="p-2.5 text-center"></th>
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
                            onValueChange={(val) => handleCategoryChange(it.id, val)}
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
                            onClick={() => {
                              saveLearnedRule(it.description, it.category)
                              saveRule(it.description, it.category).catch(() => {})
                              alert(`Regra salva: "${it.description}" → ${it.category}`)
                            }}
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
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-slate-400 text-xs">
                        Nenhuma compra identificada. Volte e tente colar o texto manualmente.
                      </td>
                    </tr>
                  )}
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
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex-1 sm:flex-initial gap-1.5"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" /> Confirmar e Salvar Fatura
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
