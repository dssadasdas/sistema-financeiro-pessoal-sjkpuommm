/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!usersCol.fields.getByName('notification_preferences')) {
      usersCol.fields.add(
        new JSONField({
          name: 'notification_preferences',
          required: false,
        }),
      )
    }

    if (!usersCol.fields.getByName('financial_preferences')) {
      usersCol.fields.add(
        new JSONField({
          name: 'financial_preferences',
          required: false,
        }),
      )
    }

    app.save(usersCol)
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('notification_preferences')) {
        usersCol.fields.removeByName('notification_preferences')
      }
      if (usersCol.fields.getByName('financial_preferences')) {
        usersCol.fields.removeByName('financial_preferences')
      }
      app.save(usersCol)
    } catch (_) {}
  },
)
