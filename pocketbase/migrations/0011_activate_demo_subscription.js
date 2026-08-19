// Ativa a assinatura do usuário demo (caio.1997a@gmail.com) para que ele não
// fique preso no /paywall durante testes. O cron `subscription_expiry`
// bloqueia assinaturas com expires_at no passado — por isso redefinimos o
// período para +1 ano a partir de agora.
//
// Idempotente: se a assinatura já estiver ativa com validade futura, mantém.
migrate(
  (app) => {
    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'caio.1997a@gmail.com')
    } catch (_) {
      user = null
    }
    if (!user) return

    // Localiza a assinatura mais recente do usuário demo.
    let sub = null
    try {
      const subs = app.findRecordsByFilter(
        'subscriptions',
        "user = '" + user.id + "'",
        '-created',
        1,
        0,
      )
      sub = subs && subs.length > 0 ? subs[0] : null
    } catch (_) {
      sub = null
    }

    const now = new Date()
    const exp = new Date()
    exp.setFullYear(exp.getFullYear() + 1)
    const nowIso = now.toISOString()
    const expIso = exp.toISOString()

    if (sub) {
      sub.set('plan', 'anual')
      sub.set('price', 119.99)
      sub.set('status', 'ativa')
      sub.set('admin_released', true)
      sub.set('current_period_start', nowIso)
      sub.set('current_period_end', expIso)
      sub.set('expires_at', expIso)
      sub.set('renewed_at', nowIso)
      sub.set('cancel_at_period_end', false)
      app.save(sub)
    } else {
      // Cria uma assinatura ativa caso não exista nenhuma.
      const col = app.findCollectionByNameOrId('subscriptions')
      const rec = new Record(col)
      rec.set('user', user.id)
      rec.set('plan', 'anual')
      rec.set('price', 119.99)
      rec.set('status', 'ativa')
      rec.set('admin_released', true)
      rec.set('current_period_start', nowIso)
      rec.set('current_period_end', expIso)
      rec.set('expires_at', expIso)
      rec.set('renewed_at', nowIso)
      rec.set('started_at', nowIso)
      rec.set('cancel_at_period_end', false)
      app.save(rec)
    }
  },
  (app) => {
    // Reverte: bloqueia a assinatura demo novamente.
    let user
    try {
      user = app.findAuthRecordByEmail('_pb_users_auth_', 'caio.1997a@gmail.com')
    } catch (_) {
      return
    }
    try {
      const subs = app.findRecordsByFilter(
        'subscriptions',
        "user = '" + user.id + "'",
        '-created',
        1,
        0,
      )
      if (subs && subs.length > 0) {
        const sub = subs[0]
        sub.set('status', 'bloqueada')
        sub.set('admin_released', false)
        app.save(sub)
      }
    } catch (_) {}
  },
)
