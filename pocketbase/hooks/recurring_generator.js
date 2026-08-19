// Cron diário: gera contas (bills) a partir das recorrências ativas em recurring_bills.
// Para cada recorrência ativa cuja next_date <= hoje, cria uma bill (se ainda não existir
// para o mesmo recurring_bill + mês) e avança next_date conforme a frequência.
cronAdd('recurring_generator', '0 3 * * *', () => {
  try {
    const recurrences = $app.findRecordsByFilter(
      'recurring_bills',
      'active = true',
      'next_date',
      500,
      0,
    )
    const now = new Date()
    const todayStr = now.toISOString().slice(0, 10)

    const billsCol = $app.findCollectionByNameOrId('bills')

    for (let i = 0; i < recurrences.length; i++) {
      const rec = recurrences[i]
      const nextDateStr = rec.getString('next_date') || ''
      if (!nextDateStr) continue
      const nextDate = new Date(nextDateStr)
      const nextDateDay = nextDateStr.slice(0, 10)

      // Só gera se a próxima data já chegou (<= hoje)
      if (nextDateDay > todayStr) continue

      const userId = rec.getString('user')
      const description = rec.getString('description')
      const value = rec.getFloat('value')
      const category = rec.getString('category') || ''
      const type = rec.getString('type') || 'pagar'
      const account = rec.getString('account') || ''
      const frequency = rec.getString('frequency') || 'mensal'
      const repetitions = rec.getInt('repetitions') || 0
      const generatedCount = rec.getInt('generated_count') || 0

      // Verifica fim (repetitions = 0 => infinito)
      if (repetitions > 0 && generatedCount >= repetitions) {
        rec.set('active', false)
        $app.save(rec)
        continue
      }

      // Dedup: mesma recurring_bill + mesmo mês (YYYY-MM)
      const monthKey = nextDateDay.slice(0, 7)
      let existing
      try {
        existing = $app.findRecordsByFilter(
          'bills',
          "recurring_bill = '" +
            rec.id +
            "' && due_date >= '" +
            monthKey +
            "-01 00:00:00.000Z' && due_date <= '" +
            monthKey +
            "-31 23:59:59.999Z'",
          '',
          1,
          0,
        )
      } catch (_) {
        existing = []
      }
      if (!existing || existing.length === 0) {
        const bill = new Record(billsCol)
        bill.set('user', userId)
        bill.set('description', description)
        bill.set('value', value)
        bill.set('due_date', nextDateStr)
        bill.set('category', category)
        bill.set('status', 'não_pago')
        bill.set('type', type)
        if (account) bill.set('account', account)
        bill.set('recurring', true)
        bill.set('recurring_bill', rec.id)
        $app.save(bill)

        rec.set('last_generated', nextDateStr)
        rec.set('generated_count', generatedCount + 1)
      }

      // Avança next_date conforme frequência
      const newNext = new Date(nextDate)
      if (frequency === 'semanal') {
        newNext.setDate(newNext.getDate() + 7)
      } else if (frequency === 'trimestral') {
        newNext.setMonth(newNext.getMonth() + 3)
      } else if (frequency === 'anual') {
        newNext.setFullYear(newNext.getFullYear() + 1)
      } else {
        // mensal
        newNext.setMonth(newNext.getMonth() + 1)
      }
      rec.set('next_date', newNext.toISOString())
      $app.save(rec)
    }
  } catch (err) {
    console.log('Erro cron recurring_generator:', err)
  }
})

// Rota sob demanda: dispara a mesma geração (útil ao abrir a página de Recorrências).
// POST /backend/v1/recurring/generate  (requer auth)
routerAdd(
  'POST',
  '/backend/v1/recurring/generate',
  (e) => {
    try {
      const recurrences = $app.findRecordsByFilter(
        'recurring_bills',
        'active = true',
        'next_date',
        500,
        0,
      )
      const now = new Date()
      const todayStr = now.toISOString().slice(0, 10)
      const billsCol = $app.findCollectionByNameOrId('bills')
      let generated = 0

      for (let i = 0; i < recurrences.length; i++) {
        const rec = recurrences[i]
        const nextDateStr = rec.getString('next_date') || ''
        if (!nextDateStr) continue
        const nextDate = new Date(nextDateStr)
        const nextDateDay = nextDateStr.slice(0, 10)
        if (nextDateDay > todayStr) continue

        const userId = rec.getString('user')
        const description = rec.getString('description')
        const value = rec.getFloat('value')
        const category = rec.getString('category') || ''
        const type = rec.getString('type') || 'pagar'
        const account = rec.getString('account') || ''
        const frequency = rec.getString('frequency') || 'mensal'
        const repetitions = rec.getInt('repetitions') || 0
        const generatedCount = rec.getInt('generated_count') || 0

        if (repetitions > 0 && generatedCount >= repetitions) {
          rec.set('active', false)
          $app.save(rec)
          continue
        }

        const monthKey = nextDateDay.slice(0, 7)
        let existing
        try {
          existing = $app.findRecordsByFilter(
            'bills',
            "recurring_bill = '" +
              rec.id +
              "' && due_date >= '" +
              monthKey +
              "-01 00:00:00.000Z' && due_date <= '" +
              monthKey +
              "-31 23:59:59.999Z'",
            '',
            1,
            0,
          )
        } catch (_) {
          existing = []
        }
        if (!existing || existing.length === 0) {
          const bill = new Record(billsCol)
          bill.set('user', userId)
          bill.set('description', description)
          bill.set('value', value)
          bill.set('due_date', nextDateStr)
          bill.set('category', category)
          bill.set('status', 'não_pago')
          bill.set('type', type)
          if (account) bill.set('account', account)
          bill.set('recurring', true)
          bill.set('recurring_bill', rec.id)
          $app.save(bill)
          generated++
          rec.set('last_generated', nextDateStr)
          rec.set('generated_count', generatedCount + 1)
        }

        const newNext = new Date(nextDate)
        if (frequency === 'semanal') {
          newNext.setDate(newNext.getDate() + 7)
        } else if (frequency === 'trimestral') {
          newNext.setMonth(newNext.getMonth() + 3)
        } else if (frequency === 'anual') {
          newNext.setFullYear(newNext.getFullYear() + 1)
        } else {
          newNext.setMonth(newNext.getMonth() + 1)
        }
        rec.set('next_date', newNext.toISOString())
        $app.save(rec)
      }

      return e.json(200, { ok: true, generated: generated })
    } catch (err) {
      return e.json(500, { error: 'Erro ao gerar recorrências: ' + err })
    }
  },
  $apis.requireAuth(),
)
