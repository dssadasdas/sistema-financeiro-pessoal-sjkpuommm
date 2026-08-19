/// <reference path="../pb_data/types.d.ts" />
// Cron: bloqueia assinaturas expiradas (status ativa + expires_at < agora).
// Também envia email de "assinatura expirada" via rota interna de emails
// (subscription_emails.js) — SendGrid se configurado.
//
// NOTA: o JSVM do PocketBase executa callbacks em um pool de VMs separado,
// então funções top-level NÃO são acessíveis dentro de callbacks. Toda a
// lógica deve estar inline dentro do callback.

cronAdd('subscription_expiry', '*/10 * * * *', () => {
  try {
    const nowIso = new Date().toISOString()
    const expiredSubs = $app.findRecordsByFilter(
      'subscriptions',
      "admin_released = true && status = 'ativa' && expires_at != '' && expires_at < '" +
        nowIso +
        "'",
      '',
      500,
      0,
    )

    // inline: remove barras finais de uma URL (sem regex)
    let baseUrlRaw = $os.getenv('PB_INSTANCE_URL') || $os.getenv('SITE_URL') || ''
    let baseUrl = baseUrlRaw
    while (baseUrl.length > 0 && baseUrl.charAt(baseUrl.length - 1) === '/') {
      baseUrl = baseUrl.substring(0, baseUrl.length - 1)
    }

    for (let i = 0; i < expiredSubs.length; i++) {
      const sub = expiredSubs[i]
      const wasCanceled = sub.getBool('cancel_at_period_end')
      sub.set('status', 'bloqueada')
      sub.set('admin_released', false)
      sub.set('cancel_at_period_end', false)
      $app.save(sub)

      // Email de assinatura expirada/cancelada
      const uid = sub.getString('user')
      const plan = sub.getString('plan') || 'mensal'
      try {
        $http.send({
          url: baseUrl + '/backend/v1/emails/subscription-canceled',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: uid,
            reason: wasCanceled ? 'canceled' : 'expired',
            plan: plan,
          }),
          timeout: 10,
        })
      } catch (_) {}
    }
  } catch (err) {
    console.log('Erro cron subscription_expiry:', err)
  }
})
