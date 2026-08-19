routerAdd(
  'POST',
  '/backend/v1/ai/ask',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const body = e.requestInfo().body || {}
      const message = body.message || ''
      const conversationId = body.conversation_id || null

      if (!message.trim()) {
        return e.badRequestError('A mensagem é obrigatória.')
      }

      const result = $ai.agent('ia-financeira').chat({
        user_id: userId,
        conversation_id: conversationId,
        message: message,
      })

      return e.json(200, {
        conversation_id: result.conversation_id,
        content: result.content,
        citations: result.citations,
        message_id: result.message_id,
      })
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'IA temporariamente indisponível.' })
      }
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, {
          error: status >= 500 ? 'Falha na resposta do agente financeiro.' : err.message,
        })
      }
      if (err instanceof SkipAiError) {
        const status = err.status || 502
        return e.json(status, {
          error: status >= 500 ? 'IA temporariamente indisponível.' : err.message,
        })
      }
      return e.json(500, { error: err.message || 'Erro interno ao processar chat' })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'POST',
  '/backend/v1/ai/ask-stream',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const body = e.requestInfo().body || {}
      const message = body.message || ''
      const conversationId = body.conversation_id || null

      if (!message.trim()) {
        return e.badRequestError('A mensagem é obrigatória.')
      }

      const conv = $ai.agent('ia-financeira').getOrCreateConversation({
        user_id: userId,
        id: conversationId,
      })

      const iter = $ai.agent('ia-financeira').chat({
        user_id: userId,
        conversation_id: conv.id,
        message: message,
        stream: true,
      })

      e.response.header().set('Content-Type', 'text/event-stream')
      e.response.header().set('Cache-Control', 'no-cache')
      e.response.header().set('X-Conversation-Id', conv.id)

      $response.stream(e, iter)
    } catch (err) {
      if (err instanceof SkipAiConfigError) {
        return e.json(503, { error: 'IA temporariamente indisponível.' })
      }
      if (err instanceof SkipAiAgentsError) {
        const status = err.status || 500
        return e.json(status, { error: status >= 500 ? 'Falha no agente.' : err.message })
      }
      return e.json(500, { error: err.message || 'Erro no chat streaming' })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/ai/history',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const convs = $ai.agent('ia-financeira').listConversations({
        user_id: userId,
        limit: 10,
      })

      return e.json(200, convs)
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao listar conversas' })
    }
  },
  $apis.requireAuth(),
)

routerAdd(
  'GET',
  '/backend/v1/ai/conversations/{id}/messages',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const convId = e.request.pathValue('id')
      const msgs = $ai.agent('ia-financeira').listMessages({
        conversation_id: convId,
        user_id: userId,
        limit: 50,
      })

      return e.json(200, msgs)
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao obter mensagens da conversa' })
    }
  },
  $apis.requireAuth(),
)
