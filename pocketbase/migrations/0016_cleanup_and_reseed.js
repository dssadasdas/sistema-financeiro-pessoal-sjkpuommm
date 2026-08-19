/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // ----------------------------------------------------------------
    // 0. Resolve usuário demo (NÃO deleta o usuário nem a subscription)
    // ----------------------------------------------------------------
    let userRecord
    try {
      userRecord = app.findAuthRecordByEmail('_pb_users_auth_', 'caio.1997a@gmail.com')
    } catch (_) {
      return // usuário base ainda não existe — nada a fazer
    }
    const userId = userRecord.id

    // ----------------------------------------------------------------
    // 1. DELETA todos os dados do usuário demo nas coleções de finanças
    //    (mantém usuário + subscription intactos)
    // ----------------------------------------------------------------
    const collectionsToClean = [
      'transactions',
      'invoice_items',
      'invoices',
      'installments',
      'bills',
      'recurring_bills',
      'recurrences',
      'goal_contributions',
      'goals',
      'budgets',
      'investments',
      'categorization_rules',
      'credit_cards',
      'accounts',
    ]

    for (let i = 0; i < collectionsToClean.length; i++) {
      const colName = collectionsToClean[i]
      if (!app.hasTable(colName)) continue
      // Limpa todos os registros deste usuário via raw SQL (mais rápido e seguro)
      try {
        app
          .db()
          .newQuery('DELETE FROM ' + colName + ' WHERE user = {:uid}')
          .bind({ uid: userId })
          .execute()
      } catch (e) {
        console.log('Aviso ao limpar ' + colName + ':', e)
      }
    }
    // Limpa também invoice_items órfãos (não têm campo user; limpamos tudo do usuário via invoices)
    // já coberto pois invoice_items é limpo acima? invoice_items não tem coluna user — tratamos via invoice
    if (app.hasTable('invoice_items')) {
      // todos os invoice_items vinculados a invoices deste usuário já foram deletados junto
      // mas pode haver órfãos de invoices que já não existem — limpa tudo vinculado a invoices deste user
      try {
        app
          .db()
          .newQuery(
            'DELETE FROM invoice_items WHERE invoice IN (SELECT id FROM invoices WHERE user = {:uid})',
          )
          .bind({ uid: userId })
          .execute()
      } catch (_) {}
    }
    // Limpa goal_contributions vinculados a goals deste usuário (goal_contributions não tem user)
    if (app.hasTable('goal_contributions')) {
      try {
        app
          .db()
          .newQuery(
            'DELETE FROM goal_contributions WHERE goal IN (SELECT id FROM goals WHERE user = {:uid})',
          )
          .bind({ uid: userId })
          .execute()
      } catch (_) {}
    }

    // ----------------------------------------------------------------
    // 2. Helpers de data (usa mês corrente real)
    // ----------------------------------------------------------------
    const now = new Date()
    const currentYear = now.getUTCFullYear()
    const currentMonth = now.getUTCMonth() // 0-11
    const pad = (n) => (n < 10 ? '0' + n : '' + n)
    const ym = (y, m) => '' + y + '-' + pad(m + 1)
    const currentMonthStr = ym(currentYear, currentMonth)
    const prevMonthDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1))
    const prevMonthYear = prevMonthDate.getUTCFullYear()
    const prevMonthIdx = prevMonthDate.getUTCMonth()
    const prevMonthStr = ym(prevMonthYear, prevMonthIdx)

    const dayIso = (year, monthIdx, day) =>
      '' + year + '-' + pad(monthIdx + 1) + '-' + pad(day) + ' 12:00:00.000Z'

    const isoDate = (year, monthIdx, day) => '' + year + '-' + pad(monthIdx + 1) + '-' + pad(day)

    // ----------------------------------------------------------------
    // 3. Coleções
    // ----------------------------------------------------------------
    const accountsCol = app.findCollectionByNameOrId('accounts')
    const cardsCol = app.findCollectionByNameOrId('credit_cards')
    const invoicesCol = app.findCollectionByNameOrId('invoices')
    const invoiceItemsCol = app.findCollectionByNameOrId('invoice_items')
    const transactionsCol = app.findCollectionByNameOrId('transactions')
    const billsCol = app.findCollectionByNameOrId('bills')
    const recurringBillsCol = app.findCollectionByNameOrId('recurring_bills')
    const recurrencesCol = app.findCollectionByNameOrId('recurrences')
    const installmentsCol = app.findCollectionByNameOrId('installments')
    const budgetsCol = app.findCollectionByNameOrId('budgets')
    const goalsCol = app.findCollectionByNameOrId('goals')
    const goalContribsCol = app.findCollectionByNameOrId('goal_contributions')
    const investmentsCol = app.findCollectionByNameOrId('investments')
    const rulesCol = app.findCollectionByNameOrId('categorization_rules')

    // ----------------------------------------------------------------
    // 4. Contas (2)
    // ----------------------------------------------------------------
    const nuAccount = new Record(accountsCol)
    nuAccount.set('user', userId)
    nuAccount.set('name', 'Nubank Principal')
    nuAccount.set('type', 'Conta corrente')
    nuAccount.set('bank', 'Nubank')
    nuAccount.set('opening_balance', 5000.0)
    nuAccount.set('color', '#820AD1')
    app.save(nuAccount)

    const caixaAccount = new Record(accountsCol)
    caixaAccount.set('user', userId)
    caixaAccount.set('name', 'Poupança Caixa')
    caixaAccount.set('type', 'Conta poupança')
    caixaAccount.set('bank', 'Caixa')
    caixaAccount.set('opening_balance', 12000.0)
    caixaAccount.set('color', '#0066A1')
    app.save(caixaAccount)

    // ----------------------------------------------------------------
    // 5. Cartões (2)
    // ----------------------------------------------------------------
    const nuCard = new Record(cardsCol)
    nuCard.set('user', userId)
    nuCard.set('name', 'Nubank Ultravioleta')
    nuCard.set('bank', 'Nubank')
    nuCard.set('limit', 8000.0)
    nuCard.set('closing_day', 15)
    nuCard.set('due_day', 22)
    nuCard.set('last_four', '8824')
    nuCard.set('brand', 'Mastercard')
    app.save(nuCard)

    const itauCard = new Record(cardsCol)
    itauCard.set('user', userId)
    itauCard.set('name', 'Itaú Personnalité')
    itauCard.set('bank', 'Itaú')
    itauCard.set('limit', 5000.0)
    itauCard.set('closing_day', 20)
    itauCard.set('due_day', 28)
    itauCard.set('last_four', '5678')
    itauCard.set('brand', 'Visa')
    app.save(itauCard)

    // ----------------------------------------------------------------
    // 6. Transações do mês corrente na conta Nubank Principal
    // ----------------------------------------------------------------
    const createAccountTx = (desc, val, cat, day, method, status, type, account) => {
      const tx = new Record(transactionsCol)
      tx.set('user', userId)
      tx.set('description', desc)
      tx.set('value', val)
      tx.set('category', cat)
      tx.set('date', dayIso(currentYear, currentMonth, day))
      tx.set('payment_method', method)
      tx.set('status', status)
      tx.set('type', type)
      tx.set('account', account)
      tx.set('source', 'manual')
      if (status === 'realizado') {
        tx.set('paid_at', dayIso(currentYear, currentMonth, day))
      }
      app.save(tx)
    }

    // Salário
    createAccountTx(
      'Salário Tech Corp',
      8500.0,
      'Salário',
      5,
      'PIX',
      'realizado',
      'receita',
      nuAccount.id,
    )
    // Supermercado Pão de Açúcar
    createAccountTx(
      'Supermercado Pão de Açúcar',
      486.5,
      'Alimentação',
      8,
      'Débito',
      'realizado',
      'despesa',
      nuAccount.id,
    )
    // iFood Jantar Sushi (Crédito, vinculado ao Nubank Ultravioleta)
    {
      const tx = new Record(transactionsCol)
      tx.set('user', userId)
      tx.set('description', 'iFood Jantar Sushi')
      tx.set('value', 112.9)
      tx.set('category', 'Alimentação')
      tx.set('date', dayIso(currentYear, currentMonth, 12))
      tx.set('payment_method', 'Crédito')
      tx.set('status', 'realizado')
      tx.set('type', 'despesa')
      tx.set('credit_card', nuCard.id)
      tx.set('source', 'manual')
      tx.set('paid_at', dayIso(currentYear, currentMonth, 12))
      app.save(tx)
    }
    // Neoenergia Coelba Luz (Boleto, pendente)
    createAccountTx(
      'Neoenergia Coelba Luz',
      215.4,
      'Luz',
      15,
      'Boleto',
      'pendente',
      'despesa',
      nuAccount.id,
    )
    // Posto Shell
    createAccountTx(
      'Posto Shell',
      230.0,
      'Combustível',
      18,
      'Débito',
      'realizado',
      'despesa',
      nuAccount.id,
    )
    // Farmácia Drogasil
    createAccountTx(
      'Farmácia Drogasil',
      89.9,
      'Saúde',
      20,
      'Débito',
      'realizado',
      'despesa',
      nuAccount.id,
    )

    // ----------------------------------------------------------------
    // 7. Faturas + itens + transações de cartão
    // ----------------------------------------------------------------
    const createInvoiceWithItems = (card, refMonth, dueDay, items, expectedTotal) => {
      const invoice = new Record(invoicesCol)
      invoice.set('user', userId)
      invoice.set('credit_card', card.id)
      invoice.set('reference', refMonth)
      invoice.set('closing_date', dayIso(currentYear, currentMonth, 15))
      invoice.set('due_date', dayIso(currentYear, currentMonth, dueDay))
      invoice.set('total', expectedTotal)
      invoice.set('status', 'aberta')
      app.save(invoice)

      for (let i = 0; i < items.length; i++) {
        const it = items[i]
        const item = new Record(invoiceItemsCol)
        item.set('invoice', invoice.id)
        item.set('description', it.desc)
        item.set('value', it.val)
        item.set('category', it.cat)
        item.set('date', dayIso(currentYear, currentMonth, it.day))
        item.set('installments', it.inst || '')
        item.set('is_imported', false)
        app.save(item)

        // item de fatura também gera transação correspondente
        const tx = new Record(transactionsCol)
        tx.set('user', userId)
        tx.set('description', it.desc)
        tx.set('value', it.val)
        tx.set('category', it.cat)
        tx.set('date', dayIso(currentYear, currentMonth, it.day))
        tx.set('payment_method', 'Crédito')
        tx.set('status', 'realizado')
        tx.set('type', 'despesa')
        tx.set('credit_card', card.id)
        tx.set('source', 'manual')
        tx.set('paid_at', dayIso(currentYear, currentMonth, it.day))
        app.save(tx)
      }
      return invoice
    }

    // Fatura Nubank Ultravioleta (R$ 1.789,30 — 8 itens)
    createInvoiceWithItems(
      nuCard,
      currentMonthStr,
      22,
      [
        { day: 2, desc: 'iFood Refeição', cat: 'Alimentação', val: 89.9, inst: '' },
        { day: 5, desc: 'Netflix Assinatura', cat: 'Assinaturas', val: 55.9, inst: '1/1' },
        { day: 8, desc: 'Posto Shell Combustível', cat: 'Combustível', val: 350.0, inst: '' },
        { day: 10, desc: 'Supermercado Pão de Açúcar', cat: 'Alimentação', val: 620.5, inst: '' },
        { day: 12, desc: 'Amazon Curso Online', cat: 'Educação', val: 297.0, inst: '3/12' },
        { day: 15, desc: 'Drogasil Farmácia', cat: 'Saúde', val: 142.7, inst: '' },
        { day: 18, desc: 'Uber Transporte', cat: 'Transporte', val: 184.0, inst: '' },
        { day: 20, desc: 'Loja Riachuelo Roupas', cat: 'Compras', val: 49.3, inst: '2/6' },
      ],
      1789.3,
    )

    // Fatura Itaú Personnalité (R$ 1.199,00 — 6 itens)
    createInvoiceWithItems(
      itauCard,
      currentMonthStr,
      28,
      [
        { day: 3, desc: 'Spotify Premium', cat: 'Assinaturas', val: 21.9, inst: '1/1' },
        { day: 6, desc: 'Cinemark Ingressos', cat: 'Lazer', val: 78.0, inst: '' },
        { day: 9, desc: 'Mercado Livre Eletrônicos', cat: 'Compras', val: 459.9, inst: '4/10' },
        { day: 11, desc: 'Neoenergia Coelba Luz', cat: 'Luz', val: 215.4, inst: '' },
        { day: 14, desc: 'EMBASA Água', cat: 'Água', val: 89.8, inst: '' },
        { day: 17, desc: 'Restaurante Outback', cat: 'Alimentação', val: 334.0, inst: '' },
      ],
      1199.0,
    )

    // ----------------------------------------------------------------
    // 8. Contas a pagar (3)
    // ----------------------------------------------------------------
    const createBill = (desc, val, dueDate, cat, status, recurring) => {
      const b = new Record(billsCol)
      b.set('user', userId)
      b.set('description', desc)
      b.set('value', val)
      b.set('due_date', dueDate)
      b.set('category', cat)
      b.set('status', status)
      b.set('type', 'pagar')
      b.set('account', nuAccount.id)
      b.set('recurring', !!recurring)
      app.save(b)
    }

    // Internet Fibra 600MB — dia 18 do mês corrente, Assinaturas, não_pago, recorrente
    createBill(
      'Internet Fibra 600MB',
      129.9,
      dayIso(currentYear, currentMonth, 18),
      'Assinaturas',
      'não_pago',
      true,
    )
    // Aluguel Apartamento — dia 10 do mês corrente, Moradia, não_pago, não recorrente
    createBill(
      'Aluguel Apartamento',
      2200.0,
      dayIso(currentYear, currentMonth, 10),
      'Moradia',
      'não_pago',
      false,
    )
    // Seguro Auto — dia 5 do mês anterior (vencida), Seguros, não_pago
    createBill(
      'Seguro Auto',
      340.0,
      dayIso(prevMonthYear, prevMonthIdx, 5),
      'Seguros',
      'não_pago',
      false,
    )

    // ----------------------------------------------------------------
    // 9. Recorrências (3) — coleção recurrences
    // ----------------------------------------------------------------
    const createRecurrence = (desc, val, type, cat, dueDay, method, account, active) => {
      const r = new Record(recurrencesCol)
      r.set('user', userId)
      r.set('description', desc)
      r.set('value', val)
      r.set('type', type)
      r.set('category', cat)
      r.set('frequency', 'mensal')
      r.set('due_day', dueDay)
      r.set('payment_method', method)
      r.set('account', account)
      r.set('active', active)
      r.set('start_date', dayIso(currentYear, currentMonth, dueDay))
      app.save(r)
    }

    // Aluguel Apartamento
    createRecurrence(
      'Aluguel Apartamento',
      2200.0,
      'despesa',
      'Moradia',
      10,
      'PIX',
      nuAccount.id,
      true,
    )
    // Salário Tech Corp
    createRecurrence(
      'Salário Tech Corp',
      8500.0,
      'receita',
      'Salário',
      5,
      'PIX',
      nuAccount.id,
      true,
    )
    // Internet Fibra 600MB
    createRecurrence(
      'Internet Fibra 600MB',
      129.9,
      'despesa',
      'Assinaturas',
      18,
      'Débito',
      nuAccount.id,
      true,
    )

    // ----------------------------------------------------------------
    // 10. Parcelamentos (3)
    // ----------------------------------------------------------------
    const createInstallment = (
      desc,
      totalValue,
      count,
      paidCount,
      cat,
      cardId,
      startYear,
      startMonthIdx,
    ) => {
      const baseValue = Math.floor((totalValue / count) * 100) / 100
      const lastValue = Math.round((totalValue - baseValue * (count - 1)) * 100) / 100

      const inst = new Record(installmentsCol)
      inst.set('user', userId)
      inst.set('description', desc)
      inst.set('total_value', totalValue)
      inst.set('installment_value', baseValue)
      inst.set('total_installments', count)
      inst.set('current_installment', Math.min(count, paidCount + 1))
      inst.set('category', cat)
      if (cardId) inst.set('credit_card', cardId)
      inst.set('start_date', dayIso(startYear, startMonthIdx, 10))
      app.save(inst)

      // Gera as parcelas como transações (source = parcela, installment_group)
      for (let i = 1; i <= count; i++) {
        const d = new Date(Date.UTC(startYear, startMonthIdx + (i - 1), 10, 12, 0, 0))
        const tx = new Record(transactionsCol)
        tx.set('user', userId)
        tx.set('description', desc + ' (' + i + '/' + count + ')')
        tx.set('value', i === count ? lastValue : baseValue)
        tx.set('category', cat)
        tx.set('date', d.toISOString())
        tx.set('payment_method', 'Crédito')
        tx.set('type', 'despesa')
        if (cardId) tx.set('credit_card', cardId)
        tx.set('installment_group', inst.id)
        tx.set('source', 'parcela')
        if (i <= paidCount) {
          tx.set('status', 'realizado')
          tx.set('paid_at', d.toISOString())
        } else {
          tx.set('status', 'pendente')
        }
        app.save(tx)
      }
    }

    // Notebook Dell: 12x de R$ 316,66 (total R$ 3.799,92), início 10/06/2026
    // Estamos em agosto/2026 → parcelas 1-3 (jun, jul, ago) realizadas, 4-12 pendentes
    createInstallment(
      'Notebook Dell',
      3799.92,
      12,
      3,
      'Eletrônicos',
      nuCard.id,
      2026,
      5, // junho (0-indexed)
    )
    // Sofá Novo: 8x de R$ 312,50 (total R$ 2.500,00), início 10/06/2026
    // parcelas 1-3 (jun, jul, ago) realizadas, 4-8 pendentes
    createInstallment(
      'Sofá Novo',
      2500.0,
      8,
      3,
      'Casa',
      itauCard.id,
      2026,
      5, // junho
    )
    // Fone de Ouvido: 3x de R$ 66,66 (total R$ 199,98), início 10/08/2026, sem cartão
    // parcela 1 (ago) pendente, 2-3 pendentes
    createInstallment(
      'Fone de Ouvido',
      199.98,
      3,
      0,
      'Eletrônicos',
      null,
      2026,
      7, // agosto
    )

    // ----------------------------------------------------------------
    // 11. Metas (2) + contribuições
    // ----------------------------------------------------------------
    const g1 = new Record(goalsCol)
    g1.set('user', userId)
    g1.set('name', 'Reserva de Emergência 6 Meses')
    g1.set('target_value', 30000.0)
    g1.set('color', '#0E9F6E')
    g1.set('icon', 'ShieldCheck')
    g1.set('category', 'Investimentos')
    g1.set('description', 'Montar uma reserva de 6 meses de despesas para emergências.')
    {
      const d = new Date()
      d.setFullYear(d.getFullYear() + 1)
      g1.set('target_date', d.toISOString().slice(0, 10) + ' 00:00:00.000Z')
    }
    app.save(g1)

    const c1 = new Record(goalContribsCol)
    c1.set('goal', g1.id)
    c1.set('value', 12000.0)
    c1.set('date', '2025-01-10 10:00:00.000Z')
    c1.set('note', 'Aporte inicial reserva')
    app.save(c1)

    const g2 = new Record(goalsCol)
    g2.set('user', userId)
    g2.set('name', 'Viagem Europa 2026')
    g2.set('target_value', 18000.0)
    g2.set('color', '#2563EB')
    g2.set('icon', 'Plane')
    g2.set('category', 'Lazer')
    g2.set('description', 'Intercâmbio de 30 dias pela Europa com a família.')
    g2.set('target_date', '2026-06-15 00:00:00.000Z')
    app.save(g2)

    const c2 = new Record(goalContribsCol)
    c2.set('goal', g2.id)
    c2.set('value', 4500.0)
    c2.set('date', '2025-02-05 10:00:00.000Z')
    c2.set('note', 'Economia mensal')
    app.save(c2)

    // ----------------------------------------------------------------
    // 12. Orçamentos (4, mês corrente)
    // ----------------------------------------------------------------
    const createBudget = (cat, limitValue) => {
      const b = new Record(budgetsCol)
      b.set('user', userId)
      b.set('category', cat)
      b.set('limit_value', limitValue)
      b.set('month', currentMonthStr)
      app.save(b)
    }
    createBudget('Alimentação', 1800.0)
    createBudget('Transporte', 600.0)
    createBudget('Lazer', 700.0)
    createBudget('Moradia', 2500.0)

    // ----------------------------------------------------------------
    // 13. Investimentos (2)
    // ----------------------------------------------------------------
    // CDB 100% CDI Liquidez Diária
    {
      const cdi = new Record(investmentsCol)
      cdi.set('user', userId)
      cdi.set('type', 'cdi100')
      cdi.set('symbol', 'CDI')
      cdi.set('name', 'CDB 100% CDI Liquidez Diária')
      cdi.set('applied_value', 10000.0)
      cdi.set('application_date', '2024-06-01 00:00:00.000Z')
      cdi.set('current_price', 10940.5)
      cdi.set('last_price_update', dayIso(currentYear, currentMonth, now.getUTCDate()))
      app.save(cdi)
    }
    // Bitcoin
    {
      const btc = new Record(investmentsCol)
      btc.set('user', userId)
      btc.set('type', 'bitcoin')
      btc.set('symbol', 'BTC')
      btc.set('name', 'Bitcoin')
      btc.set('applied_value', 5000.0)
      btc.set('quantity', 0.0125)
      btc.set('unit_price', 400000.0)
      btc.set('current_price', 480000.0)
      btc.set('application_date', '2024-06-01 00:00:00.000Z')
      btc.set('last_price_update', dayIso(currentYear, currentMonth, now.getUTCDate()))
      app.save(btc)
    }

    // ----------------------------------------------------------------
    // 14. Regras de categorização (7)
    // ----------------------------------------------------------------
    const rules = [
      { keyword: 'COELBA', category: 'Luz' },
      { keyword: 'EMBASA', category: 'Água' },
      { keyword: 'iFood', category: 'Alimentação' },
      { keyword: 'Uber', category: 'Transporte' },
      { keyword: 'Netflix', category: 'Assinaturas' },
      { keyword: 'Spotify', category: 'Assinaturas' },
      { keyword: 'Posto', category: 'Combustível' },
    ]
    for (let i = 0; i < rules.length; i++) {
      const r = rules[i]
      const cr = new Record(rulesCol)
      cr.set('user', userId)
      cr.set('keyword', r.keyword)
      cr.set('category', r.category)
      cr.set('is_learned', false)
      app.save(cr)
    }

    // ----------------------------------------------------------------
    // 15. Verificação de consistência (loga divergências, não falha)
    // ----------------------------------------------------------------
    // Soma dos invoice_items vs invoice.total
    try {
      const invs = app.findRecordsByFilter('invoices', 'user = {:uid}', '', 100, 0, {
        uid: userId,
      })
      for (let i = 0; i < invs.length; i++) {
        const inv = invs[i]
        const items = app.findRecordsByFilter('invoice_items', 'invoice = {:iid}', '', 500, 0, {
          iid: inv.id,
        })
        let sum = 0
        for (let j = 0; j < items.length; j++) {
          sum += Number(items[j].get('value') || 0)
        }
        const total = Number(inv.get('total') || 0)
        if (Math.abs(sum - total) > 0.01) {
          console.log('Inconsistência fatura ' + inv.id + ': soma itens=' + sum + ' total=' + total)
        }
      }
    } catch (_) {}
  },
  (app) => {},
)
