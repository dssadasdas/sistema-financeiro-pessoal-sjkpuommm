/// <reference path="../pb_data/types.d.ts" />

onRecordDeleteRequest((e) => {
  const record = e.record
  if (!record || !record.id) {
    e.next()
    return
  }

  const recordId = record.id

  // Verifica se o parâmetro ?cascade=true ou ?cascade=1 foi enviado na query string via request.url
  let isCascade = false
  try {
    if (e.httpContext && e.httpContext.request()) {
      const queryParams = e.httpContext.request().url.queryParameters() || {}
      const cascadeVal = queryParams.cascade
      const cascadeStr = Array.isArray(cascadeVal)
        ? String(cascadeVal[0] || '')
        : String(cascadeVal || '')
      isCascade = cascadeStr.toLowerCase() === 'true' || cascadeStr === '1'
    }
  } catch (_) {}

  if (isCascade) {
    // Modo cascade: limpa/desvincula e deleta atomicamente todos os dados dependentes via SQL antes de deletar a conta
    try {
      // 1. Desvincular referências de conta em bills, recurring_bills e recurrences
      try {
        $app
          .db()
          .newQuery('UPDATE bills SET account = NULL WHERE account = {:id}')
          .bind({ id: recordId })
          .execute()
      } catch (err) {
        console.warn('account_delete_protection: falha ao desvincular bills.account:', err)
      }

      try {
        $app
          .db()
          .newQuery('UPDATE recurring_bills SET account = NULL WHERE account = {:id}')
          .bind({ id: recordId })
          .execute()
      } catch (err) {
        console.warn(
          'account_delete_protection: falha ao desvincular recurring_bills.account:',
          err,
        )
      }

      try {
        $app
          .db()
          .newQuery('UPDATE recurrences SET account = NULL WHERE account = {:id}')
          .bind({ id: recordId })
          .execute()
      } catch (err) {
        console.warn('account_delete_protection: falha ao desvincular recurrences.account:', err)
      }

      // 2. Desvincular transações vinculadas à conta de bills (generated_transaction) e invoices (payment_transaction)
      try {
        $app
          .db()
          .newQuery(
            'UPDATE bills SET generated_transaction = NULL WHERE generated_transaction IN (SELECT id FROM transactions WHERE account = {:id} OR transfer_target_account = {:id})',
          )
          .bind({ id: recordId })
          .execute()
      } catch (err) {
        console.warn(
          'account_delete_protection: falha ao desvincular bills.generated_transaction:',
          err,
        )
      }

      try {
        $app
          .db()
          .newQuery(
            'UPDATE invoices SET payment_transaction = NULL WHERE payment_transaction IN (SELECT id FROM transactions WHERE account = {:id} OR transfer_target_account = {:id})',
          )
          .bind({ id: recordId })
          .execute()
      } catch (err) {
        console.warn(
          'account_delete_protection: falha ao desvincular invoices.payment_transaction:',
          err,
        )
      }

      // 3. Deletar todas as transações vinculadas à conta (onde account = id OU transfer_target_account = id)
      try {
        $app
          .db()
          .newQuery(
            'DELETE FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}',
          )
          .bind({ id: recordId })
          .execute()
      } catch (err) {
        console.warn('account_delete_protection: falha ao deletar transações vinculadas:', err)
      }
    } catch (cascadeErr) {
      console.warn('account_delete_protection: erro durante cascade SQL:', cascadeErr)
    }

    e.next()
    return
  }

  // Se cascade NÃO estiver presente, verifica se há movimentações vinculadas
  let linked = 0
  try {
    const row = $app
      .db()
      .newQuery(
        'SELECT count(*) as c FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}',
      )
      .bind({ id: recordId })
      .one()

    linked = row ? Number(row.c || 0) : 0
  } catch (queryErr) {
    console.warn('account_delete_protection: query falhou, permitindo exclusão:', queryErr)
    linked = 0
  }

  if (linked > 0) {
    throw new BadRequestError(
      'Esta conta possui ' +
        linked +
        ' movimentações vinculadas. Exclua as movimentações primeiro ou confirme a exclusão completa.',
      {
        code: 'linked_transactions',
        linkedCount: linked,
      },
    )
  }

  e.next()
}, 'accounts')
