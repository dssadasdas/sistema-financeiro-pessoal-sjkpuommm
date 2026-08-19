cronAdd('recurring_generator', '0 3 * * *', () => {
  try {
    const recurrences = $app.findRecordsByFilter('recurrences', 'active = true', '', 500, 0)
    const now = new Date()
    const currentYear = now.getUTCFullYear()
    const currentMonth = now.getUTCMonth() // 0-11

    for (let i = 0; i < recurrences.length; i++) {
      const rec = recurrences[i]
      const dueDay = rec.getInt('due_day') || 1
      const userId = rec.getString('user')

      // Calcula a data de vencimento deste mês
      const targetDate = new Date(
        Date.UTC(currentYear, currentMonth, Math.min(dueDay, 28), 12, 0, 0),
      )
      const targetDateStr = targetDate.toISOString()
      const targetDateDay = targetDateStr.slice(0, 10)

      // Verifica se já gerou para este mês (busca transação com mesma data e source recorrência)
      const existing = $app.findRecordsByFilter(
        'transactions',
        "user = '" +
          userId +
          "' && source = 'recorrência' && date >= '" +
          targetDateDay +
          " 00:00:00.000Z' && date <= '" +
          targetDateDay +
          " 23:59:59.999Z' && description ~ '" +
          rec.getString('description').replace(/'/g, '') +
          "'",
        '',
        1,
        0,
      )

      if (existing.length === 0) {
        const txnCol = $app.findCollectionByNameOrId('transactions')
        const txn = new Record(txnCol)
        txn.set('user', userId)
        txn.set('description', rec.getString('description'))
        txn.set('value', rec.getFloat('value'))
        txn.set('category', rec.getString('category') || 'Recorrente')
        txn.set('date', targetDateStr)
        txn.set('payment_method', rec.getString('payment_method') || 'PIX')
        txn.set('status', 'pendente')
        txn.set('type', rec.getString('type') || 'despesa')
        txn.set('account', rec.getString('account') || '')
        txn.set('source', 'recorrência')
        $app.save(txn)

        rec.set('last_generated', targetDateStr)
        $app.save(rec)
      }
    }
  } catch (err) {
    console.log('Erro cron recurring_generator:', err)
  }
})
