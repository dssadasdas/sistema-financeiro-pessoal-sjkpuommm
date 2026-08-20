/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Estende a coleção 'bills' com novos campos aditivos: barcode, paid_date
    const billsCol = app.findCollectionByNameOrId('bills')

    if (!billsCol.fields.getByName('barcode')) {
      billsCol.fields.add(
        new TextField({
          name: 'barcode',
          required: false,
        }),
      )
    }

    if (!billsCol.fields.getByName('paid_date')) {
      billsCol.fields.add(
        new DateField({
          name: 'paid_date',
          required: false,
        }),
      )
    }

    app.save(billsCol)

    // 2. Estende a coleção 'transactions' com novos campos aditivos:
    // - bill_id (relation para bills)
    // - transfer_target_account (relation para accounts, no caso de transferências entre contas)
    // - transfer_group_id (texto / uuid para agrupar as duas pontas da transferência)
    // - type: atualiza select values se necessário para garantir suporte total a transferências
    const transactionsCol = app.findCollectionByNameOrId('transactions')

    if (!transactionsCol.fields.getByName('bill_id')) {
      billsCol.id // garante que billsCol está acessível
      transactionsCol.fields.add(
        new RelationField({
          name: 'bill_id',
          collectionId: billsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    if (!transactionsCol.fields.getByName('transfer_target_account')) {
      const accountsCol = app.findCollectionByNameOrId('accounts')
      transactionsCol.fields.add(
        new RelationField({
          name: 'transfer_target_account',
          collectionId: accountsCol.id,
          cascadeDelete: false,
          maxSelect: 1,
          required: false,
        }),
      )
    }

    if (!transactionsCol.fields.getByName('transfer_group_id')) {
      transactionsCol.fields.add(
        new TextField({
          name: 'transfer_group_id',
          required: false,
        }),
      )
    }

    // Adiciona o valor 'transferencia' no select type de transactions caso necessário,
    // ou usamos payment_method 'Transferência' com type 'despesa'/'receita' e transfer_group_id
    // para garantir total retrocompatibilidade
    app.save(transactionsCol)
  },
  (app) => {
    try {
      const billsCol = app.findCollectionByNameOrId('bills')
      if (billsCol.fields.getByName('barcode')) billsCol.fields.removeByName('barcode')
      if (billsCol.fields.getByName('paid_date')) billsCol.fields.removeByName('paid_date')
      app.save(billsCol)
    } catch (_) {}

    try {
      const txCol = app.findCollectionByNameOrId('transactions')
      if (txCol.fields.getByName('bill_id')) txCol.fields.removeByName('bill_id')
      if (txCol.fields.getByName('transfer_target_account'))
        txCol.fields.removeByName('transfer_target_account')
      if (txCol.fields.getByName('transfer_group_id'))
        txCol.fields.removeByName('transfer_group_id')
      app.save(txCol)
    } catch (_) {}
  },
)
