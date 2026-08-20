/// <reference path="../pb_data/types.d.ts" />
// Bloqueia a exclusão de contas bancárias ou cartões que possuem transações vinculadas.
// Proteção no backend (além da validação já feita no frontend).
onRecordDelete((e) => {
  const record = e.record
  if (!record || !record.id) {
    e.next()
    return
  }

  const recordId = record.id
  let linked = 0

  try {
    const row = $app
      .db()
      .newQuery(
        'SELECT count(*) as c FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}',
      )
      .bind({ id: recordId })
      .one()
    linked = row ? Number(row.c || 0) : 0
  } catch (err) {
    // Se a tabela transactions não existir ou a query falhar, não bloqueia
    linked = 0
  }

  if (linked > 0) {
    throw new BadRequestError(
      'Esta conta possui movimentações vinculadas e não pode ser excluída para não quebrar o histórico.',
    )
  }

  e.next()
}, 'accounts')
