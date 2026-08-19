/// <reference path="../pb_data/types.d.ts" />
// Pagamentos Mercado Pago — Semeia (Checkout Pro / preferência)
//
// Endpoints:
//   POST /backend/v1/payments/mercadopago/checkout   (auth) -> cria preferência
//   POST /backend/v1/payments/mercadopago/webhook     (public) -> notificações
//   GET  /backend/v1/payments/mercadopago/status      (auth)  -> consulta status
//
// Secret:
//   MERCADOPAGO_ACCESS_TOKEN  (token de acesso da aplicação MP)
//
// Fluxo:
//   1. Frontend chama /checkout com { plan }
//   2. Backend cria preferência em /checkout/preferences -> retorna init_point
//   3. Usuário paga no MP; MP chama /webhook com payment.created/updated
//   4. Backend busca o pagamento em /v1/payments/{id} com o access token
//   5. Se status=approved, ativa a assinatura local
//
// Normalização de status (MP -> Semeia):
//   approved                -> ativa  + admin_released = true
//   pending | in_process    -> mantém estado (não libera)
//   rejected | cancelled    -> bloqueada
//
// NOTA: o JSVM (goja) deste backend não parseia bem literais regex em alguns
// contextos, então evitamos regex — usamos string ops (indexOf, substring).

