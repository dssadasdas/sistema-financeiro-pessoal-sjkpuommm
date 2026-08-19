/// <reference path="../pb_data/types.d.ts" />
// Pagamentos Stripe — Semia
//
// Endpoints:
//   POST /backend/v1/payments/stripe/checkout   (auth)  -> cria Checkout Session
//   POST /backend/v1/payments/stripe/cancel      (auth)  -> cancela assinatura no Stripe
//   POST /backend/v1/payments/stripe/portal      (auth)  -> cria Customer Portal session
//   POST /backend/v1/payments/stripe/webhook     (public) -> processa eventos do Stripe
//
// Secrets:
//   STRIPE_SECRET_KEY        (chave secreta da API Stripe)
//   STRIPE_WEBHOOK_SECRET    (signing secret do endpoint de webhook)
//
// Normalização de status (Stripe -> Semia):
//   active | trialing         -> ativa   + admin_released = true
//   past_due | unpaid         -> ativa   (período de carência mantém acesso)
//   canceled | incomplete...  -> bloqueada + admin_released = false
//
// O JSVM do PocketBase não expõe o corpo bruto da requisição de forma confiável,
// então a verificação do webhook usa o método recomendado pela Stripe de
// re-buscar o evento via API (GET /v1/events/{id}) com a secret key, o que
// confirma a origem legítima sem depender da assinatura HMAC do corpo cru.
//
// Emails: ao ativar/renovar/cancelar, dispara chamadas internas para as rotas
// de email (subscription_emails.js): subscription-activated, payment-receipt,
// subscription-canceled. São rotas públicas internas (entre hooks).
//
// NOTA: o JSVM (goja) deste backend não parseia bem literais regex em alguns
// contextos, então evitamos regex — usamos string ops (indexOf, substring).

