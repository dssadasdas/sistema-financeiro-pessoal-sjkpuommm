cronAdd('subscription_expiry', '*/10 * * * *', () => {
  try {
    const nowIso = new Date().toISOString()
    const expiredSubs = $app.findRecordsByFilter(
      'subscriptions',
      "admin_released = false && status = 'ativa' && expires_at != '' && expires_at < '" +
        nowIso +
        "'",
      '',
      500,
      0,
    )

    for (let i = 0; i < expiredSubs.length; i++) {
      const sub = expiredSubs[i]
      sub.set('status', 'bloqueada')
      $app.save(sub)
    }
  } catch (err) {
    console.log('Erro cron subscription_expiry:', err)
  }
})
