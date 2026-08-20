import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/constants'
import {
  askAiAgent,
  askAiAgentStream,
  consumeAiStream,
  evaluateLocalDeterministicAnswer,
} from '@/lib/aiAdvisor'
import {
  calculateHealthScore,
  detectAnomalies,
  identifySavingsOpportunities,
  FinancialContextData,
} from '@/lib/anomalyDetector'
import { calculateCashFlowProjection, formatDayMonth } from '@/lib/projectionEngine'

import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  HelpCircle,
  Target,
  Calendar,
  ShieldCheck,
  Flame,
  ChevronDown,
  Wallet,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  Scissors,
  BarChart3,
  Bot,
  Send,
  Loader2,
  Plus,
  RotateCcw,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { LoadingState, ErrorState } from '@/components/States'
import { cn } from '@/lib/utils'

type HealthLevel = 'otima' | 'boa' | 'atencao' | 'critica'

const HEALTH_META: Record<
  HealthLevel,
  { label: string; color: string; bg: string; bar: string; icon: string }
> = {
  otima: {
    label: 'Ótima',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    bar: 'bg-emerald-500',
    icon: '🟢',
  },
  boa: {
    label: 'Boa',
    color: 'text-blue-600',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
    bar: 'bg-blue-500',
    icon: '🔵',
  },
  atencao: {
    label: 'Atenção',
    color: 'text-amber-600',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    bar: 'bg-amber-500',
    icon: '🟡',
  },
  critica: {
    label: 'Crítica',
    color: 'text-red-600',
    bg: 'bg-red-50 dark:bg-red-950/40',
    bar: 'bg-red-500',
    icon: '🔴',
  },
}

type QuickQuestionId = 'cortar' | 'mes' | 'vencer' | 'investimentos'

const QUICK_QUESTIONS: Array<{
  id: QuickQuestionId
  question: string
  icon: React.ComponentType<{ className?: string }>
  color: string
}> = [
  { id: 'cortar', question: 'Onde posso cortar gastos?', icon: Scissors, color: 'text-orange-600' },
  { id: 'mes', question: 'Como está meu mês?', icon: BarChart3, color: 'text-emerald-600' },
  { id: 'vencer', question: 'O que vai vencer?', icon: Calendar, color: 'text-blue-600' },
  {
    id: 'investimentos',
    question: 'Como estão meus investimentos?',
    icon: TrendingUp,
    color: 'text-indigo-600',
  },
]

const QUICK_QUESTION_TEXT: Record<QuickQuestionId, string> = {
  cortar: 'Onde posso cortar gastos? Analise minhas categorias e sugira cortes.',
  mes: 'Como está meu mês financeiro? Faça um resumo.',
  vencer: 'O que vai vencer? Liste contas vencidas e próximas.',
  investimentos: 'Como estão meus investimentos? Analise patrimônio e rentabilidade.',
}

const CHAT_SUGGESTIONS = [
  'Posso gastar R$ 2.000 agora?',
  'Quanto terei daqui a 30 dias?',
  'Qual será meu pior dia financeiro?',
  'Qual minha margem líquida?',
  'Qual foi meu melhor mês?',
  'Minha situação melhorou?',
  'Quanto gastei este mês?',
  'Qual minha maior despesa?',
  'Quanto ainda tenho para pagar?',
  'Quanto tenho para receber?',
  'Qual cartão está mais comprometido?',
  'Quanto estou economizando?',
]

const AUTO_ANALYSIS_MESSAGE =
  'Faça uma análise completa da minha situação financeira atual. Analise receitas, despesas, saldo, contas a pagar, cartões, metas, orçamentos e investimentos. Dê um panorama geral e destaque pontos de atenção e oportunidades.'

interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  offline?: boolean
  pending?: boolean
}

// A partir de quanto tempo de inatividade (ms) no input, mostramos o
// divisor "Novas mensagens" antes do campo de digitação.
const NEW_MESSAGES_GAP_MS = 30_000

