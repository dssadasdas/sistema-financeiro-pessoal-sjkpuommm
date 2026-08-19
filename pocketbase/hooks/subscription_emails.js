/// <reference path="../pb_data/types.d.ts" />
// Emails transacionais do Semeia via SendGrid — pt-BR, identidade esmeralda.
//
// Templates enviados:
//   1. Boas-vindas                          (ao criar conta — onRecordAfterCreateSuccess em users)
//   2. Confirmação de assinatura ativa       (chamado pelos hooks de pagamento via rota interna)
//   3. Lembrete de pré-renovação (3 dias)    (cron diário)
//   4. Assinatura cancelada/expirada         (chamado pelos hooks de pagamento / cron de expiração)
//   5. Recibo/fatura após pagamento           (chamado pelos hooks de pagamento)
//
// Secrets:
//   SENDGRID_API_KEY     (chave da API do SendGrid, "SG.xxxx...")
//   SENDGRID_FROM_EMAIL  (remetente, ex.: "Semeia <noreply@semeia.finance>")
//
// IMPORTANTE: o JSVM do PocketBase executa callbacks em um pool de VMs separado,
// então NENHUMA função/variável top-level é acessível dentro de callbacks. Toda
// a lógica (helpers, montagem de template, envio) está INLINE dentro de cada
// callback. Onde a mesma lógica é usada em mais de um callback, ela é duplicada.
// Os hooks de pagamento invocam o envio diretamente via $http.send (API do
// SendGrid), já que um hook não pode chamar outro.
//
// NOTA: o JSVM (goja) deste backend não parseia bem literais regex em alguns
// contextos, então evitamos regex — usamos string ops (indexOf, substring).