// (sem helpers top-level — o JSVM executa callbacks em pool de VMs separado;
//  toda lógica está inline dentro de cada callback abaixo)
// ---------------------------------------------------------------------------
// 1. Criar preferência de pagamento (Checkout Pro)
//    Body: { plan: "monthly" | "annual" }
//    Retorna: { url: init_point, preference_id }
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/mercadopago/checkout',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const body = e.requestInfo().body || {}
      const rawPlan = (body.plan || 'monthly').toString()
      const plan = rawPlan === 'annual' ? 'annual' : 'monthly'

      const accessToken = $os.getenv('MERCADOPAGO_ACCESS_TOKEN') || ''
      if (!accessToken) {
        return e.json(503, { error: 'Pagamentos via Mercado Pago não configurados.' })
      }

      let siteUrl = $os.getenv('SITE_URL') || ''
      while (siteUrl.length > 0 && siteUrl.charAt(siteUrl.length - 1) === '/') {
        siteUrl = siteUrl.substring(0, siteUrl.length - 1)
      }
      if (!siteUrl) {
        return e.json(500, { error: 'SITE_URL não configurado.' })
      }

      let userEmail = ''
      let userName = 'Usuário'
      try {
        userEmail = e.auth.email ? e.auth.email() : e.auth.getString('email') || ''
        userName = e.auth.getString('name') || (userEmail ? userEmail.split('@')[0] : 'Usuário')
      } catch (_) {}

      const unitAmount = plan === 'annual' ? 119.99 : 11.99 // BRL
      const planLabelPt = plan === 'annual' ? 'Anual' : 'Mensal'
      const planPt = plan === 'annual' ? 'anual' : 'mensal'
      const frequency = plan === 'annual' ? 12 : 1

      const prefObj = {
        items: [
          {
            id: 'semeia-' + plan,
            title: 'Semeia Plano ' + planLabelPt,
            description: 'Assinatura Semeia ' + planLabelPt + ' — sistema financeiro pessoal',
            quantity: 1,
            currency_id: 'BRL',
            unit_price: unitAmount,
            category_id: 'services',
          },
        ],
        payer: userEmail ? { email: userEmail, name: userName } : {},
        back_urls: {
          success: siteUrl + '/obrigado?provider=mercadopago&plan=' + planPt,
          pending: siteUrl + '/paywall?pending=1&provider=mercadopago',
          failure: siteUrl + '/paywall?failed=1&provider=mercadopago',
        },
        auto_return: 'approved',
        external_reference: userId + '|' + planPt + '|stripe_unused',
        metadata: {
          user_id: userId,
          plan: planPt,
          provider: 'mercadopago',
        },
        statement_descriptor: 'SEMEIA',
        // Subscriptions via MP: tentamos criar preferência com subscrição.
        // (MP tem API separada para assinaturas recorrentes; para simplicidade
        //  usamos checkout Pro de pagamento único e renovamos pelo webhook do
        //  ciclo — ou seja, a "renovação" é manual após expirar. Para manter a
        //  experiência simples e robusta, ativamos a assinatura local ao
        //  receber approved, com expires_at = +1 período.)
        notification_url: siteUrl + '/backend/v1/payments/mercadopago/webhook',
        binary_mode: true,
      }

      const res = $http.send({
        url: 'https://api.mercadopago.com/checkout/preferences',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(prefObj),
        timeout: 20,
      })

      if (res.statusCode === 200 || res.statusCode === 201) {
        const data = res.json || {}
        const url = data.init_point || data.sandbox_init_point || ''
        if (!url) {
          console.log('[mp checkout] sem init_point:', JSON.stringify(data))
          return e.json(502, { error: 'Mercado Pago não retornou URL de checkout.' })
        }
        return e.json(200, { url: url, preference_id: data.id || '' })
      }

      console.log('[mp checkout] erro MP:', res.statusCode, JSON.stringify(res.json || ''))
      const errMsg =
        res.json && res.json.message
          ? res.json.message
          : 'Falha ao criar preferência no Mercado Pago.'
      return e.json(502, { error: errMsg })
    } catch (err) {
      console.log('[mp checkout] exceção:', err)
      return e.json(500, { error: 'Erro interno ao iniciar checkout Mercado Pago.' })
    }
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// 2. Webhook público — processa notificações do Mercado Pago
//    Query: ?type=payment&id=<payment_id>  (MP envia notification_url com query)
//    Body (também aceita): { type, data: { id } }  (formato webhook novo)
//    Eventos tratados:
//      payment.created | payment.updated  com status=approved -> ativa assinatura
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/payments/mercadopago/webhook', (e) => {
  try {
    const accessToken = $os.getenv('MERCADOPAGO_ACCESS_TOKEN') || ''
    if (!accessToken) {
      return e.json(503, { error: 'Mercado Pago não configurado.' })
    }

    // MP pode enviar como query string (IPN clássico) ou body (webhook novo)
    const query = e.requestInfo().query || {}
    const body = e.requestInfo().body || {}

    let paymentId = ''
    let notifType = ''

    // Formato webhook novo: { type: "payment", data: { id: "123" } }
    if (body && body.data && body.data.id) {
      paymentId = String(body.data.id)
      notifType = String(body.type || '')
    }
    // Formato IPN clássico via query: ?type=payment&id=123
    if (!paymentId && query.id) {
      paymentId = String(query.id)
      notifType = String(query.type || '')
    }

    // Para alguns webhooks, o "type" chega como "payment.created" no body
    if (!notifType && body && body.type) {
      notifType = String(body.type)
    }

    // Merchant Order (notificação alternativa) — não processamos aqui
    if (notifType === 'merchant_order') {
      return e.json(200, { received: true, skipped: 'merchant_order' })
    }

    if (!paymentId) {
      return e.json(400, { error: 'Sem identificador de pagamento.' })
    }

    // Busca o pagamento na API do MP para confirmar status e origem
    const payRes = $http.send({
      url: 'https://api.mercadopago.com/v1/payments/' + encodeURIComponent(paymentId),
      method: 'GET',
      headers: { Authorization: 'Bearer ' + accessToken },
      timeout: 15,
    })

    if (payRes.statusCode !== 200 || !payRes.json) {
      console.log('[mp webhook] pagamento não encontrado:', paymentId, payRes.statusCode)
      return e.json(404, { error: 'Pagamento não encontrado.' })
    }

    const pay = payRes.json
    const status = (pay.status || '').toString()
    const externalRef = (pay.external_reference || '').toString()
    const metadata = pay.metadata || {}
    const order = pay.order || {}

    // external_reference = "userId|plan|stripe_unused"
    let userId = metadata.user_id ? String(metadata.user_id) : ''
    let plan = metadata.plan ? String(metadata.plan) : ''
    if (!userId && externalRef) {
      const parts = externalRef.split('|')
      if (parts.length >= 2) {
        userId = parts[0]
        plan = parts[1]
      }
    }

    if (!userId) {
      console.log('[mp webhook] sem user_id no pagamento', paymentId)
      return e.json(200, { received: true, skipped: 'no_user' })
    }

    if (status !== 'approved') {
      console.log('[mp webhook] status', status, 'para user', userId, '- não libera')
      return e.json(200, { received: true, status: status })
    }

    // Pagamento aprovado — ativa/renova a assinatura
    let sub = null
    try {
      const subs = $app.findRecordsByFilter('subscriptions', 'user = {:uid}', '-created', 1, 0, {
        uid: userId,
      })
      sub = subs && subs.length > 0 ? subs[0] : null
    } catch (_) {
      sub = null
    }

    const nowIso = new Date().toISOString()
    const isAnnual = plan === 'anual' || plan === 'annual'
    const exp = new Date()
    if (isAnnual) exp.setFullYear(exp.getFullYear() + 1)
    else exp.setMonth(exp.getMonth() + 1)
    const expIso = exp.toISOString()
    const price = isAnnual ? 119.99 : 11.99
    const planPt = isAnnual ? 'anual' : 'mensal'

    // Guarda o id do pagamento como provider_subscription_id (MP não tem
    // subscription_id para pagamento único; usamos o payment id como ref).
    const providerSubId = String(pay.id || paymentId)

    if (sub) {
      sub.set('provider', 'mercadopago')
      sub.set('provider_subscription_id', providerSubId)
      sub.set('plan', planPt)
      sub.set('price', price)
      sub.set('status', 'ativa')
      sub.set('admin_released', true)
      if (!sub.getString('started_at')) sub.set('started_at', nowIso)
      sub.set('renewed_at', nowIso)
      sub.set('current_period_start', nowIso)
      sub.set('current_period_end', expIso)
      sub.set('expires_at', expIso)
      sub.set('cancel_at_period_end', false)
      $app.save(sub)
    } else {
      try {
        const col = $app.findCollectionByNameOrId('subscriptions')
        const rec = new Record(col)
        rec.set('user', userId)
        rec.set('provider', 'mercadopago')
        rec.set('provider_subscription_id', providerSubId)
        rec.set('plan', planPt)
        rec.set('price', price)
        rec.set('status', 'ativa')
        rec.set('admin_released', true)
        rec.set('started_at', nowIso)
        rec.set('renewed_at', nowIso)
        rec.set('current_period_start', nowIso)
        rec.set('current_period_end', expIso)
        rec.set('expires_at', expIso)
        rec.set('cancel_at_period_end', false)
        $app.save(rec)
      } catch (err) {
        console.log('[mp webhook] erro ao criar assinatura:', err)
      }
    }

    // Emails: ativação + recibo
    try {
      let baseUrl = $os.getenv('PB_INSTANCE_URL') || $os.getenv('SITE_URL') || ''
      while (baseUrl.length > 0 && baseUrl.charAt(baseUrl.length - 1) === '/') {
        baseUrl = baseUrl.substring(0, baseUrl.length - 1)
      }
      $http.send({
        url: baseUrl + '/backend/v1/emails/subscription-activated',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          plan: planPt,
          provider: 'mercadopago',
          expires_at: expIso,
          price: price,
        }),
        timeout: 10,
      })
      $http.send({
        url: baseUrl + '/backend/v1/emails/payment-receipt',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          plan: planPt,
          provider: 'mercadopago',
          amount: price,
          payment_id: providerSubId,
          paid_at: nowIso,
        }),
        timeout: 10,
      })
    } catch (_) {}

    return e.json(200, { received: true, status: status, activated: true })
  } catch (err) {
    console.log('[mp webhook] exceção:', err)
    return e.json(500, { error: 'Erro ao processar webhook Mercado Pago.' })
  }
}) // público