// (sem helpers top-level — o JSVM executa callbacks em pool de VMs separado;
//  toda lógica está inline dentro de cada callback abaixo)
// ---------------------------------------------------------------------------
// 1. Criar Checkout Session
//    Body: { plan: "monthly" | "annual" }
//    Retorna: { url }  -> redireciona o navegador para a URL do Stripe Checkout
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/stripe/checkout',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const body = e.requestInfo().body || {}
      const rawPlan = (body.plan || 'monthly').toString()
      const plan = rawPlan === 'annual' ? 'annual' : 'monthly'

      const secretKey = $os.getenv('STRIPE_SECRET_KEY') || ''
      if (!secretKey) {
        return e.json(503, { error: 'Pagamentos via Stripe não configurados.' })
      }

      // E-mail do usuário autenticado
      let userEmail = ''
      try {
        userEmail = e.auth.email ? e.auth.email() : e.auth.getString('email') || ''
      } catch (_) {
        userEmail = ''
      }
      const userName = e.auth.getString('name') || userEmail.split('@')[0] || 'Usuário'

      let siteUrl = $os.getenv('SITE_URL') || ''
      while (siteUrl.length > 0 && siteUrl.charAt(siteUrl.length - 1) === '/') {
        siteUrl = siteUrl.substring(0, siteUrl.length - 1)
      }
      if (!siteUrl) {
        return e.json(500, { error: 'SITE_URL não configurado.' })
      }

      // Preços em centavos (BRL)
      const unitAmount = plan === 'annual' ? 11999 : 1199 // R$ 119,99 / R$ 11,99
      const interval = plan === 'annual' ? 'year' : 'month'
      const planLabelPt = plan === 'annual' ? 'Anual' : 'Mensal'
      const planPt = plan === 'annual' ? 'anual' : 'mensal'

      // Monta corpo form-encoded (Stripe aceita application/x-www-form-urlencoded)
      const enc = function (s) {
        return encodeURIComponent(s)
      }
      const formParts = [
        'mode=' + enc('subscription'),
        'line_items[0][quantity]=' + enc('1'),
        'line_items[0][price_data][currency]=' + enc('brl'),
        'line_items[0][price_data][unit_amount]=' + enc(String(unitAmount)),
        'line_items[0][price_data][recurring][interval]=' + enc(interval),
        'line_items[0][price_data][product_data][name]=' + enc('Semia Plano ' + planLabelPt),
        'line_items[0][price_data][product_data][description]=' +
          enc('Assinatura Semia ' + planLabelPt + ' — sistema financeiro pessoal'),
        'client_reference_id=' + enc(userId),
        'subscription_data[metadata][user_id]=' + enc(userId),
        'subscription_data[metadata][plan]=' + enc(planPt),
        'subscription_data[metadata][provider]=' + enc('stripe'),
        'success_url=' +
          enc(siteUrl + '/obrigado?provider=stripe&session_id={CHECKOUT_SESSION_ID}'),
        'cancel_url=' + enc(siteUrl + '/paywall?canceled=1&provider=stripe'),
        'billing_address_collection=' + enc('auto'),
        'locale=' + enc('pt-BR'),
      ]
      if (userEmail) {
        formParts.push('customer_email=' + enc(userEmail))
      }
      const formBody = formParts.join('&')

      const res = $http.send({
        url: 'https://api.stripe.com/v1/checkout/sessions',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + secretKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
        timeout: 20,
      })

      if (res.statusCode === 200 && res.json && res.json.url) {
        return e.json(200, { url: res.json.url, session_id: res.json.id })
      }

      console.log('[stripe checkout] erro Stripe:', res.statusCode, JSON.stringify(res.json || ''))
      const errMsg =
        res.json && res.json.error && res.json.error.message
          ? res.json.error.message
          : 'Falha ao criar sessão de pagamento Stripe.'
      return e.json(502, { error: errMsg })
    } catch (err) {
      console.log('[stripe checkout] exceção:', err)
      return e.json(500, { error: 'Erro interno ao iniciar checkout Stripe.' })
    }
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// 2. Cancelar assinatura no Stripe (cancela no fim do ciclo atual)
//    Body: {}  (usa a assinatura do usuário autenticado)
//    Retorna: { canceled: true, cancel_at_period_end: true }
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/stripe/cancel',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const secretKey = $os.getenv('STRIPE_SECRET_KEY') || ''
      if (!secretKey) {
        return e.json(503, { error: 'Pagamentos via Stripe não configurados.' })
      }

      // Localiza a assinatura local do usuário com provider stripe
      let sub
      try {
        const subs = $app.findRecordsByFilter(
          'subscriptions',
          "user = {:uid} && provider = 'stripe' && provider_subscription_id != ''",
          '-created',
          1,
          0,
          { uid: userId },
        )
        sub = subs && subs.length > 0 ? subs[0] : null
      } catch (_) {
        sub = null
      }

      if (!sub) {
        return e.badRequestError('Nenhuma assinatura Stripe ativa encontrada.')
      }

      const providerSubId = sub.getString('provider_subscription_id') || ''
      if (!providerSubId) {
        return e.badRequestError('Assinatura sem identificador Stripe.')
      }

      // Cancela no fim do ciclo (prática padrão SaaS)
      const formBody = 'cancel_at_period_end=true'
      const res = $http.send({
        url: 'https://api.stripe.com/v1/subscriptions/' + encodeURIComponent(providerSubId),
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + secretKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
        timeout: 20,
      })

      if (res.statusCode === 200 && res.json) {
        // Atualiza localmente
        sub.set('cancel_at_period_end', true)
        const st = (res.json.status || '').toString()
        if (st === 'canceled') {
          sub.set('status', 'bloqueada')
          sub.set('admin_released', false)
        }
        $app.save(sub)
        // Email de cancelamento
        try {
          let baseUrl = $os.getenv('PB_INSTANCE_URL') || $os.getenv('SITE_URL') || ''
          while (baseUrl.length > 0 && baseUrl.charAt(baseUrl.length - 1) === '/') {
            baseUrl = baseUrl.substring(0, baseUrl.length - 1)
          }
          $http.send({
            url: baseUrl + '/backend/v1/emails/subscription-canceled',
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              user_id: userId,
              reason: 'canceled',
              plan: sub.getString('plan') || 'mensal',
            }),
            timeout: 10,
          })
        } catch (_) {}
        return e.json(200, { canceled: true, cancel_at_period_end: true })
      }

      console.log('[stripe cancel] erro Stripe:', res.statusCode, JSON.stringify(res.json || ''))
      const errMsg =
        res.json && res.json.error && res.json.error.message
          ? res.json.error.message
          : 'Falha ao cancelar assinatura no Stripe.'
      return e.json(502, { error: errMsg })
    } catch (err) {
      console.log('[stripe cancel] exceção:', err)
      return e.json(500, { error: 'Erro interno ao cancelar assinatura.' })
    }
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// 3. Customer Portal (opcional — gestão de cartão/fatura pelo Stripe)
//    Body: {}
//    Retorna: { url }
// ---------------------------------------------------------------------------
routerAdd(
  'POST',
  '/backend/v1/payments/stripe/portal',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const secretKey = $os.getenv('STRIPE_SECRET_KEY') || ''
      if (!secretKey) {
        return e.json(503, { error: 'Pagamentos via Stripe não configurados.' })
      }

      let sub
      try {
        const subs = $app.findRecordsByFilter(
          'subscriptions',
          "user = {:uid} && provider = 'stripe' && provider_customer_id != ''",
          '-created',
          1,
          0,
          { uid: userId },
        )
        sub = subs && subs.length > 0 ? subs[0] : null
      } catch (_) {
        sub = null
      }
      if (!sub) {
        return e.badRequestError('Nenhuma assinatura Stripe encontrada.')
      }

      const customerId = sub.getString('provider_customer_id') || ''
      if (!customerId) {
        return e.badRequestError('Cliente Stripe não encontrado.')
      }

      let siteUrl = $os.getenv('SITE_URL') || ''
      while (siteUrl.length > 0 && siteUrl.charAt(siteUrl.length - 1) === '/') {
        siteUrl = siteUrl.substring(0, siteUrl.length - 1)
      }
      const formBody =
        'customer=' +
        encodeURIComponent(customerId) +
        '&return_url=' +
        encodeURIComponent(siteUrl + '/configuracoes')

      const res = $http.send({
        url: 'https://api.stripe.com/v1/billing_portal/sessions',
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + secretKey,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formBody,
        timeout: 20,
      })

      if (res.statusCode === 200 && res.json && res.json.url) {
        return e.json(200, { url: res.json.url })
      }
      return e.json(502, { error: 'Falha ao abrir portal do Stripe.' })
    } catch (err) {
      console.log('[stripe portal] exceção:', err)
      return e.json(500, { error: 'Erro interno ao abrir portal.' })
    }
  },
  $apis.requireAuth(),
)

