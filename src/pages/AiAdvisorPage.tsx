import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, formatMonthYear } from '@/lib/constants'
import {
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Send,
  HelpCircle,
  Brain,
  Zap,
  Target,
  DollarSign,
  PieChart,
  Calendar,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  Flame,
  ArrowRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Progress } from '@/components/ui/progress'

interface Message {
  id: string
  sender: 'user' | 'assistant'
  text: string
  timestamp: string
  suggestions?: string[]
}

const QUICK_QUESTIONS = [
  'Onde posso cortar gastos?',
  'Como está meu mês?',
  'O que vai vencer?',
  'Como estão meus investimentos?',
  'Qual o status das minhas metas?',
]

export default function AiAdvisorPage() {
  const { transactions, accounts, creditCards, bills, budgets, goals, investments } = useFinance()
  const { user, hideValues } = useAuth()

  const [inputMessage, setInputMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)

  // Mensagens do chat
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Olá, ${user?.name || 'usuário'}! Sou seu Assistente de Inteligência Financeira Raiz. Analisei seus lançamentos, contas, faturas e investimentos. O que você gostaria de analisar hoje?`,
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      suggestions: QUICK_QUESTIONS,
    },
  ])

  // Lógica de Análise Interna dos Dados do Usuário
  const analytics = useMemo(() => {
    const currentMonthKey = new Date().toISOString().slice(0, 7)
    const todayStr = new Date().toISOString().slice(0, 10)

    // 1. Receitas e Despesas do Mês
    const monthTxns = transactions.filter((t) => (t.date || '').startsWith(currentMonthKey))
    const totalIncome = monthTxns
      .filter((t) => t.type === 'receita')
      .reduce((acc, t) => acc + (t.value || 0), 0)
    const totalExpenses = monthTxns
      .filter((t) => t.type === 'despesa')
      .reduce((acc, t) => acc + (t.value || 0), 0)
    const netSavings = totalIncome - totalExpenses
    const savingsRate = totalIncome > 0 ? Math.round((netSavings / totalIncome) * 100) : 0

    // 2. Gastos por Categoria do Mês
    const catMap: Record<string, number> = {}
    monthTxns
      .filter((t) => t.type === 'despesa')
      .forEach((t) => {
        const c = t.category || 'Outros'
        catMap[c] = (catMap[c] || 0) + (t.value || 0)
      })

    const sortedCats = Object.entries(catMap).sort((a, b) => b[1] - a[1])
    const topCategory = sortedCats[0] || ['Nenhuma', 0]

    // 3. Contas a Vencer
    const pendingBills = bills.filter((b) => b.status !== 'pago')
    const overdueBills = pendingBills.filter((b) => (b.due_date || '').slice(0, 10) < todayStr)
    const upcomingBills = pendingBills.filter((b) => (b.due_date || '').slice(0, 10) >= todayStr)
    const totalBillsPending = pendingBills.reduce((acc, b) => acc + (b.value || 0), 0)

    // 4. Saldo em Contas
    const totalCash = accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0)

    // 5. Investimentos
    const totalInvested = investments.reduce((acc, i) => acc + (i.applied_value || 0), 0)
    const totalInvestCurrent = investments.reduce(
      (acc, i) => acc + (i.current_total_value || i.applied_value || 0),
      0,
    )
    const investGain = totalInvestCurrent - totalInvested
    const investGainPct = totalInvested > 0 ? ((investGain / totalInvested) * 100).toFixed(1) : '0'

    // 6. Saúde Financeira (Score 0-100)
    let healthScore = 70
    if (savingsRate > 20) healthScore += 15
    else if (savingsRate < 0) healthScore -= 25

    if (overdueBills.length > 0) healthScore -= 20
    if (totalCash > totalBillsPending) healthScore += 10
    healthScore = Math.max(10, Math.min(100, healthScore))

    let healthStatus = 'Boa'
    let healthColor = 'text-emerald-600'
    let healthBg = 'bg-emerald-50 dark:bg-emerald-950/40'

    if (healthScore < 50) {
      healthStatus = 'Atenção Necessária'
      healthColor = 'text-red-600'
      healthBg = 'bg-red-50 dark:bg-red-950/40'
    } else if (healthScore < 75) {
      healthStatus = 'Estável / Equilibrada'
      healthColor = 'text-amber-600'
      healthBg = 'bg-amber-50 dark:bg-amber-950/40'
    } else {
      healthStatus = 'Excelente'
      healthColor = 'text-emerald-600'
      healthBg = 'bg-emerald-50 dark:bg-emerald-950/40'
    }

    return {
      currentMonthKey,
      totalIncome,
      totalExpenses,
      netSavings,
      savingsRate,
      topCategory,
      sortedCats,
      overdueBills,
      upcomingBills,
      totalBillsPending,
      totalCash,
      totalInvested,
      totalInvestCurrent,
      investGain,
      investGainPct,
      healthScore,
      healthStatus,
      healthColor,
      healthBg,
    }
  }, [transactions, accounts, bills, investments])

  // Processador de perguntas com IA / Lógica especialista
  const generateAiResponse = (question: string): string => {
    const q = question.toLowerCase()

    if (q.includes('cortar') || q.includes('economizar') || q.includes('gastos')) {
      if (analytics.sortedCats.length === 0) {
        return 'Você ainda não registrou despesas suficientes este mês. Registre seus lançamentos para identificarmos as maiores oportunidades de corte.'
      }
      const top1 = analytics.sortedCats[0]
      const top2 = analytics.sortedCats[1]
      let res = `💡 **Oportunidades de Economia:**\n\nSua maior categoria de despesa no momento é **${top1[0]}** (${formatCurrency(top1[1])}), representando ${analytics.totalExpenses > 0 ? Math.round((top1[1] / analytics.totalExpenses) * 100) : 0}% de todos os seus gastos do mês.`
      if (top2) {
        res += ` Em segundo lugar está **${top2[0]}** (${formatCurrency(top2[1])}).`
      }
      res += `\n\n📌 **Recomendações da Raiz:**\n1. Se você reduzir 15% em ${top1[0]}, economizará cerca de **${formatCurrency(top1[1] * 0.15)}** por mês.\n2. Revise assinaturas e pedidos recorrentes por aplicativo.\n3. Defina um teto na aba **Orçamento** para ser alertado antes de extrapolar.`
      return res
    }

    if (q.includes('mês') || q.includes('como está') || q.includes('resumo')) {
      return `📊 **Resumo Financeiro do Mês (${formatMonthYear(analytics.currentMonthKey)}):**\n\n• **Receitas:** +${formatCurrency(analytics.totalIncome)}\n• **Despesas:** −${formatCurrency(analytics.totalExpenses)}\n• **Resultado Líquido:** ${analytics.netSavings >= 0 ? '+' : ''}${formatCurrency(analytics.netSavings)}\n• **Taxa de Poupança:** ${analytics.savingsRate}%\n\n${analytics.netSavings >= 0 ? '🎉 Excelente! Você está fechando o mês no azul e gerando poupança.' : '⚠️ Atenção: Suas despesas superaram suas receitas neste mês. Recomendo conter novos gastos.'}`
    }

    if (q.includes('vencer') || q.includes('contas') || q.includes('boleto')) {
      if (analytics.overdueBills.length === 0 && analytics.upcomingBills.length === 0) {
        return '✅ Todas as suas contas cadastradas estão em dia! Nenhuma pendência no momento.'
      }
      let res = `📅 **Compromissos e Contas Pendentes:**\n\n`
      if (analytics.overdueBills.length > 0) {
        res += `⚠️ **${analytics.overdueBills.length} Conta(s) Vencida(s):**\n`
        analytics.overdueBills.forEach((b) => {
          res += `• ${b.description}: ${formatCurrency(b.value)} (venceu em ${formatDate(b.due_date)})\n`
        })
        res += `\n`
      }
      if (analytics.upcomingBills.length > 0) {
        res += `⏳ **Próximas a Vencer (${analytics.upcomingBills.length}):**\n`
        analytics.upcomingBills.slice(0, 4).forEach((b) => {
          res += `• ${b.description}: ${formatCurrency(b.value)} (vencimento: ${formatDate(b.due_date)})\n`
        })
      }
      res += `\n**Total pendente:** ${formatCurrency(analytics.totalBillsPending)} | **Saldo em Contas:** ${formatCurrency(analytics.totalCash)}`
      return res
    }

    if (q.includes('investimento') || q.includes('invest')) {
      if (investments.length === 0) {
        return 'Você ainda não cadastrou investimentos. Vá até a aba "Investimentos" para registrar CDB, CDI 100%, Ações, FIIs ou Criptomoedas e acompanhar o rendimento.'
      }
      return `📈 **Carteira de Investimentos:**\n\n• **Total Aplicado:** ${formatCurrency(analytics.totalInvested)}\n• **Patrimônio Atual:** ${formatCurrency(analytics.totalInvestCurrent)}\n• **Rentabilidade Geral:** ${Number(analytics.investGainPct) >= 0 ? '+' : ''}${analytics.investGainPct}% (${formatCurrency(analytics.investGain)})\n• **Ativos cadastrados:** ${investments.length} ativos (incluindo ${investments.map((i) => i.name).join(', ')}).\n\n💡 Dica: Mantenha aportes mensais constantes para acelerar o efeito dos juros compostos.`
    }

    if (q.includes('meta') || q.includes('objetivo')) {
      if (goals.length === 0) {
        return 'Você não possui metas cadastradas. Criar metas como "Reserva de Emergência" ou "Viagem" ajuda a manter a disciplina financeira.'
      }
      let res = `🎯 **Suas Metas Financeiras:**\n\n`
      goals.forEach((g) => {
        res += `• **${g.name}:** ${formatCurrency(g.accumulated)} de ${formatCurrency(g.target_value)} (${g.percentage}% alcançado)\n`
      })
      return res
    }

    // Default resposta inteligente
    return `Com base nos seus dados do Raiz:\n• Seu saldo consolidado em contas é de **${formatCurrency(analytics.totalCash)}**.\n• Sua taxa de economia este mês está em **${analytics.savingsRate}%**.\n• Sua saúde financeira está classificada como **${analytics.healthStatus}** (${analytics.healthScore}/100).\n\nSe quiser detalhes, clique em uma das perguntas rápidas abaixo ou pergunte sobre cortes, contas, cartões ou metas.`
  }

  const handleSendMessage = (textToSend?: string) => {
    const text = textToSend || inputMessage
    if (!text.trim()) return

    const userMsg: Message = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
    }

    setMessages((prev) => [...prev, userMsg])
    setInputMessage('')
    setIsTyping(true)

    setTimeout(() => {
      const responseText = generateAiResponse(text)
      const botMsg: Message = {
        id: `bot-${Date.now()}`,
        sender: 'assistant',
        text: responseText,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        suggestions: QUICK_QUESTIONS.filter((q) => q !== text),
      }
      setMessages((prev) => [...prev, botMsg])
      setIsTyping(false)
    }, 600)
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">IA Financeira</h2>
            <Badge className="bg-emerald-500 text-white gap-1 text-[11px] font-bold py-0.5">
              <Sparkles className="w-3 h-3 fill-current" /> Inteligente
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Diagnóstico completo em tempo real, insights acionáveis e assistente conversacional
          </p>
        </div>
      </div>

      {/* Grid de Diagnóstico Rápido */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Saúde Financeira */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Saúde Financeira</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-xl font-black ${analytics.healthColor}`}>
              {analytics.healthStatus}
            </span>
            <span className="text-xs font-bold font-mono text-slate-400">
              {analytics.healthScore}/100
            </span>
          </div>
          <Progress value={analytics.healthScore} className="h-2 mt-2 rounded-full" />
        </Card>

        {/* Maior Categoria de Gasto */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Maior Gasto do Mês</span>
            <Flame className="w-4 h-4 text-orange-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-900 dark:text-white truncate">
              {analytics.topCategory[0]}
            </div>
            <span className="text-xs font-bold text-orange-600 tabular-nums">
              {formatCurrency(analytics.topCategory[1], hideValues)}
            </span>
          </div>
        </Card>

        {/* Taxa de Poupança */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Taxa de Poupança</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div
              className={`text-xl font-black ${analytics.savingsRate >= 0 ? 'text-emerald-600' : 'text-red-600'}`}
            >
              {analytics.savingsRate}%
            </div>
            <span className="text-xs text-slate-400">
              {analytics.savingsRate >= 20
                ? 'Excelente retenção'
                : analytics.savingsRate >= 0
                  ? 'Equilibrado'
                  : 'Gastando mais que recebe'}
            </span>
          </div>
        </Card>

        {/* Compromissos a Vencer */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Contas Pendentes</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
              {formatCurrency(analytics.totalBillsPending, hideValues)}
            </div>
            <span className="text-xs text-slate-400">
              {analytics.overdueBills.length > 0 ? (
                <span className="text-red-600 font-bold">
                  {analytics.overdueBills.length} vencida(s)
                </span>
              ) : (
                `${analytics.upcomingBills.length} a vencer`
              )}
            </span>
          </div>
        </Card>
      </div>

      {/* Painel do Chat com o Assistente */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm overflow-hidden flex flex-col h-[560px]">
        {/* Header do Chat */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center font-bold shadow-xs">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                Assistente Raiz
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </h3>
              <p className="text-[11px] text-slate-400">
                Análise em linguagem simples sobre seus dados financeiros
              </p>
            </div>
          </div>

          <Badge variant="outline" className="text-xs font-mono">
            v1.0 · Base Conhecimento Ativa
          </Badge>
        </div>

        {/* Mensagens */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((m) => {
            const isUser = m.sender === 'user'
            return (
              <div key={m.id} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                    isUser
                      ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-bl-none border border-slate-200 dark:border-slate-700/60'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{m.text}</div>
                </div>
                <span className="text-[10px] text-slate-400 mt-1 px-1">{m.timestamp}</span>

                {/* Sugestões de perguntas rápidas */}
                {m.suggestions && (
                  <div className="flex flex-wrap gap-1.5 mt-2 max-w-full">
                    {m.suggestions.map((sug, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(sug)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 transition-colors flex items-center gap-1"
                      >
                        {sug} <ArrowRight className="w-2.5 h-2.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )
          })}

          {isTyping && (
            <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-100 dark:bg-slate-800 w-28 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
              <span>Analisando</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-[#121A2B]">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex items-center gap-2"
          >
            <Input
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              placeholder="Pergunte algo sobre seus gastos, faturas, contas ou metas..."
              className="h-11 rounded-xl text-xs sm:text-sm pl-4"
            />
            <Button
              type="submit"
              disabled={!inputMessage.trim() || isTyping}
              className="h-11 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      </Card>
    </div>
  )
}