// ---------------------------------------------------------------------------
// 1. E-mail de boas-vindas — disparado após criar conta (users).
//    Preferimos SendGrid; se não houver chave, faz fallback para o Mailer nativo.
// ---------------------------------------------------------------------------
onRecordAfterCreateSuccess(function (e) {
  try {
    var record = e.record
    var email = record.email ? record.email() : ''
    if (!email) return
    var name = record.getString('name') || email.split('@')[0]

    // --- inline: trimTrailingSlash (sem regex) ---
    var siteUrlRaw = $os.getenv('SITE_URL') || ''
    var siteUrl = siteUrlRaw
    while (siteUrl.length > 0 && siteUrl.charAt(siteUrl.length - 1) === '/') {
      siteUrl = siteUrl.substring(0, siteUrl.length - 1)
    }

    var body =
      '<p style="font-size:15px;line-height:1.6">Olá, <strong>' +
      name +
      '</strong>!</p>' +
      '<p style="font-size:15px;line-height:1.6">Sua conta no Semeia foi criada com sucesso. Agora você tem em um só lugar o controle de receitas, despesas, cartões de crédito, contas a pagar, metas, orçamentos e investimentos — com a ajuda da nossa IA financeira.</p>' +
      '<p style="font-size:15px;line-height:1.6">Para liberar o painel completo, escolha um dos planos e comece a organizar sua vida financeira.</p>' +
      '<div style="text-align:center;margin:28px 0">' +
      '<a href="' +
      (siteUrl || '') +
      '/paywall" style="display:inline-block;background:#059669;color:#fff;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px">Escolher plano</a>' +
      '</div>' +
      '<p style="font-size:13px;color:#64748b;margin-top:24px">Se você não criou essa conta, pode ignorar este e-mail com segurança.</p>'

    // --- inline: semiaTemplate ---
    var html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">' +
      '<div style="background:linear-gradient(135deg,#059669,#14b8a6);padding:24px;border-radius:16px 16px 0 0;text-align:center">' +
      '<h1 style="color:#fff;margin:0;font-size:22px">' +
      'Bem-vindo ao Semeia 👋' +
      '</h1>' +
      '</div>' +
      '<div style="border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 16px 16px">' +
      body +
      '<p style="font-size:12px;color:#94a3b8;margin-top:28px;text-align:center">' +
      'Semeia · Sistema Financeiro Pessoal<br/>' +
      'Recebeu este e-mail por ter uma conta no Semeia.' +
      '</p>' +
      '</div></div>'

    // --- inline: sendSemiaEmail ---
    var sent = false
    var apiKey = $os.getenv('SENDGRID_API_KEY') || ''
    if (apiKey) {
      // --- inline: parseFromEmail ---
      var rawFrom = $os.getenv('SENDGRID_FROM_EMAIL') || ''
      var fromAddress = rawFrom
      var fromName = 'Semeia'
      if (rawFrom) {
        var lt = rawFrom.indexOf('<')
        var gt = rawFrom.indexOf('>')
        if (lt >= 0 && gt > lt) {
          var maybeName = rawFrom.substring(0, lt).trim()
          if (maybeName) fromName = maybeName
          fromAddress = rawFrom.substring(lt + 1, gt).trim()
        } else if (rawFrom.indexOf('@') < 0) {
          fromAddress = 'noreply@semeia.finance'
        }
      }
      if (!fromAddress) fromAddress = 'noreply@semeia.finance'

      var payload = {
        personalizations: [{ to: [{ email: email }] }],
        from: { email: fromAddress, name: fromName },
        subject: 'Bem-vindo ao Semeia!',
        content: [{ type: 'text/html', value: html }],
      }
      try {
        var res = $http.send({
          url: 'https://api.sendgrid.com/v3/mail/send',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          timeout: 15,
        })
        if (res.statusCode === 202 || res.statusCode === 200) {
          sent = true
        } else {
          console.log(
            '[sendgrid] erro status',
            res.statusCode,
            'para',
            email,
            'Bem-vindo ao Semeia!',
          )
        }
      } catch (err) {
        console.log('[sendgrid] exceção:', err)
      }
    } else {
      console.log('[sendgrid] SENDGRID_API_KEY ausente — email não enviado: Bem-vindo ao Semeia!')
    }

    if (!sent) {
      // Fallback: Mailer nativo do PocketBase (exige SMTP configurado)
      try {
        var senderAddress = $app.settings().meta.senderAddress || 'noreply@semeia.app'
        var senderName = $app.settings().meta.senderName || 'Semeia'
        var message = new MailerMessage({
          from: { address: senderAddress, name: senderName },
          to: [{ address: email }],
          subject: 'Bem-vindo ao Semeia!',
          html: html,
        })
        $app.newMailClient().send(message)
      } catch (err) {
        console.log('[emails] fallback Mailer falhou:', err)
      }
    }
  } catch (err) {
    console.log('[emails] erro boas-vindas:', err)
  }
}, 'users')

