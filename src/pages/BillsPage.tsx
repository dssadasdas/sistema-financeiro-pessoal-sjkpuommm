import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, CATEGORY_SUGGESTIONS } from '@/lib/constants'
import { Bill } from '@/types/finance'
import {
  Receipt,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Calendar,
  DollarSign,
  Trash2,
  Repeat,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import { Switch } from '@/components/ui/switch'

export default function BillsPage() {
  const { bills, accounts, createBill, deleteBill, markBillAsPaid } = useFinance()
  const { hideValues } = useAuth()

  const [modalOpen, setModalOpen] = useState(false)
  const [description, setDescription] = useState('')
  const [value, setValue] = useState('')
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [category, setCategory] = useState('Moradia')
  const [accountId, setAccountId] = useState('')
  const [recurring, setRecurring] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // Pay Modal
  const [payModalBill, setPayModalBill] = useState<Bill | null>(null)
  const [payAccount, setPayAccount] = useState('')

  const todayStr = new Date().toISOString().slice(0, 10)

  // Agrupamentos
  const { overdue, dueToday, upcoming, paid } = useMemo(() => {
    const overdueList: Bill[] = []
    const dueTodayList: Bill[] = []
    const upcomingList: Bill[] = []
    const paidList: Bill[] = []

    bills.forEach((b) => {
      if (b.status === 'pago') {
        paidList.push(b)
        return
      }
      const bDay = (b.due_date || '').slice(0, 10)
      if (bDay < todayStr) {
        overdueList.push(b)
      } else if (bDay === todayStr) {
        dueTodayList.push(b)
      } else {
        upcomingList.push(b)
      }
    })

    return {
      overdue: overdueList,
      dueToday: dueTodayList,
      upcoming: upcomingList,
      paid: paidList,
    }
  }, [bills, todayStr])

  const handleSaveBill = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const num = parseFloat(value.replace(',', '.'))
    if (isNaN(num) || num <= 0) {
      setError('Valor inválido.')
      return
    }

    setLoading(true)
    try {
      await createBill({
        description: description.trim(),
        value: num,
        due_date: `${dueDate} 12:00:00.000Z`,
        category,
        account: accountId || undefined,
        recurring,
        status: 'não_pago',
      })
      setModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setError(errorObj?.message || 'Erro ao criar conta/boleto.')
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmPay = async () => {
    if (!payModalBill) return
    setLoading(true)
    try {
      await markBillAsPaid(payModalBill, payAccount || undefined)
      setPayModalBill(null)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      alert(errorObj?.message || 'Erro ao pagar conta.')
    } finally {
      setLoading(false)
    }
  }

  const renderBillRow = (b: Bill) => {
    const isOverdue = b.status !== 'pago' && (b.due_date || '').slice(0, 10) < todayStr
    const isToday = b.status !== 'pago' && (b.due_date || '').slice(0, 10) === todayStr
    const isPaid = b.status === 'pago'

    return (
      <div
        key={b.id}
        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
              isPaid
                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                : isOverdue
                  ? 'bg-red-50 text-red-600 dark:bg-red-950/40'
                  : isToday
                    ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/40'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            <Receipt className="w-4 h-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                {b.description}
              </span>
              {b.recurring && (
                <Badge variant="outline" className="text-[9px] py-0 px-1 text-slate-500">
                  <Repeat className="w-2.5 h-2.5 mr-0.5" /> Mensal
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
              <span>Venc: {formatDate(b.due_date)}</span>
              {b.category && <span>• {b.category}</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="text-sm sm:text-base font-extrabold tabular-nums text-slate-900 dark:text-white">
              {formatCurrency(b.value, hideValues)}
            </div>
            <span
              className={`text-[10px] font-semibold ${
                isPaid ? 'text-emerald-600' : isOverdue ? 'text-red-600' : 'text-amber-600'
              }`}
            >
              {isPaid ? 'Pago' : isOverdue ? 'Vencida' : isToday ? 'Vence Hoje' : 'A vencer'}
            </span>
          </div>

          {!isPaid && (
            <Button
              size="sm"
              onClick={() => {
                setPayModalBill(b)
                setPayAccount(b.account || accounts[0]?.id || '')
              }}
              className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Pagar
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteBill(b.id)}
            className="h-8 w-8 text-slate-400 hover:text-red-600"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Contas e Boletos</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Controle boletos a vencer, contas do mês e pagamentos recorrentes
          </p>
        </div>
        <Button
          onClick={() => {
            setDescription('')
            setValue('')
            setDueDate(new Date().toISOString().slice(0, 10))
            setCategory('Moradia')
            setAccountId(accounts[0]?.id || '')
            setRecurring(false)
            setError('')
            setModalOpen(true)
          }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nova Conta / Boleto
        </Button>
      </div>

      {/* Seções Agrupadas */}
      <div className="space-y-6">
        {/* 1. Vencidas */}
        {overdue.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 text-xs font-bold text-red-600">
              <AlertTriangle className="w-4 h-4" />
              <span>Contas Vencidas ({overdue.length})</span>
            </div>
            <div className="bg-white dark:bg-[#121A2B] rounded-2xl border-2 border-red-200 dark:border-red-900/50 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {overdue.map(renderBillRow)}
            </div>
          </div>
        )}

        {/* 2. Vencendo Hoje */}
        {dueToday.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 text-xs font-bold text-amber-600">
              <Clock className="w-4 h-4" />
              <span>Vencendo Hoje ({dueToday.length})</span>
            </div>
            <div className="bg-white dark:bg-[#121A2B] rounded-2xl border-2 border-amber-200 dark:border-amber-900/50 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {dueToday.map(renderBillRow)}
            </div>
          </div>
        )}

        {/* 3. Próximas a Vencer */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 px-1 text-xs font-bold text-slate-600 dark:text-slate-300">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Próximos Vencimentos ({upcoming.length})</span>
          </div>
          {upcoming.length === 0 ? (
            <div className="p-8 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              Nenhuma conta futura pendente.
            </div>
          ) : (
            <div className="bg-white dark:bg-[#121A2B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
              {upcoming.map(renderBillRow)}
            </div>
          )}
        </div>

        {/* 4. Pagas Recentemente */}
        {paid.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1 text-xs font-bold text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              <span>Contas Pagas ({paid.length})</span>
            </div>
            <div className="bg-white dark:bg-[#121A2B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden opacity-80">
              {paid.map(renderBillRow)}
            </div>
          </div>
        )}
      </div>

      {/* Modal Nova Conta */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              Nova Conta ou Boleto
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSaveBill} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label htmlFor="bill-desc">Descrição *</Label>
              <Input
                id="bill-desc"
                placeholder="Ex: Condomínio, Internet Fibra, Energia"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="bill-val">Valor (R$) *</Label>
                <Input
                  id="bill-val"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  required
                  className="h-10 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="bill-due">Data de Vencimento *</Label>
                <Input
                  id="bill-due"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
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
                <Label>Conta Padrão</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Nenhuma</SelectItem>
                    {accounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 block">
                  Recorrência Mensal
                </span>
                <span className="text-[11px] text-slate-400">
                  Gera o próximo boleto automaticamente após o pagamento
                </span>
              </div>
              <Switch checked={recurring} onCheckedChange={setRecurring} />
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
                {loading ? 'Salvando...' : 'Salvar Conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Confirmar Pagamento */}
      <Dialog open={payModalBill !== null} onOpenChange={(open) => !open && setPayModalBill(null)}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Confirmar Pagamento de Boleto
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <div className="font-bold text-sm text-slate-900 dark:text-white">
                {payModalBill?.description}
              </div>
              <div className="text-emerald-600 font-extrabold text-base tabular-nums">
                {formatCurrency(payModalBill?.value, hideValues)}
              </div>
              <p className="text-[11px] text-slate-400">
                Uma despesa realizada será criada no seu extrato e o boleto ficará marcado como
                pago.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">De qual conta bancária saiu o valor?</Label>
              <Select value={payAccount} onValueChange={setPayAccount}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Selecione a conta" />
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
                onClick={() => setPayModalBill(null)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmPay}
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold"
              >
                {loading ? 'Gravando...' : 'Confirmar como Pago'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
