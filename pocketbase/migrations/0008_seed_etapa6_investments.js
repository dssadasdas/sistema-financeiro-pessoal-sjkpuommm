/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'caio.1997a@gmail.com')
    } catch (_) {
      return // usuário base ainda não existe
    }
    const userId = userRecord.id

    const col = app.findCollectionByNameOrId('investments')

    const now = new Date()
    const pad = (n) => (n < 10 ? '0' + n : '' + n)
    const dayIso = (year, month, day) =>
      '' + year + '-' + pad(month + 1) + '-' + pad(day) + ' 12:00:00.000Z'

    const ensureInvestment = (data) => {
      try {
        app.findFirstRecordByData('investments', 'name', data.name)
        return
      } catch (_) {}
      const rec = new Record(col)
      rec.set('user', userId)
      rec.set('type', data.type)
      rec.set('name', data.name)
      rec.set('symbol', data.symbol)
      rec.set('applied_value', data.applied_value)
      if (data.quantity !== undefined) rec.set('quantity', data.quantity)
      if (data.unit_price !== undefined) rec.set('unit_price', data.unit_price)
      if (data.current_price !== undefined) rec.set('current_price', data.current_price)
      if (data.application_date) rec.set('application_date', data.application_date)
      rec.set(
        'last_price_update',
        dayIso(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
      )
      app.save(rec)
    }

    // 1. Bitcoin (atualiza se já existe o seed anterior com preço antigo)
    ensureInvestment({
      type: 'bitcoin',
      name: 'Bitcoin',
      symbol: 'BTC',
      applied_value: 5000,
      quantity: 0.0125,
      unit_price: 400000,
      current_price: 480000,
      application_date: dayIso(2024, 5, 10),
    })

    // 2. Ethereum
    ensureInvestment({
      type: 'ethereum',
      name: 'Ethereum',
      symbol: 'ETH',
      applied_value: 3000,
      quantity: 0.6,
      unit_price: 5000,
      current_price: 18500,
      application_date: dayIso(2024, 7, 15),
    })

    // 3. CDB 100% CDI
    ensureInvestment({
      type: 'cdi100',
      name: 'CDB 100% CDI Liquidez Diária',
      symbol: 'CDI',
      applied_value: 10000,
      current_price: 10940.5,
      application_date: dayIso(2024, 5, 1),
    })

    // 4. Ação PETR4
    ensureInvestment({
      type: 'acao',
      name: 'Petrobras PN',
      symbol: 'PETR4',
      applied_value: 2400,
      quantity: 100,
      unit_price: 24.0,
      current_price: 38.5,
      application_date: dayIso(2024, 2, 20),
    })

    // 5. FII HGLG11
    ensureInvestment({
      type: 'fii',
      name: 'CSHG Logística FII',
      symbol: 'HGLG11',
      applied_value: 1200,
      quantity: 10,
      unit_price: 120.0,
      current_price: 165.8,
      application_date: dayIso(2024, 0, 8),
    })
  },
  (app) => {},
)
