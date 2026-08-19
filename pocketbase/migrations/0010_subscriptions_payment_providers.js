// Estende a coleção `subscriptions` para suportar múltiplos provedores de
// pagamento (Stripe e Mercado Pago). Mantém total compatibilidade com o modelo
// existente (plan mensal/anual, status ativa/bloqueada) — os status dos
// provedores são normalizados em ativa/bloqueada nos hooks de webhook.
//
// Campos adicionados:
//   provider                    select("stripe" | "mercadopago")
//   provider_subscription_id   text  (id da assinatura no provedor)
//   provider_customer_id        text  (id do customer no provedor)
//   current_period_start        date  (início do ciclo atual)
//   current_period_end           date  (fim do ciclo atual / próxima renovação)
//   cancel_at_period_end        bool  (cancelada, mas válida até o fim do ciclo)
migrate(
  (app) => {
    const col = app.findCollectionByNameOrId('subscriptions')

    if (!col.fields.getByName('provider')) {
      col.fields.add(
        new SelectField({
          name: 'provider',
          required: false,
          values: ['stripe', 'mercadopago'],
          maxSelect: 1,
        }),
      )
    }

    if (!col.fields.getByName('provider_subscription_id')) {
      col.fields.add(new TextField({ name: 'provider_subscription_id' }))
    }

    if (!col.fields.getByName('provider_customer_id')) {
      col.fields.add(new TextField({ name: 'provider_customer_id' }))
    }

    if (!col.fields.getByName('current_period_start')) {
      col.fields.add(new DateField({ name: 'current_period_start' }))
    }

    if (!col.fields.getByName('current_period_end')) {
      col.fields.add(new DateField({ name: 'current_period_end' }))
    }

    if (!col.fields.getByName('cancel_at_period_end')) {
      col.fields.add(new BoolField({ name: 'cancel_at_period_end' }))
    }

    col.addIndex(
      'idx_subscriptions_provider_sub',
      true,
      'provider, provider_subscription_id',
      "provider_subscription_id != ''",
    )
    col.addIndex('idx_subscriptions_customer', false, 'provider_customer_id', '')

    app.save(col)
  },
  (app) => {
    const col = app.findCollectionByNameOrId('subscriptions')
    try {
      col.removeIndex('idx_subscriptions_provider_sub')
    } catch (_) {}
    try {
      col.removeIndex('idx_subscriptions_customer')
    } catch (_) {}
    ;[
      'provider',
      'provider_subscription_id',
      'provider_customer_id',
      'current_period_start',
      'current_period_end',
      'cancel_at_period_end',
    ].forEach(function (n) {
      try {
        col.fields.removeByName(n)
      } catch (_) {}
    })
    app.save(col)
  },
)
