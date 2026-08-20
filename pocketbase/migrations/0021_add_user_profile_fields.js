/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')

    if (!usersCol.fields.getByName('phone')) {
      usersCol.fields.add(
        new TextField({
          name: 'phone',
          required: false,
        }),
      )
    }

    if (!usersCol.fields.getByName('birth_date')) {
      usersCol.fields.add(
        new DateField({
          name: 'birth_date',
          required: false,
        }),
      )
    }

    if (!usersCol.fields.getByName('city')) {
      usersCol.fields.add(
        new TextField({
          name: 'city',
          required: false,
        }),
      )
    }

    if (!usersCol.fields.getByName('state')) {
      usersCol.fields.add(
        new TextField({
          name: 'state',
          required: false,
        }),
      )
    }

    if (!usersCol.fields.getByName('display_name')) {
      usersCol.fields.add(
        new TextField({
          name: 'display_name',
          required: false,
        }),
      )
    }

    app.save(usersCol)
  },
  (app) => {
    try {
      const usersCol = app.findCollectionByNameOrId('_pb_users_auth_')
      if (usersCol.fields.getByName('phone')) usersCol.fields.removeByName('phone')
      if (usersCol.fields.getByName('birth_date')) usersCol.fields.removeByName('birth_date')
      if (usersCol.fields.getByName('city')) usersCol.fields.removeByName('city')
      if (usersCol.fields.getByName('state')) usersCol.fields.removeByName('state')
      if (usersCol.fields.getByName('display_name')) usersCol.fields.removeByName('display_name')
      app.save(usersCol)
    } catch (_) {}
  },
)
