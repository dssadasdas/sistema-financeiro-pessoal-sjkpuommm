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

      // 1. Desvincular bills onde account = id
      try {
        const bills = $app.findRecordsByFilter('bills', 'account = {:id}', '', 5000, 0, {
          id: accountId,
        })
        for (let i = 0; i < bills.length; i++) {
          try {
            bills[i].set('account', null)
            $app.save(bills[i])
          } catch (billErr) {
            console.warn(
              'account_delete_cascade: falha ao atualizar bill ' + bills[i].id + ':',
              billErr,
            )
          }
        }
      } catch (billsFilterErr) {
        console.warn('account_delete_cascade: erro ao buscar bills:', billsFilterErr)
      }

      // 2. Desvincular recurring_bills onde account = id
      try {
        const recurringBills = $app.findRecordsByFilter(
          'recurring_bills',
          'account = {:id}',
          '',
          5000,
          0,
          { id: accountId },
        )
        for (let i = 0; i < recurringBills.length; i++) {
          try {
            recurringBills[i].set('account', null)
            $app.save(recurringBills[i])
          } catch (recBillErr) {
            console.warn(
              'account_delete_cascade: falha ao atualizar recurring_bill ' +
                recurringBills[i].id +
                ':',
              recBillErr,
            )
          }
        }
      } catch (recBillsFilterErr) {
        console.warn('account_delete_cascade: erro ao buscar recurring_bills:', recBillsFilterErr)
      }

      // 3. Desvincular recurrences onde account = id
      try {
        const recurrences = $app.findRecordsByFilter(
          'recurrences',
          'account = {:id}',
          '',
          5000,
          0,
          { id: accountId },
        )
        for (let i = 0; i < recurrences.length; i++) {
          try {
            recurrences[i].set('account', null)
            $app.save(recurrences[i])
          } catch (recErr) {
            console.warn(
              'account_delete_cascade: falha ao atualizar recurrence ' + recurrences[i].id + ':',
              recErr,
            )
          }
        }
      } catch (recFilterErr) {
        console.warn('account_delete_cascade: erro ao buscar recurrences:', recFilterErr)
      }

      // 4. Buscar e deletar todas as transações vinculadas (account = id OU transfer_target_account = id)
      let deletedTransactionsCount = 0

      // Transações onde account = id
      try {
        const txnsAsAccount = $app.findRecordsByFilter(
          'transactions',
          'account = {:id}',
          '',
          5000,
          0,
          { id: accountId },
        )
        for (let i = 0; i < txnsAsAccount.length; i++) {
          try {
            $app.delete(txnsAsAccount[i])
            deletedTransactionsCount++
          } catch (txnErr) {
            console.warn(
              'account_delete_cascade: falha ao deletar transaction ' + txnsAsAccount[i].id + ':',
              txnErr,
            )
          }
        }
      } catch (txnAccFilterErr) {
        console.warn(
          'account_delete_cascade: erro ao buscar transações de account:',
          txnAccFilterErr,
        )
      }

      // Transações onde transfer_target_account = id
      try {
        const txnsAsTarget = $app.findRecordsByFilter(
          'transactions',
          'transfer_target_account = {:id}',
          '',
          5000,
          0,
          { id: accountId },
        )
        for (let i = 0; i < txnsAsTarget.length; i++) {
          try {
            $app.delete(txnsAsTarget[i])
            deletedTransactionsCount++
          } catch (txnTargetErr) {
            console.warn(
              'account_delete_cascade: falha ao deletar transaction target ' +
                txnsAsTarget[i].id +
                ':',
              txnTargetErr,
            )
          }
        }
      } catch (txnTargetFilterErr) {
        console.warn(
          'account_delete_cascade: erro ao buscar transações de transfer_target_account:',
          txnTargetFilterErr,
        )
      }

      // 5. Por fim, deleta a conta bancária
      $app.delete(accountRecord)

      return e.json(200, {
        success: true,
        deletedTransactions: deletedTransactionsCount,
        accountId: accountId,
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