// ---------------------------------------------------------------------------
// 2. Confirmação de assinatura ativa — disparado pelos hooks de pagamento.
//    Rota interna: POST /backend/v1/emails/subscription-activated
//    Body: { user_id, plan, provider, expires_at, price }
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/emails/subscription-activated', function (e) {
  try {
    var body = e.requestInfo().body || {}
    var userId = String(body.user_id || '')
    if (!userId) return e.json(400, { error: 'user_id obrigatório' })

    var userRec = null
    try {
      userRec = $app.findRecordById('users', userId)
    } catch (_) {
      return e.json(404, { error: 'usuário não encontrado' })
    }
    var email = userRec.email ? userRec.email() : ''
    if (!email) return e.json(400, { error: 'usuário sem email' })
    var name = userRec.getString('name') || email.split('@')[0]
    var plan = String(body.plan || 'mensal')
    var provider = String(body.provider || '')
    var expiresAt = String(body.expires_at || '')
    var price = parseFloat(body.price || 0)
    var planLabel = plan === 'anual' ? 'Anual' : 'Mensal'
    var providerLabel =
      provider === 'mercadopago' ? 'Mercado Pago' : provider === 'stripe' ? 'Stripe' : provider

    // --- inline: trimTrailingSlash ---
    var siteUrlRaw = $os.getenv('SITE_URL') || ''
    var siteUrl = siteUrlRaw
    while (siteUrl.length > 0 && siteUrl.charAt(siteUrl.length - 1) === '/') {
      siteUrl = siteUrl.substring(0, siteUrl.length - 1)
    }

    // --- inline: formatDateLongPTBR ---
    var expiresText = ''
    if (expiresAt) {
      try {
        var d2 = new Date(expiresAt)
        if (!isNaN(d2.getTime())) {
          var months2 = [
            'janeiro',
            'fevereiro',
            'março',
            'abril',
            'maio',
            'junho',
            'julho',
            'agosto',
            'setembro',
            'outubro',
            'novembro',
            'dezembro',
          ]
          var day2 = d2.getDate()
          var dayStr2 = day2 < 10 ? '0' + day2 : '' + day2
          expiresText = dayStr2 + ' de ' + months2[d2.getMonth()] + ' de ' + d2.getFullYear()
        } else {
          expiresText = expiresAt
        }
      } catch (_) {
        expiresText = expiresAt
      }
    }

    var bodyHtml =
      '<p style="font-size:15px;line-height:1.6">Olá, <strong>' +
      name +
      '</strong>!</p>' +
      '<p style="font-size:15px;line-height:1.6">Sua assinatura no Semeia foi confirmada com sucesso. 🎉</p>' +
      '<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">' +
      '<tr><td style="padding:8px 0;color:#64748b">Plano</td><td style="padding:8px 0;font-weight:600;text-align:right">' +
      planLabel +
      '</td></tr>' +
      '<tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Valor</td><td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #e2e8f0">R$ ' +
      price.toFixed(2).replace('.', ',') +
      '</td></tr>' +
      (provider
        ? '<tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Pagamento</td><td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #e2e8f0">' +
          providerLabel +
          '</td></tr>'
        : '') +
      (expiresText
        ? '<tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Próxima renovação</td><td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #e2e8f0">' +
          expiresText +
          '</td></tr>'
        : '') +
      '</table>' +
      '<div style="text-align:center;margin:28px 0">' +
      '<a href="' +
      (siteUrl || '') +
      '/inicio" style="display:inline-block;background:#059669;color:#fff;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px">Acessar meu painel</a>' +
      '</div>' +
      '<p style="font-size:13px;color:#64748b">Se precisar cancelar, acesse Configurações → Assinatura no painel.</p>'

    // --- inline: semiaTemplate ---
    var html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">' +
      '<div style="background:linear-gradient(135deg,#059669,#14b8a6);padding:24px;border-radius:16px 16px 0 0;text-align:center">' +
      '<h1 style="color:#fff;margin:0;font-size:22px">' +
      'Assinatura ativada 🎉' +
      '</h1>' +
      '</div>' +
      '<div style="border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 16px 16px">' +
      bodyHtml +
      '<p style="font-size:12px;color:#94a3b8;margin-top:28px;text-align:center">' +
      'Semeia · Sistema Financeiro Pessoal<br/>' +
      'Recebeu este e-mail por ter uma conta no Semeia.' +
      '</p>' +
      '</div></div>'

    // --- inline: sendSemiaEmail ---
    var sent = false
    var apiKey = $os.getenv('SENDGRID_API_KEY') || ''
    if (!apiKey) {
      console.log(
        '[sendgrid] SENDGRID_API_KEY ausente — email não enviado: Sua assinatura Semeia está ativa!',
      )
    } else {
      // --- inline: parseFromEmail ---
      var rawFrom = $os.getenv('SENDGRID_FROM_EMAIL') || ''
      var fromAddress = rawFrom
      var fromName = 'Semeia'
      if (rawFrom) {
        var lt = rawFrom.indexOf('<')
        var gt = rawFrom.indexOf('>')
        if (lt >= 0 && gt > lt) {
          var maybeName = rawFrom.substring(0, lt).trim()
          if (maybeName) fromName = maybeName
          fromAddress = rawFrom.substring(lt + 1, gt).trim()
        } else if (rawFrom.indexOf('@') < 0) {
          fromAddress = 'noreply@semeia.finance'
        }
      }
      if (!fromAddress) fromAddress = 'noreply@semeia.finance'

      var payload = {
        personalizations: [{ to: [{ email: email }] }],
        from: { email: fromAddress, name: fromName },
        subject: 'Sua assinatura Semeia está ativa!',
        content: [{ type: 'text/html', value: html }],
      }
      try {
        var res = $http.send({
          url: 'https://api.sendgrid.com/v3/mail/send',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          timeout: 15,
        })
        if (res.statusCode === 202 || res.statusCode === 200) {
          sent = true
        } else {
          console.log(
            '[sendgrid] erro status',
            res.statusCode,
            'para',
            email,
            'Sua assinatura Semeia está ativa!',
          )
        }
      } catch (err) {
        console.log('[sendgrid] exceção:', err)
      }
    }
    return e.json(200, { sent: sent })
  } catch (err) {
    console.log('[emails] erro ativação:', err)
    return e.json(500, { error: 'erro ao enviar email' })
  }
})

