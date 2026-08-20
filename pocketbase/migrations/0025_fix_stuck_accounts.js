migrate(
  (app) => {
    const targetAccountIds = ['d2xmry3mmff95td', 'ip3r4jjde8s513i', '2firm0i42fjjgkh']

    for (const accId of targetAccountIds) {
      // 1. Desvincular bills.account
      try {
        app
          .db()
          .newQuery('UPDATE bills SET account = "" WHERE account = {:id}')
          .bind({ id: accId })
          .execute()
      } catch (err) {
        console.warn(`Migration 0025: falha ao desvincular bills da conta ${accId}:`, err)
      }

      // 2. Desvincular recurring_bills.account
      try {
        app
          .db()
          .newQuery('UPDATE recurring_bills SET account = "" WHERE account = {:id}')
          .bind({ id: accId })
          .execute()
      } catch (err) {
        console.warn(`Migration 0025: falha ao desvincular recurring_bills da conta ${accId}:`, err)
      }

      // 3. Desvincular recurrences.account
      try {
        app
          .db()
          .newQuery('UPDATE recurrences SET account = "" WHERE account = {:id}')
          .bind({ id: accId })
          .execute()
      } catch (err) {
        console.warn(`Migration 0025: falha ao desvincular recurrences da conta ${accId}:`, err)
      }

      // 4. Desvincular bills onde generated_transaction aponta para transações da conta
      try {
        app
          .db()
          .newQuery(`
            UPDATE bills SET generated_transaction = ""
            WHERE generated_transaction IN (
              SELECT id FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}
            )
          `)
          .bind({ id: accId })
          .execute()
      } catch (err) {
        console.warn(`Migration 0025: falha ao desvincular bills.generated_transaction:`, err)
      }

      // 5. Desvincular invoices onde payment_transaction aponta para transações da conta
      try {
        app
          .db()
          .newQuery(`
            UPDATE invoices SET payment_transaction = ""
            WHERE payment_transaction IN (
              SELECT id FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}
            )
          `)
          .bind({ id: accId })
          .execute()
      } catch (err) {
        console.warn(`Migration 0025: falha ao desvincular invoices.payment_transaction:`, err)
      }

      // 6. Deletar todas as transações vinculadas à conta
      try {
        app
          .db()
          .newQuery(
            'DELETE FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}',
          )
          .bind({ id: accId })
          .execute()
      } catch (err) {
        console.warn(`Migration 0025: falha ao deletar transações da conta ${accId}:`, err)
      }

      // 7. Deletar a conta
      try {
        app.db().newQuery('DELETE FROM accounts WHERE id = {:id}').bind({ id: accId }).execute()
      } catch (err) {
        console.warn(`Migration 0025: falha ao deletar conta ${accId}:`, err)
      }
    }

    console.log(
      'Migration 0025: 3 contas problemáticas e transações limpas via raw SQL com sucesso.',
    )
  },
  (app) => {
    // Reversão não aplicável para deleção de registros
  },
)
