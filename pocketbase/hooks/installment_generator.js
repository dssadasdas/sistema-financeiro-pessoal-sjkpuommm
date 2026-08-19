onRecordAfterCreateSuccess((e) => {
  try {
    const record = e.record
    const groupId = record.id
    const totalInstallments = record.getInt('total_installments') || 1
    const installmentValue = record.getFloat('installment_value') || 0
    const description = record.getString('description')
    const category = record.getString('category') || 'Parcelamento'
    const creditCardId = record.getString('credit_card') || ''
    const userId = record.getString('user')
    const startDateStr = record.getString('start_date') || new Date().toISOString()
    const startDate = new Date(startDateStr)

    // Idempotência: se já existem parcelas geradas para este grupo, não recria
    let existing
    try {
      existing = $app.findRecordsByFilter(
        'transactions',
        "installment_group = '" + groupId + "' && source = 'parcela'",
        '',
        1,
        0,
      )
    } catch (_) {
      existing = []
    }
    if (existing && existing.length > 0) {
      e.next()
      return
    }

    const txnCol = $app.findCollectionByNameOrId('transactions')

    // Calcula valor base + último (distribui centavos na última)
    const totalValue = record.getFloat('total_value') || installmentValue * totalInstallments
    const baseValue = Math.floor((totalValue / totalInstallments) * 100) / 100
    const lastValue = Math.round((totalValue - baseValue * (totalInstallments - 1)) * 100) / 100

    for (let i = 1; i <= totalInstallments; i++) {
      const dueDate = new Date(startDate)
      dueDate.setMonth(dueDate.getMonth() + (i - 1))
      const dueDateIso = dueDate.toISOString()

      const txn = new Record(txnCol)
      txn.set('user', userId)
      txn.set('description', description + ' (' + i + '/' + totalInstallments + ')')
      txn.set('value', i === totalInstallments ? lastValue : baseValue)
      txn.set('category', category)
      txn.set('date', dueDateIso)
      txn.set('payment_method', 'Crédito')
      txn.set('status', i === 1 ? 'realizado' : 'pendente')
      txn.set('type', 'despesa')
      if (creditCardId) {
        txn.set('credit_card', creditCardId)
      }
      txn.set('installment_group', groupId)
      txn.set('source', 'parcela')
      if (i === 1) {
        txn.set('paid_at', dueDateIso)
      }
      $app.save(txn)
    }
  } catch (err) {
    console.log('Erro ao gerar parcelas:', err)
  }
  e.next()
}, 'installments')