// ---------------------------------------------------------------------------
// 4. Webhook público — processa eventos do Stripe
//    Eventos tratados:
//      checkout.session.completed     -> ativa a assinatura local
//      invoice.paid                    -> renovação/atualização de ciclo
//      customer.subscription.updated   -> atualiza status/período
//      customer.subscription.deleted   -> bloqueia a assinatura
//    Verificação: re-busca o evento em /v1/events/{id} (confirma origem).
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/payments/stripe/webhook', (e) => {
  try {
    const secretKey = $os.getenv('STRIPE_SECRET_KEY') || ''

    if (!secretKey) {
      return e.json(503, { error: 'Stripe não configurado.' })
    }

    const body = e.requestInfo().body || {}
    const eventId = (body.id || '').toString()
    const eventType = (body.type || '').toString()

    if (!eventId || !eventType) {
      return e.json(400, { error: 'Payload de evento inválido.' })
    }

    // Verificação de origem: re-busca o evento na API do Stripe.
    // Se existir e retornar 200, o evento é legítimo.
    const verifyRes = $http.send({
      url: 'https://api.stripe.com/v1/events/' + encodeURIComponent(eventId),
      method: 'GET',
      headers: { Authorization: 'Bearer ' + secretKey },
      timeout: 15,
    })

    if (verifyRes.statusCode !== 200 || !verifyRes.json) {
      console.log('[stripe webhook] evento não verificado:', eventId, verifyRes.statusCode)
      return e.json(401, { error: 'Evento não pôde ser verificado.' })
    }

    const verifiedEvent = verifyRes.json
    const vType = (verifiedEvent.type || eventType).toString()
    const obj = verifiedEvent.data && verifiedEvent.data.object ? verifiedEvent.data.object : {}

    // --- helpers inline ---
    const findSubByProvider = function (providerSubId) {
      if (!providerSubId) return null
      try {
        const subs = $app.findRecordsByFilter(
          'subscriptions',
          "provider = 'stripe' && provider_subscription_id = {:sid}",
          '-created',
          1,
          0,
          { sid: providerSubId },
        )
        return subs && subs.length > 0 ? subs[0] : null
      } catch (_) {
        return null
      }
    }
    const normalizeStatus = function (stripeStatus) {
      const s = (stripeStatus || '').toString()
      if (s === 'active' || s === 'trialing') return { status: 'ativa', released: true }
      if (s === 'past_due' || s === 'unpaid') return { status: 'ativa', released: true }
      return { status: 'bloqueada', released: false }
    }
    const isoFromUnix = function (ts) {
      if (!ts) return ''
      const n = parseInt(ts, 10)
      if (isNaN(n) || n <= 0) return ''
      return new Date(n * 1000).toISOString()
    }
    // Helper inline: dispara email interno via rota subscription_emails.js
    const sendInternalEmail = function (routePath, payload) {
      let baseUrl = $os.getenv('PB_INSTANCE_URL') || $os.getenv('SITE_URL') || ''
      while (baseUrl.length > 0 && baseUrl.charAt(baseUrl.length - 1) === '/') {
        baseUrl = baseUrl.substring(0, baseUrl.length - 1)
      }
      try {
        $http.send({
          url: baseUrl + routePath,
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          timeout: 10,
        })
      } catch (_) {}
    }

    // ---------------------------------------------------------------
    // checkout.session.completed
    // ---------------------------------------------------------------
    if (vType === 'checkout.session.completed') {
      const providerSubId = (obj.subscription || '').toString()
      const customerId = (obj.customer || '').toString()
      const userIdFromMeta =
        (obj.client_reference_id || '').toString() ||
        (obj.metadata && obj.metadata.user_id ? obj.metadata.user_id : '') ||
        (obj.metadata && obj.metadata.userId ? obj.metadata.userId : '')
      const planFromMeta = obj.metadata && obj.metadata.plan ? obj.metadata.plan : ''
      const amountTotal = obj.amount_total || 0

      let sub = findSubByProvider(providerSubId)
      const nowIso = new Date().toISOString()
      const exp = new Date()
      if (planFromMeta === 'anual') exp.setFullYear(exp.getFullYear() + 1)
      else exp.setMonth(exp.getMonth() + 1)
      const expIso = exp.toISOString()
      const planPt = planFromMeta === 'anual' ? 'anual' : 'mensal'
      const price = planFromMeta === 'anual' ? 119.99 : 11.99

      if (sub) {
        sub.set('provider', 'stripe')
        sub.set('provider_subscription_id', providerSubId)
        if (customerId) sub.set('provider_customer_id', customerId)
        if (planFromMeta === 'anual' || planFromMeta === 'mensal') sub.set('plan', planFromMeta)
        sub.set('price', price)
        sub.set('status', 'ativa')
        sub.set('admin_released', true)
        if (!sub.getString('started_at')) sub.set('started_at', nowIso)
        sub.set('renewed_at', nowIso)
        sub.set('expires_at', expIso)
        sub.set('current_period_start', nowIso)
        sub.set('current_period_end', expIso)
        sub.set('cancel_at_period_end', false)
        $app.save(sub)
      } else {
        // Cria um novo registro de assinatura
        try {
          const col = $app.findCollectionByNameOrId('subscriptions')
          const rec = new Record(col)
          rec.set('user', userIdFromMeta)
          rec.set('provider', 'stripe')
          rec.set('provider_subscription_id', providerSubId)
          if (customerId) rec.set('provider_customer_id', customerId)
          rec.set('plan', planPt)
          rec.set('price', price)
          rec.set('status', 'ativa')
          rec.set('admin_released', true)
          rec.set('started_at', nowIso)
          rec.set('renewed_at', nowIso)
          rec.set('expires_at', expIso)
          rec.set('current_period_start', nowIso)
          rec.set('current_period_end', expIso)
          rec.set('cancel_at_period_end', false)
          $app.save(rec)
          sub = rec
        } catch (err) {
          console.log('[stripe webhook] erro ao criar assinatura:', err)
        }
      }

      // Emails: ativação + recibo
      sendInternalEmail('/backend/v1/emails/subscription-activated', {
        user_id: userIdFromMeta,
        plan: planPt,
        provider: 'stripe',
        expires_at: expIso,
        price: price,
      })
      sendInternalEmail('/backend/v1/emails/payment-receipt', {
        user_id: userIdFromMeta,
        plan: planPt,
        provider: 'stripe',
        amount: price,
        payment_id: providerSubId,
        paid_at: nowIso,
      })
    }

    // ---------------------------------------------------------------
    // invoice.paid — renovação de ciclo
    // ---------------------------------------------------------------
    else if (vType === 'invoice.paid') {
      const providerSubId = (obj.subscription || '').toString()
      const customerId = (obj.customer || '').toString()
      const periodStart = obj.period_start ? isoFromUnix(obj.period_start) : ''
      const periodEnd = obj.period_end ? isoFromUnix(obj.period_end) : ''
      const amountPaid = obj.amount_paid || 0
      const invoiceId = (obj.id || '').toString()
      const subUserId =
        obj.subscription_details && obj.subscription_details.metadata
          ? obj.subscription_details.metadata.user_id
          : ''

      let sub = findSubByProvider(providerSubId)
      if (!sub && customerId) {
        try {
          const subs = $app.findRecordsByFilter(
            'subscriptions',
            "provider = 'stripe' && provider_customer_id = {:cid}",
            '-created',
            1,
            0,
            { cid: customerId },
          )
          sub = subs && subs.length > 0 ? subs[0] : null
        } catch (_) {
          sub = null
        }
      }

      if (sub) {
        if (customerId) sub.set('provider_customer_id', customerId)
        if (providerSubId) sub.set('provider_subscription_id', providerSubId)
        sub.set('status', 'ativa')
        sub.set('admin_released', true)
        if (periodStart) {
          sub.set('current_period_start', periodStart)
          sub.set('renewed_at', periodStart)
        }
        if (periodEnd) {
          sub.set('current_period_end', periodEnd)
          sub.set('expires_at', periodEnd)
        }
        $app.save(sub)

        // Recibo de renovação
        const uid = sub.getString('user')
        const plan = sub.getString('plan') || 'mensal'
        const price = sub.getFloat('price') || (plan === 'anual' ? 119.99 : 11.99)
        sendInternalEmail('/backend/v1/emails/payment-receipt', {
          user_id: uid,
          plan: plan,
          provider: 'stripe',
          amount: price,
          payment_id: invoiceId,
          paid_at: periodStart || new Date().toISOString(),
        })
      }
    }

    // ---------------------------------------------------------------
    // customer.subscription.updated
    // ---------------------------------------------------------------
    else if (vType === 'customer.subscription.updated') {
      const providerSubId = (obj.id || '').toString()
      const customerId = (obj.customer || '').toString()
      const norm = normalizeStatus(obj.status)
      const periodStart = obj.current_period_start ? isoFromUnix(obj.current_period_start) : ''
      const periodEnd = obj.current_period_end ? isoFromUnix(obj.current_period_end) : ''
      const cancelAtEnd = obj.cancel_at_period_end === true
      const prevCancel = obj.previous_attributes && obj.previous_attributes.cancel_at_period_end
      const becameCanceled = cancelAtEnd === true && prevCancel !== true

      let sub = findSubByProvider(providerSubId)
      if (sub) {
        if (customerId) sub.set('provider_customer_id', customerId)
        sub.set('status', norm.status)
        sub.set('admin_released', norm.released)
        sub.set('cancel_at_period_end', cancelAtEnd)
        if (periodStart) sub.set('current_period_start', periodStart)
        if (periodEnd) {
          sub.set('current_period_end', periodEnd)
          sub.set('expires_at', periodEnd)
        }
        // Detecta plano pelo intervalo
        try {
          const items = obj.items && obj.items.data ? obj.items.data : []
          if (items.length > 0 && items[0].price && items[0].price.recurring) {
            const interval = items[0].price.recurring.interval
            if (interval === 'year') {
              sub.set('plan', 'anual')
              sub.set('price', 119.99)
            } else if (interval === 'month') {
              sub.set('plan', 'mensal')
              sub.set('price', 11.99)
            }
          }
        } catch (_) {}
        $app.save(sub)

        // Se acabou de marcar cancelamento no fim do ciclo, envia email
        if (becameCanceled) {
          const uid = sub.getString('user')
          const plan = sub.getString('plan') || 'mensal'
          sendInternalEmail('/backend/v1/emails/subscription-canceled', {
            user_id: uid,
            reason: 'canceled',
            plan: plan,
          })
        }
      }
    }

    // ---------------------------------------------------------------
    // customer.subscription.deleted
    // ---------------------------------------------------------------
    else if (vType === 'customer.subscription.deleted') {
      const providerSubId = (obj.id || '').toString()
      const sub = findSubByProvider(providerSubId)
      if (sub) {
        sub.set('status', 'bloqueada')
        sub.set('admin_released', false)
        sub.set('cancel_at_period_end', false)
        $app.save(sub)
        const uid = sub.getString('user')
        const plan = sub.getString('plan') || 'mensal'
        sendInternalEmail('/backend/v1/emails/subscription-canceled', {
          user_id: uid,
          reason: 'expired',
          plan: plan,
        })
      }
    }

    return e.json(200, { received: true, type: vType })
  } catch (err) {
    console.log('[stripe webhook] exceção:', err)
    return e.json(500, { error: 'Erro ao processar webhook Stripe.' })
  }
}) // público — sem auth
