import React, { useState, useMemo, useCallback } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/constants'
import { Account } from '@/types/finance'
import {
  Plus,
  Landmark,
  Wallet,
  TrendingUp,
  PiggyBank,
  ArrowRightLeft,
  Edit2,
  Trash2,
  Loader2,
  AlertTriangle,
  ChevronRight,
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

const ACCOUNT_TYPES = ['Conta corrente', 'Conta poupança', 'Carteira', 'Outro'] as const

type AccountType = (typeof ACCOUNT_TYPES)[number]

const ACCOUNT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Conta corrente': Landmark,
  'Conta poupança': PiggyBank,
  Outro: TrendingUp,
  Carteira: Wallet,
}

interface AccountForm {
  name: string
  type: AccountType
  opening_balance: string
}

const initialForm: AccountForm = {
  name: '',
  type: 'Conta corrente',
  opening_balance: '',
}

export default function AccountsPage() {
  const {
    accounts,
    transactions,
    createAccount,
    updateAccount,
    deleteAccount,
    createTransfer,
    createTransaction,
    isLoading,
    loadError,
    refreshAll,
  } = useFinance()
  const { hideValues } = useAuth()

  // Modal Novo / Editar Conta
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<AccountForm>(initialForm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Modal Ajuste de Saldo
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [adjustingAccount, setAdjustingAccount] = useState<Account | null>(null)
  const [adjustValue, setAdjustValue] = useState('')
  const [adjustNote, setAdjustNote] = useState('')
  const [adjustLoading, setAdjustLoading] = useState(false)

  // Modal Transferência entre Contas
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [sourceAccountId, setSourceAccountId] = useState('')
  const [targetAccountId, setTargetAccountId] = useState('')
  const [transferAmount, setTransferAmount] = useState('')
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10))
  const [transferDesc, setTransferDesc] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)

  // Confirmação de Exclusão
  const [deleteAccountTarget, setDeleteAccountTarget] = useState<Account | null>(null)
  const [deleteBlocked, setDeleteBlocked] = useState(false)
  const [deletingCascade, setDeletingCascade] = useState(false)

  // Conta selecionada para detalhes (extrato)
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)

  // Soma total patrimonial
  const totalBalance = useMemo(
    () => accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0),
    [accounts],
  )

  const handleOpenCreate = () => {
    setEditingId(null)
    setForm(initialForm)
    setError('')
    setFieldErrors({})
    setModalOpen(true)
  }

  const handleOpenEdit = (acc: Account) => {
    setEditingId(acc.id)
    setForm({
      name: acc.name,
      type: (ACCOUNT_TYPES.includes(acc.type as AccountType)
        ? acc.type
        : 'Conta corrente') as AccountType,
      opening_balance: String(acc.opening_balance || 0),
    })
    setError('')
    setFieldErrors({})
    setModalOpen(true)
  }

  const handleOpenAdjust = (acc: Account) => {
    setAdjustingAccount(acc)
    setAdjustValue('')
    setAdjustNote('')
    setError('')
    setAdjustModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})
    setLoading(true)
    try {
      const payload: Partial<Account> = {
        name: form.name.trim(),
        type: form.type,
        opening_balance: parseFloat(form.opening_balance.replace(',', '.')) || 0,
      }

      if (editingId) {
        await updateAccount(editingId, {
          name: payload.name,
          type: payload.type,
        })
      } else {
        await createAccount(payload)
      }
      setModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string; data?: Record<string, { message: string }> }
      setError(errorObj?.message || 'Erro ao salvar conta.')
      if (errorObj?.data) {
        const fe: Record<string, string> = {}
        for (const [k, v] of Object.entries(errorObj.data)) {
          fe[k] = v.message
        }
        setFieldErrors(fe)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleAdjust = async () => {
    if (!adjustingAccount) return
    setAdjustLoading(true)
    setError('')
    try {
      const value = parseFloat(adjustValue.replace(',', '.'))
      if (isNaN(value) || value === 0) {
        setError('Informe um valor de ajuste válido (positivo ou negativo).')
        setAdjustLoading(false)
        return
      }
      await createTransaction({
        description: `Ajuste de Saldo: ${adjustNote || 'Sem justificativa'}`,
        value: Math.abs(value),
        category: 'Ajuste de Saldo',
        payment_method: 'Transferência',
        status: 'realizado',
        type: value < 0 ? 'despesa' : 'receita',
        account: adjustingAccount.id,
        source: 'ajuste',
        date: new Date().toISOString(),
      })
      setAdjustModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setError(errorObj?.message || 'Erro ao registrar ajuste.')
    } finally {
      setAdjustLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteAccountTarget) return
    setLoading(true)
    setError('')
    try {
      // Se a conta já tem transações conhecidas no frontend, abre a confirmação de cascata diretamente
      const hasKnownTxns = transactions.some(
        (t) =>
          t.account === deleteAccountTarget.id ||
          t.transfer_target_account === deleteAccountTarget.id,
      )
      if (hasKnownTxns) {
        setDeleteBlocked(true)
        setLoading(false)
        return
      }

      await deleteAccount(deleteAccountTarget.id)
      setDeleteAccountTarget(null)
      setDeleteBlocked(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string; status?: number; response?: { message?: string } }
      const msg = errorObj?.response?.message || errorObj?.message || ''
      const lowerMsg = msg.toLowerCase()
      if (
        lowerMsg.includes('movimentações') ||
        lowerMsg.includes('transaç') ||
        lowerMsg.includes('transac') ||
        lowerMsg.includes('linked') ||
        lowerMsg.includes('cannot') ||
        lowerMsg.includes('histórico') ||
        lowerMsg.includes('historico') ||
        errorObj?.status === 400 ||
        errorObj?.status === 500
      ) {
        setDeleteBlocked(true)
      } else {
        setError(msg || 'Erro ao excluir conta.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCascade = async () => {
    if (!deleteAccountTarget) return
    setDeletingCascade(true)
    setError('')
    try {
      await deleteAccount(deleteAccountTarget.id, { deleteLinkedTransactions: true })
      setDeleteAccountTarget(null)
      setDeleteBlocked(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string; response?: { message?: string } }
      const msg = errorObj?.response?.message || errorObj?.message || ''
      setError(msg || 'Erro ao excluir conta e transações vinculadas.')
    } finally {
      setDeletingCascade(false)
    }
  }

  // Transações da conta expandida
  const expandedTransactions = useMemo(() => {
    if (!expandedAccount) return []
    return transactions.filter((t) => t.account === expandedAccount).slice(0, 8)
  }, [expandedAccount, transactions])

  const handleToggleExpand = useCallback((accId: string) => {
    setExpandedAccount((prev) => (prev === accId ? null : accId))
  }, [])

  if (isLoading) {
    return <LoadingState message="Carregando contas..." />
  }
  if (loadError) {
    return <ErrorState message="Não foi possível carregar suas contas." onRetry={refreshAll} />
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    const amt = parseFloat(transferAmount.replace(',', '.'))
    if (isNaN(amt) || amt <= 0) {
      setError('Informe um valor de transferência válido e maior que zero.')
      return
    }
    if (!sourceAccountId || !targetAccountId) {
      setError('Selecione as contas de origem e destino.')
      return
    }
    if (sourceAccountId === targetAccountId) {
      setError('A conta de origem e destino devem ser diferentes.')
      return
    }

    setTransferLoading(true)
    try {
      await createTransfer(
        sourceAccountId,
        targetAccountId,
        amt,
        transferDate,
        transferDesc.trim() || undefined,
      )
      setTransferModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setError(errorObj?.message || 'Erro ao realizar transferência.')
    } finally {
      setTransferLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Contas Bancárias</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Saldo total patrimonial:{' '}
            <span className="font-bold text-emerald-600">
              {formatCurrency(totalBalance, hideValues)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length >= 2 && (
            <Button
              variant="outline"
              onClick={() => {
                setSourceAccountId(accounts[0]?.id || '')
                setTargetAccountId(accounts[1]?.id || '')
                setTransferAmount('')
                setTransferDesc('')
                setTransferDate(new Date().toISOString().slice(0, 10))
                setError('')
                setTransferModalOpen(true)
              }}
              className="rounded-xl font-semibold text-xs sm:text-sm gap-1.5 h-10 border-slate-200 dark:border-slate-800"
            >
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" /> Transferir
            </Button>
          )}
          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5 h-10"
          >
            <Plus className="w-4 h-4" /> Nova Conta
          </Button>
        </div>
      </div>

      {accounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Nenhuma conta cadastrada"
          description="Cadastre sua primeira conta bancária, carteira ou poupança para acompanhar seu saldo patrimonial."
          actionLabel="Adicionar Primeira Conta"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {accounts.map((acc) => {
            const Icon = ACCOUNT_TYPE_ICONS[acc.type as AccountType] || Landmark
            const isExpanded = expandedAccount === acc.id
            const positive = (acc.current_balance || 0) >= 0
            return (
              <Card
                key={acc.id}
                className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm hover:shadow-md transition-all overflow-hidden"
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                          {acc.name}
                        </h3>
                        <Badge
                          variant="outline"
                          className="text-[10px] font-medium mt-0.5 px-1.5 py-0"
                        >
                          {acc.type}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg"
                        onClick={() => handleOpenEdit(acc)}
                        title="Editar Conta"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40"
                        onClick={() => {
                          setDeleteBlocked(false)
                          setDeleteAccountTarget(acc)
                        }}
                        title="Excluir Conta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="py-3 border-t border-b border-slate-100 dark:border-slate-800 my-2">
                    <span className="text-[11px] text-slate-400 uppercase font-semibold">
                      Saldo Atual
                    </span>
                    <div
                      className={`text-2xl font-black tabular-nums ${
                        positive ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(acc.current_balance, hideValues)}
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Saldo inicial: {formatCurrency(acc.opening_balance, hideValues)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2 mt-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAdjust(acc)}
                      className="rounded-lg text-xs font-semibold gap-1"
                    >
                      <ArrowRightLeft className="w-3.5 h-3.5" /> Ajustar Saldo
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleExpand(acc.id)}
                      className="rounded-lg text-xs font-semibold text-emerald-600 gap-1"
                    >
                      {isExpanded ? 'Ocultar' : 'Detalhes'}
                      <ChevronRight
                        className={`w-3.5 h-3.5 transition-transform ${
                          isExpanded ? 'rotate-90' : ''
                        }`}
                      />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <span className="text-[10px] uppercase font-bold text-slate-400">
                        Últimas Movimentações
                      </span>
                      {expandedTransactions.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2">
                          Nenhuma movimentação vinculada a esta conta.
                        </p>
                      ) : (
                        expandedTransactions.map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between text-xs py-1"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  t.type === 'receita' ? 'bg-emerald-500' : 'bg-red-500'
                                }`}
                              />
                              <span className="truncate text-slate-600 dark:text-slate-300">
                                {t.description}
                              </span>
                            </div>
                            <span
                              className={`font-bold tabular-nums flex-shrink-0 ${
                                t.type === 'receita' ? 'text-emerald-600' : 'text-red-600'
                              }`}
                            >
                              {t.type === 'receita' ? '+' : '-'}
                              {formatCurrency(t.value, hideValues)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Novo / Editar Conta */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              {editingId ? 'Editar Conta' : 'Nova Conta Bancária'}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="acc-name">Nome da Conta *</Label>
              <Input
                id="acc-name"
                placeholder="Ex: Conta Corrente Nubank, Carteira Geral"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="h-10 rounded-xl"
              />
              {fieldErrors.name && (
                <span className="text-[11px] text-red-500">{fieldErrors.name}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-type">Tipo de Conta *</Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as AccountType })}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {fieldErrors.type && (
                <span className="text-[11px] text-red-500">{fieldErrors.type}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="acc-balance">
                Saldo Inicial (R$){' '}
                {editingId && <span className="text-slate-400">(não editável)</span>}
              </Label>
              <Input
                id="acc-balance"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={form.opening_balance}
                onChange={(e) => setForm({ ...form, opening_balance: e.target.value })}
                disabled={!!editingId}
                className="h-10 rounded-xl font-bold disabled:opacity-50"
              />
              {fieldErrors.opening_balance && (
                <span className="text-[11px] text-red-500">{fieldErrors.opening_balance}</span>
              )}
              {editingId && (
                <span className="text-[11px] text-slate-400">
                  Para alterar o saldo, use o botão «Ajustar Saldo».
                </span>
              )}
            </div>

            <DialogFooter className="pt-3 gap-2">
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : editingId ? (
                  'Salvar Alterações'
                ) : (
                  'Criar Conta'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Ajuste de Saldo */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
              Ajustar Saldo · {adjustingAccount?.name}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {error}
            </div>
          )}

          <div className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs flex justify-between">
              <span className="text-slate-500">Saldo Atual:</span>
              <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                {formatCurrency(adjustingAccount?.current_balance || 0, hideValues)}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjust-value">
                Valor do Ajuste (R$) *{' '}
                <span className="text-slate-400">(positivo ou negativo)</span>
              </Label>
              <Input
                id="adjust-value"
                type="number"
                step="0.01"
                placeholder="Ex: -50,00 ou 150,00"
                value={adjustValue}
                onChange={(e) => setAdjustValue(e.target.value)}
                className="h-10 rounded-xl font-bold"
              />
              <p className="text-[11px] text-slate-400">
                Use negativo (-) para reduzir o saldo, positivo (+) para aumentá-lo.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjust-note">Justificativa *</Label>
              <Input
                id="adjust-note"
                placeholder="Ex: Correção de diferença de câmbio, taxa esquecida..."
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                variant="outline"
                onClick={() => setAdjustModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAdjust}
                disabled={adjustLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
              >
                {adjustLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Registrando...
                  </>
                ) : (
                  'Registrar Ajuste'
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Transferência entre Contas */}
      <Dialog open={transferModalOpen} onOpenChange={setTransferModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-emerald-600" />
              Transferência entre Contas
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleTransfer} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Conta de Origem (Sai o valor) *</Label>
              <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="Selecione a conta origem" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: {formatCurrency(acc.current_balance || 0, hideValues)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Conta de Destino (Recebe o valor) *</Label>
              <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="Selecione a conta destino" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} (Saldo: {formatCurrency(acc.current_balance || 0, hideValues)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                  className="h-10 rounded-xl font-bold"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label>Data *</Label>
                <Input
                  type="date"
                  value={transferDate}
                  onChange={(e) => setTransferDate(e.target.value)}
                  className="h-10 rounded-xl font-semibold"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Descrição / Motivo</Label>
              <Input
                placeholder="Ex: Transferência de reserva, PIX para conta conjunta..."
                value={transferDesc}
                onChange={(e) => setTransferDesc(e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
              Transferências entre contas não alteram seu saldo consolidado patrimonial e não geram
              duplicação de receitas ou despesas nos relatórios.
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransferModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={transferLoading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
              >
                {transferLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Transferindo...
                  </>
                ) : (
                  'Confirmar Transferência'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog
        open={deleteAccountTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteAccountTarget(null)
            setDeleteBlocked(false)
            setError('')
          }
        }}
      >
        <AlertDialogContent className="rounded-2xl bg-white dark:bg-[#121A2B]">
          {deleteBlocked ? (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                  <AlertTriangle className="w-5 h-5" /> Conta com transações vinculadas
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-600 dark:text-slate-300 space-y-2">
                  <p>
                    A conta "<strong>{deleteAccountTarget?.name}</strong>" possui movimentações ou
                    transações vinculadas no histórico financeiro.
                  </p>
                  <p className="text-xs text-slate-500">
                    Deseja excluir esta conta e <strong>TODAS</strong> as suas transações vinculadas
                    permanentemente?
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              {error && (
                <div className="p-2.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
                  {error}
                </div>
              )}
              <AlertDialogFooter className="gap-2 sm:gap-0">
                <AlertDialogCancel
                  onClick={() => {
                    setDeleteAccountTarget(null)
                    setDeleteBlocked(false)
                    setError('')
                  }}
                  className="rounded-xl"
                  disabled={deletingCascade}
                >
                  Cancelar
                </AlertDialogCancel>
                <Button
                  onClick={handleDeleteCascade}
                  disabled={deletingCascade}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold gap-1.5"
                >
                  {deletingCascade ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Excluindo tudo...
                    </>
                  ) : (
                    'Excluir Conta e Transações'
                  )}
                </Button>
              </AlertDialogFooter>
            </>
          ) : (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle className="text-slate-900 dark:text-white">
                  Excluir Conta Bancária?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                  Tem certeza que deseja excluir a conta "
                  <strong>{deleteAccountTarget?.name}</strong>"? Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {error && (
                <div className="p-2.5 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
                  {error}
                </div>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={loading}
                  className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
                >
                  {loading ? 'Excluindo...' : 'Excluir Conta'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
