// DEPRECATED — substituído por ai_chat.js (Skip AI Gateway). Mantido apenas
// como fallback offline.
//
// IA Financeira generativa (OpenAI gpt-4o-mini) com fallback baseado em regras.
// Rota: POST /backend/v1/ai/advisor
// Body: { message: string, context: {...} }
// Retorna: { content: string, offline: bool, error?: string }
//
// Rate limiting: máx. 10 chamadas por usuário por hora (registro em ai_advisor_requests).
// Fallback seguro: se a chave OpenAI não existir, a API falhar ou demorar, devolve
// análise determinística baseada no contexto enviado pelo cliente.
//
// Observação: a rota em produção é /backend/v1/ai/ask e /backend/v1/ai/ask-stream
// (hook ai_chat.js, que conversa com o agente "ia-financeira" via Skip AI Gateway).
// Este hook antigo só deve ser usado se o gateway estiver indisponível.

routerAdd(
  'POST',
  '/backend/v1/ai/advisor',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const body = e.requestInfo().body || {}
      const message = (body.message || '').toString().trim()
      const context = body.context || {}
      const source = (body.source || 'chat').toString()

      if (!message) {
        return e.badRequestError('A mensagem é obrigatória.')
      }

      // ---------- Rate limiting (10 chamadas / usuário / hora) ----------
      const now = new Date()
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
      const sinceIso = oneHourAgo.toISOString()

      let recent = 0
      try {
        const recs = $app.findRecordsByFilter(
          'ai_advisor_requests',
          'user = {:uid} && created > {:since}',
          '-created',
          11,
          0,
          { uid: userId, since: sinceIso },
        )
        recent = recs.length
      } catch (err) {
        console.log('[ai_advisor] rate-limit count falhou:', err)
      }
      if (recent >= 10) {
        console.log('[ai_advisor] rate limit excedido para user', userId)
        return e.json(429, {
          error: 'Limite de 10 perguntas por hora atingido. Tente novamente em alguns minutos.',
          offline: true,
        })
      }

      // ---------- Monta o contexto em texto ----------
      const ctxText = (function (ctx) {
        const lines = []
        const mes = ctx.mes || ''
        lines.push('Mês de referência: ' + mes)

        lines.push(
          'Resumo do mês: receitas R$ ' +
            (ctx.receitas || 0).toFixed(2) +
            ' | despesas R$ ' +
            (ctx.despesas || 0).toFixed(2) +
            ' | saldo R$ ' +
            (ctx.saldo || 0).toFixed(2) +
            ' | taxa de economia ' +
            (ctx.taxaEconomia || 0).toFixed(0) +
            '%',
        )

        const top = ctx.topCategorias || []
        if (top.length > 0) {
          lines.push('Top categorias de gasto:')
          for (let i = 0; i < top.length; i++) {
            const c = top[i]
            lines.push(
              '  - ' +
                (c.categoria || 'Outros') +
                ': R$ ' +
                (c.valor || 0).toFixed(2) +
                ' (' +
                (c.percentual || 0).toFixed(0) +
                '% do total)',
            )
          }
        }

        const orc = ctx.orcamentosAcima80 || []
        if (orc.length > 0) {
          lines.push('Orçamentos acima de 80%:')
          for (let i = 0; i < orc.length; i++) {
            const o = orc[i]
            lines.push(
              '  - ' +
                (o.categoria || '-') +
                ': ' +
                (o.percentual || 0).toFixed(0) +
                '% (gasto R$ ' +
                (o.gasto || 0).toFixed(2) +
                ' / limite R$ ' +
                (o.limite || 0).toFixed(2) +
                ')',
            )
          }
        }

        const cart = ctx.cartoes || {}
        lines.push(
          'Cartões: total de faturas abertas R$ ' +
            (cart.totalFaturas || 0).toFixed(2) +
            ' | cartões acima de 80% do limite: ' +
            (cart.cartoesEstourados || []).length,
        )
        const estour = cart.cartoesEstourados || []
        for (let i = 0; i < estour.length; i++) {
          const cc = estour[i]
          lines.push(
            '  - ' + (cc.nome || '-') + ': ' + (cc.usadoPct || 0).toFixed(0) + '% do limite usado',
          )
        }

        const venc = ctx.contasVencidas || []
        if (venc.length > 0) {
          lines.push('Contas vencidas:')
          for (let i = 0; i < venc.length; i++) {
            const v = venc[i]
            lines.push(
              '  - ' +
                (v.descricao || '-') +
                ': R$ ' +
                (v.valor || 0).toFixed(2) +
                ' (venceu em ' +
                (v.vencimento || '-') +
                ')',
            )
          }
        }

        const prox = ctx.contasProximas || []
        if (prox.length > 0) {
          lines.push('Próximas contas a pagar:')
          for (let i = 0; i < prox.length; i++) {
            const p = prox[i]
            lines.push(
              '  - ' +
                (p.descricao || '-') +
                ': R$ ' +
                (p.valor || 0).toFixed(2) +
                ' (vence em ' +
                (p.vencimento || '-') +
                ')',
            )
          }
        }

        const metas = ctx.metas || []
        if (metas.length > 0) {
          lines.push('Metas:')
          for (let i = 0; i < metas.length; i++) {
            const m = metas[i]
            lines.push(
              '  - ' +
                (m.nome || '-') +
                ': ' +
                (m.progressoPct || 0).toFixed(0) +
                '% (R$ ' +
                (m.acumulado || 0).toFixed(2) +
                ' de R$ ' +
                (m.alvo || 0).toFixed(2) +
                ')',
            )
          }
        }

        const inv = ctx.investimentos || {}
        lines.push(
          'Investimentos: patrimônio R$ ' +
            (inv.patrimonio || 0).toFixed(2) +
            ' | rentabilidade ' +
            (inv.rentabilidadePct || 0).toFixed(1) +
            '%',
        )
        const aportes = inv.aportes || []
        if (aportes.length > 0) {
          lines.push('Ativos:')
          for (let i = 0; i < aportes.length; i++) {
            const a = aportes[i]
            lines.push(
              '  - ' +
                (a.nome || '-') +
                ' (' +
                (a.tipo || '-') +
                '): R$ ' +
                (a.valorAtual || 0).toFixed(2),
            )
          }
        }

        const tend = ctx.tendencia || []
        if (tend.length > 0) {
          lines.push('Tendência (últimos 3 meses):')
          for (let i = 0; i < tend.length; i++) {
            const t = tend[i]
            lines.push(
              '  - ' +
                (t.mes || '-') +
                ': receitas R$ ' +
                (t.receitas || 0).toFixed(2) +
                ' | despesas R$ ' +
                (t.despesas || 0).toFixed(2),
            )
          }
        }

        const saldoContas = ctx.saldoContas
        if (saldoContas !== undefined && saldoContas !== null) {
          lines.push('Saldo total em contas: R$ ' + (saldoContas || 0).toFixed(2))
        }

        return lines.join('\n')
      })(context)

      // ---------- Tenta OpenAI ----------
      const apiKey = $os.getenv('OPENAI_API_KEY') || ''
      let offline = false
      let content = ''

      // Fallback baseado em regras — declarado inline (o JSVM não permite
      // referenciar funções top-level dentro de callbacks).
      const fallbackAnswer = function (message, ctx) {
        const msg = (message || '').toLowerCase()
        const receitas = ctx.receitas || 0
        const despesas = ctx.despesas || 0
        const saldo = ctx.saldo || 0
        const taxa = ctx.taxaEconomia || 0
        const top = ctx.topCategorias || []
        const orc = ctx.orcamentosAcima80 || []
        const venc = ctx.contasVencidas || []
        const prox = ctx.contasProximas || []
        const metas = ctx.metas || []
        const inv = ctx.investimentos || {}
        const cart = ctx.cartoes || {}

        var out = []

        if (
          msg.indexOf('cortar') >= 0 ||
          msg.indexOf('supérfluo') >= 0 ||
          msg.indexOf('superfluo') >= 0
        ) {
          out.push('✂️ Analisei seus gastos para encontrar oportunidades de corte:')
          if (top.length > 0) {
            var t = top[0]
            out.push(
              '• Sua maior categoria é ' +
                (t.categoria || 'Outros') +
                ' (R$ ' +
                (t.valor || 0).toFixed(2) +
                ', ' +
                (t.percentual || 0).toFixed(0) +
                '% do total). Reduzir 15% aqui economizaria R$ ' +
                ((t.valor || 0) * 0.15).toFixed(2) +
                '/mês.',
            )
          }
          if (orc.length > 0) {
            var o = orc[0]
            out.push(
              '• O orçamento de ' +
                (o.categoria || '-') +
                ' está em ' +
                (o.percentual || 0).toFixed(0) +
                '% — atenção para não estourar.',
            )
          }
          out.push('💡 Defina um teto mensal na aba Orçamento para as categorias acima.')
          out.push('_(Análise offline — IA indisponível no momento)_')
          return out.join('\n')
        }

        if (msg.indexOf('invest') >= 0) {
          out.push('📈 Seus investimentos:')
          out.push(
            '• Patrimônio atual: R$ ' +
              (inv.patrimonio || 0).toFixed(2) +
              ' | rentabilidade ' +
              (inv.rentabilidadePct || 0).toFixed(1) +
              '%',
          )
          if ((inv.rentabilidadePct || 0) >= 0) {
            out.push('• Carteira no azul. Considere manter aportes regulares.')
          } else {
            out.push('• Rentabilidade negativa — revise a alocação e diversifique.')
          }
          out.push('_(Análise offline — IA indisponível no momento)_')
          return out.join('\n')
        }

        if (msg.indexOf('vencer') >= 0 || msg.indexOf('vencim') >= 0 || msg.indexOf('conta') >= 0) {
          out.push('📅 Seus compromissos:')
          if (venc.length > 0) {
            out.push('• ⚠️ ' + venc.length + ' conta(s) vencida(s):')
            for (var i = 0; i < venc.length && i < 3; i++) {
              var v = venc[i]
              out.push(
                '  - ' +
                  v.descricao +
                  ' — R$ ' +
                  (v.valor || 0).toFixed(2) +
                  ' (venceu ' +
                  (v.vencimento || '-') +
                  ')',
              )
            }
          }
          if (prox.length > 0) {
            out.push('• Próximos vencimentos:')
            for (var j = 0; j < prox.length && j < 3; j++) {
              var p = prox[j]
              out.push(
                '  - ' +
                  p.descricao +
                  ' — R$ ' +
                  (p.valor || 0).toFixed(2) +
                  ' em ' +
                  (p.vencimento || '-'),
              )
            }
          }
          if (venc.length === 0 && prox.length === 0) {
            out.push('✅ Você está em dia com seus compromissos!')
          }
          out.push('_(Análise offline — IA indisponível no momento)_')
          return out.join('\n')
        }

        // resposta padrão / "como está meu mês"
        out.push('📊 Resumo do seu mês:')
        out.push('• Receitas: R$ ' + receitas.toFixed(2) + ' | Despesas: R$ ' + despesas.toFixed(2))
        out.push(
          '• Saldo: R$ ' + saldo.toFixed(2) + ' | Taxa de economia: ' + taxa.toFixed(0) + '%',
        )
        if (saldo >= 0) {
          out.push('🎉 Você fechou o mês no azul!')
        } else {
          out.push('⚠️ Despesas acima das receitas — contenha novos gastos.')
        }
        if (top.length > 0) {
          out.push(
            '• Maior gasto: ' + top[0].categoria + ' (R$ ' + (top[0].valor || 0).toFixed(2) + ')',
          )
        }
        if ((cart.cartoesEstourados || []).length > 0) {
          out.push(
            '• ' + (cart.cartoesEstourados || []).length + ' cartão(ões) acima de 80% do limite.',
          )
        }
        if (venc.length > 0) {
          out.push('• ' + venc.length + ' conta(s) vencida(s) — regularize logo.')
        }
        out.push('_(Análise offline — IA indisponível no momento)_')
        return out.join('\n')
      }

      const systemPrompt =
        'Você é a IA Financeira do sistema Semeia, um analista financeiro pessoal brasileiro amigável e direto.\n' +
        'Diretrizes:\n' +
        '1. Responda sempre em português brasileiro (pt-BR), em linguagem natural, amigável e clara, com emojis ocasionais.\n' +
        '2. Use APENAS os dados reais fornecidos no contexto. Nunca invente valores, saldos ou transações.\n' +
        '3. Seja objetivo e acionável: indique oportunidades de corte, alertas de vencimento, progresso de metas e dicas de investimento.\n' +
        '4. Quando útil, organize a resposta em tópicos curtos. Não ultrapasse ~250 palavras.\n' +
        '5. Encerre, quando pertinente, com a nota: "Esta análise é orientativa e não constitui recomendação oficial de investimento."'

      const userContent =
        'DADOS FINANCEIROS DO USUÁRIO:\n' + ctxText + '\n\nPERGUNTA DO USUÁRIO: ' + message

      if (!apiKey) {
        console.log('[ai_advisor] OPENAI_API_KEY ausente — usando fallback')
        offline = true
        content = fallbackAnswer(message, context)
      } else {
        try {
          const res = $http.send({
            url: 'https://api.openai.com/v1/chat/completions',
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + apiKey,
            },
            body: JSON.stringify({
              model: 'gpt-4o-mini',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent },
              ],
              temperature: 0.7,
              max_tokens: 800,
            }),
            timeout: 20,
          })

          if (res.statusCode === 200 && res.json && res.json.choices) {
            const choice = res.json.choices[0]
            if (choice && choice.message && choice.message.content) {
              content = choice.message.content.trim()
              console.log(
                '[ai_advisor] OpenAI OK user',
                userId,
                'tokens',
                res.json.usage ? res.json.usage.total_tokens : '?',
              )
            } else {
              console.log('[ai_advisor] OpenAI 200 sem conteúdo — fallback')
              offline = true
              content = fallbackAnswer(message, context)
            }
          } else {
            console.log('[ai_advisor] OpenAI falhou status', res.statusCode, '— fallback')
            offline = true
            content = fallbackAnswer(message, context)
          }
        } catch (err) {
          console.log('[ai_advisor] erro OpenAI:', err, '— fallback')
          offline = true
          content = fallbackAnswer(message, context)
        }
      }

      // ---------- Registra a chamada (rate limit) ----------
      try {
        const col = $app.findCollectionByNameOrId('ai_advisor_requests')
        const rec = new Record(col, {
          user: userId,
          question: message.slice(0, 1000),
          source: source,
          offline: offline,
        })
        $app.save(rec)
      } catch (err) {
        console.log('[ai_advisor] erro ao salvar log de requisição:', err)
      }

      return e.json(200, { content: content, offline: offline })
    } catch (err) {
      console.log('[ai_advisor] erro interno:', err)
      return e.json(500, { error: 'Erro interno ao processar a análise.' })
    }
  },
  $apis.requireAuth(),
)