// ---------------------------------------------------------------------------
// 3. Consulta de status do pagamento (opcional, usado no polling pós-retorno)
//    Query: ?payment_id=123
//    Retorna: { status, plan, active }
// ---------------------------------------------------------------------------
routerAdd(
  'GET',
  '/backend/v1/payments/mercadopago/status',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }
      const accessToken = $os.getenv('MERCADOPAGO_ACCESS_TOKEN') || ''
      if (!accessToken) {
        return e.json(503, { error: 'Mercado Pago não configurado.' })
      }

      const query = e.requestInfo().query || {}
      const paymentId = String(query.payment_id || '')
      if (!paymentId) {
        // Sem payment_id: retorna o status da assinatura local
        let sub = null
        try {
          const subs = $app.findRecordsByFilter(
            'subscriptions',
            'user = {:uid}',
            '-created',
            1,
            0,
            { uid: userId },
          )
          sub = subs && subs.length > 0 ? subs[0] : null
        } catch (_) {
          sub = null
        }
        return e.json(200, {
          status: sub ? sub.getString('status') : 'bloqueada',
          active: sub && sub.getString('status') === 'ativa',
        })
      }

      const payRes = $http.send({
        url: 'https://api.mercadopago.com/v1/payments/' + encodeURIComponent(paymentId),
        method: 'GET',
        headers: { Authorization: 'Bearer ' + accessToken },
        timeout: 15,
      })
      if (payRes.statusCode !== 200 || !payRes.json) {
        return e.json(404, { error: 'Pagamento não encontrado.' })
      }
      const pay = payRes.json
      return e.json(200, {
        status: pay.status,
        active: pay.status === 'approved',
        plan: pay.metadata && pay.metadata.plan ? pay.metadata.plan : '',
      })
    } catch (err) {
      console.log('[mp status] exceção:', err)
      return e.json(500, { error: 'Erro ao consultar status.' })
    }
  },
  $apis.requireAuth(),
)
