/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // ---------- 1. Limpa parcelas duplicadas (mantém a mais antiga por installment_group + descrição + data) ----------
    app
      .db()
      .newQuery(
        `DELETE FROM transactions
         WHERE source = 'parcela'
           AND id NOT IN (
             SELECT MIN(id) FROM transactions
             WHERE source = 'parcela'
             GROUP BY installment_group, description, date
           )`,
      )
      .execute()

    // ---------- 2. Recalcula current_installment a partir das parcelas pagas ----------
    try {
      const installments = app.findRecordsByFilter('installments', 'id != ""', '', 500, 0)
      for (let i = 0; i < installments.length; i++) {
        const inst = installments[i]
        const groupId = inst.id
        // busca parcelas pagas deste grupo
        let paidCount = 0
        try {
          const paid = app.findRecordsByFilter(
            'transactions',
            "installment_group = '" + groupId + "' && source = 'parcela' && status = 'realizado'",
            '',
            500,
            0,
          )
          paidCount = paid.length
        } catch (_) {}
        const total = inst.getInt('total_installments') || 1
        const next = Math.min(total, paidCount + 1)
        if (inst.getInt('current_installment') !== next) {
          inst.set('current_installment', next)
          app.save(inst)
        }
      }
    } catch (err) {
      console.log('Erro ao recalcular current_installment:', err)
    }
  },
  (app) => {},
)
