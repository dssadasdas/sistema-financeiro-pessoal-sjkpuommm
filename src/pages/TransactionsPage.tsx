import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, CATEGORY_COLORS } from '@/lib/constants'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Transaction } from '@/types/finance'
import CategoryExpensesWidget from '@/components/CategoryExpensesWidget'
import {
  Plus,
  Search,
  CheckCircle2,
  MoreVertical,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  ArrowLeftRight,
  Calendar as CalendarIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { useToast } from '@/hooks/use-toast'
import TransactionModal from '@/components/modals/TransactionModal'

type DatePeriod =
  | 'todos'
  | 'este_mes'
  | 'mes_anterior'
  | 'ultimos_30_dias'
  | 'ultimos_90_dias'
  | 'este_ano'
  | 'personalizado'

export default function TransactionsPage() {
  const {
    transactions,
    accounts,
    creditCards,
    customCategories,
    deleteTransaction,
    toggleTransactionStatus,
    isLoading,
    loadError,
    refreshAll,
  } = useFinance()
  const { hideValues } = useAuth()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('todos')
  const [datePeriod, setDatePeriod] = useState<DatePeriod>('todos')
  const [customStartDate, setCustomStartDate] = useState<string>('')
  const [customEndDate, setCustomEndDate] = useState<string>('')

  const [modalOpen, setModalOpen] = useState(false)
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null)
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<Transaction | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const categories = useMemo(() => {
    const set = new Set<string>()
    customCategories.forEach((c) => {
      if (c.name) set.add(c.name)
    })
    transactions.forEach((t) => {
      if (t.category) set.add(t.category)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [transactions, customCategories])

  const filteredTransactions = useMemo(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() // 0-indexed

    // Chave do mês atual YYYY-MM
    const currentMonthKey = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`

    // Mês anterior
    const prevMonthDate = new Date(currentYear, currentMonth - 1, 1)
    const prevMonthKey = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}`

    // Limites de dias
    const todayTimestamp = new Date(
      currentYear,
      currentMonth,
      now.getDate(),
      23,
      59,
      59,
      999,
    ).getTime()
    const thirtyDaysAgoTimestamp = todayTimestamp - 30 * 24 * 60 * 60 * 1000
    const ninetyDaysAgoTimestamp = todayTimestamp - 90 * 24 * 60 * 60 * 1000
    const currentYearStr = String(currentYear)

    const filtered = transactions.filter((tx) => {
      if (categoryFilter !== 'todos' && tx.category !== categoryFilter) return false

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const desc = (tx.description || '').toLowerCase()
        const cat = (tx.category || '').toLowerCase()
        if (!desc.includes(term) && !cat.includes(term)) return false
      }

      // Filtro por data (período)
      const txDateStr = (tx.date || '').slice(0, 10)
      if (datePeriod !== 'todos') {
        if (!txDateStr) return false

        if (datePeriod === 'este_mes') {
          if (!txDateStr.startsWith(currentMonthKey)) return false
        } else if (datePeriod === 'mes_anterior') {
          if (!txDateStr.startsWith(prevMonthKey)) return false
        } else if (datePeriod === 'ultimos_30_dias') {
          const txTime = new Date(`${txDateStr}T12:00:00`).getTime()
          if (txTime < thirtyDaysAgoTimestamp || txTime > todayTimestamp + 24 * 60 * 60 * 1000) {
            return false
          }
        } else if (datePeriod === 'ultimos_90_dias') {
          const txTime = new Date(`${txDateStr}T12:00:00`).getTime()
          if (txTime < ninetyDaysAgoTimestamp || txTime > todayTimestamp + 24 * 60 * 60 * 1000) {
            return false
          }
        } else if (datePeriod === 'este_ano') {
          if (!txDateStr.startsWith(currentYearStr)) return false
        } else if (datePeriod === 'personalizado') {
          if (customStartDate && txDateStr < customStartDate) return false
          if (customEndDate && txDateStr > customEndDate) return false
        }
      }

      return true
    })

    return filtered.sort((a, b) => {
      return new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime()
    })
  }, [transactions, categoryFilter, searchTerm, datePeriod, customStartDate, customEndDate])

  // Agrupamento por data (YYYY-MM-DD)
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    filteredTransactions.forEach((tx) => {
      const day = (tx.date || '').slice(0, 10) || 'Sem data'
      if (!map.has(day)) map.set(day, [])
      map.get(day)!.push(tx)
    })
    return Array.from(map.entries())
  }, [filteredTransactions])

  const handleEdit = (tx: Transaction) => {
    setTxToEdit(tx)
    setModalOpen(true)
  }

  const handleCreate = () => {
    setTxToEdit(null)
    setModalOpen(true)
  }

  const handleToggleStatus = async (tx: Transaction) => {
    setActionLoading(tx.id)
    try {
      await toggleTransactionStatus(tx)
      toast({
        title: tx.status === 'realizado' ? 'Marcado como pendente' : 'Status atualizado',
        description:
          tx.status === 'realizado'
            ? 'Lançamento voltou para pendente.'
            : tx.type === 'receita'
              ? 'Receita marcada como recebida.'
              : 'Despesa marcada como paga.',
      })
    } catch (err) {
      toast({
        title: 'Erro ao atualizar status',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirmTx) return
    setActionLoading(deleteConfirmTx.id)
    try {
      await deleteTransaction(deleteConfirmTx.id)
      toast({
        title: 'Lançamento excluído',
        description: `"${deleteConfirmTx.description}" foi removido.`,
      })
      setDeleteConfirmTx(null)
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setActionLoading(null)
    }
  }

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    categoryFilter !== 'todos' ||
    datePeriod !== 'todos' ||
    customStartDate !== '' ||
    customEndDate !== ''

  const clearFilters = () => {
    setSearchTerm('')
    setCategoryFilter('todos')
    setDatePeriod('todos')
    setCustomStartDate('')
    setCustomEndDate('')
  }

  if (isLoading) {
    return <LoadingState message="Carregando lançamentos..." />
  }

  if (loadError) {
    return (
      <ErrorState
        message="Não foi possível carregar seus lançamentos. Verifique sua conexão e tente novamente."
        onRetry={refreshAll}
      />
    )
  }

  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name
  const cardName = (id?: string) => creditCards.find((c) => c.id === id)?.name

  return (
    <div className="space-y-6">
      {/* 1. Gráfico de Gastos por Categoria (Donut) no topo */}
      <CategoryExpensesWidget
        transactions={transactions}
        customCategories={customCategories}
        hideValues={hideValues}
      />

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
            Lançamentos
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe e gerencie todas as receitas, despesas e ajustes
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5 justify-center"
        >
          <Plus className="w-4 h-4" /> Nova Transação
        </Button>
      </div>

      {/* 2. Barra de Filtros Simplificada: Busca, Categoria e Data */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Busca por descrição/categoria */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              placeholder="Buscar descrição ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          {/* Filtro por categoria */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent className="max-h-64">
              <SelectItem value="todos">Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro por data (período) */}
          <Select value={datePeriod} onValueChange={(v) => setDatePeriod(v as DatePeriod)}>
            <SelectTrigger className="h-10 rounded-xl">
              <div className="flex items-center gap-2 truncate">
                <CalendarIcon className="w-4 h-4 text-slate-400 shrink-0" />
                <SelectValue placeholder="Período" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todo o período</SelectItem>
              <SelectItem value="este_mes">Este mês</SelectItem>
              <SelectItem value="mes_anterior">Mês anterior</SelectItem>
              <SelectItem value="ultimos_30_dias">Últimos 30 dias</SelectItem>
              <SelectItem value="ultimos_90_dias">Últimos 90 dias</SelectItem>
              <SelectItem value="este_ano">Este ano</SelectItem>
              <SelectItem value="personalizado">Personalizado...</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Inputs adicionais se período personalizado for escolhido */}
        {datePeriod === 'personalizado' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500">De (Data Inicial)</label>
              <Input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-500">Até (Data Final)</label>
              <Input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="h-9 rounded-xl text-xs"
              />
            </div>
          </div>
        )}

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500">
              {filteredTransactions.length} lançamento(s) encontrado(s)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-7 text-xs text-slate-500 hover:text-slate-700"
            >
              Limpar filtros
            </Button>
          </div>
        )}
      </div>

      {/* Lista Agrupada por Data */}
      {transactions.length === 0 ? (
        <EmptyState
          icon={ArrowLeftRight}
          title="Nenhum lançamento ainda"
          description="Comece registrando sua primeira receita ou despesa para acompanhar suas finanças."
          actionLabel="Criar primeiro lançamento"
          onAction={handleCreate}
        />
      ) : groupedByDate.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nenhum lançamento encontrado"
          description="Tente ajustar os filtros para encontrar o que procura."
          actionLabel="Limpar filtros"
          onAction={clearFilters}
        />
      ) : (
        <div className="space-y-6">
          {groupedByDate.map(([day, txns]) => {
            const dayIncome = txns
              .filter((t) => t.type === 'receita')
              .reduce((acc, t) => acc + Number(t.value || 0), 0)
            const dayExpense = txns
              .filter((t) => t.type === 'despesa')
              .reduce((acc, t) => acc + Number(t.value || 0), 0)

            return (
              <div key={day} className="space-y-2">
                {/* Header do Dia */}
                <div className="flex items-center justify-between px-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>{formatDate(day)}</span>
                  <div className="flex items-center gap-3">
                    {dayIncome > 0 && (
                      <span className="text-emerald-600 font-bold">
                        +{formatCurrency(dayIncome, hideValues)}
                      </span>
                    )}
                    {dayExpense > 0 && (
                      <span className="text-orange-600 font-bold">
                        −{formatCurrency(dayExpense, hideValues)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Cards das transações do dia */}
                <div className="bg-white dark:bg-[#121A2B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                  {txns.map((tx) => {
                    const isReceita = tx.type === 'receita'
                    const isDespesa = tx.type === 'despesa'
                    const isAjuste = tx.type === 'ajuste'
                    const isRealizado = tx.status === 'realizado'
                    const isLoadingThis = actionLoading === tx.id

                    return (
                      <div
                        key={tx.id}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group"
                      >
                        {/* Esquerda: Ícone + Descrição + Chips */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Toggle Status Clickable */}
                          <button
                            onClick={() => handleToggleStatus(tx)}
                            disabled={isLoadingThis}
                            title={
                              isRealizado
                                ? 'Marcar como pendente'
                                : isReceita
                                  ? 'Marcar como recebida'
                                  : 'Marcar como paga'
                            }
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 disabled:opacity-50 ${
                              isReceita
                                ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40'
                                : isDespesa
                                  ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40'
                                  : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40'
                            }`}
                          >
                            {isReceita ? (
                              <ArrowUpRight className="w-5 h-5" />
                            ) : isDespesa ? (
                              <ArrowDownRight className="w-5 h-5" />
                            ) : (
                              <ArrowUpDown className="w-5 h-5" />
                            )}
                          </button>

                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                {tx.description}
                              </span>
                              {!isRealizado && (
                                <Badge className="text-[10px] py-0 px-1.5 bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-0">
                                  Pendente
                                </Badge>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {tx.category && (
                                <span
                                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                                  style={{
                                    backgroundColor:
                                      (CATEGORY_COLORS[tx.category] || '#64748B') + '20',
                                    color: CATEGORY_COLORS[tx.category] || '#64748B',
                                  }}
                                >
                                  {tx.category}
                                </span>
                              )}
                              {tx.payment_method && (
                                <span className="text-[11px] text-slate-400">
                                  • {tx.payment_method}
                                </span>
                              )}
                              {accountName(tx.account) && (
                                <span className="text-[11px] text-slate-400">
                                  • {accountName(tx.account)}
                                </span>
                              )}
                              {cardName(tx.credit_card) && (
                                <span className="text-[11px] text-slate-400">
                                  • {cardName(tx.credit_card)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Direita: Valor + Ações */}
                        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
                          <div className="text-right">
                            <div
                              className={`text-xs sm:text-sm md:text-base font-extrabold tabular-nums break-words ${
                                isReceita
                                  ? 'text-emerald-600'
                                  : isDespesa
                                    ? 'text-orange-600'
                                    : 'text-blue-600'
                              }`}
                            >
                              {isReceita ? '+' : isDespesa ? '−' : ''}
                              {formatCurrency(tx.value, hideValues)}
                            </div>
                            <button
                              onClick={() => handleToggleStatus(tx)}
                              disabled={isLoadingThis}
                              className="text-[10px] text-slate-400 hover:text-emerald-600 underline block ml-auto disabled:opacity-50 whitespace-nowrap"
                            >
                              {isRealizado
                                ? 'Realizado'
                                : isReceita
                                  ? 'Marcar recebida'
                                  : 'Marcar paga'}
                            </button>
                          </div>

                          {/* Menu ⋯ */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-slate-400 shrink-0"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="rounded-xl">
                              <DropdownMenuItem
                                onClick={() => handleEdit(tx)}
                                className="cursor-pointer"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-2" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(tx)}
                                className="cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                                {isRealizado
                                  ? 'Marcar como pendente'
                                  : isReceita
                                    ? 'Marcar recebida'
                                    : 'Marcar paga'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => setDeleteConfirmTx(tx)}
                                className="cursor-pointer text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Novo / Editar */}
      <TransactionModal open={modalOpen} onOpenChange={setModalOpen} transactionToEdit={txToEdit} />

      {/* Confirmação de Exclusão */}
      <AlertDialog
        open={deleteConfirmTx !== null}
        onOpenChange={(open) => !open && setDeleteConfirmTx(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Lançamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o lançamento "
              <strong>{deleteConfirmTx?.description}</strong>" no valor de{' '}
              {formatCurrency(deleteConfirmTx?.value)}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={actionLoading === deleteConfirmTx?.id}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
            >
              {actionLoading === deleteConfirmTx?.id ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
