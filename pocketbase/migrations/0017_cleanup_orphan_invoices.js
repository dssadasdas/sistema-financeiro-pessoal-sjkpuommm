/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    // 1. Exclui todos os invoice_items cujo invoice NÃO esteja nas faturas atuais
    // (1bwfy1ln69ga6f4 = Nubank, imkpruaz7gpo9vt = Itaú)
    try {
      app
        .db()
        .newQuery(
          "DELETE FROM invoice_items WHERE invoice NOT IN ('1bwfy1ln69ga6f4', 'imkpruaz7gpo9vt')",
        )
        .execute()
    } catch (e) {
      console.log('Erro ao limpar invoice_items órfãos:', e)
    }

    // 2. Exclui todas as invoices cujo id NÃO seja 1bwfy1ln69ga6f4 ou imkpruaz7gpo9vt
    try {
      app
        .db()
        .newQuery("DELETE FROM invoices WHERE id NOT IN ('1bwfy1ln69ga6f4', 'imkpruaz7gpo9vt')")
        .execute()
    } catch (e) {
      console.log('Erro ao limpar invoices órfãs:', e)
    }
  },
  (app) => {},
)
