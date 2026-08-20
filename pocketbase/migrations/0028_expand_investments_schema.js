/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCollection = app.findCollectionByNameOrId('_pb_users_auth_')
    const investmentsCollection = app.findCollectionByNameOrId('investments')

    // 1. Atualizar campo 'type' e adicionar novos campos à collection 'investments'
    const invTypeField = investmentsCollection.fields.getByName('type')
    if (invTypeField) {
      invTypeField.values = [
        'bitcoin',
        'ethereum',
        'acao',
        'fii',
        'renda_fixa',
        'cdi100',
        'cdb',
        'rdb',
        'lci',
        'lca',
        'tesouro_selic',
        'tesouro_prefixado',
        'tesouro_ipca',
        'debentures',
        'cri',
        'cra',
        'letras_financeiras',
        'poupanca',
        'etf',
        'bdr',
        'fiagro',
        'fundo_rf',
        'fundo_multimercado',
        'fundo_acoes',
        'fundo_cambial',
        'fundo_imobiliario',
        'pgbl',
        'vgbl',
        'acao_us',
        'etf_internacional',
        'ouro',
        'dolar',
        'euro',
        'ativo_personalizado',
        'cripto_alt',
      ]
    }

    if (!investmentsCollection.fields.getByName('institution')) {
      investmentsCollection.fields.add(new TextField({ name: 'institution' }))
    }
    if (!investmentsCollection.fields.getByName('maturity_date')) {
      investmentsCollection.fields.add(new DateField({ name: 'maturity_date' }))
    }
    if (!investmentsCollection.fields.getByName('liquidity')) {
      investmentsCollection.fields.add(new TextField({ name: 'liquidity' }))
    }
    if (!investmentsCollection.fields.getByName('yield_type')) {
      investmentsCollection.fields.add(
        new SelectField({
          name: 'yield_type',
          values: ['cdi_pct', 'prefixado', 'ipca_mais', 'manual', 'variavel'],
          maxSelect: 1,
        }),
      )
    }
    if (!investmentsCollection.fields.getByName('yield_rate')) {
      investmentsCollection.fields.add(new NumberField({ name: 'yield_rate' }))
    }
    if (!investmentsCollection.fields.getByName('tax_regime')) {
      investmentsCollection.fields.add(
        new SelectField({
          name: 'tax_regime',
          values: ['regressivo', 'isento', 'sem_ir'],
          maxSelect: 1,
        }),
      )
    }
    if (!investmentsCollection.fields.getByName('category_group')) {
      investmentsCollection.fields.add(
        new SelectField({
          name: 'category_group',
          values: [
            'renda_fixa',
            'renda_variavel',
            'fundos',
            'cripto',
            'previdencia',
            'internacional',
            'outros',
          ],
          maxSelect: 1,
        }),
      )
    }
    if (!investmentsCollection.fields.getByName('notes')) {
      investmentsCollection.fields.add(new TextField({ name: 'notes' }))
    }

    app.save(investmentsCollection)

    // 2. Criar collection investment_contributions se não existir
    let contribCol
    try {
      contribCol = app.findCollectionByNameOrId('investment_contributions')
    } catch (_) {
      contribCol = new Collection({
        name: 'investment_contributions',
        type: 'base',
        listRule: "@request.auth.id != '' && user = @request.auth.id",
        viewRule: "@request.auth.id != '' && user = @request.auth.id",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'investment',
            type: 'relation',
            required: true,
            collectionId: investmentsCollection.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: usersCollection.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'value', type: 'number', required: true },
          { name: 'quantity', type: 'number' },
          { name: 'unit_price', type: 'number' },
          { name: 'date', type: 'date', required: true },
          {
            name: 'type',
            type: 'select',
            required: true,
            values: ['compra', 'venda'],
            maxSelect: 1,
          },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_inv_contrib_investment ON investment_contributions (investment)',
          'CREATE INDEX idx_inv_contrib_user ON investment_contributions (user)',
        ],
      })
      app.save(contribCol)
    }

    // 3. Criar collection investment_earnings se não existir
    let earningsCol
    try {
      earningsCol = app.findCollectionByNameOrId('investment_earnings')
    } catch (_) {
      earningsCol = new Collection({
        name: 'investment_earnings',
        type: 'base',
        listRule: "@request.auth.id != '' && user = @request.auth.id",
        viewRule: "@request.auth.id != '' && user = @request.auth.id",
        createRule: "@request.auth.id != ''",
        updateRule: "@request.auth.id != '' && user = @request.auth.id",
        deleteRule: "@request.auth.id != '' && user = @request.auth.id",
        fields: [
          {
            name: 'investment',
            type: 'relation',
            required: true,
            collectionId: investmentsCollection.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          {
            name: 'user',
            type: 'relation',
            required: true,
            collectionId: usersCollection.id,
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'value', type: 'number', required: true },
          {
            name: 'type',
            type: 'select',
            required: true,
            values: ['dividendo', 'jcp', 'rendimento_fii', 'cupom', 'juros', 'outro'],
            maxSelect: 1,
          },
          { name: 'date', type: 'date', required: true },
          { name: 'notes', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: [
          'CREATE INDEX idx_inv_earnings_investment ON investment_earnings (investment)',
          'CREATE INDEX idx_inv_earnings_user ON investment_earnings (user)',
        ],
      })
      app.save(earningsCol)
    }
  },
  (app) => {
    try {
      const c1 = app.findCollectionByNameOrId('investment_earnings')
      app.delete(c1)
    } catch (_) {}
    try {
      const c2 = app.findCollectionByNameOrId('investment_contributions')
      app.delete(c2)
    } catch (_) {}
  },
)
