routerAdd(
  'POST',
  '/backend/v1/reset-user-data',
  (e) => {
    try {
      const userId = e.auth ? e.auth.id : null
      if (!userId) {
        return e.unauthorizedError('Autenticação necessária')
      }

      const deletedCounts = {}

      // Executa deleção direta via SQL na ordem correta (filhos primeiro)
      // 1. invoice_items (subquery por invoices do user)
      try {
        const res1 = $app
          .db()
          .newQuery(
            'DELETE FROM invoice_items WHERE invoice IN (SELECT id FROM invoices WHERE user = {:uid})',
          )
          .bind({ uid: userId })
          .execute()
        deletedCounts.invoice_items = res1 ? res1.rowsAffected : 0
      } catch (err1) {
        console.warn('reset_user_data: erro ao deletar invoice_items:', err1)
      }

      // 2. goal_contributions (subquery por goals do user)
      try {
        const res2 = $app
          .db()
          .newQuery(
            'DELETE FROM goal_contributions WHERE goal IN (SELECT id FROM goals WHERE user = {:uid})',
          )
          .bind({ uid: userId })
          .execute()
        deletedCounts.goal_contributions = res2 ? res2.rowsAffected : 0
      } catch (err2) {
        console.warn('reset_user_data: erro ao deletar goal_contributions:', err2)
      }

      // 2.5 investment_contributions e investment_earnings (subquery por investments do user ou user = uid)
      try {
        const resContrib = $app
          .db()
          .newQuery('DELETE FROM investment_contributions WHERE user = {:uid}')
          .bind({ uid: userId })
          .execute()
        deletedCounts.investment_contributions = resContrib ? resContrib.rowsAffected : 0
      } catch (errC) {
        console.warn('reset_user_data: erro ao deletar investment_contributions:', errC)
      }

      try {
        const resEarn = $app
          .db()
          .newQuery('DELETE FROM investment_earnings WHERE user = {:uid}')
          .bind({ uid: userId })
          .execute()
        deletedCounts.investment_earnings = resEarn ? resEarn.rowsAffected : 0
      } catch (errE) {
        console.warn('reset_user_data: erro ao deletar investment_earnings:', errE)
      }

      // 3. Demais coleções diretamente por user = {:uid} na ordem segura
      const collections = [
        'transactions',
        'invoices',
        'bills',
        'recurring_bills',
        'recurrences',
        'installments',
        'budgets',
        'goals',
        'investments',
        'categorization_rules',
        'categories',
        'weekly_analyses',
        'credit_cards',
        'accounts',
      ]

      for (let i = 0; i < collections.length; i++) {
        const colName = collections[i]
        try {
          const res = $app
            .db()
            .newQuery('DELETE FROM ' + colName + ' WHERE user = {:uid}')
            .bind({ uid: userId })
            .execute()
          deletedCounts[colName] = res ? res.rowsAffected : 0
        } catch (colErr) {
          console.warn('reset_user_data: erro ao deletar de ' + colName + ':', colErr)
        }
      }

      return e.json(200, {
        success: true,
        deletedCounts: deletedCounts,
        message: 'Dados financeiros resetados com sucesso.',
      })
    } catch (err) {
      console.error('reset_user_data falhou:', err)
      return e.json(500, {
        error: (err && err.message) || 'Erro ao resetar dados financeiros',
      })
    }
  },
  $apis.requireAuth(),
)
