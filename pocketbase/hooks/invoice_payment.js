routerAdd(
  'POST',
  '/backend/v1/invoices/{id}/pay',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const invoiceId = e.request.pathValue('id')
      const body = e.requestInfo().body || {}
      const accountId = body.accountId

      if (!accountId) {
        return e.badRequestError('Conta bancária de pagamento é obrigatória')
      }

      // Busca fatura e valida se pertence ao usuário
      const invoice = $app.findRecordById('invoices', invoiceId)
      if (!invoice || invoice.getString('user') !== userId) {
        return e.notFoundError('Fatura não encontrada ou sem permissão')
      }

      if (invoice.getString('status') === 'paga') {
        return e.badRequestError('Esta fatura já foi paga anteriormente')
      }

      // Busca conta e valida
      const account = $app.findRecordById('accounts', accountId)
      if (!account || account.getString('user') !== userId) {
        return e.badRequestError('Conta bancária selecionada é inválida')
      }

      const totalValue = invoice.getFloat('total') || 0
      const nowIso = new Date().toISOString()
      const cardId = invoice.getString('credit_card')
      const card = $app.findRecordById('credit_cards', cardId)
      const cardName = card ? card.getString('name') : 'Cartão'

      // Cria a transação de pagamento de fatura (tipo despesa, source fatura)
      const transactionsCol = $app.findCollectionByNameOrId('transactions')
      const txn = new Record(transactionsCol)
      txn.set('user', userId)
      txn.set(
        'description',
        'Pagamento de Fatura - ' + cardName + ' (' + invoice.getString('reference') + ')',
      )
      txn.set('value', totalValue)
      txn.set('category', 'Fatura de cartão')
      txn.set('date', nowIso)
      txn.set('payment_method', 'Débito')
      txn.set('status', 'realizado')
      txn.set('type', 'despesa')
      txn.set('account', accountId)
      txn.set('credit_card', cardId)
      txn.set('source', 'fatura')
      txn.set('paid_at', nowIso)
      $app.save(txn)

      // Atualiza fatura
      invoice.set('status', 'paga')
      invoice.set('paid_at', nowIso)
      invoice.set('payment_transaction', txn.id)
      $app.save(invoice)

      return e.json(200, {
        success: true,
        transaction_id: txn.id,
        invoice_id: invoice.id,
        message: 'Fatura paga com sucesso e despesa registrada.',
      })
    } catch (err) {
      return e.json(500, { error: err.message || 'Erro ao pagar fatura' })
    }
  },
  $apis.requireAuth(),
)
