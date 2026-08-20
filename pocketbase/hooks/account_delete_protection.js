/// <reference path="../pb_data/types.d.ts" />
// Proteção de exclusão de contas bancárias:
// Impede a exclusão via API caso ainda existam transações atreladas à conta,
// evitando órfãos ou quebra de integridade contábil.
onRecordDeleteRequest((e) => {
  try {
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
      linked = 0
    }

    if (linked > 0) {
      throw new BadRequestError(
        'Esta conta possui movimentações vinculadas e não pode ser excluída para não quebrar o histórico. Exclua as movimentações primeiro.',
      )
    }
  } catch (err) {
    if (err instanceof BadRequestError) {
      throw err
    }
    // Se ocorrer qualquer erro inesperado no hook, repassa para não causar 500 indevido
    console.error('Erro em account_delete_protection:', err)
  }

  e.next()
}, 'accounts')
