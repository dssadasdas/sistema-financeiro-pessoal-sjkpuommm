/// <reference path="../pb_data/types.d.ts" />
// Bloqueia a exclusão de contas bancárias que possuem transações vinculadas.
// Proteção no backend (além da validação já feita no frontend).
onRecordDelete((e) => {
  const record = e.record
  if (!record) {
    e.next()
    return
  }

  let linked = 0
  try {
    const row = $app
      .db()
      .newQuery(
        'SELECT count(*) as c FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}',
      )
      .bind({ id: record.id })
      .one()
    linked = row ? Number(row.c || 0) : 0
  } catch (_) {
    linked = 0
  }

  if (linked > 0) {
    throw new Error(
      'Esta conta possui movimentações vinculadas e não pode ser excluída para não quebrar o histórico.',
    )
  }

  e.next()
}, 'accounts')
