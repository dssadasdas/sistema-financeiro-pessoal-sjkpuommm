import React, { useState, useMemo, useEffect } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import { useSearchParams } from 'react-router-dom'
import { formatCurrency, formatDate, CATEGORY_SUGGESTIONS } from '@/lib/constants'
import { Bill } from '@/types/finance'
import {
  Barcode,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Building2,
  Trash2,
  Pencil,
  Copy,
  Camera,
  Check,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Maximize2,
  Link2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'
import BarcodeScannerModal, { parseBrazilianBoleto } from '@/components/modals/BarcodeScannerModal'

type BoletoStatusTab = 'todos' | 'a_vencer' | 'vence_hoje' | 'vencido' | 'pago'

interface BoletoFormState {
  description: string
  category: string
  value: string
  dueDate: string
  barcode: string
  accountId: string
  linkExistingExpenseId: string // id de despesa existente para vincular
}

const emptyBoletoForm: BoletoFormState = {
  description: '',
  category: 'Contas e Boletos',
  value: '',
  dueDate: new Date().toISOString().slice(0, 10),
  barcode: '',
  accountId: '',
  linkExistingExpenseId: 'none',
}

export default function BoletosPage() {
  const {
    bills,
    accounts,
    transactions,
    isLoading,
    loadError,
    refreshAll,
    createBill,
    updateBill,
    deleteBill,
    markBillAsPaid,
  } = useFinance()
  const { hideValues } = useAuth()
  const { toast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<BoletoStatusTab>('todos')
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('todas')
  const [monthFilter, setMonthFilter] = useState('todos')

  // Modais de Criação / Edição
  const [modalOpen, setModalOpen] = useState(false)
  const [editingBill, setEditingBill] = useState<Bill | null>(null)
  const [form, setForm] = useState<BoletoFormState>(emptyBoletoForm)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // Scanner modal
  const [scannerOpen, setScannerOpen] = useState(false)

  // Modal de Pagamento
  const [payModalBill, setPayModalBill] = useState<Bill | null>(null)
  const [payAccountId, setPayAccountId] = useState('')
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10))
  const [isPaying, setIsPaying] = useState(false)

  // Modal de Exclusão
  const [deleteBillObj, setDeleteBillObj] = useState<Bill | null>(null)

  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), [])

  // Abre direto o boleto caso venha da Central de Alertas via query param `?id=xyz`
  useEffect(() => {
    const targetId = searchParams.get('id')
    if (targetId && bills.length > 0) {
      const found = bills.find((b) => b.id === targetId)
      if (found) {
        if (found.status !== 'pago') {
          openPayModal(found)
        } else {
          openEdit(found)
        }
        // limpa o search param após abrir
        setSearchParams({}, { replace: true })
      }
    }
  }, [searchParams, bills])

  // Despesas pendentes que podem ser vinculadas (para não duplicar despesa)
  const availablePendingExpenses = useMemo(() => {
    return transactions.filter(
      (t) =>
        t.type === 'despesa' &&
        t.status === 'pendente' &&
        !bills.some((b) => b.generated_transaction === t.id || b.id === t.bill_id),
    )
  }, [transactions, bills])

  // Lista de boletos com status computado
  const computedBoletos = useMemo(() => {
    return bills
      .filter((b) => (b.type || 'pagar') === 'pagar')
      .map((b) => {
        const due = (b.due_date || '').slice(0, 10)
        const isPaid = b.status === 'pago'
        const isOverdue = !isPaid && due && due < todayStr
        const isToday = !isPaid && due && due === todayStr

        let computedStatus: 'a_vencer' | 'vence_hoje' | 'vencido' | 'pago' = 'a_vencer'
        let statusLabel = 'A vencer'
        let badgeColor =
          'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border-blue-200'

        if (isPaid) {
          computedStatus = 'pago'
          statusLabel = 'Pago'
          badgeColor =
            'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200'
        } else if (isToday) {
          computedStatus = 'vence_hoje'
          statusLabel = 'Vence hoje'
          badgeColor =
            'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border-amber-200 animate-pulse'
        } else if (isOverdue) {
          computedStatus = 'vencido'
          statusLabel = 'Vencido'
          badgeColor = 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 border-red-200'
        }

        const accObj = accounts.find((a) => a.id === b.account)

        return {
          ...b,
          due,
          computedStatus,
          statusLabel,
          badgeColor,
          accountName: accObj?.name,
        }
      })
  }, [bills, accounts, todayStr])

  // Filtros aplicados
  const filteredBoletos = useMemo(() => {
    let list = computedBoletos

    if (activeTab !== 'todos') {
      list = list.filter((b) => b.computedStatus === activeTab)
    }

    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (b) =>
          (b.description || '').toLowerCase().includes(q) ||
          (b.category || '').toLowerCase().includes(q) ||
          (b.barcode || '').toLowerCase().includes(q) ||
          (b.accountName || '').toLowerCase().includes(q),
      )
    }

    if (accountFilter !== 'todas') {
      list = list.filter((b) => b.account === accountFilter)
    }

    if (monthFilter !== 'todos') {
      list = list.filter((b) => (b.due || '').startsWith(monthFilter))
    }

    return list.sort((a, b) => {
      // Ordena não pagos primeiro, depois por vencimento mais próximo
      if (a.status === 'pago' && b.status !== 'pago') return 1
      if (a.status !== 'pago' && b.status === 'pago') return -1
      return (a.due || '').localeCompare(b.due || '')
    })
  }, [computedBoletos, activeTab, search, accountFilter, monthFilter])

  // Métricas rápidas dos boletos
  const stats = useMemo(() => {
    const totalPagar = computedBoletos
      .filter((b) => b.status !== 'pago')
      .reduce((s, b) => s + Number(b.value || 0), 0)

    const totalVencido = computedBoletos
      .filter((b) => b.computedStatus === 'vencido')
      .reduce((s, b) => s + Number(b.value || 0), 0)

    const totalVenceHoje = computedBoletos
      .filter((b) => b.computedStatus === 'vence_hoje')
      .reduce((s, b) => s + Number(b.value || 0), 0)

    const totalPago = computedBoletos
      .filter((b) => b.status === 'pago')
      .reduce((s, b) => s + Number(b.value || 0), 0)

    return {
      totalPagar,
      totalVencido,
      totalVenceHoje,
      totalPago,
      countPagar: computedBoletos.filter((b) => b.status !== 'pago').length,
      countVencido: computedBoletos.filter((b) => b.computedStatus === 'vencido').length,
      countVenceHoje: computedBoletos.filter((b) => b.computedStatus === 'vence_hoje').length,
      countPago: computedBoletos.filter((b) => b.status === 'pago').length,
    }
  }, [computedBoletos])

  // Meses para filtro
  const availableMonths = useMemo(() => {
    const s = new Set<string>()
    computedBoletos.forEach((b) => {
      if (b.due && b.due.length >= 7) {
        s.add(b.due.slice(0, 7))
      }
    })
    return Array.from(s).sort((a, b) => b.localeCompare(a))
  }, [computedBoletos])

  const openCreate = () => {
    setEditingBill(null)
    setForm({
      ...emptyBoletoForm,
      accountId: accounts[0]?.id || '',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const openEdit = (bill: Bill) => {
    setEditingBill(bill)
    setForm({
      description: bill.description || '',
      category: bill.category || 'Contas e Boletos',
      value: String(bill.value || ''),
      dueDate: (bill.due_date || '').slice(0, 10) || todayStr,
      barcode: bill.barcode || '',
      accountId: bill.account || '',
      linkExistingExpenseId: 'none',
    })
    setFormErrors({})
    setModalOpen(true)
  }

  const openPayModal = (bill: Bill) => {
    setPayModalBill(bill)
    setPayAccountId(bill.account || accounts[0]?.id || '')
    setPayDate(todayStr)
  }

  const handleBarcodeDetected = (
    code: string,
    parsedData?: { value?: number; dueDate?: string },
  ) => {
    setForm((prev) => ({
      ...prev,
      barcode: code,
      ...(parsedData?.value ? { value: String(parsedData.value) } : {}),
      ...(parsedData?.dueDate ? { dueDate: parsedData.dueDate } : {}),
    }))
    toast({
      title: 'Código de barras lido com sucesso!',
      description: parsedData?.value
        ? `Valor R$ ${parsedData.value.toFixed(2)} e data preenchidos automaticamente.`
        : 'Código inserido no formulário.',
    })
  }

  const validateForm = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.description.trim()) errs.description = 'Descrição é obrigatória'
    const num = parseFloat(form.value.replace(',', '.'))
    if (isNaN(num) || num <= 0) errs.value = 'Informe um valor válido e positivo'
    if (!form.dueDate) errs.dueDate = 'Data de vencimento obrigatória'
    setFormErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSaveBoleto = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setIsSaving(true)

    try {
      const num = parseFloat(form.value.replace(',', '.'))
      const dueIso = `${form.dueDate} 12:00:00.000Z`

      if (editingBill) {
        await updateBill(editingBill.id, {
          description: form.description.trim(),
          category: form.category,
          value: num,
          due_date: dueIso,
          barcode: form.barcode.trim() || undefined,
          account: form.accountId || undefined,
        })
        toast({
          title: 'Boleto atualizado com sucesso!',
        })
      } else {
        const linkId =
          form.linkExistingExpenseId && form.linkExistingExpenseId !== 'none'
            ? form.linkExistingExpenseId
            : undefined

        await createBill(
          {
            description: form.description.trim(),
            category: form.category,
            value: num,
            due_date: dueIso,
            barcode: form.barcode.trim() || undefined,
            account: form.accountId || undefined,
            type: 'pagar',
            status: 'não_pago',
          },
          linkId,
        )

        toast({
          title: 'Boleto cadastrado com sucesso!',
          description: linkId
            ? 'Vinculado à despesa pendente existente sem duplicidade.'
            : 'Despesa pendente criada e sincronizada.',
        })
      }

      setModalOpen(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar boleto',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmPayment = async () => {
    if (!payModalBill) return
    setIsPaying(true)
    try {
      await markBillAsPaid(payModalBill, payAccountId || undefined, payDate)
      toast({
        title: 'Boleto pago com sucesso!',
        description: `O valor foi debitado da conta bancária e a despesa foi liquidada.`,
      })
      setPayModalBill(null)
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar pagamento',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setIsPaying(false)
    }
  }

  const handleDeleteBoleto = async () => {
    if (!deleteBillObj) return
    try {
      await deleteBill(deleteBillObj.id)
      toast({
        title: 'Boleto excluído com sucesso.',
      })
      setDeleteBillObj(null)
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir boleto',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      })
    }
  }

  const handleCopyBarcode = (code: string) => {
    if (!code) return
    navigator.clipboard.writeText(code)
    toast({
      title: 'Código de barras copiado!',
      description: 'Linha digitável salva na área de transferência.',
    })
  }

  if (isLoading) {
    return <LoadingState message="Carregando boletos e conciliação..." />
  }

  if (loadError) {
    return (
      <ErrorState
        message="Não foi possível carregar os boletos. Tente novamente."
        onRetry={refreshAll}
      />
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
            <Barcode className="w-7 h-7 text-emerald-600" />
            Gestão de Boletos
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Controle de obrigações de pagamento, leitura de código de barras e conciliação bancária
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={openCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm shadow-emerald-600/20 gap-2 h-10 px-4"
          >
            <Plus className="w-4 h-4" /> Novo Boleto
          </Button>
        </div>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-4 sm:p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">
              Total a Pagar
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-bold bg-slate-50 whitespace-nowrap"
            >
              {stats.countPagar} boletos
            </Badge>
          </div>
          <div className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-1.5 whitespace-nowrap truncate">
            {formatCurrency(stats.totalPagar, hideValues)}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-4 sm:p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-red-600 font-semibold flex items-center gap-1 whitespace-nowrap">
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" /> Vencidos
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-bold bg-red-50 text-red-700 border-red-300 whitespace-nowrap"
            >
              {stats.countVencido}
            </Badge>
          </div>
          <div className="text-xl sm:text-2xl font-black text-red-600 tabular-nums mt-1.5 whitespace-nowrap truncate">
            {formatCurrency(stats.totalVencido, hideValues)}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-4 sm:p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-amber-600 font-semibold flex items-center gap-1 whitespace-nowrap">
              <Clock className="w-3.5 h-3.5 flex-shrink-0" /> Vence Hoje
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-300 whitespace-nowrap"
            >
              {stats.countVenceHoje}
            </Badge>
          </div>
          <div className="text-xl sm:text-2xl font-black text-amber-600 tabular-nums mt-1.5 whitespace-nowrap truncate">
            {formatCurrency(stats.totalVenceHoje, hideValues)}
          </div>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-4 sm:p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1 whitespace-nowrap">
              <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" /> Pagos
            </span>
            <Badge
              variant="outline"
              className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border-emerald-300 whitespace-nowrap"
            >
              {stats.countPago}
            </Badge>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-600 tabular-nums mt-1.5 whitespace-nowrap truncate">
            {formatCurrency(stats.totalPago, hideValues)}
          </div>
        </Card>
      </div>

      {/* Tabs de Status */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 bg-slate-100 dark:bg-slate-900/60 rounded-2xl">
        <button
          onClick={() => setActiveTab('todos')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'todos'
              ? 'bg-white dark:bg-[#121A2B] text-slate-900 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
          }`}
        >
          Todos ({computedBoletos.length})
        </button>

        <button
          onClick={() => setActiveTab('a_vencer')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'a_vencer'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-blue-600'
          }`}
        >
          A Vencer ({computedBoletos.filter((b) => b.computedStatus === 'a_vencer').length})
        </button>

        <button
          onClick={() => setActiveTab('vence_hoje')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'vence_hoje'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-amber-600'
          }`}
        >
          Vence Hoje ({stats.countVenceHoje})
        </button>

        <button
          onClick={() => setActiveTab('vencido')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'vencido'
              ? 'bg-red-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-red-600'
          }`}
        >
          Vencidos ({stats.countVencido})
        </button>

        <button
          onClick={() => setActiveTab('pago')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'pago'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600'
          }`}
        >
          Pagos ({stats.countPago})
        </button>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por descrição, código de barras ou conta..."
            className="pl-9 h-10 rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="h-10 w-44 rounded-xl text-xs">
              <SelectValue placeholder="Conta Bancária" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="todas">Todas as Contas</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={monthFilter} onValueChange={setMonthFilter}>
            <SelectTrigger className="h-10 w-36 rounded-xl text-xs">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="todos">Todos os Meses</SelectItem>
              {availableMonths.map((m) => (
                <SelectItem key={m} value={m}>
                  {m.split('-').reverse().join('/')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista de Boletos */}
      {filteredBoletos.length === 0 ? (
        <EmptyState
          icon={Barcode}
          title="Nenhum boleto encontrado"
          description={
            search || accountFilter !== 'todas' || monthFilter !== 'todos'
              ? 'Tente ajustar seus filtros de busca.'
              : 'Cadastre seus boletos e contas a pagar com código de barras para gerenciar seus vencimentos.'
          }
          actionLabel="Cadastrar Boleto"
          onAction={openCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBoletos.map((b) => (
            <Card
              key={b.id}
              className={`rounded-2xl border transition-all hover:shadow-md bg-white dark:bg-[#121A2B] flex flex-col justify-between overflow-hidden ${
                b.computedStatus === 'vencido'
                  ? 'border-red-200 dark:border-red-900/50'
                  : b.computedStatus === 'vence_hoje'
                    ? 'border-amber-300 dark:border-amber-700/60'
                    : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="p-4 sm:p-5 space-y-3">
                {/* Header do Card */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <span className="text-[11px] font-semibold text-slate-400 block truncate">
                      {b.category || 'Contas e Boletos'}
                    </span>
                    <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                      {b.description}
                    </h3>
                  </div>

                  <Badge variant="outline" className={`text-[10px] font-bold ${b.badgeColor}`}>
                    {b.statusLabel}
                  </Badge>
                </div>

                {/* Valor */}
                <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(b.value, hideValues)}
                </div>

                {/* Informações detalhadas */}
                <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" /> Vencimento:
                    </span>
                    <strong className="font-semibold">{formatDate(b.due)}</strong>
                  </div>

                  {b.accountName && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> Conta de Pagamento:
                      </span>
                      <strong className="font-semibold truncate max-w-[150px]">
                        {b.accountName}
                      </strong>
                    </div>
                  )}

                  {b.status === 'pago' && (b.paid_date || b.paid_at) && (
                    <div className="flex items-center justify-between text-emerald-600 font-medium">
                      <span className="flex items-center gap-1">
                        <Check className="w-3.5 h-3.5" /> Pago em:
                      </span>
                      <strong>{formatDate((b.paid_date || b.paid_at || '').slice(0, 10))}</strong>
                    </div>
                  )}
                </div>

                {/* Código de barras / Linha digitável */}
                {b.barcode && (
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-400 block font-semibold">
                        Linha Digitável / Código
                      </span>
                      <p className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                        {b.barcode}
                      </p>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleCopyBarcode(b.barcode || '')}
                      className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-700 shrink-0"
                      title="Copiar código de barras"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Ações do Card */}
              <div className="p-3 bg-slate-50/80 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(b)}
                    className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-800"
                    title="Editar"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteBillObj(b)}
                    className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600"
                    title="Excluir"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {b.status === 'pago' ? (
                  <span className="text-xs font-bold text-emerald-600 flex items-center gap-1 pr-2">
                    <CheckCircle2 className="w-4 h-4" /> Liquidado
                  </span>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => openPayModal(b)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5 h-8 px-3 shadow-xs"
                  >
                    <Check className="w-3.5 h-3.5" /> Pagar Boleto
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal de Criação e Edição de Boleto */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg rounded-3xl bg-white dark:bg-[#121A2B] p-0 overflow-hidden">
          <form onSubmit={handleSaveBoleto}>
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
                  <Barcode className="w-5 h-5" />
                </div>
                <div>
                  <DialogTitle className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                    {editingBill ? 'Editar Boleto' : 'Novo Boleto'}
                  </DialogTitle>
                  <p className="text-xs text-slate-500">
                    Preencha os dados da obrigação de pagamento
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Leitor de código de barras rápido */}
              <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Camera className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      Leitura de Código de Barras
                    </span>
                    <p className="text-[11px] text-slate-500">
                      Câmera do celular, leitor ou colagem rápida
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setScannerOpen(true)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl h-8 px-3 shrink-0"
                >
                  Ler com Câmera
                </Button>
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <Label className="text-xs font-bold">Descrição do Boleto *</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Ex: Conta de Energia CEMIG, Aluguel, Internet..."
                  className="rounded-xl h-10 text-xs"
                />
                {formErrors.description && (
                  <p className="text-[11px] text-red-600">{formErrors.description}</p>
                )}
              </div>

              {/* Valor e Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Valor (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={form.value}
                    onChange={(e) => setForm({ ...form, value: e.target.value })}
                    placeholder="0,00"
                    className="rounded-xl h-10 text-xs font-bold text-slate-900 dark:text-white"
                  />
                  {formErrors.value && (
                    <p className="text-[11px] text-red-600">{formErrors.value}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Data de Vencimento *</Label>
                  <Input
                    type="date"
                    value={form.dueDate}
                    onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                    className="rounded-xl h-10 text-xs font-bold"
                  />
                  {formErrors.dueDate && (
                    <p className="text-[11px] text-red-600">{formErrors.dueDate}</p>
                  )}
                </div>
              </div>

              {/* Categoria e Conta */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-bold">Categoria</Label>
                  <Select
                    value={form.category}
                    onValueChange={(val) => setForm({ ...form, category: val })}
                  >
                    <SelectTrigger className="rounded-xl h-10 text-xs">
                      <SelectValue placeholder="Selecione a categoria" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {CATEGORY_SUGGESTIONS.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-bold">Conta Bancária Preferencial</Label>
                  <Select
                    value={form.accountId}
                    onValueChange={(val) => setForm({ ...form, accountId: val })}
                  >
                    <SelectTrigger className="rounded-xl h-10 text-xs">
                      <SelectValue placeholder="Selecione a conta" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {accounts.map((acc) => (
                        <SelectItem key={acc.id} value={acc.id}>
                          {acc.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Código de barras / Linha digitável */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold">Código de Barras / Linha Digitável</Label>
                  <span className="text-[10px] text-slate-400">Opcional</span>
                </div>
                <Input
                  value={form.barcode}
                  onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                  placeholder="Cole ou digite a linha digitável do boleto..."
                  className="rounded-xl h-10 text-xs font-mono"
                />
              </div>

              {/* Vincular a uma despesa já existente (apenas criação) */}
              {!editingBill && availablePendingExpenses.length > 0 && (
                <div className="space-y-1 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800">
                  <Label className="text-xs font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                    <Link2 className="w-3.5 h-3.5 text-emerald-600" />
                    Vincular a Despesa Existente (Evita duplicidade)
                  </Label>
                  <p className="text-[11px] text-slate-500">
                    Se você já cadastrou esta despesa na aba de Transações, selecione-a abaixo para
                    evitar dupla contabilização:
                  </p>
                  <Select
                    value={form.linkExistingExpenseId}
                    onValueChange={(val) => {
                      setForm({ ...form, linkExistingExpenseId: val })
                      if (val !== 'none') {
                        const target = availablePendingExpenses.find((t) => t.id === val)
                        if (target) {
                          setForm((prev) => ({
                            ...prev,
                            description: target.description || prev.description,
                            value: String(target.value || prev.value),
                            category: target.category || prev.category,
                            dueDate: (target.date || '').slice(0, 10) || prev.dueDate,
                            accountId: target.account || prev.accountId,
                            linkExistingExpenseId: val,
                          }))
                        }
                      }
                    }}
                  >
                    <SelectTrigger className="rounded-xl h-10 text-xs mt-1">
                      <SelectValue placeholder="Criar nova despesa correspondente" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="none">
                        Criar nova despesa pendente correspondente
                      </SelectItem>
                      {availablePendingExpenses.map((tx) => (
                        <SelectItem key={tx.id} value={tx.id}>
                          {tx.description} — {formatCurrency(tx.value)} ({formatDate(tx.date)})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setModalOpen(false)}
                className="rounded-xl text-xs font-semibold"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
              >
                {isSaving ? 'Salvando...' : editingBill ? 'Salvar Alterações' : 'Cadastrar Boleto'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal de Pagamento de Boleto */}
      <Dialog open={!!payModalBill} onOpenChange={(open) => !open && setPayModalBill(null)}>
        <DialogContent className="max-w-md rounded-3xl bg-white dark:bg-[#121A2B] p-0 overflow-hidden">
          <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold">
              <Check className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="font-extrabold text-base text-slate-900 dark:text-white">
                Liquidar e Pagar Boleto
              </DialogTitle>
              <p className="text-xs text-slate-500">Conciliação financeira em conta bancária</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {payModalBill && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs text-slate-400 font-semibold block">Boleto a Pagar</span>
                <h4 className="text-base font-bold text-slate-900 dark:text-white">
                  {payModalBill.description}
                </h4>
                <div className="text-2xl font-black text-emerald-600 tabular-nums">
                  {formatCurrency(payModalBill.value, hideValues)}
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs font-bold">De qual conta saiu o pagamento? *</Label>
              <Select value={payAccountId} onValueChange={setPayAccountId}>
                <SelectTrigger className="rounded-xl h-11 text-xs">
                  <SelectValue placeholder="Selecione a conta bancária" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: {formatCurrency(acc.current_balance || 0, hideValues)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-bold">Data efetiva do pagamento *</Label>
              <Input
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="rounded-xl h-11 text-xs font-bold"
              />
            </div>

            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40 text-blue-800 dark:text-blue-200 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                O valor será debitado <strong>uma única vez</strong> da conta selecionada e a
                despesa vinculada será liquidada sem duplicações.
              </span>
            </div>
          </div>

          <DialogFooter className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setPayModalBill(null)}
              className="rounded-xl text-xs font-semibold"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              disabled={isPaying || !payAccountId}
              onClick={handleConfirmPayment}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5"
            >
              {isPaying ? 'Processando...' : 'Confirmar Pagamento'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Exclusão */}
      <AlertDialog open={!!deleteBillObj} onOpenChange={(open) => !open && setDeleteBillObj(null)}>
        <AlertDialogContent className="rounded-2xl bg-white dark:bg-[#121A2B]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              Excluir Boleto?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              Tem certeza que deseja excluir o boleto "{deleteBillObj?.description}"? Esta ação não
              pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBoleto}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Scanner Modal com Câmera, Colagem e Digitação */}
      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onDetected={handleBarcodeDetected}
      />
    </div>
  )
}
