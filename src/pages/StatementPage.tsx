import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, formatMonthYear, CATEGORY_COLORS } from '@/lib/constants'
import { Transaction } from '@/types/finance'
import {
  Printer,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  Layers,
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import TransactionModal from '@/components/modals/TransactionModal'

export default function StatementPage() {
  const { transactions, accounts, deleteTransaction, toggleTransactionStatus } = useFinance()
  const { hideValues } = useAuth()

  const [statusTab, setStatusTab] = useState<'todos' | 'realizado' | 'pendente'>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [accountFilter, setAccountFilter] = useState<string>('todos')
  const [categoryFilter, setCategoryFilter] = useState<string>('todos')

  const [modalOpen, setModalOpen] = useState(false)
  const [txToEdit, setTxToEdit] = useState<Transaction | null>(null)

  // Categorias
  const categories = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((t) => {
      if (t.category) set.add(t.category)
    })
    return Array.from(set)
  }, [transactions])

  // Filtragem
  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusTab !== 'todos' && tx.status !== statusTab) return false
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
  }, [transactions, statusTab, accountFilter, categoryFilter, searchTerm])

  // Agrupamento por Mês ("YYYY-MM")
  const groupedByMonth = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    filtered.forEach((tx) => {
      const monthKey = (tx.date || '').slice(0, 7) || 'Outros'
      if (!map.has(monthKey)) map.set(monthKey, [])
      map.get(monthKey)!.push(tx)
    })
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  const handlePrint = () => {
    window.print()
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Extrato Consolidado</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Histórico completo e organizado por mês com subtotais
          </p>
        </div>
        <Button
          onClick={handlePrint}
          variant="outline"
          className="rounded-xl border-slate-300 dark:border-slate-700 gap-1.5"
        >
          <Printer className="w-4 h-4" /> Exportar / Imprimir
        </Button>
      </div>

      {/* Filtros e Tabs */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 print:hidden">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Tabs
            value={statusTab}
            onValueChange={(v) => setStatusTab(v as 'todos' | 'realizado' | 'pendente')}
            className="w-full sm:w-auto"
          >
            <TabsList className="grid grid-cols-3 w-full sm:w-80 rounded-xl">
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="realizado">Realizados</TabsTrigger>
              <TabsTrigger value="pendente">Pendentes</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full sm:w-auto flex-1 max-w-2xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-10 rounded-xl"
              />
            </div>

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
      </div>

      {/* Lista Agrupada por Mês */}
      {groupedByMonth.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-sm">Nenhum lançamento no extrato.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedByMonth.map(([monthKey, txns]) => {
            const monthIncome = txns
              .filter((t) => t.type === 'receita' && t.status === 'realizado')
              .reduce((acc, t) => acc + Number(t.value || 0), 0)
            const monthExpense = txns
              .filter((t) => t.type === 'despesa' && t.status === 'realizado')
              .reduce((acc, t) => acc + Number(t.value || 0), 0)
            const monthBalance = monthIncome - monthExpense

            return (
              <div key={monthKey} className="space-y-3">
                {/* Header do Mês com Subtotais */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-emerald-600" />
                    <span className="font-extrabold text-base text-slate-900 dark:text-white capitalize">
                      {formatMonthYear(monthKey)}
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {txns.length} lançamentos
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                    <span className="text-emerald-600">
                      Receitas: +{formatCurrency(monthIncome, hideValues)}
                    </span>
                    <span className="text-orange-600">
                      Despesas: −{formatCurrency(monthExpense, hideValues)}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-md ${
                        monthBalance >= 0
                          ? 'bg-emerald-500/10 text-emerald-600 font-bold'
                          : 'bg-red-500/10 text-red-600 font-bold'
                      }`}
                    >
                      Saldo: {monthBalance >= 0 ? '+' : ''}
                      {formatCurrency(monthBalance, hideValues)}
                    </span>
                  </div>
                </div>

                {/* Lista de Transações */}
                <div className="bg-white dark:bg-[#121A2B] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
                  {txns.map((tx) => {
                    const isReceita = tx.type === 'receita'
                    const isDespesa = tx.type === 'despesa'
                    const isRealizado = tx.status === 'realizado'
                    const accountName = accounts.find((a) => a.id === tx.account)?.name

                    return (
                      <div
                        key={tx.id}
                        className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
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
                          </div>

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
                            <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-400">
                              <span>{formatDate(tx.date)}</span>
                              {tx.category && (
                                <span
                                  className="font-semibold px-2 py-0.5 rounded-full text-[10px]"
                                  style={{
                                    backgroundColor:
                                      (CATEGORY_COLORS[tx.category] || '#64748B') + '20',
                                    color: CATEGORY_COLORS[tx.category] || '#64748B',
                                  }}
                                >
                                  {tx.category}
                                </span>
                              )}
                              {accountName && <span>• {accountName}</span>}
                            </div>
                          </div>
                        </div>

                        <div className="text-right flex-shrink-0">
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
                          <span className="text-[10px] text-slate-400 capitalize">{tx.status}</span>
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

      <TransactionModal open={modalOpen} onOpenChange={setModalOpen} transactionToEdit={txToEdit} />
    </div>
  )
}
