cronAdd('crypto_prices', '@hourly', () => {
  try {
    const cryptoInvestments = $app.findRecordsByFilter(
      'investments',
      "type = 'bitcoin' || type = 'ethereum'",
      '',
      500,
      0,
    )

    if (cryptoInvestments.length === 0) return

    // Busca cotações públicas Binance (sem chave)
    // BTCUSDT
    let btcPriceBRL = 0
    let ethPriceBRL = 0

    try {
      const btcRes = $http.send({
        url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCBRL',
        method: 'GET',
        timeout: 10,
      })
      if (btcRes.statusCode === 200 && btcRes.json && btcRes.json.price) {
        btcPriceBRL = parseFloat(btcRes.json.price)
      } else {
        // Tenta BTCUSDT * 5.70 se BTCBRL indisponível
        const btcUsdtRes = $http.send({
          url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
          method: 'GET',
          timeout: 10,
        })
        if (btcUsdtRes.statusCode === 200 && btcUsdtRes.json && btcUsdtRes.json.price) {
          btcPriceBRL = parseFloat(btcUsdtRes.json.price) * 5.7
        }
      }
    } catch (_) {}

    try {
      const ethRes = $http.send({
        url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHBRL',
        method: 'GET',
        timeout: 10,
      })
      if (ethRes.statusCode === 200 && ethRes.json && ethRes.json.price) {
        ethPriceBRL = parseFloat(ethRes.json.price)
      } else {
        const ethUsdtRes = $http.send({
          url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT',
          method: 'GET',
          timeout: 10,
        })
        if (ethUsdtRes.statusCode === 200 && ethUsdtRes.json && ethUsdtRes.json.price) {
          ethPriceBRL = parseFloat(ethUsdtRes.json.price) * 5.7
        }
      }
    } catch (_) {}

    const nowIso = new Date().toISOString()

    for (let i = 0; i < cryptoInvestments.length; i++) {
      const inv = cryptoInvestments[i]
      const type = inv.getString('type')
      const qty = inv.getFloat('quantity') || 0

      if (type === 'bitcoin' && btcPriceBRL > 0) {
        inv.set('current_price', btcPriceBRL)
        inv.set('last_price_update', nowIso)
        $app.save(inv)
      } else if (type === 'ethereum' && ethPriceBRL > 0) {
        inv.set('current_price', ethPriceBRL)
        inv.set('last_price_update', nowIso)
        $app.save(inv)
      }
    }
  } catch (err) {
    console.log('Erro cron crypto_prices:', err)
  }
})

// Endpoint on-demand para atualizar cotações de cripto na hora
routerAdd(
  'POST',
  '/backend/v1/investments/refresh-crypto',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      let btcPriceBRL = 0
      let ethPriceBRL = 0

      try {
        const btcRes = $http.send({
          url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCBRL',
          method: 'GET',
          timeout: 10,
        })
        if (btcRes.statusCode === 200 && btcRes.json && btcRes.json.price) {
          btcPriceBRL = parseFloat(btcRes.json.price)
        } else {
          const btcUsdtRes = $http.send({
            url: 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT',
            method: 'GET',
            timeout: 10,
          })
          if (btcUsdtRes.statusCode === 200 && btcUsdtRes.json && btcUsdtRes.json.price) {
            btcPriceBRL = parseFloat(btcUsdtRes.json.price) * 5.7
          }
        }
      } catch (_) {}

      try {
        const ethRes = $http.send({
          url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHBRL',
          method: 'GET',
          timeout: 10,
        })
        if (ethRes.statusCode === 200 && ethRes.json && ethRes.json.price) {
          ethPriceBRL = parseFloat(ethRes.json.price)
        } else {
          const ethUsdtRes = $http.send({
            url: 'https://api.binance.com/api/v3/ticker/price?symbol=ETHUSDT',
            method: 'GET',
            timeout: 10,
          })
          if (ethUsdtRes.statusCode === 200 && ethUsdtRes.json && ethUsdtRes.json.price) {
            ethPriceBRL = parseFloat(ethUsdtRes.json.price) * 5.7
          }
        }
      } catch (_) {}

      const cryptoInvestments = $app.findRecordsByFilter(
        'investments',
        "user = '" + userId + "' && (type = 'bitcoin' || type = 'ethereum')",
        '',
        100,
        0,
      )

      const nowIso = new Date().toISOString()
      for (let i = 0; i < cryptoInvestments.length; i++) {
        const inv = cryptoInvestments[i]
        const type = inv.getString('type')
        if (type === 'bitcoin' && btcPriceBRL > 0) {
          inv.set('current_price', btcPriceBRL)
          inv.set('last_price_update', nowIso)
          $app.save(inv)
        } else if (type === 'ethereum' && ethPriceBRL > 0) {
          inv.set('current_price', ethPriceBRL)
          inv.set('last_price_update', nowIso)
          $app.save(inv)
        }
      }

      return e.json(200, {
        btc: btcPriceBRL,
        eth: ethPriceBRL,
        updated_at: nowIso,
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao atualizar cotações' })
    }
  },
  $apis.requireAuth(),
)
