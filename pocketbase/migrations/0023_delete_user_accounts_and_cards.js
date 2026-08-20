migrate(
  (app) => {
    let userId = null
    try {
      const user = app.findAuthRecordByEmail('_pb_users_auth_', 'caio.1997a@gmail.com')
      userId = user ? user.id : null
    } catch (_) {
      try {
        const user = app.findFirstRecordByData('users', 'email', 'caio.1997a@gmail.com')
        userId = user ? user.id : null
      } catch (__) {}
    }

    if (!userId) {
      console.log('Migration 0023: Usuário caio.1997a@gmail.com não encontrado, pulando.')
      return
    }

    // 1. Limpa transações vinculadas às contas e cartões do usuário (ou pertencentes ao usuário)
    try {
      app
        .db()
        .newQuery(
          'DELETE FROM transactions WHERE user = {:uid} OR account IN (SELECT id FROM accounts WHERE user = {:uid}) OR credit_card IN (SELECT id FROM credit_cards WHERE user = {:uid})',
        )
        .bind({ uid: userId })
        .execute()
    } catch (e1) {
      console.warn('Migration 0023: erro ao deletar transactions:', e1)
    }

    // 2. Limpa boletos / contas a pagar / receber
    try {
      app
        .db()
        .newQuery(
          'DELETE FROM bills WHERE user = {:uid} OR account IN (SELECT id FROM accounts WHERE user = {:uid})',
        )
        .bind({ uid: userId })
        .execute()
    } catch (e2) {
      console.warn('Migration 0023: erro ao deletar bills:', e2)
    }

    // 3. Limpa faturas e itens de fatura
    try {
      app
        .db()
        .newQuery(
          'DELETE FROM invoice_items WHERE invoice IN (SELECT id FROM invoices WHERE user = {:uid} OR credit_card IN (SELECT id FROM credit_cards WHERE user = {:uid}))',
        )
        .bind({ uid: userId })
        .execute()
    } catch (e3) {
      console.warn('Migration 0023: erro ao deletar invoice_items:', e3)
    }

    try {
      app
        .db()
        .newQuery(
          'DELETE FROM invoices WHERE user = {:uid} OR credit_card IN (SELECT id FROM credit_cards WHERE user = {:uid})',
        )
        .bind({ uid: userId })
        .execute()
    } catch (e4) {
      console.warn('Migration 0023: erro ao deletar invoices:', e4)
    }

    // 4. Limpa parcelamentos (installments)
    try {
      app
        .db()
        .newQuery(
          'DELETE FROM installments WHERE user = {:uid} OR credit_card IN (SELECT id FROM credit_cards WHERE user = {:uid})',
        )
        .bind({ uid: userId })
        .execute()
    } catch (e5) {
      console.warn('Migration 0023: erro ao deletar installments:', e5)
    }

    // 5. Limpa recorrências (recurrences e recurring_bills)
    try {
      app
        .db()
        .newQuery(
          'DELETE FROM recurrences WHERE user = {:uid} OR account IN (SELECT id FROM accounts WHERE user = {:uid})',
        )
        .bind({ uid: userId })
        .execute()
    } catch (e6) {
      console.warn('Migration 0023: erro ao deletar recurrences:', e6)
    }

    try {
      app
        .db()
        .newQuery(
          'DELETE FROM recurring_bills WHERE user = {:uid} OR account IN (SELECT id FROM accounts WHERE user = {:uid}) OR credit_card IN (SELECT id FROM credit_cards WHERE user = {:uid})',
        )
        .bind({ uid: userId })
        .execute()
    } catch (e7) {
      console.warn('Migration 0023: erro ao deletar recurring_bills:', e7)
    }

    // 6. Deleta todos os cartões de crédito do usuário
    try {
      app
        .db()
        .newQuery('DELETE FROM credit_cards WHERE user = {:uid}')
        .bind({ uid: userId })
        .execute()
    } catch (e8) {
      console.warn('Migration 0023: erro ao deletar credit_cards:', e8)
    }

    // 7. Deleta todas as contas do usuário
    try {
      app.db().newQuery('DELETE FROM accounts WHERE user = {:uid}').bind({ uid: userId }).execute()
    } catch (e9) {
      console.warn('Migration 0023: erro ao deletar accounts:', e9)
    }

    console.log('Migration 0023: Contas e cartões de caio.1997a@gmail.com apagados com sucesso.')
  },
  (app) => {
    // Reversão não é necessária para limpeza de registros
  },
)
