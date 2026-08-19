/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const users = app.findCollectionByNameOrId('_pb_users_auth_')
    const email = 'caio.1997a@gmail.com'

    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', email)
    } catch (_) {
      userRecord = new Record(users)
      userRecord.setEmail(email)
      userRecord.setPassword('Skip@Pass')
      userRecord.setVerified(true)
      userRecord.set('name', 'Caio')
      app.save(userRecord)
    }

    const userId = userRecord.id

    // 1. Subscription ativa (anual, admin_released = true)
    const subscriptions = app.findCollectionByNameOrId('subscriptions')
    try {
      app.findFirstRecordByData('subscriptions', 'user', userId)
    } catch (_) {
      const sub = new Record(subscriptions)
      sub.set('user', userId)
      sub.set('plan', 'anual')
      sub.set('price', 119.99)
      sub.set('status', 'ativa')
      sub.set('started_at', '2025-01-01 00:00:00.000Z')
      sub.set('renewed_at', '2025-01-01 00:00:00.000Z')
      sub.set('expires_at', '2026-01-01 00:00:00.000Z')
      sub.set('admin_released', true)
      app.save(sub)
    }

    // 2. Accounts: Nubank Conta Corrente & Itaú Reserva
    const accounts = app.findCollectionByNameOrId('accounts')
    let nuAccount
    try {
      nuAccount = app.findFirstRecordByData('accounts', 'user', userId)
    } catch (_) {
      nuAccount = new Record(accounts)
      nuAccount.set('user', userId)
      nuAccount.set('name', 'Nubank Principal')
      nuAccount.set('type', 'Conta corrente')
      nuAccount.set('bank', 'Nubank')
      nuAccount.set('opening_balance', 4500.0)
      nuAccount.set('color', '#820ad1')
      app.save(nuAccount)

      const itauAccount = new Record(accounts)
      itauAccount.set('user', userId)
      itauAccount.set('name', 'Itaú Reserva')
      itauAccount.set('type', 'Conta poupança')
      itauAccount.set('bank', 'Itaú')
      itauAccount.set('opening_balance', 12000.0)
      itauAccount.set('color', '#EC7000')
      app.save(itauAccount)
    }

    // 3. Credit Card: Nubank Ultravioleta
    const creditCards = app.findCollectionByNameOrId('credit_cards')
    let nuCard
    try {
      nuCard = app.findFirstRecordByData('credit_cards', 'user', userId)
    } catch (_) {
      nuCard = new Record(creditCards)
      nuCard.set('user', userId)
      nuCard.set('name', 'Nubank Ultravioleta')
      nuCard.set('bank', 'Nubank')
      nuCard.set('limit', 15000.0)
      nuCard.set('closing_day', 15)
      nuCard.set('due_day', 22)
      nuCard.set('last_four', '8824')
      nuCard.set('brand', 'Mastercard')
      app.save(nuCard)
    }

    // 4. Sample Transactions
    const transactions = app.findCollectionByNameOrId('transactions')
    try {
      app.findFirstRecordByData('transactions', 'user', userId)
    } catch (_) {
      const today = new Date().toISOString().split('T')[0]

      // Salário
      const t1 = new Record(transactions)
      t1.set('user', userId)
      t1.set('description', 'Salário Mensal Tech Corp')
      t1.set('value', 8500.0)
      t1.set('category', 'Salário')
      t1.set('date', `${today} 09:00:00.000Z`)
      t1.set('payment_method', 'PIX')
      t1.set('status', 'realizado')
      t1.set('type', 'receita')
      t1.set('account', nuAccount.id)
      t1.set('source', 'manual')
      t1.set('paid_at', `${today} 09:00:00.000Z`)
      app.save(t1)

      // Mercado
      const t2 = new Record(transactions)
      t2.set('user', userId)
      t2.set('description', 'Supermercado Pão de Açúcar')
      t2.set('value', 486.5)
      t2.set('category', 'Alimentação')
      t2.set('date', `${today} 14:30:00.000Z`)
      t2.set('payment_method', 'Débito')
      t2.set('status', 'realizado')
      t2.set('type', 'despesa')
      t2.set('account', nuAccount.id)
      t2.set('source', 'manual')
      t2.set('paid_at', `${today} 14:30:00.000Z`)
      app.save(t2)

      // iFood
      const t3 = new Record(transactions)
      t3.set('user', userId)
      t3.set('description', 'iFood Jantar Sushi')
      t3.set('value', 112.9)
      t3.set('category', 'Alimentação')
      t3.set('date', `${today} 20:15:00.000Z`)
      t3.set('payment_method', 'Crédito')
      t3.set('status', 'realizado')
      t3.set('type', 'despesa')
      t3.set('credit_card', nuCard.id)
      t3.set('source', 'manual')
      app.save(t3)

      // Conta de Luz Neoenergia Coelba (Pendente)
      const t4 = new Record(transactions)
      t4.set('user', userId)
      t4.set('description', 'Neoenergia Coelba - Luz Residencial')
      t4.set('value', 215.4)
      t4.set('category', 'Luz')
      t4.set('date', `${today} 10:00:00.000Z`)
      t4.set('payment_method', 'Boleto')
      t4.set('status', 'pendente')
      t4.set('type', 'despesa')
      t4.set('account', nuAccount.id)
      t4.set('source', 'manual')
      app.save(t4)
    }

    // 5. Goal: Reserva de Emergência
    const goals = app.findCollectionByNameOrId('goals')
    const goalContribs = app.findCollectionByNameOrId('goal_contributions')
    try {
      app.findFirstRecordByData('goals', 'user', userId)
    } catch (_) {
      const g1 = new Record(goals)
      g1.set('user', userId)
      g1.set('name', 'Reserva de Emergência 6 Meses')
      g1.set('target_value', 30000.0)
      g1.set('color', '#0E9F6E')
      g1.set('icon', 'ShieldCheck')
      app.save(g1)

      const c1 = new Record(goalContribs)
      c1.set('goal', g1.id)
      c1.set('value', 12000.0)
      c1.set('date', '2025-01-10 10:00:00.000Z')
      c1.set('note', 'Aporte inicial reserva')
      app.save(c1)

      const g2 = new Record(goals)
      g2.set('user', userId)
      g2.set('name', 'Viagem Europa 2026')
      g2.set('target_value', 18000.0)
      g2.set('color', '#2563EB')
      g2.set('icon', 'Plane')
      app.save(g2)

      const c2 = new Record(goalContribs)
      c2.set('goal', g2.id)
      c2.set('value', 4500.0)
      c2.set('date', '2025-02-05 10:00:00.000Z')
      c2.set('note', 'Economia mensal')
      app.save(c2)
    }

    // 6. Budget
    const budgets = app.findCollectionByNameOrId('budgets')
    try {
      app.findFirstRecordByData('budgets', 'user', userId)
    } catch (_) {
      const currentMonth = new Date().toISOString().slice(0, 7) // "YYYY-MM"
      const b1 = new Record(budgets)
      b1.set('user', userId)
      b1.set('category', 'Alimentação')
      b1.set('limit_value', 1800.0)
      b1.set('month', currentMonth)
      app.save(b1)

      const b2 = new Record(budgets)
      b2.set('user', userId)
      b2.set('category', 'Transporte')
      b2.set('limit_value', 600.0)
      b2.set('month', currentMonth)
      app.save(b2)

      const b3 = new Record(budgets)
      b3.set('user', userId)
      b3.set('category', 'Lazer')
      b3.set('limit_value', 700.0)
      b3.set('month', currentMonth)
      app.save(b3)
    }

    // 7. Recurrence: Aluguel
    const recurrences = app.findCollectionByNameOrId('recurrences')
    try {
      app.findFirstRecordByData('recurrences', 'user', userId)
    } catch (_) {
      const rec = new Record(recurrences)
      rec.set('user', userId)
      rec.set('description', 'Aluguel Apartamento')
      rec.set('value', 2200.0)
      rec.set('type', 'despesa')
      rec.set('category', 'Moradia')
      rec.set('frequency', 'mensal')
      rec.set('due_day', 10)
      rec.set('payment_method', 'PIX')
      rec.set('account', nuAccount.id)
      rec.set('active', true)
      rec.set('start_date', '2025-01-01 00:00:00.000Z')
      app.save(rec)
    }

    // 8. Investments: CDI 100% & Bitcoin
    const investments = app.findCollectionByNameOrId('investments')
    try {
      app.findFirstRecordByData('investments', 'user', userId)
    } catch (_) {
      const cdi = new Record(investments)
      cdi.set('user', userId)
      cdi.set('type', 'cdi100')
      cdi.set('symbol', 'CDI')
      cdi.set('name', 'CDB 100% CDI Liquidez Diária')
      cdi.set('applied_value', 10000.0)
      cdi.set('application_date', '2024-06-01 00:00:00.000Z')
      cdi.set('current_price', 10940.5)
      cdi.set('last_price_update', '2025-05-01 00:00:00.000Z')
      app.save(cdi)

      const btc = new Record(investments)
      btc.set('user', userId)
      btc.set('type', 'bitcoin')
      btc.set('symbol', 'BTC')
      btc.set('name', 'Bitcoin')
      btc.set('applied_value', 5000.0)
      btc.set('quantity', 0.0125)
      btc.set('unit_price', 400000.0)
      btc.set('current_price', 480000.0)
      btc.set('last_price_update', '2025-05-01 00:00:00.000Z')
      app.save(btc)
    }

    // 9. Categorization Rules
    const categorizationRules = app.findCollectionByNameOrId('categorization_rules')
    try {
      app.findFirstRecordByData('categorization_rules', 'user', userId)
    } catch (_) {
      const rules = [
        { keyword: 'COELBA', category: 'Luz' },
        { keyword: 'EMBASA', category: 'Água' },
        { keyword: 'iFood', category: 'Alimentação' },
        { keyword: 'Uber', category: 'Transporte' },
        { keyword: 'Netflix', category: 'Assinaturas' },
        { keyword: 'Spotify', category: 'Assinaturas' },
        { keyword: 'Posto', category: 'Combustível' },
      ]
      for (const r of rules) {
        const cr = new Record(categorizationRules)
        cr.set('user', userId)
        cr.set('keyword', r.keyword)
        cr.set('category', r.category)
        cr.set('is_learned', false)
        app.save(cr)
      }
    }

    // 10. Bills
    const bills = app.findCollectionByNameOrId('bills')
    try {
      app.findFirstRecordByData('bills', 'user', userId)
    } catch (_) {
      const b1 = new Record(bills)
      b1.set('user', userId)
      b1.set('description', 'Internet Fibra 600MB')
      b1.set('value', 129.9)
      b1.set('due_date', '2025-05-18 00:00:00.000Z')
      b1.set('category', 'Assinaturas')
      b1.set('status', 'não_pago')
      b1.set('account', nuAccount.id)
      b1.set('recurring', true)
      app.save(b1)
    }
  },
  (app) => {},
)
