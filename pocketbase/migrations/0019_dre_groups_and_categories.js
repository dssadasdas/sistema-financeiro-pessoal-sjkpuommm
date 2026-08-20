/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Cria coleção 'categories' se não existir para permitir customização de dre_group
    let categoriesCol
    try {
      categoriesCol = app.findCollectionByNameOrId('categories')
    } catch (_) {
      categoriesCol = new Collection({
        name: 'categories',
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
            collectionId: '_pb_users_auth_',
            cascadeDelete: true,
            maxSelect: 1,
          },
          { name: 'name', type: 'text', required: true },
          { name: 'type', type: 'select', values: ['receita', 'despesa'], maxSelect: 1 },
          {
            name: 'dre_group',
            type: 'select',
            values: [
              'receita_bruta',
              'deducoes',
              'cmv',
              'despesas_administrativas',
              'despesas_comerciais',
              'pessoal',
              'ocupacao',
              'despesas_financeiras',
              'outras_operacionais',
              'outras_receitas_despesas',
            ],
            maxSelect: 1,
          },
          { name: 'color', type: 'text' },
          { name: 'icon', type: 'text' },
          { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
          { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
        ],
        indexes: ['CREATE INDEX idx_categories_user ON categories (user)'],
      })
      app.save(categoriesCol)
    }

    // Se já existia a collection categories, adiciona campo dre_group se faltar
    if (categoriesCol && !categoriesCol.fields.getByName('dre_group')) {
      categoriesCol.fields.add(
        new SelectField({
          name: 'dre_group',
          values: [
            'receita_bruta',
            'deducoes',
            'cmv',
            'despesas_administrativas',
            'despesas_comerciais',
            'pessoal',
            'ocupacao',
            'despesas_financeiras',
            'outras_operacionais',
            'outras_receitas_despesas',
          ],
          maxSelect: 1,
        }),
      )
      app.save(categoriesCol)
    }

    // 2. Adiciona campo 'dre_group' na collection 'transactions' de forma opcional
    const txCol = app.findCollectionByNameOrId('transactions')
    if (!txCol.fields.getByName('dre_group')) {
      txCol.fields.add(
        new SelectField({
          name: 'dre_group',
          values: [
            'receita_bruta',
            'deducoes',
            'cmv',
            'despesas_administrativas',
            'despesas_comerciais',
            'pessoal',
            'ocupacao',
            'despesas_financeiras',
            'outras_operacionais',
            'outras_receitas_despesas',
          ],
          maxSelect: 1,
        }),
      )
      app.save(txCol)
    }
  },
  (app) => {
    try {
      const txCol = app.findCollectionByNameOrId('transactions')
      if (txCol.fields.getByName('dre_group')) {
        txCol.fields.removeByName('dre_group')
        app.save(txCol)
      }
    } catch (_) {}

    try {
      const catCol = app.findCollectionByNameOrId('categories')
      app.delete(catCol)
    } catch (_) {}
  },
)