// ---------------------------------------------------------------------------
// 3. Recibo/fatura após pagamento — disparado pelos hooks de pagamento.
//    Rota interna: POST /backend/v1/emails/payment-receipt
//    Body: { user_id, plan, provider, amount, payment_id, paid_at }
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/emails/payment-receipt', function (e) {
  try {
    var body = e.requestInfo().body || {}
    var userId = String(body.user_id || '')
    if (!userId) return e.json(400, { error: 'user_id obrigatório' })

    var userRec = null
    try {
      userRec = $app.findRecordById('users', userId)
    } catch (_) {
      return e.json(404, { error: 'usuário não encontrado' })
    }
    var email = userRec.email ? userRec.email() : ''
    if (!email) return e.json(200, { sent: false })
    var name = userRec.getString('name') || email.split('@')[0]
    var plan = String(body.plan || 'mensal')
    var provider = String(body.provider || '')
    var amount = parseFloat(body.amount || 0)
    var paymentId = String(body.payment_id || '')
    var paidAt = String(body.paid_at || '')
    var planLabel = plan === 'anual' ? 'Anual' : 'Mensal'
    var providerLabel =
      provider === 'mercadopago' ? 'Mercado Pago' : provider === 'stripe' ? 'Stripe' : provider

    // --- inline: trimTrailingSlash ---
    var siteUrlRaw = $os.getenv('SITE_URL') || ''
    var siteUrl = siteUrlRaw
    while (siteUrl.length > 0 && siteUrl.charAt(siteUrl.length - 1) === '/') {
      siteUrl = siteUrl.substring(0, siteUrl.length - 1)
    }

    // --- inline: formatDateLongPTBR ---
    var paidText = ''
    function fmtDate3(iso) {
      if (!iso) return ''
      try {
        var d = new Date(iso)
        if (isNaN(d.getTime())) return iso
        var months = [
          'janeiro',
          'fevereiro',
          'março',
          'abril',
          'maio',
          'junho',
          'julho',
          'agosto',
          'setembro',
          'outubro',
          'novembro',
          'dezembro',
        ]
        var day = d.getDate()
        var dayStr = day < 10 ? '0' + day : '' + day
        return dayStr + ' de ' + months[d.getMonth()] + ' de ' + d.getFullYear()
      } catch (_) {
        return iso
      }
    }
    paidText = fmtDate3(paidAt)
    if (!paidText) paidText = fmtDate3(new Date().toISOString())

    var bodyHtml =
      '<p style="font-size:15px;line-height:1.6">Olá, <strong>' +
      name +
      '</strong>!</p>' +
      '<p style="font-size:15px;line-height:1.6">Recebemos seu pagamento. Aqui está o seu recibo:</p>' +
      '<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">' +
      '<tr><td style="padding:8px 0;color:#64748b">Descrição</td><td style="padding:8px 0;font-weight:600;text-align:right">Semeia Plano ' +
      planLabel +
      '</td></tr>' +
      '<tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Valor</td><td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #e2e8f0">R$ ' +
      amount.toFixed(2).replace('.', ',') +
      '</td></tr>' +
      (provider
        ? '<tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Método</td><td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #e2e8f0">' +
          providerLabel +
          '</td></tr>'
        : '') +
      '<tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Data</td><td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #e2e8f0">' +
      paidText +
      '</td></tr>' +
      (paymentId
        ? '<tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Transação</td><td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #e2e8f0;font-size:11px;word-break:break-all">' +
          paymentId +
          '</td></tr>'
        : '') +
      '</table>' +
      '<div style="text-align:center;margin:28px 0">' +
      '<a href="' +
      (siteUrl || '') +
      '/configuracoes" style="display:inline-block;background:#059669;color:#fff;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px">Ver minha assinatura</a>' +
      '</div>'

    // --- inline: semiaTemplate ---
    var html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">' +
      '<div style="background:linear-gradient(135deg,#059669,#14b8a6);padding:24px;border-radius:16px 16px 0 0;text-align:center">' +
      '<h1 style="color:#fff;margin:0;font-size:22px">' +
      'Recibo de pagamento' +
      '</h1>' +
      '</div>' +
      '<div style="border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 16px 16px">' +
      bodyHtml +
      '<p style="font-size:12px;color:#94a3b8;margin-top:28px;text-align:center">' +
      'Semeia · Sistema Financeiro Pessoal<br/>' +
      'Recebeu este e-mail por ter uma conta no Semeia.' +
      '</p>' +
      '</div></div>'

    // --- inline: sendSemiaEmail ---
    var sent = false
    var apiKey = $os.getenv('SENDGRID_API_KEY') || ''
    if (!apiKey) {
      console.log(
        '[sendgrid] SENDGRID_API_KEY ausente — email não enviado: Recibo do seu pagamento Semeia',
      )
    } else {
      // --- inline: parseFromEmail ---
      var rawFrom = $os.getenv('SENDGRID_FROM_EMAIL') || ''
      var fromAddress = rawFrom
      var fromName = 'Semeia'
      if (rawFrom) {
        var lt = rawFrom.indexOf('<')
        var gt = rawFrom.indexOf('>')
        if (lt >= 0 && gt > lt) {
          var maybeName = rawFrom.substring(0, lt).trim()
          if (maybeName) fromName = maybeName
          fromAddress = rawFrom.substring(lt + 1, gt).trim()
        } else if (rawFrom.indexOf('@') < 0) {
          fromAddress = 'noreply@semeia.finance'
        }
      }
      if (!fromAddress) fromAddress = 'noreply@semeia.finance'

      var payload = {
        personalizations: [{ to: [{ email: email }] }],
        from: { email: fromAddress, name: fromName },
        subject: 'Recibo do seu pagamento Semeia',
        content: [{ type: 'text/html', value: html }],
      }
      try {
        var res = $http.send({
          url: 'https://api.sendgrid.com/v3/mail/send',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          timeout: 15,
        })
        if (res.statusCode === 202 || res.statusCode === 200) {
          sent = true
        } else {
          console.log(
            '[sendgrid] erro status',
            res.statusCode,
            'para',
            email,
            'Recibo do seu pagamento Semeia',
          )
        }
      } catch (err) {
        console.log('[sendgrid] exceção:', err)
      }
    }
    return e.json(200, { sent: sent })
  } catch (err) {
    console.log('[emails] erro recibo:', err)
    return e.json(500, { error: 'erro ao enviar recibo' })
  }
})

