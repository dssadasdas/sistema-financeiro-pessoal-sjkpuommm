/// <reference path="../pb_data/types.d.ts" />

onRecordDeleteRequest((e) => {
  if (e.collection?.name !== 'accounts') {
    e.next()
    return
  }

  const recordId = e.record?.id
  if (!recordId) {
    e.next()
    return
  }

  // Verificar cascade na query string
  let cascade = false
  try {
    const qp = e.httpContext?.request()?.url?.queryParameters?.() || {}
    const val = Array.isArray(qp.cascade) ? qp.cascade[0] : qp.cascade
    cascade = String(val || '').toLowerCase() === 'true' || String(val || '') === '1'
  } catch {}

  if (cascade) {
    e.next()
    return
  }

  // Verificar transações vinculadas
  const row = arrayOf(
    new DynamicModel({
      c: 0,
    }),
  )
  $app
    .db()
    .newQuery(
      'SELECT count(*) as c FROM transactions WHERE account = {:id} OR transfer_target_account = {:id}',
    )
    .bind({ id: recordId })
    .one(row)
  const linked = row[0]?.c || 0

  if (linked > 0) {
    throw new BadRequestError('Esta conta possui movimentações vinculadas.', {
      code: 'linked_transactions',
      linkedCount: linked,
    })
  }

  e.next()
}, 'accounts')
