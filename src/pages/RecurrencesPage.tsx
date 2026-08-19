import React, { useState } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, CATEGORY_SUGGESTIONS } from '@/lib/constants'
import { Recurrence, PaymentMethod } from '@/types/finance'
import {
  Repeat,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
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

export default function RecurrencesPage() {
  const { recurrences, accounts, createRecurrence, updateRecurrence, deleteRecurrence } =
    useFinance()
  const { hideValues } = useAuth()

  const [modalOpen, setModalOpen] = useState(false)
  const [recToEdit, setRecToEdit] = useState<Recurrence | null>(null)
  const [description, setDescription] = useState('')
  const [value, setValue] = useState('')
  const [type, setType] = useState<'receita' | 'despesa'>('despesa')
  const [category, setCategory] = useState('Moradia')
  const [dueDay, setDueDay] = useState('10')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('PIX')
  const [accountId, setAccountId] = useState('')
  const [active, setActive] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleOpenCreate = () => {
    setRecToEdit(null)
    setDescription('')
    setValue('')
    setType('despesa')
    setCategory('Moradia')
    setDueDay('10')
    setPaymentMethod('PIX')
    setAccountId(accounts[0]?.id || '')
    setActive(true)
    setError('')
    setModalOpen(true)
  }

  const handleOpenEdit = (r: Recurrence) => {
    setRecToEdit(r)
    setDescription(r.description)
    setValue(String(r.value || 0))
    setType(r.type)
    setCategory(r.category || 'Moradia')
    setDueDay(String(r.due_day || 10))
    setPaymentMethod(r.payment_method || 'PIX')
    setAccountId(r.account || '')
    setActive(r.active)
    setError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const num = parseFloat(value.replace(',', '.'))
    if (isNaN(num) || num <= 0) {
      setError('Informe um valor válido.')
      return
    }

    setLoading(true)
    try {
      const payload: Partial<Recurrence> = {
        description: description.trim(),
        value: num,
        type,
        category,
        frequency: 'mensal',
        due_day: parseInt(dueDay, 10) || 10,
        payment_method: paymentMethod,
        account: accountId || undefined,
        active,
        start_date: new Date().toISOString(),
      }

      if (recToEdit) {
        await updateRecurrence(recToEdit.id, payload)
      } else {
        await createRecurrence(payload)
      }
      setModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setError(errorObj?.message || 'Erro ao salvar recorrência.')
    } finally {
      setLoading(false)
    }
  }

  const handleToggleActive = async (r: Recurrence) => {
    await updateRecurrence(r.id, { active: !r.active })
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Recorrentes</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Receitas e despesas fixas geradas automaticamente todo mês
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nova Recorrência
        </Button>
      </div>

      {recurrences.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-sm">Nenhuma recorrência cadastrada.</p>
          <Button onClick={handleOpenCreate} variant="outline" className="mt-4 rounded-xl">
            Criar Primeira Recorrência
          </Button>
        </div>
      ) : (
        <div className="bg-white dark:bg-[#121A2B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
          {recurrences.map((r) => {
            const isReceita = r.type === 'receita'
            const accountName = accounts.find((a) => a.id === r.account)?.name

            return (
              <div
                key={r.id}
                className="p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 font-bold ${
                      isReceita
                        ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                        : 'bg-orange-50 text-orange-600 dark:bg-orange-950/40'
                    }`}
                  >
                    {isReceita ? (
                      <ArrowUpRight className="w-5 h-5" />
                    ) : (
                      <ArrowDownRight className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {r.description}
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[9px] py-0 px-1 font-semibold ${
                          r.active ? 'text-emerald-600 border-emerald-300' : 'text-slate-400'
                        }`}
                      >
                        {r.active ? 'Ativo' : 'Pausado'}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                      <span>Dia {r.due_day} de cada mês</span>
                      {r.category && <span>• {r.category}</span>}
                      {accountName && <span>• {accountName}</span>}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-4 flex-shrink-0">
                  <div className="text-right">
                    <div
                      className={`text-sm sm:text-base font-extrabold tabular-nums ${
                        isReceita ? 'text-emerald-600' : 'text-orange-600'
                      }`}
                    >
                      {isReceita ? '+' : '−'}
                      {formatCurrency(r.value, hideValues)}
                    </div>
                    <span className="text-[10px] text-slate-400">Mensal</span>
                  </div>

                  <Switch
                    checked={r.active}
                    onCheckedChange={() => handleToggleActive(r)}
                    title={r.active ? 'Pausar recorrência' : 'Ativar recorrência'}
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(r)}
                    className="h-8 w-8 text-slate-400 hover:text-slate-700"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => deleteRecurrence(r.id)}
                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              {recToEdit ? 'Editar Recorrência' : 'Nova Recorrência Fixa'}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5 pt-2">
            <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setType('receita')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === 'receita'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                + Receita Fixa
              </button>
              <button
                type="button"
                onClick={() => setType('despesa')}
                className={`py-2 text-xs font-bold rounded-lg transition-all ${
                  type === 'despesa'
                    ? 'bg-orange-600 text-white shadow-sm'
                    : 'text-slate-600 dark:text-slate-300'
                }`}
              >
                − Despesa Fixa
              </button>
            </div>

            <div className="space-y-1">
              <Label htmlFor="rec-desc">Descrição *</Label>
              <Input
                id="rec-desc"
                placeholder="Ex: Aluguel, Salário, Internet"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="rec-val">Valor Mensal (R$) *</Label>
                <Input
                  id="rec-val"
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
                <Label htmlFor="rec-day">Dia do Mês (1-28) *</Label>
                <Input
                  id="rec-day"
                  type="number"
                  min={1}
                  max={28}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
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
                <Label>Forma de Pagamento</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}
                >
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PIX">PIX</SelectItem>
                    <SelectItem value="Boleto">Boleto</SelectItem>
                    <SelectItem value="Débito">Débito</SelectItem>
                    <SelectItem value="Dinheiro">Dinheiro</SelectItem>
                    <SelectItem value="Transferência">Transferência</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                {loading ? 'Salvando...' : 'Salvar Recorrência'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
