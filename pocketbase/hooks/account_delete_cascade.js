/// <reference path="../pb_data/types.d.ts" />

routerAdd(
  'POST',
  '/backend/v1/accounts/{id}/delete-cascade',
  (e) => {
    const userId = e.auth?.id
    if (!userId) {
      return e.unauthorizedError('Autenticação necessária')
    }

    const accountId = e.request.pathValue('id')

    // Verificar posse da conta
    const rows = arrayOf(new DynamicModel({ user: '' }))
    $app
      .dao()
      .db()
      .newQuery('SELECT user FROM accounts WHERE id = {:id}')
      .bind({ id: accountId })
      .all(rows)

    if (rows.length === 0) {
      return e.notFoundError('Conta não encontrada')
    }
    if (rows[0].user !== userId) {
      return e.forbiddenError('Conta não pertence ao usuário')
    }

    // PASSO 1: Desvincular bills que referenciam transações desta conta
    $app
      .dao()
      .db()
      .newQuery(
        `UPDATE bills SET generated_transaction = NULL 
       WHERE generated_transaction IN (
         SELECT id FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}
       )`,
      )
      .bind({ id: accountId })
      .execute()

    // PASSO 2: Desvincular invoices que referenciam transações desta conta
    $app
      .dao()
      .db()
      .newQuery(
        `UPDATE invoices SET payment_transaction = NULL 
       WHERE payment_transaction IN (
         SELECT id FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}
       )`,
      )
      .bind({ id: accountId })
      .execute()

    // PASSO 3: Deletar TODAS as transações
    $app
      .dao()
      .db()
      .newQuery('DELETE FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}')
      .bind({ id: accountId })
      .execute()

    // PASSO 4: Desvincular bills.account
    $app
      .dao()
      .db()
      .newQuery('UPDATE bills SET account = NULL WHERE account = {:id}')
      .bind({ id: accountId })
      .execute()

    // PASSO 5: Desvincular recurring_bills.account
    $app
      .dao()
      .db()
      .newQuery('UPDATE recurring_bills SET account = NULL WHERE account = {:id}')
      .bind({ id: accountId })
      .execute()

    // PASSO 6: Desvincular recurrences.account
    $app
      .dao()
      .db()
      .newQuery('UPDATE recurrences SET account = NULL WHERE account = {:id}')
      .bind({ id: accountId })
      .execute()

    // PASSO 7: Deletar a conta
    $app
      .dao()
      .db()
      .newQuery('DELETE FROM accounts WHERE id = {:id}')
      .bind({ id: accountId })
      .execute()

    return e.json(200, { success: true, accountId })
  },
  $apis.requireAuth(),
)
