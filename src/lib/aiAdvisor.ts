import pb from '@/lib/pocketbase/client'

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
 * Envia uma mensagem ao agente `ia-financeira` (Skip AI Gateway) e retorna a
 * resposta completa. O agente consulta as coleções do usuário diretamente via
 * ferramentas — nenhum contexto precisa ser enviado no body além da mensagem.
 */
export async function askAiAgent(
  message: string,
  conversationId?: string,
  projectionContext?: string,
): Promise<{ content: string; conversationId: string }> {
  const fullMessage = projectionContext
    ? `${message}\n\n[CONTEXTO DO MOTOR DE PROJEÇÃO FINANCEIRA (DADOS REAIS DA ETAPA 3)]:\n${projectionContext}`
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
 * Retorna o ReadableStream bruto para consumo no frontend e o conversation_id
 * (lido do header `X-Conversation-Id`).
 */
export async function askAiAgentStream(
  message: string,
  conversationId?: string,
  projectionContext?: string,
): Promise<{ stream: ReadableStream<Uint8Array>; conversationId: string }> {
  const fullMessage = projectionContext
    ? `${message}\n\n[CONTEXTO DO MOTOR DE PROJEÇÃO FINANCEIRA (DADOS REAIS DA ETAPA 3)]:\n${projectionContext}`
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
 * Lê um ReadableStream de SSE do agente e invoca `onChunk` a cada pedço de
 * texto recebido. Cada evento vem no formato `data: {...}\n\n`.
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

      // Processa eventos SSE completos (separados por \n\n)
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
          // chunk não-JSON ou parcial; ignora
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

/**
 * Wrapper de compatibilidade: mantém a assinatura (message) -> AiAdvisorResult
 * para quem precisar de resposta não-streaming. Sempre online via Skip AI Gateway.
 */
export async function askAiAdvisor(message: string): Promise<AiAdvisorResult> {
  try {
    const { content } = await askAiAgent(message)
    return { content, offline: false }
  } catch (err) {
    return {
      content: err instanceof Error ? err.message : 'Erro ao consultar a IA.',
      offline: true,
      error: err instanceof Error ? err.message : undefined,
    }
  }
}
