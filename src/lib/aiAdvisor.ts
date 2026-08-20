import pb from '@/lib/pocketbase/client'
import {
  FinancialContextData,
  detectAnomalies,
  calculateHealthScore,
  identifySavingsOpportunities,
  generateWeeklySummary,
  evaluateCanSpendPurchase,
} from './anomalyDetector'
import { calculateCashFlowProjection } from './projectionEngine'

import { formatCurrency, formatDate } from './constants'

export interface AiAdvisorResult {
  content: string
  offline: boolean
  error?: string
}

const BASE_URL = import.meta.env.VITE_POCKETBASE_URL

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: pb.authStore.token,
  }
}

/**
 * 2. CONTEXTO FINANCEIRO AMPLIADO
 * Constrói string estruturada contendo todos os dados e métricas determinísticas
 * das Etapas 1, 2, 3, 4 e 5:
 * - Saldo consolidado e por banco
 * - Receitas e despesas do mês
 * - Contas a pagar/receber (status)
 * - Boletos pendentes/vencidos
 * - Cartões e faturas (limites, vencimentos)
 * - Parcelamentos futuros
 * - Recorrências ativas
 * - Orçamentos (consumo % por categoria)
 * - Metas (progresso %)
 * - Investimentos (carteira)
 * - Previsão 30/60/90 dias (projetado)
 * - DRE do período (margens)
 * - Comparativo mensal (variações)
 * - Saúde Financeira (0-100)
 * - Anomalias e Oportunidades
 *
 * NUNCA misturar dados de usuários (garantido pelo escopo do usuário autenticado).
 */
export function buildComprehensiveFinancialContext(context: FinancialContextData): string {
  const currentMonthKey = context.currentMonthKey || new Date().toISOString().slice(0, 7)

  // 1. Saldos em Contas
  const totalBalance = context.accounts.reduce((acc, a) => acc + (a.current_balance || 0), 0)
  const accountsBreakdown = context.accounts
    .map((a) => `  * ${a.name} (${a.bank}): ${formatCurrency(a.current_balance || 0)}`)
    .join('\n')

  // 2. Projeção de Fluxo de Caixa (30 dias)
  const p30 = calculateCashFlowProjection({ ...context, days: 30 })

  // 3. Cartões e Faturas
  const cardsInfo = (context.creditCards || [])
    .map((c) => {
      const openInv = context.invoices.find(
        (inv) => inv.credit_card === c.id && inv.status !== 'paga',
      )
      return `  * ${c.name} (${c.bank}): Limite ${formatCurrency(c.limit)} | Fatura atual: ${formatCurrency(openInv?.total || c.current_invoice_total || 0)} (${c.used_percentage || 0}% usado) | Vence dia ${c.due_day}`
    })
    .join('\n')

  // 4. Saúde Financeira e Anomalias Determinísticas
  const health = calculateHealthScore(context, currentMonthKey)
  const { anomalies, hasEnoughHistory } = detectAnomalies(context, currentMonthKey)
  const opportunities = identifySavingsOpportunities(context)

  // 5. Resumo do Mês das Transações
  const monthTxns = (context.transactions || []).filter(
    (t) => (t.date || '').startsWith(currentMonthKey) && t.status === 'realizado',
  )
  const monthIncome = monthTxns
    .filter((t) => t.type === 'receita')
    .reduce((acc, t) => acc + Number(t.value || 0), 0)
  const monthExpense = monthTxns
    .filter((t) => t.type === 'despesa')
    .reduce((acc, t) => acc + Number(t.value || 0), 0)

  // 6. Investimentos
  const investmentsList = context.investments || []
  const totalInvestedVal = investmentsList.reduce((acc, i) => acc + Number(i.applied_value || 0), 0)
  const totalCurrentInvested = investmentsList.reduce(
    (acc, i) => acc + Number(i.current_total_value || i.applied_value || 0),
    0,
  )
  const totalInvestProfit = totalCurrentInvested - totalInvestedVal
  const investmentsSummary = investmentsList
    .map(
      (inv) =>
        `  * ${inv.name} (${inv.type}): Aplicado ${formatCurrency(inv.applied_value)} | Atual ${formatCurrency(inv.current_total_value || inv.applied_value)} (${(inv.profit_loss_pct || 0) >= 0 ? '+' : ''}${(inv.profit_loss_pct || 0).toFixed(1)}%)`,
    )
    .join('\n')

  return `
[SAÚDE FINANCEIRA]:
- Pontuação: ${health.score}/100 (${health.levelLabel.toUpperCase()})
- Fatores:
${health.factors.map((f) => `  * ${f.factor}: ${f.score}/${f.maxScore} pts (${f.description})`).join('\n')}

[SALDO CONSOLIDADO E POR BANCO]:
- Saldo Consolidado Hoje: ${formatCurrency(totalBalance)}
${accountsBreakdown || '  * Nenhuma conta cadastrada'}

[INVESTIMENTOS E PATRIMÔNIO]:
- Total Investido: ${formatCurrency(totalInvestedVal)} | Valor Atual: ${formatCurrency(totalCurrentInvested)} | Resultado: ${formatCurrency(totalInvestProfit)}
${investmentsSummary || '  * Nenhum investimento cadastrado'}

[MÊS ATUAL]:
- Receitas realizadas: ${formatCurrency(monthIncome)}
- Despesas realizadas: ${formatCurrency(monthExpense)}
- Resultado líquido: ${formatCurrency(monthIncome - monthExpense)}

[PREVISÃO DE FLUXO DE CAIXA (30 DIAS)]:
- 30 dias: Entradas ${formatCurrency(p30.totalIncome)}, Saídas ${formatCurrency(p30.totalExpense)} → Saldo final previsto: ${formatCurrency(p30.projectedEndBalance)} (${p30.isPositive ? 'Positivo' : 'Negativo'})
  Risco 30d: ${p30.risk.hasRisk ? `Déficit a partir de ${formatDate(p30.risk.firstNegativeDate || '')} (${formatCurrency(p30.risk.firstNegativeBalance || 0)})` : 'Sem risco de saldo negativo nos próximos 30 dias'}

[CARTÕES E FATURAS]:
${cardsInfo || '  * Nenhum cartão cadastrado'}

[ANOMALIAS E ALERTAS]:
- Histórico: ${hasEnoughHistory ? 'Histórico suficiente para médias' : 'Ainda não há histórico suficiente para essa comparação.'}
${anomalies.map((a) => `  * [${a.priority}] ${a.title}: ${a.description}`).join('\n') || '  * Nenhuma anomalia crítica detectada'}

[OPORTUNIDADES IDENTIFICADAS]:
${opportunities.map((o) => `  * ${o.title}: ${o.description}`).join('\n') || '  * Nenhuma oportunidade pendente'}
  `.trim()
}

