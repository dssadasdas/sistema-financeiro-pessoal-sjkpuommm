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

    // Verificar posse da conta consultando o banco real (evita cache corrompido do DAO)
    const records = $app
      .dao()
      .findRecordsByFilter('accounts', 'id = {:id}', undefined, 1, { id: accountId })
    if (records.length === 0) {
      return e.notFoundError('Conta não encontrada')
    }
    const account = records[0]

    if (account.getString('user') !== userId) {
      return e.forbiddenError('Conta não pertence ao usuário')
    }

    // 1. Encontrar TODAS as transações vinculadas (account = id OR transfer_target_account = id)
    const txns = $app
      .dao()
      .findRecordsByFilter(
        'transactions',
        'account = {:id} || transfer_target_account = {:id}',
        undefined,
        500,
        { id: accountId },
      )

    // 2. Para cada transação, desvincular bills e invoices que apontam para ela
    for (const tx of txns) {
      // Desvincular bills.generated_transaction
      const linkedBills = $app
        .dao()
        .findRecordsByFilter('bills', 'generated_transaction = {:txid}', undefined, 500, {
          txid: tx.id,
        })
      for (const bill of linkedBills) {
        bill.set('generated_transaction', '')
        $app.dao().saveRecord(bill)
      }

      // Desvincular invoices.payment_transaction
      const linkedInvoices = $app
        .dao()
        .findRecordsByFilter('invoices', 'payment_transaction = {:txid}', undefined, 500, {
          txid: tx.id,
        })
      for (const inv of linkedInvoices) {
        inv.set('payment_transaction', '')
        $app.dao().saveRecord(inv)
      }
    }

    // 3. Deletar TODAS as transações (via DAO, que gerencia cache e FKs)
    let deletedCount = txns.length
    for (const tx of txns) {
      $app.dao().deleteRecord(tx)
    }

    // 4. Desvincular account de bills, recurring_bills, recurrences
    const billsList = $app
      .dao()
      .findRecordsByFilter('bills', 'account = {:id}', undefined, 500, { id: accountId })
    for (const b of billsList) {
      b.set('account', '')
      $app.dao().saveRecord(b)
    }

    const recBillsList = $app
      .dao()
      .findRecordsByFilter('recurring_bills', 'account = {:id}', undefined, 500, { id: accountId })
    for (const rb of recBillsList) {
      rb.set('account', '')
      $app.dao().saveRecord(rb)
    }

    const recurrencesList = $app
      .dao()
      .findRecordsByFilter('recurrences', 'account = {:id}', undefined, 500, { id: accountId })
    for (const r of recurrencesList) {
      r.set('account', '')
      $app.dao().saveRecord(r)
    }

    // 5. Deletar a conta via raw SQL (evita bloqueio do hook onRecordDeleteRequest e bypass do cache)
    $app
      .dao()
      .db()
      .newQuery('DELETE FROM accounts WHERE id = {:id}')
      .bind({ id: accountId })
      .execute()

    return e.json(200, { success: true, deletedTransactions: deletedCount, accountId })
  },
  $apis.requireAuth(),
)
