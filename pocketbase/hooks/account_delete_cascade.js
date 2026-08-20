/// <reference path="../pb_data/types.d.ts" />

routerAdd(
  'POST',
  '/backend/v1/accounts/{id}/delete-cascade',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const accountId = e.request.pathValue('id')
      if (!accountId) {
        return e.badRequestError('ID da conta é obrigatório')
      }

      // Verifica se a conta existe e pertence ao usuário autenticado
      let accountRecord
      try {
        accountRecord = $app.findRecordById('accounts', accountId)
      } catch (err) {
        return e.notFoundError('Conta bancária não encontrada')
      }

      if (!accountRecord || accountRecord.getString('user') !== userId) {
        return e.forbiddenError('Conta não pertence ao usuário autenticado')
      }

      // 1. Desvincular bills.account = NULL
      try {
        $app
          .db()
          .newQuery('UPDATE bills SET account = NULL WHERE account = {:id}')
          .bind({ id: accountId })
          .execute()
      } catch (err) {
        console.warn('account_delete_cascade: falha ao desvincular bills.account:', err)
      }

      // 2. Desvincular recurring_bills.account = NULL
      try {
        $app
          .db()
          .newQuery('UPDATE recurring_bills SET account = NULL WHERE account = {:id}')
          .bind({ id: accountId })
          .execute()
      } catch (err) {
        console.warn('account_delete_cascade: falha ao desvincular recurring_bills.account:', err)
      }

      // 3. Desvincular recurrences.account = NULL
      try {
        $app
          .db()
          .newQuery('UPDATE recurrences SET account = NULL WHERE account = {:id}')
          .bind({ id: accountId })
          .execute()
      } catch (err) {
        console.warn('account_delete_cascade: falha ao desvincular recurrences.account:', err)
      }

      // 4. Desvincular bills.generated_transaction = NULL onde a transaction referencia esta conta
      try {
        $app
          .db()
          .newQuery(
            'UPDATE bills SET generated_transaction = NULL WHERE generated_transaction IN (SELECT id FROM transactions WHERE account = {:id} OR transfer_target_account = {:id})',
          )
          .bind({ id: accountId })
          .execute()
      } catch (err) {
        console.warn(
          'account_delete_cascade: falha ao desvincular bills.generated_transaction:',
          err,
        )
      }

      // 5. Desvincular invoices.payment_transaction = NULL
      try {
        $app
          .db()
          .newQuery(
            'UPDATE invoices SET payment_transaction = NULL WHERE payment_transaction IN (SELECT id FROM transactions WHERE account = {:id} OR transfer_target_account = {:id})',
          )
          .bind({ id: accountId })
          .execute()
      } catch (err) {
        console.warn(
          'account_delete_cascade: falha ao desvincular invoices.payment_transaction:',
          err,
        )
      }

      // Contar quantas transações serão excluídas para retorno informativo
      let deletedTransactionsCount = 0
      try {
        const countRow = $app
          .db()
          .newQuery(
            'SELECT count(*) as c FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}',
          )
          .bind({ id: accountId })
          .one()
        deletedTransactionsCount = countRow ? Number(countRow.c || 0) : 0
      } catch (err) {
        console.warn('account_delete_cascade: erro ao contar transações:', err)
      }

      // 6. Deletar TODAS as transações vinculadas
      try {
        $app
          .db()
          .newQuery(
            'DELETE FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}',
          )
          .bind({ id: accountId })
          .execute()
      } catch (err) {
        console.warn('account_delete_cascade: falha ao deletar transações vinculadas:', err)
      }

      // 7. Deletar a conta bancária (raw SQL, bypassa hooks)
      try {
        $app
          .db()
          .newQuery('DELETE FROM accounts WHERE id = {:id}')
          .bind({ id: accountId })
          .execute()
      } catch (err) {
        console.warn('account_delete_cascade: falha ao deletar a conta bancária via SQL:', err)
      }

      // Verificação pós-delete: confirmar que a conta foi realmente excluída
      let remainingCount = 0
      try {
        const verifyRow = $app
          .db()
          .newQuery('SELECT count(*) as c FROM accounts WHERE id = {:id}')
          .bind({ id: accountId })
          .one()
        remainingCount = verifyRow ? Number(verifyRow.c || 0) : 0
      } catch (err) {
        console.warn('account_delete_cascade: erro ao verificar exclusão da conta:', err)
      }

      const verifiedDeleted = remainingCount === 0

      if (!verifiedDeleted) {
        return e.json(500, {
          success: false,
          error: 'Falha ao confirmar exclusão da conta bancária.',
          accountId: accountId,
          verifiedDeleted: false,
        })
      }

      return e.json(200, {
        success: true,
        deletedTransactions: deletedTransactionsCount,
        accountId: accountId,
        verifiedDeleted: true,
        message: 'Conta e dados vinculados excluídos com sucesso.',
      })
    } catch (err) {
      console.error('account_delete_cascade erro geral:', err)
      return e.json(500, {
        error: (err && err.message) || 'Erro ao excluir conta com cascade',
      })
    }
  },
  $apis.requireAuth(),
)