/**
 * 3 & 4. RESPOSTA DIRETA / LOCAL DETERMINÍSTICA PARA PERGUNTAS ESPECÍFICAS
 * Garante que se o usuário perguntar valores pontuais ou "Posso gastar R$ X?",
 * o cálculo matemático determinístico é aplicado primeiro.
 */
export function evaluateLocalDeterministicAnswer(
  message: string,
  context: FinancialContextData,
): string | null {
  const msgLower = (message || '').toLowerCase().trim()

  // 1. "Posso gastar R$ X agora?"
  const spendMatch =
    msgLower.match(/posso gastar\s*(?:r\$)?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i) ||
    msgLower.match(/posso comprar.*(?:r\$)?\s*([0-9]+(?:[.,][0-9]{1,2})?)/i)
  if (spendMatch) {
    const rawVal = spendMatch[1].replace(/\./g, '').replace(',', '.')
    const val = parseFloat(rawVal)
    if (!isNaN(val) && val > 0) {
      const res = evaluateCanSpendPurchase(val, context, 30)
      return res.reasoningText
    }
  }

  // 2. "Quanto terei daqui a 30 dias?"
  if (
    msgLower.includes('quanto terei') &&
    (msgLower.includes('30 dias') || msgLower.includes('próximo mês'))
  ) {
    const p30 = calculateCashFlowProjection({ ...context, days: 30 })
    return `Nos próximos 30 dias, considerando entradas previstas de ${formatCurrency(p30.totalIncome)} e saídas previstas de ${formatCurrency(p30.totalExpense)}, seu saldo projetado é de ${formatCurrency(p30.projectedEndBalance)} (${p30.isPositive ? 'Positivo' : 'Negativo'}).`
  }

  // 3. "Qual o resultado deste mês?"
  if (
    msgLower.includes('resultado deste mês') ||
    msgLower.includes('resultado do mês') ||
    msgLower.includes('saldo do mês')
  ) {
    const currentMonthKey = context.currentMonthKey || new Date().toISOString().slice(0, 7)
    const monthTxns = (context.transactions || []).filter(
      (t) => (t.date || '').startsWith(currentMonthKey) && t.status === 'realizado',
    )
    const inc = monthTxns
      .filter((t) => t.type === 'receita')
      .reduce((a, t) => a + Number(t.value || 0), 0)
    const exp = monthTxns
      .filter((t) => t.type === 'despesa')
      .reduce((a, t) => a + Number(t.value || 0), 0)
    const res = inc - exp
    return `No mês atual, você recebeu ${formatCurrency(inc)} e gastou ${formatCurrency(exp)}, resultando em ${res >= 0 ? 'saldo positivo' : 'déficit'} de ${formatCurrency(res)}.`
  }

  // 4. "Quanto tenho investido?" ou "Total em investimentos"
  if (
    msgLower.includes('quanto tenho investido') ||
    msgLower.includes('total investido') ||
    msgLower.includes('meus investimentos')
  ) {
    const invs = context.investments || []
    const totalCurrent = invs.reduce(
      (sum, i) => sum + (i.current_total_value || i.applied_value || 0),
      0,
    )
    const totalApplied = invs.reduce((sum, i) => sum + (i.applied_value || 0), 0)
    const diff = totalCurrent - totalApplied
    return `Você possui atualmente ${formatCurrency(totalCurrent)} em investimentos (total aplicado: ${formatCurrency(totalApplied)}), com resultado acumulado de ${diff >= 0 ? '+' : ''}${formatCurrency(diff)}.`
  }

  return null
}

