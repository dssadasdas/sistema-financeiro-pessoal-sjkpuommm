routerAdd(
  'POST',
  '/backend/v1/invoices/parse',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const body = e.requestInfo().body || {}
      const textContent = body.text || ''
      const imageBase64 = body.image || ''
      const bankHint = body.bank || ''

      if (!textContent && !imageBase64) {
        return e.badRequestError('Envie o texto ou imagem da fatura para processamento.')
      }

      // Prompt estruturado para extração precisa com múltiplas estratégias
      const systemPrompt =
        "Você é um extrator especialista de faturas de cartão de crédito brasileiras. Extraia todos os lançamentos de compras/débitos reais da fatura. NUNCA inclua 'limite disponível', 'saldo anterior', 'pagamento de fatura recebido' ou totais como se fossem compras. Identifique estornos como valores negativos ou classifique-os. Retorne ESTRITAMENTE um objeto JSON válido (sem markdown, sem explicações)."

      const userPrompt = `Analise o seguinte conteúdo de fatura de cartão de crédito ${bankHint ? '(Emissor sugerido: ' + bankHint + ')' : ''}.
Conteúdo textual:
"""
${textContent.slice(0, 8000)}
"""

Extraia:
1. "detected_bank": string com o nome do emissor (Nubank, Caixa, Itaú, Bradesco, Santander, Banco do Brasil, Inter, C6, Sicoob, PicPay, Mercado Pago, Neon, Banco CSF/Atacadão, ou Outro)
2. "detected_total": number com o valor total da fatura (ex: 1250.45)
3. "reference_month": string (ex: "2025-05")
4. "due_date": string (ex: "2025-05-20")
5. "items": array de objetos com:
   - "date": string "YYYY-MM-DD"
   - "description": string
   - "category": sugestão de categoria (Alimentação, Transporte, Saúde, Educação, Moradia, Luz, Água, Assinaturas, Taxas e tarifas, Compras, Lazer, Outros)
   - "value": number (ex: 45.90)
   - "installments": string (ex: "1/3" ou "" se à vista)

Regras de categorização padrão:
- COELBA / Neoenergia -> Luz
- EMBASA / Sabesp / Sanepar -> Água
- iFood / Rappi / Zé Delivery -> Alimentação
- Posto / Ipiranga / Shell / Petrobras -> Combustível
- Uber / 99 / Táxi -> Transporte
- Netflix / Spotify / Prime / Apple / YouTube -> Assinaturas
- Farmácia / Drogasil / Pacheco / Hospital / Clínica -> Saúde
- Escola / Colégio / Faculdade / Curso / Udemy -> Educação
- IOF / Anuidade / Tarifa / Juros / Multa -> Taxas e tarifas

Formato de resposta JSON:
{
  "detected_bank": "Nubank",
  "detected_total": 0.00,
  "reference_month": "2025-05",
  "due_date": "2025-05-20",
  "items": [
    { "date": "2025-05-01", "description": "Exemplo", "category": "Alimentação", "value": 50.00, "installments": "" }
  ]
}`

      let aiResult
      try {
        aiResult = $ai.chat({
          model: 'fast',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: { type: 'json_object' },
        })
      } catch (aiErr) {
        return e.json(500, {
          error: 'Falha ao processar com IA: ' + (aiErr.message || 'Erro desconhecido'),
        })
      }

      const content =
        aiResult && aiResult.choices && aiResult.choices[0] && aiResult.choices[0].message
          ? aiResult.choices[0].message.content
          : '{}'

      let parsed
      try {
        parsed = JSON.parse(content)
      } catch (_) {
        // Fallback regex se houver invólucro markdown
        const match = content.match(/\{[\s\S]*\}/)
        if (match) {
          parsed = JSON.parse(match[0])
        } else {
          parsed = { detected_bank: bankHint || 'Outro', detected_total: 0, items: [] }
        }
      }

      return e.json(200, parsed)
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro no parsing da fatura' })
    }
  },
  $apis.requireAuth(),
)
