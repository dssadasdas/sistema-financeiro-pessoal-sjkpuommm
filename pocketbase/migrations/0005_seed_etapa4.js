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

    // ---------- 1. Adiciona campos novos na coleção goals ----------
    const goalsCol = app.findCollectionByNameOrId('goals')
    const addField = (name, ctor) => {
      if (!goalsCol.fields.getByName(name)) {
        goalsCol.fields.add(ctor)
      }
    }
    addField('target_date', new DateField({ name: 'target_date' }))
    addField('category', new TextField({ name: 'category' }))
    addField('description', new TextField({ name: 'description' }))
    app.save(goalsCol)

    // ---------- 2. Atualiza / cria metas de exemplo ----------
    const goalsCollection = app.findCollectionByNameOrId('goals')
    const goalContribs = app.findCollectionByNameOrId('goal_contributions')

    let g1
    try {
      g1 = app.findFirstRecordByData('goals', 'name', 'Reserva de Emergência 6 Meses')
    } catch (_) {
      g1 = new Record(goalsCollection)
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
    }
    // Preenche os novos campos se vazios
    if (!g1.get('category')) {
      g1.set('category', 'Investimentos')
      app.save(g1)
    }
    if (!g1.get('description')) {
      g1.set('description', 'Montar uma reserva de 6 meses de despesas para emergências.')
      app.save(g1)
    }
    if (!g1.get('target_date')) {
      const d = new Date()
      d.setFullYear(d.getFullYear() + 1)
      g1.set('target_date', d.toISOString().slice(0, 10) + ' 00:00:00.000Z')
      app.save(g1)
    }

    let g2
    try {
      g2 = app.findFirstRecordByData('goals', 'name', 'Viagem Europa 2026')
    } catch (_) {
      g2 = new Record(goalsCollection)
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
    if (!g2.get('category')) {
      g2.set('category', 'Lazer')
      app.save(g2)
    }
    if (!g2.get('description')) {
      g2.set('description', 'Intercâmbio de 30 dias pela Europa com a família.')
      app.save(g2)
    }
    if (!g2.get('target_date')) {
      g2.set('target_date', '2026-06-15 00:00:00.000Z')
      app.save(g2)
    }

    // ---------- 3. Garante 4 orçamentos no mês corrente ----------
    const budgetsCollection = app.findCollectionByNameOrId('budgets')
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM

    const ensureBudget = (category, limitValue) => {
      try {
        app.findFirstRecordByData('budgets', 'category', category)
      } catch (_) {
        const b = new Record(budgetsCollection)
        b.set('user', userId)
        b.set('category', category)
        b.set('limit_value', limitValue)
        b.set('month', currentMonth)
        app.save(b)
      }
    }

    ensureBudget('Alimentação', 1800.0)
    ensureBudget('Transporte', 600.0)
    ensureBudget('Lazer', 700.0)
    ensureBudget('Moradia', 2500.0)
  },
  (app) => {},
)
