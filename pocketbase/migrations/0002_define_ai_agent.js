/// <reference path="../pb_data/types.d.ts" />
migrate(
  (app) => {
    $ai.agents.define(app, {
      slug: 'ia-financeira',
      name: 'IA Financeira',
      description:
        'Analista financeiro pessoal brasileiro amigável que analisa dados de contas, cartões, despesas, receitas, metas e investimentos.',
      systemPrompt: `Você é a IA Financeira do sistema Raiz, um analista financeiro brasileiro amigável, transparente e altamente focado na saúde financeira do usuário.
Diretrizes:
1. Responda sempre em português brasileiro (pt-BR) de forma clara, amigável e direta, com emojis moderados.
2. Analise estritamente os dados reais do usuário (contas, transações, cartões, faturas, contas a pagar, orçamentos, metas e investimentos).
3. NUNCA invente valores, saldos ou transações que não constam nas ferramentas. Se faltarem informações ou você não souber, peça esclarecimentos ao usuário.
4. Forneça diagnósticos claros de saúde financeira (Saudável, Atenção ou Crítico), indique maiores gastos, economia do mês, compromissos futuros e sugestões de corte de despesas supérfluas.
5. Adicione sempre que oportuno a nota orientativa: "Esta análise é orientativa com base nos seus dados do Raiz e não constitui recomendação oficial de investimento."`,
      tier: 'fast',
      tools: [
        { collection: 'accounts', perms: { read: true, list: true } },
        { collection: 'transactions', perms: { read: true, list: true } },
        { collection: 'credit_cards', perms: { read: true, list: true } },
        { collection: 'invoices', perms: { read: true, list: true } },
        { collection: 'invoice_items', perms: { read: true, list: true } },
        { collection: 'bills', perms: { read: true, list: true } },
        { collection: 'goals', perms: { read: true, list: true } },
        { collection: 'goal_contributions', perms: { read: true, list: true } },
        { collection: 'budgets', perms: { read: true, list: true } },
        { collection: 'investments', perms: { read: true, list: true } },
        { collection: 'categorization_rules', perms: { read: true, list: true } },
      ],
      memory: [
        {
          type: 'faq',
          payload: {
            qa: [
              {
                question: 'Como importo uma fatura de cartão de crédito no Raiz?',
                answer:
                  'Acesse Cartões > Detalhe do Cartão > Importar Fatura. Você pode anexar arquivos PDF, imagens, CSV/TXT ou colar o texto da fatura. A IA lê os itens, detecta o banco e apresenta uma prévia com trava matemática antes de salvar.',
              },
              {
                question: 'Como o saldo das contas é calculado no Raiz?',
                answer:
                  'O saldo de cada conta é calculado automaticamente somando o saldo inicial cadastrado às transações realizadas (receitas, despesas e ajustes) vinculadas à respectiva conta.',
              },
              {
                question: 'O que é a trava matemática da importação de faturas?',
                answer:
                  'A trava matemática garante precisão: se a soma das compras extraídas diferir do total real da fatura em mais de R$ 0,50, a confirmação fica bloqueada até você conferir e ajustar as linhas.',
              },
              {
                question: 'Como funciona o pagamento de fatura?',
                answer:
                  "Ao clicar em 'Pagar fatura', você escolhe a conta bancária de débito. O Raiz gera uma única transação de despesa vinculada sem duplicar lançamentos e marca a fatura como paga.",
              },
            ],
          },
        },
        {
          type: 'text',
          payload: {
            text: 'O Raiz é o sistema financeiro pessoal completo com controle de receitas, despesas, contas, cartões, metas, orçamento mensal por categoria, previsão financeira, investimentos em cripto e CDI 100% e IA integrada.',
          },
        },
      ],
    })
  },
  (app) => {
    try {
      $ai.agents.delete(app, 'ia-financeira')
    } catch (_) {}
  },
)