/**
 * Envia uma mensagem ao agente `ia-financeira` (Skip AI Gateway) e retorna a resposta completa.
 */
export async function askAiAgent(
  message: string,
  conversationId?: string,
  extraContext?: string,
): Promise<{ content: string; conversationId: string }> {
  const fullMessage = extraContext
    ? `${message}\n\n[CONTEXTO CONTÁBIL / DRE / PROJEÇÃO / IA SEMEIA (DADOS REAIS E MATEMÁTICOS CALCULADOS)]:\n${extraContext}`
    : message

  const res = await fetch(`${BASE_URL}/backend/v1/ai/ask`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message: fullMessage, conversation_id: conversationId ?? null }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.error || 'Não foi possível obter a análise agora.')
  }
  return {
    content: data.content || '',
    conversationId: data.conversation_id || '',
  }
}

/**
 * Envia uma mensagem ao agente `ia-financeira` em modo streaming (SSE).
 */
export async function askAiAgentStream(
  message: string,
  conversationId?: string,
  extraContext?: string,
): Promise<{ stream: ReadableStream<Uint8Array>; conversationId: string }> {
  const fullMessage = extraContext
    ? `${message}\n\n[CONTEXTO CONTÁBIL / DRE / PROJEÇÃO / IA SEMEIA (DADOS REAIS E MATEMÁTICOS CALCULADOS)]:\n${extraContext}`
    : message

  const res = await fetch(`${BASE_URL}/backend/v1/ai/ask-stream`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify({ message: fullMessage, conversation_id: conversationId ?? null }),
  })

  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error || 'Não foi possível iniciar o streaming agora.')
  }

  const convId = res.headers.get('X-Conversation-Id') || ''
  return { stream: res.body, conversationId: convId }
}

/**
 * Consome ReadableStream de SSE do agente e invoca `onChunk`.
 */
export async function consumeAiStream(
  stream: ReadableStream<Uint8Array>,
  onChunk: (text: string) => void,
  signal?: AbortSignal,
): Promise<void> {
  const reader = stream.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      if (signal?.aborted) {
        await reader.cancel().catch(() => {})
        return
      }
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let sepIndex: number
      while ((sepIndex = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, sepIndex)
        buffer = buffer.slice(sepIndex + 2)

        const dataLine = rawEvent
          .split('\n')
          .map((l) => l.trim())
          .find((l) => l.startsWith('data:'))

        if (!dataLine) continue
        const jsonStr = dataLine.slice(5).trim()
        if (!jsonStr || jsonStr === '[DONE]') continue

        try {
          const parsed = JSON.parse(jsonStr)
          const text =
            typeof parsed === 'string'
              ? parsed
              : parsed.content || parsed.text || parsed.delta || ''
          if (text) onChunk(text)
        } catch {
          // chunk parcial
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Wrapper com fallback seguro e resiliente (15. FALLBACK SE IA INDISPONÍVEL).
 */
export async function askAiAdvisor(
  message: string,
  contextData?: FinancialContextData,
): Promise<AiAdvisorResult> {
  // 1. Tenta resposta determinística imediata se houver
  if (contextData) {
    const localAnswer = evaluateLocalDeterministicAnswer(message, contextData)
    if (localAnswer) {
      return { content: localAnswer, offline: false }
    }
  }

  // 2. Tenta agente Skip AI Gateway com contexto ampliado
  try {
    const extraContext = contextData ? buildComprehensiveFinancialContext(contextData) : undefined
    const { content } = await askAiAgent(message, undefined, extraContext)
    return { content, offline: false }
  } catch (err) {
    // 3. Fallback determinístico offline se o servidor falhar
    if (contextData) {
      const summary = generateWeeklySummary(contextData)
      return {
        content: `[IA temporariamente indisponível — Resumo Determinístico]\n\n${summary.formattedSummaryText}`,
        offline: true,
        error: err instanceof Error ? err.message : undefined,
      }
    }
    return {
      content:
        'IA temporariamente indisponível. Seus cálculos e painéis continuam funcionando normalmente.',
      offline: true,
      error: err instanceof Error ? err.message : undefined,
    }
  }
}
