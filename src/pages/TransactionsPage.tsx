import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, CATEGORY_COLORS } from '@/lib/constants'
import { Transaction } from '@/types/finance'
import {
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  MoreVertical,
  Edit2,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
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
import TransactionModal from '@/components/modals/TransactionModal'

export default function TransactionsPage() {
  const { transactions, accounts, deleteTransaction, toggleTransactionStatus } = useFinance()
  const { hideValues } = useAuth()

  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<'todos' | 'receita' | 'despesa' | 'ajuste'>('todos')
  const [statusFilter, setStatusFilter] = useState<'todos' | 'realizado' | 'pendente'>('todos')
  const [accountFilter, setAccountFilter] = useState<string>('todos')
  const [categoryFilter, setCategoryFilter] = useState<string>('todos')

  const [modalOpen, setModalOpen] = useState(false)
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null)
  const [deleteConfirmTx, setDeleteConfirmTx] = useState<Transaction | null>(null)

  // Extrair categorias únicas
  const categories = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((t) => {
      if (t.category) set.add(t.category)
    })
    return Array.from(set)
  }, [transactions])

  // Filtragem
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (typeFilter !== 'todos' && tx.type !== typeFilter) return false
      if (statusFilter !== 'todos' && tx.status !== statusFilter) return false
      if (accountFilter !== 'todos' && tx.account !== accountFilter) return false
      if (categoryFilter !== 'todos' && tx.category !== categoryFilter) return false

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const desc = (tx.description || '').toLowerCase()
        const cat = (tx.category || '').toLowerCase()
        if (!desc.includes(term) && !cat.includes(term)) return false
      }

      return true
    })
  }, [transactions, typeFilter, statusFilter, accountFilter, categoryFilter, searchTerm])

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

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Lançamentos</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe e gerencie todas as receitas, despesas e ajustes
          </p>
        </div>
        <Button
          onClick={handleCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" /> Novo Lançamento
        </Button>
      </div>

      {/* Barra de Filtros */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Busca */}
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <Input
              placeholder="Buscar descrição ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 rounded-xl"
            />
          </div>

          {/* Tipo */}
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as 'todos' | 'receita' | 'despesa' | 'ajuste')}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="receita">Receitas (+)</SelectItem>
              <SelectItem value="despesa">Despesas (−)</SelectItem>
              <SelectItem value="ajuste">Ajustes</SelectItem>
            </SelectContent>
          </Select>

          {/* Status */}
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as 'todos' | 'realizado' | 'pendente')}
          >
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os status</SelectItem>
              <SelectItem value="realizado">Realizados</SelectItem>
              <SelectItem value="pendente">Pendentes</SelectItem>
            </SelectContent>
          </Select>

          {/* Conta */}
          <Select value={accountFilter} onValueChange={setAccountFilter}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Conta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as contas</SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.id} value={acc.id}>
                  {acc.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Categoria */}
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todas as categorias</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Lista Agrupada por Data */}
      {groupedByDate.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-sm">
            Nenhum lançamento encontrado para os filtros selecionados.
          </p>
          <Button onClick={handleCreate} variant="outline" className="mt-4 rounded-xl">
            Criar Lançamento
          </Button>
        </div>
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

                    const accountName = accounts.find((a) => a.id === tx.account)?.name

                    return (
                      <div
                        key={tx.id}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors group"
                      >
                        {/* Esquerda: Ícone + Descrição + Chips */}
                        <div className="flex items-center gap-3 min-w-0">
                          {/* Toggle Status Clickable */}
                          <button
                            onClick={() => toggleTransactionStatus(tx)}
                            title={
                              isRealizado
                                ? 'Marcar como pendente'
                                : isReceita
                                  ? 'Marcar como recebida'
                                  : 'Marcar como paga'
                            }
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform active:scale-95 ${
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
                              {accountName && (
                                <span className="text-[11px] text-slate-400">• {accountName}</span>
                              )}
                              {tx.payment_method && (
                                <span className="text-[11px] text-slate-400">
                                  • {tx.payment_method}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Direita: Valor + Ações */}
                        <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
                          <div className="text-right">
                            <div
                              className={`text-sm sm:text-base font-extrabold tabular-nums ${
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
                              onClick={() => toggleTransactionStatus(tx)}
                              className="text-[10px] text-slate-400 hover:text-emerald-600 underline block ml-auto"
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
                                className="h-8 w-8 text-slate-400"
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
                                onClick={() => toggleTransactionStatus(tx)}
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
              onClick={async () => {
                if (deleteConfirmTx) {
                  await deleteTransaction(deleteConfirmTx.id)
                  setDeleteConfirmTx(null)
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