// ---------------------------------------------------------------------------
// 4. Assinatura cancelada/expirada — disparado pelos hooks de pagamento.
//    Rota interna: POST /backend/v1/emails/subscription-canceled
//    Body: { user_id, reason: 'canceled' | 'expired', plan }
// ---------------------------------------------------------------------------
routerAdd('POST', '/backend/v1/emails/subscription-canceled', function (e) {
  try {
    var body = e.requestInfo().body || {}
    var userId = String(body.user_id || '')
    if (!userId) return e.json(400, { error: 'user_id obrigatório' })

    var userRec = null
    try {
      userRec = $app.findRecordById('users', userId)
    } catch (_) {
      return e.json(404, { error: 'usuário não encontrado' })
    }
    var email = userRec.email ? userRec.email() : ''
    if (!email) return e.json(200, { sent: false })
    var name = userRec.getString('name') || email.split('@')[0]
    var reason = String(body.reason || 'expired')
    var plan = String(body.plan || 'mensal')
    var planLabel = plan === 'anual' ? 'Anual' : 'Mensal'

    // --- inline: trimTrailingSlash ---
    var siteUrlRaw = $os.getenv('SITE_URL') || ''
    var siteUrl = siteUrlRaw
    while (siteUrl.length > 0 && siteUrl.charAt(siteUrl.length - 1) === '/') {
      siteUrl = siteUrl.substring(0, siteUrl.length - 1)
    }

    var isCanceled = reason === 'canceled'
    var title = isCanceled ? 'Assinatura cancelada' : 'Assinatura expirada'
    var intro = isCanceled
      ? 'Sua assinatura do Semeia foi cancelada, conforme solicitado. Você continuará com acesso até o fim do ciclo já pago.'
      : 'Sua assinatura do Semeia expirou. Para voltar a usar todos os recursos, reative agora.'

    var bodyHtml =
      '<p style="font-size:15px;line-height:1.6">Olá, <strong>' +
      name +
      '</strong>!</p>' +
      '<p style="font-size:15px;line-height:1.6">' +
      intro +
      '</p>' +
      '<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">' +
      '<tr><td style="padding:8px 0;color:#64748b">Plano anterior</td><td style="padding:8px 0;font-weight:600;text-align:right">' +
      planLabel +
      '</td></tr>' +
      '<tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Status</td><td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #e2e8f0">' +
      (isCanceled ? 'Cancelada' : 'Expirada') +
      '</td></tr>' +
      '</table>' +
      '<div style="text-align:center;margin:28px 0">' +
      '<a href="' +
      (siteUrl || '') +
      '/paywall" style="display:inline-block;background:#059669;color:#fff;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px">Reativar assinatura</a>' +
      '</div>' +
      '<p style="font-size:13px;color:#64748b">Sentiremos sua falta! Você pode reativar quando quiser e seus dados continuarão salvos.</p>'

    // --- inline: semiaTemplate ---
    var html =
      '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">' +
      '<div style="background:linear-gradient(135deg,#059669,#14b8a6);padding:24px;border-radius:16px 16px 0 0;text-align:center">' +
      '<h1 style="color:#fff;margin:0;font-size:22px">' +
      title +
      '</h1>' +
      '</div>' +
      '<div style="border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 16px 16px">' +
      bodyHtml +
      '<p style="font-size:12px;color:#94a3b8;margin-top:28px;text-align:center">' +
      'Semeia · Sistema Financeiro Pessoal<br/>' +
      'Recebeu este e-mail por ter uma conta no Semeia.' +
      '</p>' +
      '</div></div>'

    // --- inline: sendSemiaEmail ---
    var sent = false
    var apiKey = $os.getenv('SENDGRID_API_KEY') || ''
    if (!apiKey) {
      console.log('[sendgrid] SENDGRID_API_KEY ausente — email não enviado:', title + ' — Semeia')
    } else {
      // --- inline: parseFromEmail ---
      var rawFrom = $os.getenv('SENDGRID_FROM_EMAIL') || ''
      var fromAddress = rawFrom
      var fromName = 'Semeia'
      if (rawFrom) {
        var lt = rawFrom.indexOf('<')
        var gt = rawFrom.indexOf('>')
        if (lt >= 0 && gt > lt) {
          var maybeName = rawFrom.substring(0, lt).trim()
          if (maybeName) fromName = maybeName
          fromAddress = rawFrom.substring(lt + 1, gt).trim()
        } else if (rawFrom.indexOf('@') < 0) {
          fromAddress = 'noreply@semeia.finance'
        }
      }
      if (!fromAddress) fromAddress = 'noreply@semeia.finance'

      var payload = {
        personalizations: [{ to: [{ email: email }] }],
        from: { email: fromAddress, name: fromName },
        subject: title + ' — Semeia',
        content: [{ type: 'text/html', value: html }],
      }
      try {
        var res = $http.send({
          url: 'https://api.sendgrid.com/v3/mail/send',
          method: 'POST',
          headers: {
            Authorization: 'Bearer ' + apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          timeout: 15,
        })
        if (res.statusCode === 202 || res.statusCode === 200) {
          sent = true
        } else {
          console.log('[sendgrid] erro status', res.statusCode, 'para', email, title + ' — Semeia')
        }
      } catch (err) {
        console.log('[sendgrid] exceção:', err)
      }
    }
    return e.json(200, { sent: sent })
  } catch (err) {
    console.log('[emails] erro cancelado:', err)
    return e.json(500, { error: 'erro ao enviar email' })
  }
})

// ---------------------------------------------------------------------------
// 5. Cron diário — lembrete de pré-renovação (3 dias antes do vencimento)
//    Varre assinaturas ativas cujo expires_at está em 3 dias e dispara email.
// ---------------------------------------------------------------------------
cronAdd('subscription_emails_reminder', '0 8 * * *', function () {
  try {
    var now = new Date()
    var in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    var in3DaysStartIso = new Date(in3Days.getTime() - 60 * 60 * 1000).toISOString() // 1h de janela
    var in3DaysEndIso = in3Days.toISOString()

    var subs = []
    try {
      subs = $app.findRecordsByFilter(
        'subscriptions',
        "status = 'ativa' && expires_at != '' && expires_at >= {:start} && expires_at <= {:end}",
        'expires_at',
        500,
        0,
        { start: in3DaysStartIso, end: in3DaysEndIso },
      )
    } catch (err) {
      console.log('[emails cron] find falhou:', err)
    }

    // --- inline: trimTrailingSlash ---
    var siteUrlRaw = $os.getenv('SITE_URL') || ''
    var siteUrl = siteUrlRaw
    while (siteUrl.length > 0 && siteUrl.charAt(siteUrl.length - 1) === '/') {
      siteUrl = siteUrl.substring(0, siteUrl.length - 1)
    }

    for (var i = 0; i < subs.length; i++) {
      var sub = subs[i]
      var userId = sub.getString('user')
      var plan = sub.getString('plan') || 'mensal'
      var planLabel = plan === 'anual' ? 'Anual' : 'Mensal'
      var price = sub.getFloat('price') || (plan === 'anual' ? 119.99 : 11.99)
      var expiresAt = sub.getString('expires_at') || ''
      var cancelAtEnd = sub.getBool('cancel_at_period_end')

      // Não envia lembrete se já marcada para cancelar no fim do ciclo
      if (cancelAtEnd) continue

      var userRec = null
      try {
        userRec = $app.findRecordById('users', userId)
      } catch (_) {
        continue
      }
      var email = userRec.email ? userRec.email() : ''
      if (!email) continue
      var name = userRec.getString('name') || email.split('@')[0]

      // --- inline: formatDateLongPTBR ---
      var expiresText = ''
      if (expiresAt) {
        try {
          var d5 = new Date(expiresAt)
          if (!isNaN(d5.getTime())) {
            var months5 = [
              'janeiro',
              'fevereiro',
              'março',
              'abril',
              'maio',
              'junho',
              'julho',
              'agosto',
              'setembro',
              'outubro',
              'novembro',
              'dezembro',
            ]
            var day5 = d5.getDate()
            var dayStr5 = day5 < 10 ? '0' + day5 : '' + day5
            expiresText = dayStr5 + ' de ' + months5[d5.getMonth()] + ' de ' + d5.getFullYear()
          } else {
            expiresText = expiresAt
          }
        } catch (_) {
          expiresText = expiresAt
        }
      }

      var bodyHtml =
        '<p style="font-size:15px;line-height:1.6">Olá, <strong>' +
        name +
        '</strong>!</p>' +
        '<p style="font-size:15px;line-height:1.6">Sua assinatura Semeia Plano ' +
        planLabel +
        ' será renovada automaticamente em <strong>3 dias</strong>.</p>' +
        '<table style="width:100%;border-collapse:collapse;margin:20px 0;font-size:14px">' +
        '<tr><td style="padding:8px 0;color:#64748b">Plano</td><td style="padding:8px 0;font-weight:600;text-align:right">' +
        planLabel +
        '</td></tr>' +
        '<tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Valor</td><td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #e2e8f0">R$ ' +
        price.toFixed(2).replace('.', ',') +
        '</td></tr>' +
        '<tr><td style="padding:8px 0;color:#64748b;border-top:1px solid #e2e8f0">Renovação</td><td style="padding:8px 0;font-weight:600;text-align:right;border-top:1px solid #e2e8f0">' +
        expiresText +
        '</td></tr>' +
        '</table>' +
        '<p style="font-size:15px;line-height:1.6">Se quiser cancelar antes da renovação, acesse Configurações → Assinatura no painel.</p>' +
        '<div style="text-align:center;margin:28px 0">' +
        '<a href="' +
        (siteUrl || '') +
        '/configuracoes" style="display:inline-block;background:#059669;color:#fff;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:12px">Gerenciar assinatura</a>' +
        '</div>'

      // --- inline: semiaTemplate ---
      var templateTitle = 'Sua assinatura Semeia renova em 3 dias'
      var html =
        '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">' +
        '<div style="background:linear-gradient(135deg,#059669,#14b8a6);padding:24px;border-radius:16px 16px 0 0;text-align:center">' +
        '<h1 style="color:#fff;margin:0;font-size:22px">' +
        templateTitle +
        '</h1>' +
        '</div>' +
        '<div style="border:1px solid #e2e8f0;border-top:none;padding:28px;border-radius:0 0 16px 16px">' +
        bodyHtml +
        '<p style="font-size:12px;color:#94a3b8;margin-top:28px;text-align:center">Semeia · Sistema Financeiro Pessoal</p>' +
        '</div></div>'

      // --- inline: sendSemiaEmail (envio direto via SendGrid) ---
      var apiKey = $os.getenv('SENDGRID_API_KEY') || ''
      if (!apiKey) {
        console.log('[emails cron] SENDGRID_API_KEY ausente — lembrete não enviado')
        continue
      }
      // --- inline: parseFromEmail ---
      var rawFrom = $os.getenv('SENDGRID_FROM_EMAIL') || ''
      var fromAddress = rawFrom
      var fromName = 'Semeia'
      if (rawFrom) {
        var lt = rawFrom.indexOf('<')
        var gt = rawFrom.indexOf('>')
        if (lt >= 0 && gt > lt) {
          var maybeName = rawFrom.substring(0, lt).trim()
          if (maybeName) fromName = maybeName
          fromAddress = rawFrom.substring(lt + 1, gt).trim()
        } else if (rawFrom.indexOf('@') < 0) {
          fromAddress = 'noreply@semeia.finance'
        }
      }
      if (!fromAddress) fromAddress = 'noreply@semeia.finance'

      var payload = {
        personalizations: [{ to: [{ email: email }] }],
        from: { email: fromAddress, name: fromName },
        subject: 'Sua assinatura Semeia renova em 3 dias',
        content: [{ type: 'text/html', value: html }],
      }
      try {
        $http.send({
          url: 'https://api.sendgrid.com/v3/mail/send',
          method: 'POST',
          headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
          timeout: 15,
        })
      } catch (err) {
        console.log('[emails cron] erro envio lembrete:', err)
      }
    }
  } catch (err) {
    console.log('[emails cron] exceção:', err)
  }
})
