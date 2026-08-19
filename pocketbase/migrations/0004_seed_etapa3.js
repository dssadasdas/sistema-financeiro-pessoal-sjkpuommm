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

    const accounts = app.findCollectionByNameOrId('accounts')
    const creditCards = app.findCollectionByNameOrId('credit_cards')
    const invoices = app.findCollectionByNameOrId('invoices')
    const invoiceItems = app.findCollectionByNameOrId('invoice_items')
    const transactions = app.findCollectionByNameOrId('transactions')

    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const today = new Date().toISOString().split('T')[0]
    const dueDate = currentMonth + '-22 12:00:00.000Z'

    // ---------- Contas Bancárias ----------
    let contaCorrenteNubank
    try {
      contaCorrenteNubank = app.findFirstRecordByData('accounts', 'name', 'Conta Corrente Nubank')
    } catch (_) {
      contaCorrenteNubank = new Record(accounts)
      contaCorrenteNubank.set('user', userId)
      contaCorrenteNubank.set('name', 'Conta Corrente Nubank')
      contaCorrenteNubank.set('type', 'Conta corrente')
      contaCorrenteNubank.set('bank', 'Nubank')
      contaCorrenteNubank.set('opening_balance', 5000.0)
      contaCorrenteNubank.set('color', '#820AD1')
      app.save(contaCorrenteNubank)
    }

    let poupancaCaixa
    try {
      poupancaCaixa = app.findFirstRecordByData('accounts', 'name', 'Poupança Caixa')
    } catch (_) {
      poupancaCaixa = new Record(accounts)
      poupancaCaixa.set('user', userId)
      poupancaCaixa.set('name', 'Poupança Caixa')
      poupancaCaixa.set('type', 'Conta poupança')
      poupancaCaixa.set('bank', 'Caixa')
      poupancaCaixa.set('opening_balance', 12000.0)
      poupancaCaixa.set('color', '#0066A1')
      app.save(poupancaCaixa)
    }

    // ---------- Cartões de Crédito ----------
    let nuCard
    try {
      nuCard = app.findFirstRecordByData('credit_cards', 'name', 'Nubank Gold')
    } catch (_) {
      nuCard = new Record(creditCards)
      nuCard.set('user', userId)
      nuCard.set('name', 'Nubank Gold')
      nuCard.set('bank', 'Nubank')
      nuCard.set('limit', 8000.0)
      nuCard.set('closing_day', 15)
      nuCard.set('due_day', 22)
      nuCard.set('last_four', '1234')
      nuCard.set('brand', 'Mastercard')
      app.save(nuCard)
    }

    let itauCard
    try {
      itauCard = app.findFirstRecordByData('credit_cards', 'name', 'Itaú Personnalité')
    } catch (_) {
      itauCard = new Record(creditCards)
      itauCard.set('user', userId)
      itauCard.set('name', 'Itaú Personnalité')
      itauCard.set('bank', 'Itaú')
      itauCard.set('limit', 5000.0)
      itauCard.set('closing_day', 20)
      itauCard.set('due_day', 28)
      itauCard.set('last_four', '5678')
      itauCard.set('brand', 'Visa')
      app.save(itauCard)
    }

    // ---------- Fatura Nubank (usado R$ 2.350,00) ----------
    let nuInvoice
    try {
      nuInvoice = app.findFirstRecordByData('invoices', 'credit_card', nuCard.id)
    } catch (_) {
      nuInvoice = new Record(invoices)
      nuInvoice.set('user', userId)
      nuInvoice.set('credit_card', nuCard.id)
      nuInvoice.set('reference', currentMonth)
      nuInvoice.set('due_date', currentMonth + '-22 12:00:00.000Z')
      nuInvoice.set('total', 2350.0)
      nuInvoice.set('status', 'aberta')
      app.save(nuInvoice)

      const nuCompras = [
        {
          date: currentMonth + '-02',
          desc: 'iFood Refeição',
          cat: 'Alimentação',
          val: 89.9,
          inst: '',
        },
        {
          date: currentMonth + '-05',
          desc: 'Netflix Assinatura',
          cat: 'Assinaturas',
          val: 55.9,
          inst: '1/1',
        },
        {
          date: currentMonth + '-08',
          desc: 'Posto Shell Combustível',
          cat: 'Combustível',
          val: 350.0,
          inst: '',
        },
        {
          date: currentMonth + '-10',
          desc: 'Supermercado Pão de Açúcar',
          cat: 'Alimentação',
          val: 620.5,
          inst: '',
        },
        {
          date: currentMonth + '-12',
          desc: 'Amazon Curso Online',
          cat: 'Educação',
          val: 297.0,
          inst: '3/12',
        },
        {
          date: currentMonth + '-15',
          desc: 'Drogasil Farmácia',
          cat: 'Saúde',
          val: 142.7,
          inst: '',
        },
        {
          date: currentMonth + '-18',
          desc: 'Uber Transporte',
          cat: 'Transporte',
          val: 184.0,
          inst: '',
        },
        {
          date: currentMonth + '-20',
          desc: 'Loja Riachuelo Roupas',
          cat: 'Compras',
          val: 610.0,
          inst: '2/6',
        },
      ]

      for (const c of nuCompras) {
        const it = new Record(invoiceItems)
        it.set('invoice', nuInvoice.id)
        it.set('description', c.desc)
        it.set('value', c.val)
        it.set('category', c.cat)
        it.set('date', c.date + ' 12:00:00.000Z')
        it.set('installments', c.inst)
        it.set('is_imported', false)
        app.save(it)

        const tx = new Record(transactions)
        tx.set('user', userId)
        tx.set('description', c.desc)
        tx.set('value', c.val)
        tx.set('category', c.cat)
        tx.set('date', c.date + ' 12:00:00.000Z')
        tx.set('payment_method', 'Crédito')
        tx.set('status', 'realizado')
        tx.set('type', 'despesa')
        tx.set('credit_card', nuCard.id)
        tx.set('source', 'manual')
        app.save(tx)
      }
    }

    // ---------- Fatura Itaú (usado R$ 1.200,00) ----------
    let itauInvoice
    try {
      itauInvoice = app.findFirstRecordByData('invoices', 'credit_card', itauCard.id)
    } catch (_) {
      itauInvoice = new Record(invoices)
      itauInvoice.set('user', userId)
      itauInvoice.set('credit_card', itauCard.id)
      itauInvoice.set('reference', currentMonth)
      itauInvoice.set('due_date', currentMonth + '-28 12:00:00.000Z')
      itauInvoice.set('total', 1200.0)
      itauInvoice.set('status', 'aberta')
      app.save(itauInvoice)

      const itauCompras = [
        {
          date: currentMonth + '-03',
          desc: 'Spotify Premium',
          cat: 'Assinaturas',
          val: 21.9,
          inst: '1/1',
        },
        {
          date: currentMonth + '-06',
          desc: 'Cinemark Ingressos',
          cat: 'Lazer',
          val: 78.0,
          inst: '',
        },
        {
          date: currentMonth + '-09',
          desc: 'Mercado Livre Eletrônicos',
          cat: 'Compras',
          val: 459.9,
          inst: '4/10',
        },
        {
          date: currentMonth + '-11',
          desc: 'Neoenergia Coelba Luz',
          cat: 'Luz',
          val: 215.4,
          inst: '',
        },
        { date: currentMonth + '-14', desc: 'EMBASA Água', cat: 'Água', val: 89.8, inst: '' },
        {
          date: currentMonth + '-17',
          desc: 'Restaurante Outback',
          cat: 'Alimentação',
          val: 334.0,
          inst: '',
        },
      ]

      for (const c of itauCompras) {
        const it = new Record(invoiceItems)
        it.set('invoice', itauInvoice.id)
        it.set('description', c.desc)
        it.set('value', c.val)
        it.set('category', c.cat)
        it.set('date', c.date + ' 12:00:00.000Z')
        it.set('installments', c.inst)
        it.set('is_imported', false)
        app.save(it)

        const tx = new Record(transactions)
        tx.set('user', userId)
        tx.set('description', c.desc)
        tx.set('value', c.val)
        tx.set('category', c.cat)
        tx.set('date', c.date + ' 12:00:00.000Z')
        tx.set('payment_method', 'Crédito')
        tx.set('status', 'realizado')
        tx.set('type', 'despesa')
        tx.set('credit_card', itauCard.id)
        tx.set('source', 'manual')
        app.save(tx)
      }
    }
  },
  (app) => {},
)
