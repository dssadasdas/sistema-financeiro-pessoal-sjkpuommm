migrate(
  (app) => {
    const targetAccountId = 'mqbynwvd06mnbwp'

    // 1. Desvincular bills onde generated_transaction aponta para transações da conta
    try {
      app
        .db()
        .newQuery(`
          UPDATE bills SET generated_transaction = NULL
          WHERE generated_transaction IN (
            SELECT id FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}
          )
        `)
        .bind({ id: targetAccountId })
        .execute()
    } catch (err) {
      console.warn(`Migration 0026: falha ao desvincular bills.generated_transaction:`, err)
    }

    // 2. Desvincular invoices onde payment_transaction aponta para transações da conta
    try {
      app
        .db()
        .newQuery(`
          UPDATE invoices SET payment_transaction = NULL
          WHERE payment_transaction IN (
            SELECT id FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}
          )
        `)
        .bind({ id: targetAccountId })
        .execute()
    } catch (err) {
      console.warn(`Migration 0026: falha ao desvincular invoices.payment_transaction:`, err)
    }

    // 3. Deletar transações vinculadas à conta
    try {
      app
        .db()
        .newQuery(
          'DELETE FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}',
        )
        .bind({ id: targetAccountId })
        .execute()
    } catch (err) {
      console.warn(`Migration 0026: falha ao deletar transações da conta ${targetAccountId}:`, err)
    }

    // 4. Desvincular bills.account
    try {
      app
        .db()
        .newQuery('UPDATE bills SET account = NULL WHERE account = {:id}')
        .bind({ id: targetAccountId })
        .execute()
    } catch (err) {
      console.warn(`Migration 0026: falha ao desvincular bills.account:`, err)
    }

    // 5. Desvincular recurring_bills.account
    try {
      app
        .db()
        .newQuery('UPDATE recurring_bills SET account = NULL WHERE account = {:id}')
        .bind({ id: targetAccountId })
        .execute()
    } catch (err) {
      console.warn(`Migration 0026: falha ao desvincular recurring_bills.account:`, err)
    }

    // 6. Desvincular recurrences.account
    try {
      app
        .db()
        .newQuery('UPDATE recurrences SET account = NULL WHERE account = {:id}')
        .bind({ id: targetAccountId })
        .execute()
    } catch (err) {
      console.warn(`Migration 0026: falha ao desvincular recurrences.account:`, err)
    }

    // 7. Deletar a conta de teste
    try {
      app
        .db()
        .newQuery('DELETE FROM accounts WHERE id = {:id}')
        .bind({ id: targetAccountId })
        .execute()
    } catch (err) {
      console.warn(`Migration 0026: falha ao deletar conta ${targetAccountId}:`, err)
    }

    console.log(`Migration 0026: conta de teste ${targetAccountId} limpa com sucesso.`)
  },
  (app) => {
    // Reversão não aplicável para limpeza de registros de teste
  },
)
