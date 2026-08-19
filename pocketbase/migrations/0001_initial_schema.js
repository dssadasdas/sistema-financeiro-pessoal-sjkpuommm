/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersId = '_pb_users_auth_'

    // 1. accounts
    const accounts = new Collection({
      name: 'accounts',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['Conta corrente', 'Conta poupança', 'Carteira', 'Outro'],
          maxSelect: 1,
        },
        {
          name: 'bank',
          type: 'select',
          required: true,
          values: [
            'Nubank',
            'Caixa',
            'Itaú',
            'Bradesco',
            'Santander',
            'Banco do Brasil',
            'Inter',
            'C6',
            'Sicoob',
            'PicPay',
            'Mercado Pago',
            'Neon',
            'Banco CSF/Atacadão',
            'Outro',
          ],
          maxSelect: 1,
        },
        { name: 'opening_balance', type: 'number' },
        { name: 'color', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_accounts_user ON accounts (user)'],
    })
    app.save(accounts)

    // 2. credit_cards
    const creditCards = new Collection({
      name: 'credit_cards',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        {
          name: 'bank',
          type: 'select',
          required: true,
          values: [
            'Nubank',
            'Caixa',
            'Itaú',
            'Bradesco',
            'Santander',
            'Banco do Brasil',
            'Inter',
            'C6',
            'Sicoob',
            'PicPay',
            'Mercado Pago',
            'Neon',
            'Banco CSF/Atacadão',
            'Outro',
          ],
          maxSelect: 1,
        },
        { name: 'limit', type: 'number' },
        { name: 'closing_day', type: 'number', min: 1, max: 31 },
        { name: 'due_day', type: 'number', min: 1, max: 31 },
        { name: 'last_four', type: 'text' },
        {
          name: 'brand',
          type: 'select',
          values: ['Visa', 'Mastercard', 'Elo', 'Amex', 'Hipercard', 'Outro'],
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_credit_cards_user ON credit_cards (user)'],
    })
    app.save(creditCards)

    // 3. installments
    const installments = new Collection({
      name: 'installments',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'total_value', type: 'number' },
        { name: 'installment_value', type: 'number' },
        { name: 'total_installments', type: 'number' },
        { name: 'current_installment', type: 'number' },
        { name: 'category', type: 'text' },
        { name: 'credit_card', type: 'relation', collectionId: creditCards.id, maxSelect: 1 },
        { name: 'start_date', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_installments_user ON installments (user)'],
    })
    app.save(installments)

    // 4. transactions
    const transactions = new Collection({
      name: 'transactions',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'value', type: 'number' },
        { name: 'category', type: 'text' },
        { name: 'date', type: 'date' },
        {
          name: 'payment_method',
          type: 'select',
          values: ['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Boleto', 'Transferência'],
          maxSelect: 1,
        },
        {
          name: 'status',
          type: 'select',
          values: ['realizado', 'pendente'],
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          values: ['receita', 'despesa', 'ajuste'],
          maxSelect: 1,
        },
        { name: 'account', type: 'relation', collectionId: accounts.id, maxSelect: 1 },
        { name: 'credit_card', type: 'relation', collectionId: creditCards.id, maxSelect: 1 },
        {
          name: 'installment_group',
          type: 'relation',
          collectionId: installments.id,
          maxSelect: 1,
        },
        {
          name: 'source',
          type: 'select',
          values: ['manual', 'importado', 'fatura', 'recorrência', 'parcela', 'ajuste'],
          maxSelect: 1,
        },
        { name: 'paid_at', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_transactions_user ON transactions (user)',
        'CREATE INDEX idx_transactions_date ON transactions (date)',
        'CREATE INDEX idx_transactions_status ON transactions (status)',
        'CREATE INDEX idx_transactions_type ON transactions (type)',
        'CREATE INDEX idx_transactions_account ON transactions (account)',
        'CREATE INDEX idx_transactions_card ON transactions (credit_card)',
      ],
    })
    app.save(transactions)

    // 5. invoices
    const invoices = new Collection({
      name: 'invoices',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'credit_card',
          type: 'relation',
          required: true,
          collectionId: creditCards.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'reference', type: 'text', required: true }, // e.g. "2025-05"
        { name: 'closing_date', type: 'date' },
        { name: 'due_date', type: 'date' },
        { name: 'total', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['aberta', 'paga'],
          maxSelect: 1,
        },
        { name: 'paid_at', type: 'date' },
        {
          name: 'payment_transaction',
          type: 'relation',
          collectionId: transactions.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_invoices_user ON invoices (user)',
        'CREATE INDEX idx_invoices_card_ref ON invoices (credit_card, reference)',
      ],
    })
    app.save(invoices)

    // 6. invoice_items
    const invoiceItems = new Collection({
      name: 'invoice_items',
      type: 'base',
      listRule: "@request.auth.id != '' && invoice.user = @request.auth.id",
      viewRule: "@request.auth.id != '' && invoice.user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && invoice.user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && invoice.user = @request.auth.id",
      fields: [
        {
          name: 'invoice',
          type: 'relation',
          required: true,
          collectionId: invoices.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'value', type: 'number' },
        { name: 'category', type: 'text' },
        { name: 'date', type: 'date' },
        { name: 'installments', type: 'text' },
        { name: 'is_imported', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_invoice_items_invoice ON invoice_items (invoice)'],
    })
    app.save(invoiceItems)

    // 7. bills
    const bills = new Collection({
      name: 'bills',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'value', type: 'number' },
        { name: 'due_date', type: 'date' },
        { name: 'category', type: 'text' },
        {
          name: 'status',
          type: 'select',
          values: ['pago', 'não_pago'],
          maxSelect: 1,
        },
        { name: 'paid_at', type: 'date' },
        { name: 'account', type: 'relation', collectionId: accounts.id, maxSelect: 1 },
        { name: 'recurring', type: 'bool' },
        {
          name: 'generated_transaction',
          type: 'relation',
          collectionId: transactions.id,
          maxSelect: 1,
        },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: [
        'CREATE INDEX idx_bills_user ON bills (user)',
        'CREATE INDEX idx_bills_due ON bills (due_date)',
        'CREATE INDEX idx_bills_status ON bills (status)',
      ],
    })
    app.save(bills)

    // 8. recurrences
    const recurrences = new Collection({
      name: 'recurrences',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'description', type: 'text', required: true },
        { name: 'value', type: 'number' },
        {
          name: 'type',
          type: 'select',
          values: ['receita', 'despesa'],
          maxSelect: 1,
        },
        { name: 'category', type: 'text' },
        {
          name: 'frequency',
          type: 'select',
          values: ['mensal'],
          maxSelect: 1,
        },
        { name: 'due_day', type: 'number', min: 1, max: 31 },
        {
          name: 'payment_method',
          type: 'select',
          values: ['Dinheiro', 'PIX', 'Débito', 'Crédito', 'Boleto', 'Transferência'],
          maxSelect: 1,
        },
        { name: 'account', type: 'relation', collectionId: accounts.id, maxSelect: 1 },
        { name: 'active', type: 'bool' },
        { name: 'start_date', type: 'date' },
        { name: 'end_date', type: 'date' },
        { name: 'last_generated', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_recurrences_user ON recurrences (user)'],
    })
    app.save(recurrences)

    // 9. budgets
    const budgets = new Collection({
      name: 'budgets',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'category', type: 'text', required: true },
        { name: 'limit_value', type: 'number' },
        { name: 'month', type: 'text', required: true }, // "YYYY-MM"
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_budgets_user_month ON budgets (user, month)'],
    })
    app.save(budgets)

    // 10. goals
    const goals = new Collection({
      name: 'goals',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'name', type: 'text', required: true },
        { name: 'target_value', type: 'number' },
        { name: 'color', type: 'text' },
        { name: 'icon', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_goals_user ON goals (user)'],
    })
    app.save(goals)

    // 11. goal_contributions
    const goalContributions = new Collection({
      name: 'goal_contributions',
      type: 'base',
      listRule: "@request.auth.id != '' && goal.user = @request.auth.id",
      viewRule: "@request.auth.id != '' && goal.user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && goal.user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && goal.user = @request.auth.id",
      fields: [
        {
          name: 'goal',
          type: 'relation',
          required: true,
          collectionId: goals.id,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'value', type: 'number' },
        { name: 'date', type: 'date' },
        { name: 'note', type: 'text' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_goal_contrib_goal ON goal_contributions (goal)'],
    })
    app.save(goalContributions)

    // 12. investments
    const investments = new Collection({
      name: 'investments',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'type',
          type: 'select',
          required: true,
          values: ['bitcoin', 'ethereum', 'acao', 'fii', 'renda_fixa', 'cdi100'],
          maxSelect: 1,
        },
        { name: 'symbol', type: 'text' },
        { name: 'name', type: 'text', required: true },
        { name: 'applied_value', type: 'number' },
        { name: 'quantity', type: 'number' },
        { name: 'unit_price', type: 'number' },
        { name: 'application_date', type: 'date' },
        { name: 'current_price', type: 'number' },
        { name: 'last_price_update', type: 'date' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_investments_user ON investments (user)'],
    })
    app.save(investments)

    // 13. categorization_rules
    const categorizationRules = new Collection({
      name: 'categorization_rules',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        { name: 'keyword', type: 'text', required: true },
        { name: 'category', type: 'text', required: true },
        { name: 'is_learned', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_cat_rules_user ON categorization_rules (user)'],
    })
    app.save(categorizationRules)

    // 14. subscriptions
    const subscriptions = new Collection({
      name: 'subscriptions',
      type: 'base',
      listRule: "@request.auth.id != '' && user = @request.auth.id",
      viewRule: "@request.auth.id != '' && user = @request.auth.id",
      createRule: "@request.auth.id != ''",
      updateRule: "@request.auth.id != '' && user = @request.auth.id",
      deleteRule: "@request.auth.id != '' && user = @request.auth.id",
      fields: [
        {
          name: 'user',
          type: 'relation',
          required: true,
          collectionId: usersId,
          cascadeDelete: true,
          maxSelect: 1,
        },
        {
          name: 'plan',
          type: 'select',
          values: ['mensal', 'anual'],
          maxSelect: 1,
        },
        { name: 'price', type: 'number' },
        {
          name: 'status',
          type: 'select',
          values: ['ativa', 'bloqueada'],
          maxSelect: 1,
        },
        { name: 'started_at', type: 'date' },
        { name: 'renewed_at', type: 'date' },
        { name: 'expires_at', type: 'date' },
        { name: 'admin_released', type: 'bool' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_subscriptions_user ON subscriptions (user)'],
    })
    app.save(subscriptions)
  },
  (app) => {
    const toDelete = [
      'subscriptions',
      'categorization_rules',
      'investments',
      'goal_contributions',
      'goals',
      'budgets',
      'recurrences',
      'bills',
      'invoice_items',
      'invoices',
      'transactions',
      'installments',
      'credit_cards',
      'accounts',
    ]
    for (const name of toDelete) {
      try {
        const col = app.findCollectionByNameOrId(name)
        app.delete(col)
      } catch (_) {}
    }
  },
)
