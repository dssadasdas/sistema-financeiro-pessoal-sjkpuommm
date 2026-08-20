import React, { useState, useMemo, useCallback } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/constants'
import { Account, BankName } from '@/types/finance'
import {
  Plus,
  Landmark,
  Wallet,
  TrendingUp,
  PiggyBank,
  ArrowRightLeft,
  Loader2,
  AlertTriangle,
  ChevronRight,
  ArrowUpDown,
  Star,
  CheckCircle2,
  ShieldCheck,
  Building2,
  Eye,
  EyeOff,
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
import { BankSelector } from '@/components/BankSelector'
import { AccountCard } from '@/components/AccountCard'
import { findInstitution, FinancialInstitution } from '@/data/institutions'
import { BankLogoIcon } from '@/components/BankLogoIcon'

const ACCOUNT_TYPES = ['Conta corrente', 'Conta poupança', 'Carteira', 'Outro'] as const
type AccountType = (typeof ACCOUNT_TYPES)[number]

type SortOption = 'principal' | 'maior_saldo' | 'menor_saldo' | 'nome' | 'personalizada'

interface AccountForm {
  name: string
  type: AccountType
  bankId: string // Slug/Id da instituição
  bankDisplayName: string
  color: string
  customCode: string
  opening_balance: string
  is_primary: boolean
}

const initialForm: AccountForm = {
  name: '',
  type: 'Conta corrente',
  bankId: 'nubank',
  bankDisplayName: 'Nubank',
  color: '#820AD1',
  customCode: '',
  opening_balance: '',
  is_primary: false,
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
  const { hideValues, user } = useAuth()

  // Preferências locais do usuário persistidas em localStorage
  const [primaryAccountId, setPrimaryAccountId] = useState<string>(() => {
    return localStorage.getItem('semeia_primary_account_id') || ''
  })
  const [archivedAccountIds, setArchivedAccountIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('semeia_archived_account_ids') || '[]')
    } catch {
      return []
    }
  })
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    return (localStorage.getItem('semeia_accounts_sort_by') as SortOption) || 'principal'
  })
  const [showArchived, setShowArchived] = useState(false)

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

  // Conta selecionada para detalhes (extrato expandido)
  const [expandedAccount, setExpandedAccount] = useState<string | null>(null)

  // Se não houver conta principal definida no storage, assume a primeira conta ativa
  const effectivePrimaryId = useMemo(() => {
    if (primaryAccountId && accounts.some((a) => a.id === primaryAccountId)) {
      return primaryAccountId
    }
    return accounts[0]?.id || ''
  }, [primaryAccountId, accounts])

  // Salva conta principal
  const handleSetPrimary = (acc: Account) => {
    setPrimaryAccountId(acc.id)
    localStorage.setItem('semeia_primary_account_id', acc.id)
  }

  // Alterna arquivamento da conta
  const handleToggleArchive = (acc: Account) => {
    setArchivedAccountIds((prev) => {
      const next = prev.includes(acc.id) ? prev.filter((id) => id !== acc.id) : [...prev, acc.id]
      localStorage.setItem('semeia_archived_account_ids', JSON.stringify(next))
      return next
    })
  }

  // Salva critério de ordenação
  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort)
    localStorage.setItem('semeia_accounts_sort_by', newSort)
  }

  // Contas ativas vs arquivadas
  const activeAccounts = useMemo(
    () => accounts.filter((a) => !archivedAccountIds.includes(a.id)),
    [accounts, archivedAccountIds],
  )
  const archivedAccounts = useMemo(
    () => accounts.filter((a) => archivedAccountIds.includes(a.id)),
    [accounts, archivedAccountIds],
  )

  // Saldo consolidado patrimonial (apenas contas ativas)
  const consolidatedBalance = useMemo(
    () => activeAccounts.reduce((acc, a) => acc + (a.current_balance || 0), 0),
    [activeAccounts],
  )

  // Lista ordenada de contas
  const sortedAccounts = useMemo(() => {
    const list = showArchived ? accounts : activeAccounts
    return [...list].sort((a, b) => {
      if (sortBy === 'principal') {
        const aIsPrimary = a.id === effectivePrimaryId
        const bIsPrimary = b.id === effectivePrimaryId
        if (aIsPrimary && !bIsPrimary) return -1
        if (!aIsPrimary && bIsPrimary) return 1
        return (b.current_balance || 0) - (a.current_balance || 0)
      }
      if (sortBy === 'maior_saldo') {
        return (b.current_balance || 0) - (a.current_balance || 0)
      }
      if (sortBy === 'menor_saldo') {
        return (a.current_balance || 0) - (b.current_balance || 0)
      }
      if (sortBy === 'nome') {
        return a.name.localeCompare(b.name, 'pt-BR')
      }
      return 0
    })
  }, [accounts, activeAccounts, showArchived, sortBy, effectivePrimaryId])

  const handleOpenCreate = () => {
    setEditingId(null)
    setForm(initialForm)
    setError('')
    setFieldErrors({})
    setModalOpen(true)
  }

  const handleOpenEdit = (acc: Account) => {
    const inst = findInstitution(acc.bank || acc.name)
    setEditingId(acc.id)
    setForm({
      name: acc.name,
      type: (ACCOUNT_TYPES.includes(acc.type as AccountType)
        ? acc.type
        : 'Conta corrente') as AccountType,
      bankId: inst.id,
      bankDisplayName: inst.id === 'outro' ? acc.bank || 'Outro' : inst.shortName,
      color: acc.color || inst.primaryColor,
      customCode: inst.code || '',
      opening_balance: String(acc.opening_balance || 0),
      is_primary: acc.id === effectivePrimaryId,
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

  const handleOpenTransfer = (acc?: Account) => {
    const src = acc?.id || accounts[0]?.id || ''
    const target = accounts.find((a) => a.id !== src)?.id || accounts[1]?.id || ''
    setSourceAccountId(src)
    setTargetAccountId(target)
    setTransferAmount('')
    setTransferDesc('')
    setTransferDate(new Date().toISOString().slice(0, 10))
    setError('')
    setTransferModalOpen(true)
  }

  // Compatibilidade com enum de bank no PocketBase:
  // Se for uma das strings suportadas pelo enum histórico, grava o nome exato.
  // Caso contrário, grava 'Outro' no campo bank e salva a cor/nome para perfeita compatibilidade!
  const POCKETBASE_ALLOWED_BANKS = [
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setFieldErrors({})

    const trimmedName = form.name.trim()
    if (!trimmedName) {
      setFieldErrors({ name: 'Informe o nome da conta' })
      return
    }

    setLoading(true)
    try {
      // Resolve compatibilidade com enum de banco
      const selectedInst = findInstitution(form.bankId)
      let bankEnumVal: BankName = 'Outro'

      if (POCKETBASE_ALLOWED_BANKS.includes(selectedInst.shortName)) {
        bankEnumVal = selectedInst.shortName as BankName
      } else if (POCKETBASE_ALLOWED_BANKS.includes(form.bankDisplayName)) {
        bankEnumVal = form.bankDisplayName as BankName
      }

      const payload: Partial<Account> = {
        name: trimmedName,
        type: form.type,
        bank: bankEnumVal,
        color: form.color || selectedInst.primaryColor,
        opening_balance: parseFloat(form.opening_balance.replace(',', '.')) || 0,
      }

      let savedAccount: Account
      if (editingId) {
        savedAccount = await updateAccount(editingId, {
          name: payload.name,
          type: payload.type,
          bank: payload.bank,
          color: payload.color,
        })
      } else {
        savedAccount = await createAccount(payload)
      }

      if (form.is_primary && savedAccount?.id) {
        handleSetPrimary(savedAccount)
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
        description: `Ajuste de Saldo: ${adjustNote.trim() || 'Sem justificativa'}`,
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
      await deleteAccount(deleteAccountTarget.id)
      setDeleteAccountTarget(null)
      setDeleteBlocked(false)
    } catch (err: unknown) {
      const errorObj = err as {
        message?: string
        status?: number
        response?: { message?: string; code?: string }
      }
      const msg = errorObj?.response?.message || errorObj?.message || ''
      const code = errorObj?.response?.code || ''
      const lowerMsg = msg.toLowerCase()

      if (
        lowerMsg.includes('movimenta') ||
        lowerMsg.includes('vinculada') ||
        code === 'linked_transactions'
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

  // Transações da conta expandida
  const expandedTransactions = useMemo(() => {
    if (!expandedAccount) return []
    return transactions.filter((t) => t.account === expandedAccount).slice(0, 8)
  }, [expandedAccount, transactions])

  const handleToggleExpand = useCallback((accId: string) => {
    setExpandedAccount((prev) => (prev === accId ? null : accId))
  }, [])

  if (isLoading) {
    return <LoadingState message="Carregando instituições e contas bancárias..." />
  }
  if (loadError) {
    return <ErrorState message="Não foi possível carregar suas contas." onRetry={refreshAll} />
  }

  return (
    <div className="space-y-6">
      {/* 8. Topo Consolidado da Área de Bancos */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 sm:p-6 rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200/90 dark:border-slate-800 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Bancos e Contas
            </h2>
            <Badge
              variant="secondary"
              className="text-xs font-semibold px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-0"
            >
              {activeAccounts.length}{' '}
              {activeAccounts.length === 1 ? 'conta ativa' : 'contas ativas'}
            </Badge>
          </div>
          <div className="flex items-baseline gap-2 flex-wrap pt-0.5">
            <span className="text-xs sm:text-sm text-slate-500 font-medium">
              Saldo consolidado:
            </span>
            <span
              className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight ${
                consolidatedBalance >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {formatCurrency(consolidatedBalance, hideValues)}
            </span>
          </div>
        </div>

        {/* Botões de Ação Topo */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {accounts.length >= 2 && (
            <Button
              variant="outline"
              onClick={() => handleOpenTransfer()}
              className="flex-1 sm:flex-initial rounded-xl font-semibold text-xs sm:text-sm gap-1.5 h-10 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 justify-center shadow-xs"
            >
              <ArrowRightLeft className="w-4 h-4 text-emerald-600" /> Transferir
            </Button>
          )}

          <Button
            onClick={handleOpenCreate}
            className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5 h-10 justify-center"
          >
            <Plus className="w-4 h-4" /> Nova Conta
          </Button>
        </div>
      </div>

      {/* 7. Barra de Filtro e Ordenação das Contas */}
      {accounts.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5" /> Ordenar por:
            </span>
            <Select value={sortBy} onValueChange={(v) => handleSortChange(v as SortOption)}>
              <SelectTrigger className="h-8.5 text-xs rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] w-48 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="principal">Conta Principal primeiro</SelectItem>
                <SelectItem value="maior_saldo">Maior saldo</SelectItem>
                <SelectItem value="menor_saldo">Menor saldo</SelectItem>
                <SelectItem value="nome">Nome (A-Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {archivedAccounts.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowArchived(!showArchived)}
              className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white self-start sm:self-auto h-8 rounded-xl"
            >
              {showArchived
                ? `Ocultar arquivadas (${archivedAccounts.length})`
                : `Ver arquivadas (${archivedAccounts.length})`}
            </Button>
          )}
        </div>
      )}

      {/* 4 & 9 & 10: Grid de Contas (Mobile: 1 coluna | Desktop: 2-3 colunas) */}
      {accounts.length === 0 ? (
        <EmptyState
          icon={Landmark}
          title="Nenhuma conta cadastrada"
          description="Cadastre sua primeira conta no Nubank, Itaú, Bradesco, Caixa, Banco do Brasil, Inter ou qualquer outra instituição brasileira."
          actionLabel="Adicionar Primeira Conta"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 items-start">
          {sortedAccounts.map((acc) => {
            const isPrimary = acc.id === effectivePrimaryId
            const isArchived = archivedAccountIds.includes(acc.id)
            const isExpanded = expandedAccount === acc.id

            return (
              <div key={acc.id} className="space-y-2">
                <AccountCard
                  account={acc}
                  isPrimary={isPrimary}
                  isArchived={isArchived}
                  isExpanded={isExpanded}
                  globalHideValues={hideValues}
                  onToggleExpand={handleToggleExpand}
                  onEdit={handleOpenEdit}
                  onAdjustBalance={handleOpenAdjust}
                  onTransfer={handleOpenTransfer}
                  onSetPrimary={handleSetPrimary}
                  onToggleArchive={handleToggleArchive}
                  onDelete={(target) => {
                    setDeleteBlocked(false)
                    setDeleteAccountTarget(target)
                  }}
                />

                {/* Extrato / Últimas Movimentações Expandidas */}
                {isExpanded && (
                  <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-[#121A2B]/70 shadow-xs animate-in fade-in-50 duration-200">
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          Últimas Movimentações · {acc.name}
                        </span>
                        <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                          {expandedTransactions.length} registros
                        </Badge>
                      </div>

                      {expandedTransactions.length === 0 ? (
                        <p className="text-xs text-slate-400 py-2 italic text-center">
                          Nenhuma movimentação vinculada a esta conta ainda.
                        </p>
                      ) : (
                        <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800/60">
                          {expandedTransactions.map((t) => (
                            <div
                              key={t.id}
                              className="flex items-center justify-between text-xs pt-1.5 first:pt-0"
                            >
                              <div className="flex items-center gap-2 min-w-0 pr-2">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    t.type === 'receita' ? 'bg-emerald-500' : 'bg-rose-500'
                                  }`}
                                />
                                <div className="min-w-0 flex flex-col">
                                  <span className="truncate text-slate-700 dark:text-slate-300 font-medium">
                                    {t.description}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {formatDate(t.date)} • {t.category || 'Geral'}
                                  </span>
                                </div>
                              </div>
                              <span
                                className={`font-bold tabular-nums flex-shrink-0 ${
                                  t.type === 'receita'
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-rose-600 dark:text-rose-400'
                                }`}
                              >
                                {t.type === 'receita' ? '+' : '-'}
                                {formatCurrency(t.value, hideValues)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* 1, 2, 3: Modal Novo / Editar Conta com Seletor Visual de Bancos */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md w-full rounded-2xl bg-white dark:bg-[#121A2B] p-5 sm:p-6 shadow-2xl">
          <DialogHeader className="text-left">
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-emerald-600" />
              {editingId ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4 pt-1">
            {/* 1 & 2: Seletor Pesquisável de Banco com Logomarcas */}
            <BankSelector
              value={form.bankId || form.bankDisplayName}
              onChange={(inst, custom) => {
                setForm((prev) => ({
                  ...prev,
                  bankId: inst.id,
                  bankDisplayName: custom?.name || inst.shortName,
                  color: custom?.color || inst.primaryColor,
                  customCode: custom?.code || inst.code || '',
                  // Se o nome da conta estiver vazio ou for o nome anterior de um banco, sugere o nome
                  name:
                    !prev.name.trim() || prev.name === prev.bankDisplayName
                      ? inst.id === 'outro'
                        ? ''
                        : `Conta ${inst.shortName}`
                      : prev.name,
                }))
              }}
              customName={form.bankDisplayName}
              customColor={form.color}
              customCode={form.customCode}
              onCustomDetailsChange={(det) => {
                setForm((prev) => ({
                  ...prev,
                  bankDisplayName: det.name,
                  color: det.color,
                  customCode: det.code,
                }))
              }}
              error={fieldErrors.bank}
            />

            {/* Nome da Conta */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-name" className="text-xs font-semibold">
                Nome da Conta / Identificação *
              </Label>
              <Input
                id="acc-name"
                placeholder="Ex: Nubank Principal, Itaú Salário, Reserva Sicoob"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className="h-10 rounded-xl"
              />
              {fieldErrors.name && (
                <span className="text-[11px] text-red-500">{fieldErrors.name}</span>
              )}
            </div>

            {/* Tipo de Conta */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-type" className="text-xs font-semibold">
                Tipo de Conta *
              </Label>
              <Select
                value={form.type}
                onValueChange={(v) => setForm({ ...form, type: v as AccountType })}
              >
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
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

            {/* Saldo Inicial */}
            <div className="space-y-1.5">
              <Label htmlFor="acc-balance" className="text-xs font-semibold">
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
                <span className="text-[11px] text-slate-400 block">
                  Para alterar o saldo, utilize a opção «Ajustar Saldo».
                </span>
              )}
            </div>

            {/* Marcar como Principal */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="acc-is-primary"
                checked={form.is_primary}
                onChange={(e) => setForm({ ...form, is_primary: e.target.checked })}
                className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <label
                htmlFor="acc-is-primary"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer select-none"
              >
                Definir como Conta Principal (sugerida primeiro nos lançamentos)
              </label>
            </div>

            <DialogFooter className="pt-3 gap-2 flex-col-reverse sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="w-full sm:w-auto rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5 justify-center shadow-md"
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
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B] p-5 sm:p-6 shadow-2xl">
          <DialogHeader className="text-left">
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
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs flex justify-between items-center">
              <span className="text-slate-500 font-medium">Saldo Atual Registrado:</span>
              <span className="font-bold text-sm text-slate-900 dark:text-white tabular-nums">
                {formatCurrency(adjustingAccount?.current_balance || 0, hideValues)}
              </span>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjust-value" className="text-xs font-semibold">
                Valor do Ajuste (R$) *{' '}
                <span className="text-slate-400 font-normal">(positivo ou negativo)</span>
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
                Use sinal negativo (-) para reduzir o saldo, ou positivo (+) para aumentá-lo.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="adjust-note" className="text-xs font-semibold">
                Justificativa / Motivo *
              </Label>
              <Input
                id="adjust-note"
                placeholder="Ex: Correção de conciliação bancária, taxa esquecida..."
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2 gap-2 flex-col-reverse sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setAdjustModalOpen(false)}
                className="w-full sm:w-auto rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAdjust}
                disabled={adjustLoading}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5 justify-center shadow-md"
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
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B] p-5 sm:p-6 shadow-2xl">
          <DialogHeader className="text-left">
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
              <Label className="text-xs font-semibold">Conta de Origem (Sai o valor) *</Label>
              <Select value={sourceAccountId} onValueChange={setSourceAccountId}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="Selecione a conta origem" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.current_balance || 0, hideValues)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Conta de Destino (Recebe o valor) *</Label>
              <Select value={targetAccountId} onValueChange={setTargetAccountId}>
                <SelectTrigger className="h-10 rounded-xl text-xs">
                  <SelectValue placeholder="Selecione a conta destino" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {accounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.current_balance || 0, hideValues)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Valor (R$) *</Label>
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
                <Label className="text-xs font-semibold">Data *</Label>
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
              <Label className="text-xs font-semibold">Descrição / Motivo</Label>
              <Input
                placeholder="Ex: Transferência para poupança, PIX de aporte..."
                value={transferDesc}
                onChange={(e) => setTransferDesc(e.target.value)}
                className="h-10 rounded-xl text-xs"
              />
            </div>

            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
              Transferências entre contas preservam o saldo consolidado patrimonial e não duplicam
              lançamentos de receitas ou despesas nos seus relatórios.
            </div>

            <DialogFooter className="pt-2 gap-2 flex-col-reverse sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransferModalOpen(false)}
                className="w-full sm:w-auto rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={transferLoading}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5 justify-center shadow-md"
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