export default function AiAdvisorPage() {
  const {
    transactions,
    accounts,
    creditCards,
    bills,
    recurringBills,
    recurrences,
    installments,
    invoices,
    budgets,
    investments,
    totalInvested,
    totalInvestmentsResult,
    customCategories,
    isLoading,
    loadError,
    refreshAll,
  } = useFinance()
  const { hideValues } = useAuth()

  const [expandedQuestion, setExpandedQuestion] = useState<QuickQuestionId | null>(null)
  const [quickAnswers, setQuickAnswers] = useState<
    Record<string, { content: string; offline: boolean }>
  >({})
  const [quickLoading, setQuickLoading] = useState<QuickQuestionId | null>(null)

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [showNewMessagesDivider, setShowNewMessagesDivider] = useState(false)
  const chatEndRef = useRef<HTMLDivElement | null>(null)
  const conversationIdRef = useRef<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const lastActivityRef = useRef<number>(Date.now())

  // Auto-análise (Análise do Momento) — dispara uma vez ao abrir a página,
  // depois do carregamento dos dados. O cache é só o estado em memória:
  // só refaz se a página for recarregada (remontagem do componente).
  const autoAnalysisRanRef = useRef(false)
  const [autoAnalysis, setAutoAnalysis] = useState<{
    content: string
    loading: boolean
    error: boolean
  }>({ content: '', loading: false, error: false })

  // Constrói o contexto contábil real e auditado (Etapa 3 Projeção + Etapa 4 DRE / Comparativo)
  const combinedFinancialContextString = useMemo(() => {
    const currentMonthKey = new Date().toISOString().slice(0, 7)
    const monthTxns = transactions.filter(
      (t) => (t.date || '').startsWith(currentMonthKey) && t.status === 'realizado',
    )
    const monthIncome = monthTxns
      .filter((t) => t.type === 'receita')
      .reduce((acc, t) => acc + Number(t.value || 0), 0)
    const monthExpense = monthTxns
      .filter((t) => t.type === 'despesa')
      .reduce((acc, t) => acc + Number(t.value || 0), 0)

    const p30 = calculateCashFlowProjection({
      accounts,
      transactions,
      bills: [],
      recurringBills: [],
      recurrences: [],
      installments: [],
      invoices,
      days: 30,
    })

    const topEvents30 = p30.timelineEvents
      .slice(0, 8)
      .map(
        (ev) =>
          `- ${formatDate(ev.date)}: ${ev.type === 'income' ? '+' : '−'}${formatCurrency(ev.value)} (${ev.description}) → Saldo acumulado: ${formatCurrency(ev.runningBalance)}`,
      )

    return `
[DADOS DO MÊS ATUAL]:
- Receitas Realizadas: ${formatCurrency(monthIncome)}
- Despesas Realizadas: ${formatCurrency(monthExpense)}
- Resultado Líquido: ${formatCurrency(monthIncome - monthExpense)}

[PROJEÇÃO DE FLUXO DE CAIXA (30 DIAS)]:
- Saldo consolidado inicial hoje: ${formatCurrency(p30.startingBalance)}
- Projeção 30 dias: Entradas ${formatCurrency(p30.totalIncome)}, Saídas ${formatCurrency(p30.totalExpense)}, Saldo final previsto: ${formatCurrency(p30.projectedEndBalance)} (${p30.isPositive ? 'Positivo' : 'Negativo'})
  Risco 30d: ${p30.risk.hasRisk ? `Déficit a partir de ${formatDate(p30.risk.firstNegativeDate || '')} (${formatCurrency(p30.risk.firstNegativeBalance || 0)}), maior déficit: ${formatCurrency(p30.risk.maxDeficit)}` : 'Sem risco previsto'}
- Principais eventos previstos nos próximos 30 dias:
${topEvents30.join('\n')}
    `.trim()
  }, [accounts, transactions, invoices])

  const runAutoAnalysis = useCallback(async () => {
    setAutoAnalysis({ content: '', loading: true, error: false })
    try {
      const { content } = await askAiAgent(
        AUTO_ANALYSIS_MESSAGE,
        undefined,
        combinedFinancialContextString,
      )
      setAutoAnalysis({ content, loading: false, error: false })
    } catch {
      setAutoAnalysis({ content: '', loading: false, error: true })
    }
  }, [combinedFinancialContextString])

  useEffect(() => {
    if (isLoading || loadError) return
    if (autoAnalysisRanRef.current) return
    autoAnalysisRanRef.current = true
    runAutoAnalysis()
  }, [isLoading, loadError, runAutoAnalysis])

  const analytics = useMemo(() => {
    const currentMonthKey = new Date().toISOString().slice(0, 7)
    const todayStr = new Date().toISOString().slice(0, 10)

    // 1. Receitas e Despesas do Mês
    const monthTxns = transactions.filter((t) => (t.date || '').startsWith(currentMonthKey))
    const totalIncome = monthTxns
      .filter(
        (t) => t.type === 'receita' && t.status === 'realizado' && t.category !== 'Transferência',
      )
      .reduce((acc, t) => acc + Number(t.value || 0), 0)
    const totalExpenses = monthTxns
      .filter(
        (t) => t.type === 'despesa' && t.status === 'realizado' && t.category !== 'Transferência',
      )
      .reduce((acc, t) => acc + Number(t.value || 0), 0)
    const netSavings = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0

    // 2. Gastos por Categoria do Mês
    const catMap: Record<string, number> = {}
    monthTxns
      .filter(
        (t) => t.type === 'despesa' && t.status === 'realizado' && t.category !== 'Transferência',
      )
      .forEach((t) => {
        const c = t.category || 'Outros'
        catMap[c] = (catMap[c] || 0) + Number(t.value || 0)
      })

    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1])
    const topCategory = sortedCats[0] || null
    const topCategoryPct =
      totalExpenses > 0 && topCategory ? Math.round((topCategory[1] / totalExpenses) * 100) : 0

    // 3. Despesas pendentes
    const pendingTxns = transactions.filter((t) => t.status !== 'realizado' && t.type === 'despesa')
    const overdueBills = pendingTxns.filter((t) => (t.date || '').slice(0, 10) < todayStr)
    const upcomingBills = pendingTxns
      .filter((t) => (t.date || '').slice(0, 10) >= todayStr)
      .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
      .slice(0, 5)
    const totalBillsPending = pendingTxns.reduce((acc, b) => acc + Number(b.value || 0), 0)

    // 4. Saldo em Contas
    const totalCash = accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0)

    // 5. Cartões estourados (>80% do limite)
    const cardsNearLimit = creditCards.filter((c) => (c.used_percentage || 0) > 80)

    // 6. Tendência de gastos (últimos 3 meses por categoria)
    const categoryTrend = (() => {
      const months: string[] = []
      const now = new Date()
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        months.push(d.toISOString().slice(0, 7))
      }
      const trendMap: Record<string, number[]> = {}
      months.forEach((mk) => {
        transactions
          .filter(
            (t) =>
              t.type === 'despesa' && t.status === 'realizado' && (t.date || '').startsWith(mk),
          )
          .forEach((t) => {
            const c = t.category || 'Outros'
            if (!trendMap[c]) trendMap[c] = [0, 0, 0]
            const idx = months.indexOf(mk)
            trendMap[c][idx] += Number(t.value || 0)
          })
      })
      const rising = Object.entries(trendMap)
        .filter(([, vals]) => vals[2] > vals[0] && vals[2] > 0)
        .map(([cat, vals]) => ({
          category: cat,
          values: vals,
          diff: vals[2] - vals[0],
          pct: vals[0] > 0 ? ((vals[2] - vals[0]) / vals[0]) * 100 : 100,
        }))
        .sort((a, b) => b.diff - a.diff)
      return { months, rising }
    })()

    // 7. Sugestão de economia (gastos recorrentes médios)
    const recurringSuggestion = (() => {
      const now = new Date()
      let total3m = 0
      for (let i = 0; i < 3; i++) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const mk = d.toISOString().slice(0, 7)
        total3m += transactions
          .filter(
            (t) =>
              t.type === 'despesa' && t.status === 'realizado' && (t.date || '').startsWith(mk),
          )
          .reduce((acc, t) => acc + Number(t.value || 0), 0)
      }
      const avgMonthly = total3m / 3
      const suggested = Math.max(0, Math.round((avgMonthly * 0.1) / 50) * 50)
      return { avgMonthly, suggested }
    })()

    // 8. Saúde Financeira
    let healthScore = 70
    const expenseRatio = totalIncome > 0 ? totalExpenses / totalIncome : 1
    if (expenseRatio < 0.7) healthScore += 15
    else if (expenseRatio > 1) healthScore -= 25
    if (savingsRate > 20) healthScore += 5
    if (overdueBills.length > 0) healthScore -= 20
    if (cardsNearLimit.length > 0) healthScore -= 10
    if (totalCash > totalBillsPending) healthScore += 10
    healthScore = Math.max(5, Math.min(100, healthScore))

    let healthLevel: HealthLevel = 'critica'
    if (healthScore >= 80) healthLevel = 'otima'
    else if (healthScore >= 65) healthLevel = 'boa'
    else if (healthScore >= 45) healthLevel = 'atencao'

    return {
      currentMonthKey,
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      topCategory,
      topCategoryPct,
      sortedCats,
      overdueBills,
      upcomingBills,
      pendingBills: pendingTxns,
      totalBillsPending,
      totalCash,
      cardsNearLimit,
      categoryTrend,
      budgetAlerts: [],
      recurringSuggestion,
      healthScore,
      healthLevel,
    }
  }, [transactions, accounts, creditCards])

  // Auto-scroll chat para o fim
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  const handleQuickQuestion = useCallback(
    async (id: QuickQuestionId) => {
      // Se já tem resposta, apenas recolhe/abre sem refazer a chamada
      if (quickAnswers[id]) {
        setExpandedQuestion((cur) => (cur === id ? null : id))
        return
      }
      setExpandedQuestion(id)
      setQuickLoading(id)
      try {
        const { content } = await askAiAgent(
          QUICK_QUESTION_TEXT[id],
          undefined,
          combinedFinancialContextString,
        )
        setQuickAnswers((prev) => ({
          ...prev,
          [id]: { content, offline: false },
        }))
      } catch {
        setQuickAnswers((prev) => ({
          ...prev,
          [id]: {
            content: 'Não foi possível obter a análise agora. Tente novamente em instantes.',
            offline: true,
          },
        }))
      } finally {
        setQuickLoading(null)
      }
    },
    [quickAnswers],
  )

  const handleNewConversation = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    conversationIdRef.current = null
    setChatMessages([])
    setChatInput('')
    setChatLoading(false)
    setShowNewMessagesDivider(false)
    lastActivityRef.current = Date.now()
  }, [])

  const onChatInputChange = useCallback(
    (value: string) => {
      setChatInput(value)
      // Divisor "Novas mensagens": só quando já há histórico e o usuário
      // volta a digitar após um período de inatividade.
      if (
        value.trim().length > 0 &&
        chatMessages.length > 0 &&
        !showNewMessagesDivider &&
        Date.now() - lastActivityRef.current > NEW_MESSAGES_GAP_MS
      ) {
        setShowNewMessagesDivider(true)
      }
    },
    [chatMessages.length, showNewMessagesDivider],
  )

  const sendChatMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || chatLoading) return

      // Aborta qualquer stream anterior se houver
      if (abortRef.current) {
        abortRef.current.abort()
        abortRef.current = null
      }

      const userMsg: ChatMessage = {
        id: `u-${Date.now()}`,
        role: 'user',
        content: trimmed,
      }
      const pendingId = `a-${Date.now()}`
      const pendingMsg: ChatMessage = {
        id: pendingId,
        role: 'assistant',
        content: '',
        pending: true,
      }
      setChatMessages((prev) => [...prev, userMsg, pendingMsg])
      setChatInput('')
      setChatLoading(true)
      setShowNewMessagesDivider(false)
      lastActivityRef.current = Date.now()

      // 1. Checa resposta determinística pré-calculada primeiro (CÁLCULO PRIMEIRO)
      const localContext: FinancialContextData = {
        accounts,
        transactions,
        bills,
        recurringBills,
        recurrences,
        installments,
        invoices,
        budgets,
        goals: [],
        investments,
        customCategories,
      }
      const localDeterministic = evaluateLocalDeterministicAnswer(trimmed, localContext)

      if (localDeterministic) {
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId ? { ...m, content: localDeterministic, pending: false } : m,
          ),
        )
        setChatLoading(false)
        lastActivityRef.current = Date.now()
        return
      }

      const controller = new AbortController()
      abortRef.current = controller

      try {
        const { stream, conversationId } = await askAiAgentStream(
          trimmed,
          conversationIdRef.current ?? undefined,
          combinedFinancialContextString,
        )
        if (conversationId) conversationIdRef.current = conversationId

        // Primeiro chunk recebido: remove o estado "pending" (TypingIndicator)
        let firstChunk = true
        await consumeAiStream(
          stream,
          (chunkText) => {
            if (firstChunk) {
              firstChunk = false
              setChatMessages((prev) =>
                prev.map((m) =>
                  m.id === pendingId ? { ...m, content: chunkText, pending: false } : m,
                ),
              )
            } else {
              setChatMessages((prev) =>
                prev.map((m) =>
                  m.id === pendingId ? { ...m, content: m.content + chunkText, pending: false } : m,
                ),
              )
            }
          },
          controller.signal,
        )

        lastActivityRef.current = Date.now()

        // Garante que saiu do estado pending mesmo se nenhum chunk veio
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId && m.pending
              ? {
                  ...m,
                  content: 'Sem resposta recebida. Tente novamente.',
                  offline: true,
                  pending: false,
                }
              : m,
          ),
        )
      } catch {
        setChatMessages((prev) =>
          prev.map((m) =>
            m.id === pendingId
              ? {
                  ...m,
                  content: 'Não foi possível obter a análise agora. Tente novamente em instantes.',
                  offline: true,
                  pending: false,
                }
              : m,
          ),
        )
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        setChatLoading(false)
        lastActivityRef.current = Date.now()
      }
    },
    [chatLoading],
  )

  if (isLoading) {
    return <LoadingState message="Analisando seus dados financeiros..." />
  }

  if (loadError) {
    return (
      <ErrorState
        message="Não foi possível carregar a análise. Tente novamente."
        onRetry={refreshAll}
      />
    )
  }

  const health = HEALTH_META[analytics.healthLevel]

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">IA Financeira</h2>
            <Badge className="bg-emerald-500 text-white gap-1.5 text-[11px] font-bold py-0.5">
              {/* Indicador "conectado" — bolinha verde com pulso */}
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-200 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-200" />
              </span>
              <Sparkles className="w-3 h-3 fill-current" /> IA Generativa
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Análise inteligente em tempo real com IA generativa, baseada nos seus dados reais
          </p>
        </div>
      </div>

      {/* Análise do Momento (auto-análise ao abrir a página) */}
      <AutoAnalysisCard
        loading={autoAnalysis.loading}
        error={autoAnalysis.error}
        content={autoAnalysis.content}
        onRetry={runAutoAnalysis}
      />

      {/* Chat livre com a IA (movido para cima, logo abaixo da análise automática) */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
            <Bot className="w-4 h-4 text-emerald-600" />
            Conversa com a IA Financeira
            <Badge variant="outline" className="text-[10px] font-normal text-slate-500">
              Chat livre
            </Badge>
          </h3>
          <button
            onClick={handleNewConversation}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Nova conversa
          </button>
        </div>
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm overflow-hidden flex flex-col">
          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[420px] min-h-[200px] bg-slate-50/50 dark:bg-slate-900/20">
            {chatMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-10 gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center">
                  <Bot className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Olá! 👋 Sou a Semeia, sua IA Financeira.
                  </p>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm">
                    Pergunte qualquer coisa sobre suas finanças — gastos, metas, investimentos,
                    contas a pagar. Estou aqui para ajudar!
                  </p>
                </div>
                {/* Sugestões clicáveis dentro da própria área de chat */}
                <div className="flex flex-wrap justify-center gap-2 mt-2 max-w-md">
                  {CHAT_SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => sendChatMessage(s)}
                      disabled={chatLoading}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/30 dark:hover:border-emerald-800 transition-colors disabled:opacity-50"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              chatMessages.map((m) => <ChatBubble key={m.id} message={m} />)
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Divisor "Novas mensagens" — aparece quando o usuário volta a
              digitar após um período, indicando o início de um novo bloco */}
          {showNewMessagesDivider && (
            <div className="px-4 py-2 flex items-center gap-2">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                Novas mensagens
              </span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>
          )}

          {/* Input */}
          <form
            onSubmit={(ev) => {
              ev.preventDefault()
              sendChatMessage(chatInput)
            }}
            className="p-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => onChatInputChange(e.target.value)}
              placeholder="Pergunte sobre suas finanças..."
              disabled={chatLoading}
              className="flex-1 bg-slate-100 dark:bg-slate-800 border-0 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || chatLoading}
              className="shrink-0 w-10 h-10 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              aria-label="Enviar"
            >
              {chatLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </Card>
      </div>

      {/* Painel de análise: Saúde + Resumo do mês */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Saúde Financeira */}
        <Card
          className={cn(
            'rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-5 flex flex-col justify-between',
            health.bg,
          )}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                Saúde Financeira
              </span>
              <ShieldCheck className={cn('w-5 h-5 shrink-0', health.color)} />
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2">
              <span className={cn('text-2xl font-black whitespace-nowrap', health.color)}>
                {health.label}
              </span>
              <span className="text-xs font-bold font-mono text-slate-400 whitespace-nowrap">
                {analytics.healthScore}/100
              </span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', health.bar)}
                style={{ width: `${analytics.healthScore}%` }}
              />
            </div>
          </div>
          <div className="mt-3 space-y-1 text-[11px] text-slate-500">
            {analytics.overdueBills.length > 0 && (
              <div className="flex items-center gap-1 text-red-600 truncate whitespace-nowrap">
                <AlertCircle className="w-3 h-3 shrink-0" /> {analytics.overdueBills.length}{' '}
                conta(s) vencida(s)
              </div>
            )}
            {analytics.cardsNearLimit.length > 0 && (
              <div className="flex items-center gap-1 text-amber-600 truncate whitespace-nowrap">
                <AlertCircle className="w-3 h-3 shrink-0" /> {analytics.cardsNearLimit.length}{' '}
                cartão(ões) acima de 80% do limite
              </div>
            )}
            {analytics.overdueBills.length === 0 && analytics.cardsNearLimit.length === 0 && (
              <div className="flex items-center gap-1 text-emerald-600 truncate whitespace-nowrap">
                <CheckCircle2 className="w-3 h-3 shrink-0" /> Sem pendências críticas
              </div>
            )}
          </div>
        </Card>

        {/* Maior categoria de gasto */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Maior Categoria de Gasto</span>
            <Flame className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-3">
            <div className="text-xl font-black text-slate-900 dark:text-white truncate">
              {analytics.topCategory?.[0] || 'Nenhuma'}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-bold text-orange-600 tabular-nums">
                {formatCurrency(analytics.topCategory?.[1] || 0, hideValues)}
              </span>
              <span className="text-xs text-slate-400">{analytics.topCategoryPct}% do total</span>
            </div>
          </div>
        </Card>

        {/* Resumo do mês */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Resumo do Mês</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div>
              <div className="text-slate-400">Receitas</div>
              <div className="font-bold text-emerald-600 tabular-nums">
                +{formatCurrency(analytics.totalIncome, hideValues)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Despesas</div>
              <div className="font-bold text-orange-600 tabular-nums">
                −{formatCurrency(analytics.totalExpenses, hideValues)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Saldo</div>
              <div
                className={cn(
                  'font-bold tabular-nums',
                  analytics.netSavings >= 0 ? 'text-emerald-600' : 'text-red-600',
                )}
              >
                {formatCurrency(analytics.netSavings, hideValues)}
              </div>
            </div>
            <div>
              <div className="text-slate-400">Economia</div>
              <div className="font-bold text-slate-900 dark:text-white">
                {analytics.savingsRate}%
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Compromissos futuros + Investimentos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Compromissos futuros */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-600" />
              Compromissos Futuros
            </h3>
            <Badge variant="outline" className="text-xs">
              {analytics.pendingBills.length} pendente(s)
            </Badge>
          </div>
          {analytics.upcomingBills.length === 0 && analytics.overdueBills.length === 0 ? (
            <div className="text-xs text-slate-400 py-6 text-center">
              Você está em dia com seus compromissos.
            </div>
          ) : (
            <div className="space-y-2">
              {analytics.overdueBills.slice(0, 2).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-red-50 dark:bg-red-950/30"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                      {b.description}
                    </div>
                    <div className="text-[10px] text-red-600 font-medium">
                      Venceu em {formatDate(b.date || '')}
                    </div>
                  </div>
                  <span className="font-bold text-red-600 text-xs tabular-nums">
                    {formatCurrency(b.value, hideValues)}
                  </span>
                </div>
              ))}
              {analytics.upcomingBills.slice(0, 3).map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-slate-50 dark:bg-slate-900/50"
                >
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white text-xs truncate">
                      {b.description}
                    </div>
                    <div className="text-[10px] text-slate-400">{formatDate(b.date || '')}</div>
                  </div>
                  <span className="font-bold text-slate-900 dark:text-white text-xs tabular-nums">
                    {formatCurrency(b.value, hideValues)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Perguntas rápidas (IA generativa) */}
      <div>
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-3 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-emerald-600" />
          Perguntas Rápidas
          <Badge variant="outline" className="text-[10px] font-normal text-slate-500">
            IA generativa
          </Badge>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {QUICK_QUESTIONS.map((q) => {
            const Icon = q.icon
            const isOpen = expandedQuestion === q.id
            const isLoadingThis = quickLoading === q.id
            const answer = quickAnswers[q.id]
            return (
              <Card
                key={q.id}
                className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm overflow-hidden"
              >
                <button
                  onClick={() => handleQuickQuestion(q.id)}
                  disabled={!!quickLoading}
                  className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Icon className={cn('w-4 h-4', q.color)} />
                    </div>
                    <span className="font-semibold text-sm text-slate-900 dark:text-white">
                      {q.question}
                    </span>
                  </div>
                  {isLoadingThis ? (
                    <Loader2 className="w-4 h-4 text-emerald-600 animate-spin" />
                  ) : (
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 text-slate-400 transition-transform',
                        isOpen && 'rotate-180',
                      )}
                    />
                  )}
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-slate-100 dark:border-slate-800">
                    {isLoadingThis ? (
                      <TypingIndicator />
                    ) : answer ? (
                      <AiAnswer content={answer.content} offline={answer.offline} />
                    ) : (
                      <p className="text-sm text-slate-500">Sem resposta.</p>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>

      {/* Análises complementares */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {' '}
        {/* Tendência de gastos */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-500" />
              Tendência de Gastos
            </h3>
          </div>
          {analytics.categoryTrend.rising.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              Nenhuma categoria com tendência de alta nos últimos 3 meses.
            </div>
          ) : (
            <div className="space-y-2">
              {analytics.categoryTrend.rising.slice(0, 3).map((r) => (
                <div
                  key={r.category}
                  className="flex items-center justify-between text-xs p-2 rounded-lg bg-amber-50 dark:bg-amber-950/20"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {r.category}
                  </span>
                  <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300 font-bold text-[10px]">
                    +{r.pct.toFixed(0)}%
                  </Badge>
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-2">
            Comparativo dos últimos 3 meses por categoria.
          </p>
        </Card>
        {/* Alerta de orçamento */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Alerta de Orçamento
            </h3>
          </div>
          {analytics.budgetAlerts.length === 0 ? (
            <div className="flex items-center gap-2 text-xs text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
              Todos os orçamentos estão dentro do limite.
            </div>
          ) : (
            <div className="space-y-2">
              {analytics.budgetAlerts.map((b) => (
                <div key={b.id} className="text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-slate-700 dark:text-slate-200">
                      {b.category}
                    </span>
                    <span
                      className={cn(
                        'font-bold',
                        (b.percentage || 0) >= 100 ? 'text-red-600' : 'text-amber-600',
                      )}
                    >
                      {b.percentage}%
                    </span>
                  </div>
                  <Progress
                    value={Math.min(100, b.percentage || 0)}
                    className={cn(
                      'h-1.5 rounded-full',
                      (b.percentage || 0) >= 100 ? '[&>div]:bg-red-500' : '[&>div]:bg-amber-500',
                    )}
                  />
                </div>
              ))}
            </div>
          )}
          <p className="text-[10px] text-slate-400 mt-2">
            Categorias acima de 80% do orçamento do mês.
          </p>
        </Card>
        {/* Sugestão de economia */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-emerald-600" />
              Sugestão de Economia
            </h3>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
            Com base na sua média de gastos dos últimos 3 meses (
            <strong>
              {formatCurrency(analytics.recurringSuggestion.avgMonthly, hideValues)}/mês
            </strong>
            ), você poderia investir:
          </p>
          <div className="text-3xl font-black text-emerald-600 tabular-nums">
            {formatCurrency(analytics.recurringSuggestion.suggested, hideValues)}
          </div>
          <div className="text-xs text-slate-500 mt-1">por mês em aportes regulares</div>
          <div className="mt-3 flex items-start gap-1.5 text-[11px] text-emerald-700 dark:text-emerald-400">
            <Target className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            Aportes mensais constantes aceleram o efeito dos juros compostos.
          </div>
        </Card>
      </div>

      {/* Rodapé */}
      <div className="text-center text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <Sparkles className="w-3 h-3" />
        Análise com IA generativa baseada nos seus dados reais de{' '}
        {formatMonthYear(analytics.currentMonthKey)}.
      </div>
    </div>
  )
}

// ---------- Subcomponentes ----------

function AutoAnalysisCard({
  loading,
  error,
  content,
  onRetry,
}: {
  loading: boolean
  error: boolean
  content: string
  onRetry: () => void
}) {
  return (
    <Card className="rounded-2xl border-emerald-200 dark:border-emerald-800 bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 shadow-sm overflow-hidden">
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600" />
            Análise do Momento
          </h3>
          <Badge className="bg-emerald-500 text-white text-[10px] font-bold gap-1 py-0.5">
            <Bot className="w-3 h-3" /> Automática
          </Badge>
        </div>

        {loading ? (
          <AutoAnalysisSkeleton />
        ) : error ? (
          <div className="flex flex-col items-start gap-3 py-2">
            <p className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Análise temporariamente indisponível.
            </p>
            <button
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-white dark:bg-slate-800 hover:bg-emerald-50 dark:hover:bg-slate-700 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3 py-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Tentar novamente
            </button>
          </div>
        ) : (
          <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
            {content}
          </div>
        )}
      </div>
    </Card>
  )
}

function AutoAnalysisSkeleton() {
  return (
    <div className="space-y-2.5 animate-pulse">
      <div className="flex items-center gap-2 text-sm font-medium text-emerald-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        Analisando seus dados...
      </div>
      <div className="h-3 w-full rounded-full bg-emerald-100 dark:bg-emerald-900/40" />
      <div className="h-3 w-11/12 rounded-full bg-emerald-100 dark:bg-emerald-900/40" />
      <div className="h-3 w-4/5 rounded-full bg-emerald-100 dark:bg-emerald-900/40" />
      <div className="h-3 w-3/4 rounded-full bg-emerald-100 dark:bg-emerald-900/40" />
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-500">
      <Bot className="w-4 h-4 text-emerald-600" />
      <span className="font-medium">Pensando</span>
      <span className="inline-flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.3s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-bounce" />
      </span>
    </div>
  )
}

function AiAnswer({ content }: { content: string; offline?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
        {content}
      </div>
    </div>
  )
}

function ChatBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'
  if (message.pending) {
    return (
      <div className="flex items-start gap-2 justify-start">
        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-emerald-600" />
        </div>
        <div className="max-w-[80%] rounded-2xl rounded-tl-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3.5 py-2.5">
          <TypingIndicator />
        </div>
      </div>
    )
  }
  return (
    <div className={cn('flex items-start gap-2', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center shrink-0">
          <Bot className="w-4 h-4 text-emerald-600" />
        </div>
      )}
      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap leading-relaxed',
          isUser
            ? 'rounded-tr-sm bg-emerald-600 text-white'
            : 'rounded-tl-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200',
        )}
      >
        {message.content}
        {message.offline && !isUser && (
          <div className="flex items-center gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 mt-1.5 pt-1.5 border-t border-slate-100 dark:border-slate-700">
            <AlertCircle className="w-3 h-3" />
            Análise offline — IA indisponível no momento
          </div>
        )}
      </div>
    </div>
  )
}
