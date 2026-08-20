import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, formatMonthYear, CATEGORY_COLORS } from '@/lib/constants'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'
import {
  Printer,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  ArrowUpDown,
  Calendar,
  FileText,
  Download,
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

export default function StatementPage() {
  const { transactions, accounts, creditCards, isLoading, loadError, refreshAll } = useFinance()
  const { hideValues } = useAuth()

  const [statusTab, setStatusTab] = useState<'todos' | 'realizado' | 'pendente'>('todos')
  const [searchTerm, setSearchTerm] = useState('')
  const [accountFilter, setAccountFilter] = useState<string>('todos')
  const [cardFilter, setCardFilter] = useState<string>('todos')
  const [categoryFilter, setCategoryFilter] = useState<string>('todos')

  // Realtime é gerenciado centralmente pelo FinanceDataContext.

  const categories = useMemo(() => {
    const set = new Set<string>()
    transactions.forEach((t) => {
      if (t.category) set.add(t.category)
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [transactions])

  const filtered = useMemo(() => {
    return transactions.filter((tx) => {
      if (statusTab !== 'todos' && tx.status !== statusTab) return false
      if (accountFilter !== 'todos' && tx.account !== accountFilter) return false
      if (cardFilter !== 'todos' && tx.credit_card !== cardFilter) return false
      if (categoryFilter !== 'todos' && tx.category !== categoryFilter) return false

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase()
        const desc = (tx.description || '').toLowerCase()
        const cat = (tx.category || '').toLowerCase()
        if (!desc.includes(term) && !cat.includes(term)) return false
      }

      return true
    })
  }, [transactions, statusTab, accountFilter, cardFilter, categoryFilter, searchTerm])

  // Agrupamento por Mês ("YYYY-MM"), ordenado do mais recente ao mais antigo
  const groupedByMonth = useMemo(() => {
    const map = new Map<string, typeof filtered>()
    filtered.forEach((tx) => {
      const monthKey = (tx.date || '').slice(0, 7) || 'Outros'
      if (!map.has(monthKey)) map.set(monthKey, [])
      map.get(monthKey)!.push(tx)
    })
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]))
  }, [filtered])

  // Totais gerais (apenas realizados)
  const totalIncome = filtered
    .filter(
      (t) =>
        t.type === 'receita' &&
        t.status === 'realizado' &&
        !t.transfer_group_id &&
        t.category !== 'Transferência',
    )
    .reduce((acc, t) => acc + Number(t.value || 0), 0)

  const totalExpense = filtered
    .filter(
      (t) =>
        t.type === 'despesa' &&
        t.status === 'realizado' &&
        !t.transfer_group_id &&
        t.category !== 'Transferência',
    )
    .reduce((acc, t) => acc + Number(t.value || 0), 0)
  const totalBalance = totalIncome - totalExpense

  const handlePrint = () => {
    window.print()
  }

  const handleExportCsv = () => {
    const headers = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Status', 'Conta', 'Cartão', 'Valor']
    const rows = filtered.map((tx) => {
      const acc = accounts.find((a) => a.id === tx.account)?.name || ''
      const card = creditCards.find((c) => c.id === tx.credit_card)?.name || ''
      return [
        formatDate(tx.date),
        tx.description,
        tx.category || '',
        tx.type,
        tx.status,
        acc,
        card,
        String(tx.value || 0).replace('.', ','),
      ]
    })
    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(';'))
      .join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `extrato-financas-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const clearFilters = () => {
    setSearchTerm('')
    setAccountFilter('todos')
    setCardFilter('todos')
    setCategoryFilter('todos')
    setStatusTab('todos')
  }

  const hasActiveFilters =
    searchTerm.trim() !== '' ||
    accountFilter !== 'todos' ||
    cardFilter !== 'todos' ||
    categoryFilter !== 'todos' ||
    statusTab !== 'todos'

  if (isLoading) {
    return <LoadingState message="Carregando extrato..." />
  }

  if (loadError) {
    return (
      <ErrorState
        message="Não foi possível carregar seu extrato. Verifique sua conexão e tente novamente."
        onRetry={refreshAll}
      />
    )
  }

  const accountName = (id?: string) => accounts.find((a) => a.id === id)?.name
  const cardName = (id?: string) => creditCards.find((c) => c.id === id)?.name

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Extrato</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Histórico completo de transações, organizado por mês
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleExportCsv}
            variant="outline"
            className="rounded-xl border-slate-300 dark:border-slate-700 gap-1.5"
          >
            <Download className="w-4 h-4" /> CSV
          </Button>
          <Button
            onClick={handlePrint}
            variant="outline"
            className="rounded-xl border-slate-300 dark:border-slate-700 gap-1.5"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </Button>
        </div>
      </div>

      {/* Resumo geral (apenas realizados) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 print:hidden">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap block">
            Total Recebido
          </span>
          <div className="text-xl sm:text-2xl font-bold text-emerald-600 tabular-nums mt-1.5 whitespace-nowrap truncate">
            +{formatCurrency(totalIncome, hideValues)}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap block">
            Total Pago
          </span>
          <div className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums mt-1.5 whitespace-nowrap truncate">
            −{formatCurrency(totalExpense, hideValues)}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap block">
            Saldo do Período
          </span>
          <div
            className={`text-xl sm:text-2xl font-bold tabular-nums mt-1.5 whitespace-nowrap truncate ${
              totalBalance >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {totalBalance >= 0 ? '+' : ''}
            {formatCurrency(totalBalance, hideValues)}
          </div>
        </div>
      </div>

      {/* Filtros e Tabs */}
      <div className="p-4 rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 print:hidden">
        <Tabs
          value={statusTab}
          onValueChange={(v) => setStatusTab(v as 'todos' | 'realizado' | 'pendente')}
        >
          <TabsList className="grid grid-cols-3 w-full sm:w-80 rounded-xl">
            <TabsTrigger value="todos">Todos</TabsTrigger>
            <TabsTrigger value="realizado">Realizados</TabsTrigger>
            <TabsTrigger value="pendente">Pendentes</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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

          <Select value={cardFilter} onValueChange={setCardFilter}>
            <SelectTrigger className="h-10 rounded-xl">
              <SelectValue placeholder="Cartão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os cartões</SelectItem>
              {creditCards.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} (•••• {c.last_four})
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

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-slate-500">
              {filtered.length} lançamento(s) no período filtrado
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

      {/* Lista Agrupada por Mês */}
      {transactions.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="Nenhum lançamento no extrato"
          description="Assim que você registrar transações, elas aparecerão aqui organizadas por mês."
        />
      ) : groupedByMonth.length === 0 ? (
        <EmptyState
          icon={Search}
          title="Nada encontrado"
          description="Nenhum lançamento corresponde aos filtros selecionados."
          actionLabel="Limpar filtros"
          onAction={clearFilters}
        />
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
                      {txns.length} lançamento(s)
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
                              {tx.payment_method && <span>• {tx.payment_method}</span>}
                              {accountName(tx.account) && <span>• {accountName(tx.account)}</span>}
                              {cardName(tx.credit_card) && (
                                <span>• {cardName(tx.credit_card)}</span>
                              )}
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
                          <span className="text-[10px] text-slate-400 capitalize">
                            {isRealizado ? 'Realizado' : 'Pendente'}
                          </span>
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
    </div>
  )
}
