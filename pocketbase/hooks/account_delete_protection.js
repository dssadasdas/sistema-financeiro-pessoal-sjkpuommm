/// <reference path="../pb_data/types.d.ts" />

onRecordDeleteRequest((e) => {
  const record = e.record
  if (!record || !record.id) {
    e.next()
    return
  }

  const recordId = record.id

  try {
    const row = $app
      .db()
      .newQuery(
        'SELECT count(*) as c FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}',
      )
      .bind({ id: recordId })
      .one()

    const linked = row ? Number(row.c || 0) : 0

    if (linked > 0) {
      // NUNCA usar throw aqui — retornar resposta HTTP diretamente
      const res = e.httpContext.response()
      res.status = 400
      res.json({
        message:
          'Esta conta possui ' +
          linked +
          ' movimentacoes vinculadas. Exclua as movimentacoes primeiro.',
        code: 'linked_transactions',
        linkedCount: linked,
      })
      return // NÃO chama e.next() — bloqueia a exclusão
    }
  } catch (queryErr) {
    // Se a query falhar (tabela não existe, etc.), permite a exclusão
    console.warn('account_delete_protection: query falhou, permitindo exclusão:', queryErr)
  }

  e.next()
}, 'accounts')
