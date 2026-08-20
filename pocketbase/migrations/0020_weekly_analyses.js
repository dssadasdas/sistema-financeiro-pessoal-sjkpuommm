/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // Criação da coleção weekly_analyses para histórico de resumos financeiros semanais
    const collection = new Collection({
      name: 'weekly_analyses',
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
        { name: 'week_start', type: 'date', required: true },
        { name: 'week_end', type: 'date', required: true },
        { name: 'summary_json', type: 'json' },
        { name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
        { name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
      ],
      indexes: ['CREATE INDEX idx_weekly_analyses_user_week ON weekly_analyses (user, week_start)'],
    })
    app.save(collection)
  },
  (app) => {
    try {
      const collection = app.findCollectionByNameOrId('weekly_analyses')
      app.delete(collection)
    } catch (_) {}
  },
)
