migrate(
  (app) => {
    const targetAccountIds = ['0uehm6mgl888hqi', '5a80lgakg1n6ov6', 'u1nsh50mbt0853a']

    for (const accId of targetAccountIds) {
      // 1. Desvincular bills.account
      try {
        const bills = app.findRecordsByFilter('bills', 'account = {:id}', '', 500, 0, { id: accId })
        for (const b of bills) {
          b.set('account', '')
          app.save(b)
        }
      } catch (err) {
        console.warn(`Migration 0024: falha ao desvincular bills da conta ${accId}:`, err)
      }

      // 2. Desvincular recurring_bills.account
      try {
        const recBills = app.findRecordsByFilter('recurring_bills', 'account = {:id}', '', 500, 0, {
          id: accId,
        })
        for (const rb of recBills) {
          rb.set('account', '')
          app.save(rb)
        }
      } catch (err) {
        console.warn(`Migration 0024: falha ao desvincular recurring_bills da conta ${accId}:`, err)
      }

      // 3. Desvincular recurrences.account
      try {
        const recurrences = app.findRecordsByFilter('recurrences', 'account = {:id}', '', 500, 0, {
          id: accId,
        })
        for (const r of recurrences) {
          r.set('account', '')
          app.save(r)
        }
      } catch (err) {
        console.warn(`Migration 0024: falha ao desvincular recurrences da conta ${accId}:`, err)
      }

      // 4. Encontrar TODAS as transações onde account = id OR transfer_target_account = id
      let txns = []
      try {
        txns = app.findRecordsByFilter(
          'transactions',
          'account = {:id} || transfer_target_account = {:id}',
          '',
          500,
          0,
          { id: accId },
        )
      } catch (err) {
        console.warn(`Migration 0024: erro ao buscar transações da conta ${accId}:`, err)
      }

      // 5. Para cada transação vinculada:
      for (const tx of txns) {
        // Se tiver bill_id ou apontar em bills.generated_transaction, desvincular
        try {
          const linkedBills = app.findRecordsByFilter(
            'bills',
            'generated_transaction = {:txid}',
            '',
            500,
            0,
            { txid: tx.id },
          )
          for (const bill of linkedBills) {
            bill.set('generated_transaction', '')
            app.save(bill)
          }
        } catch (err) {
          console.warn(
            `Migration 0024: erro ao desvincular bills.generated_transaction para tx ${tx.id}:`,
            err,
          )
        }

        try {
          const linkedInvoices = app.findRecordsByFilter(
            'invoices',
            'payment_transaction = {:txid}',
            '',
            500,
            0,
            { txid: tx.id },
          )
          for (const inv of linkedInvoices) {
            inv.set('payment_transaction', '')
            app.save(inv)
          }
        } catch (err) {
          console.warn(
            `Migration 0024: erro ao desvincular invoices.payment_transaction para tx ${tx.id}:`,
            err,
          )
        }

        // Deleta a transação
        try {
          app.delete(tx)
        } catch (err) {
          console.warn(`Migration 0024: erro ao deletar tx ${tx.id}:`, err)
        }
      }

      // 6. Deleta a conta
      try {
        const accRecord = app.findRecordById('accounts', accId)
        if (accRecord) {
          app.delete(accRecord)
        }
      } catch (err) {
        // Conta pode não existir
        console.log(`Migration 0024: conta ${accId} não encontrada ou já deletada.`)
      }
    }

    console.log('Migration 0024: Contas problemáticas limpas com sucesso.')
  },
  (app) => {
    // Reversão não aplicável para deleção de registros
  },
)
