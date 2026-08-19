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

    // ---------- 1. Cria a coleção recurring_bills ----------
    let recurringBillsCol
    try {
      recurringBillsCol = app.findCollectionByNameOrId('recurring_bills')
    } catch (_) {
      recurringBillsCol = new Collection({
        name: 'recurring_bills',
        type: 'base',
        listRule: "@request.auth.id != '' && user = @request.auth.id",
        viewRule: "@request.auth.id != '' && user = @request.auth.id",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          { name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_' },
          { name: 'description', type: 'text', required: true },
          { name: 'value', type: 'number' },
          { name: 'type', type: 'select', values: ['pagar', 'receber'] },
          { name: 'category', type: 'text' },
          {
            name: 'frequency',
            type: 'select',
            values: ['mensal', 'semanal', 'trimestral', 'anual'],
          },
          { name: 'due_day', type: 'number' },
          {
            name: 'payment_method',
            type: 'select',
            values: ['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Boleto', 'Transferência'],
          },
          {
            name: 'account',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('accounts').id,
          },
          {
            name: 'credit_card',
            type: 'relation',
            collectionId: app.findCollectionByNameOrId('credit_cards').id,
          },
          { name: 'active', type: 'bool' },
          { name: 'start_date', type: 'date' },
          { name: 'end_date', type: 'date' },
          { name: 'next_date', type: 'date' },
          { name: 'last_generated', type: 'date' },
          { name: 'repetitions', type: 'number' },
          { name: 'generated_count', type: 'number' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_recurring_bills_user ON recurring_bills (user)',
          'CREATE INDEX idx_recurring_bills_active_next ON recurring_bills (active, next_date)',
        ],
      })
      app.save(recurringBillsCol)
      recurringBillsCol = app.findCollectionByNameOrId('recurring_bills')
    }

    // ---------- 2. Adiciona campos em bills: type + recurring_bill ----------
    const billsCol = app.findCollectionByNameOrId('bills')
    const addBillField = (name, ctor) => {
      if (!billsCol.fields.getByName(name)) {
        billsCol.fields.add(ctor)
      }
    }
    addBillField('type', new SelectField({ name: 'type', values: ['pagar', 'receber'] }))
    addBillField(
      'recurring_bill',
      new RelationField({ name: 'recurring_bill', collectionId: recurringBillsCol.id }),
    )
    app.save(billsCol)

    // ---------- helpers de data ----------
    const now = new Date()
    const currentYear = now.getUTCFullYear()
    const currentMonth = now.getUTCMonth() // 0-11
    const pad = (n) => (n < 10 ? '0' + n : '' + n)
    const ym = (y, m) => '' + y + '-' + pad(m + 1)
    const currentMonthStr = ym(currentYear, currentMonth)
    const prevMonthDate = new Date(Date.UTC(currentYear, currentMonth - 1, 1))
    const prevMonthStr = ym(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth())

    const dayIso = (year, month, day) =>
      '' + year + '-' + pad(month + 1) + '-' + pad(day) + ' 12:00:00.000Z'

    const accountsCol = app.findCollectionByNameOrId('accounts')
    const cardsCol = app.findCollectionByNameOrId('credit_cards')
    const installmentsCol = app.findCollectionByNameOrId('installments')
    const transactionsCol = app.findCollectionByNameOrId('transactions')

    let nuAccount
    try {
      nuAccount = app.findFirstRecordByData('accounts', 'name', 'Nubank Principal')
    } catch (_) {
      nuAccount = app.findFirstRecordByData('accounts', 'user', userId)
    }
    let nuCard
    try {
      nuCard = app.findFirstRecordByData('credit_cards', 'name', 'Nubank Gold')
    } catch (_) {
      nuCard = app.findFirstRecordByData('credit_cards', 'user', userId)
    }
    let itauCard
    try {
      itauCard = app.findFirstRecordByData('credit_cards', 'name', 'Itaú Personnalité')
    } catch (_) {
      itauCard = null
    }

    // ---------- 3. Seed Contas a Pagar (bills) ----------
    const ensureBill = (desc, value, dueDate, category, status, type, account, recurring) => {
      try {
        app.findFirstRecordByData('bills', 'description', desc)
        return
      } catch (_) {}
      const b = new Record(billsCol)
      b.set('user', userId)
      b.set('description', desc)
      b.set('value', value)
      b.set('due_date', dueDate)
      b.set('category', category)
      b.set('status', status)
      b.set('type', type)
      if (account) b.set('account', account)
      b.set('recurring', !!recurring)
      if (status === 'pago') {
        b.set('paid_at', dueDate)
      }
      app.save(b)
    }

    ensureBill(
      'Aluguel',
      1500.0,
      dayIso(currentYear, currentMonth, 10),
      'Moradia',
      'pago',
      'pagar',
      nuAccount.id,
      true,
    )
    ensureBill(
      'Energia (COELBA)',
      320.0,
      dayIso(currentYear, currentMonth, 15),
      'Luz',
      'não_pago',
      'pagar',
      nuAccount.id,
    )
    ensureBill(
      'Internet (Claro)',
      119.9,
      dayIso(currentYear, currentMonth, 20),
      'Assinaturas',
      'não_pago',
      'pagar',
      nuAccount.id,
    )
    ensureBill(
      'Academia',
      99.9,
      dayIso(currentYear, currentMonth, 5),
      'Saúde',
      'pago',
      'pagar',
      nuAccount.id,
    )
    ensureBill(
      'Seguro do carro',
      189.0,
      dayIso(currentYear, currentMonth, 25),
      'Transporte',
      'não_pago',
      'pagar',
      nuAccount.id,
    )
    // Vencida no mês anterior
    ensureBill(
      'Farmácia',
      45.0,
      dayIso(prevMonthDate.getUTCFullYear(), prevMonthDate.getUTCMonth(), 28),
      'Saúde',
      'não_pago',
      'pagar',
      nuAccount.id,
    )
    // Conta a receber
    ensureBill(
      'Freelance',
      800.0,
      dayIso(currentYear, currentMonth, 30),
      'Renda Extra',
      'não_pago',
      'receber',
      nuAccount.id,
    )

    // Atualiza type da bill antiga se existir
    try {
      const oldBill = app.findFirstRecordByData('bills', 'description', 'Internet Fibra 600MB')
      if (!oldBill.get('type')) {
        oldBill.set('type', 'pagar')
        app.save(oldBill)
      }
    } catch (_) {}

    // ---------- 4. Seed Recorrências (recurring_bills) ----------
    const ensureRecurringBill = (
      desc,
      value,
      type,
      category,
      frequency,
      dueDay,
      paymentMethod,
      account,
      active,
    ) => {
      try {
        app.findFirstRecordByData('recurring_bills', 'description', desc)
        return
      } catch (_) {}
      const r = new Record(recurringBillsCol)
      r.set('user', userId)
      r.set('description', desc)
      r.set('value', value)
      r.set('type', type)
      r.set('category', category)
      r.set('frequency', frequency)
      r.set('due_day', dueDay)
      r.set('payment_method', paymentMethod)
      if (account) r.set('account', account)
      r.set('active', active)
      r.set('start_date', dayIso(currentYear, currentMonth, dueDay))
      r.set('next_date', dayIso(currentYear, currentMonth, dueDay))
      r.set('repetitions', 0)
      r.set('generated_count', 0)
      app.save(r)
    }

    ensureRecurringBill(
      'Aluguel',
      1500.0,
      'pagar',
      'Moradia',
      'mensal',
      10,
      'PIX',
      nuAccount.id,
      true,
    )
    ensureRecurringBill(
      'Salário',
      5000.0,
      'receber',
      'Salário',
      'mensal',
      5,
      'Transferência',
      nuAccount.id,
      true,
    )
    ensureRecurringBill(
      'Claro Internet',
      119.9,
      'pagar',
      'Assinaturas',
      'mensal',
      20,
      'Boleto',
      nuAccount.id,
      true,
    )
    ensureRecurringBill(
      'Academia',
      99.9,
      'pagar',
      'Saúde',
      'mensal',
      5,
      'Débito',
      nuAccount.id,
      true,
    )
    ensureRecurringBill(
      'Seguro Auto',
      189.0,
      'pagar',
      'Transporte',
      'mensal',
      25,
      'Boleto',
      nuAccount.id,
      true,
    )
    ensureRecurringBill(
      'Spotify',
      21.9,
      'pagar',
      'Assinaturas',
      'mensal',
      12,
      'Crédito',
      null,
      true,
    )

    // ---------- 5. Seed Parcelamentos (installments + parcelas) ----------
    const ensureInstallment = (
      desc,
      totalValue,
      count,
      paidCount,
      category,
      cardId,
      startYear,
      startMonth,
    ) => {
      try {
        app.findFirstRecordByData('installments', 'description', desc)
        return
      } catch (_) {}
      const baseValue = Math.floor((totalValue / count) * 100) / 100
      const lastValue = Math.round((totalValue - baseValue * (count - 1)) * 100) / 100

      const inst = new Record(installmentsCol)
      inst.set('user', userId)
      inst.set('description', desc)
      inst.set('total_value', totalValue)
      inst.set('installment_value', baseValue)
      inst.set('total_installments', count)
      inst.set('current_installment', paidCount + 1 > count ? count : paidCount + 1)
      inst.set('category', category)
      if (cardId) inst.set('credit_card', cardId)
      inst.set('start_date', dayIso(startYear, startMonth, 10))
      app.save(inst)

      // Gera as parcelas como transações (source = parcela, installment_group)
      for (let i = 1; i <= count; i++) {
        const d = new Date(Date.UTC(startYear, startMonth + (i - 1), 10, 12, 0, 0))
        const tx = new Record(transactionsCol)
        tx.set('user', userId)
        tx.set('description', desc + ' (' + i + '/' + count + ')')
        tx.set('value', i === count ? lastValue : baseValue)
        tx.set('category', category)
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

    // Notebook Dell: 12x, 3 pagas, início há 3 meses
    ensureInstallment(
      'Notebook Dell',
      3800.0,
      12,
      3,
      'Eletrônicos',
      nuCard ? nuCard.id : null,
      currentYear,
      currentMonth - 3,
    )
    // Sofá Novo: 8x, 2 pagas, início há 2 meses
    ensureInstallment(
      'Sofá Novo',
      2500.0,
      8,
      2,
      'Casa',
      itauCard ? itauCard.id : null,
      currentYear,
      currentMonth - 2,
    )
    // Fone de Ouvido: 3x, 0 pagas, início no mês corrente, sem cartão
    ensureInstallment('Fone de Ouvido', 200.0, 3, 0, 'Eletrônicos', null, currentYear, currentMonth)
  },
  (app) => {},
)
