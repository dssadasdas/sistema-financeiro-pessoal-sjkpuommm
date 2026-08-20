import { describe, it, expect } from 'vitest'
import {
  detectAnomalies,
  calculateHealthScore,
  evaluateCanSpendPurchase,
  identifySavingsOpportunities,
  generateWeeklySummary,
  FinancialContextData,
} from './anomalyDetector'
import { evaluateLocalDeterministicAnswer } from './aiAdvisor'
import {
  Account,
  Bill,
  Budget,
  Goal,
  Installment,
  Investment,
  Invoice,
  RecurringBill,
  Transaction,
} from '@/types/finance'

describe('ETAPA 5 — Testes do Motor de IA Financeira, Anomalias e Saúde Financeira', () => {
  const dummyAccount: Account = {
    id: 'acc1',
    user: 'user1',
    name: 'Conta Corrente Nubank',
    bank: 'Nubank',
    type: 'Conta corrente',
    opening_balance: 5000,
    current_balance: 5000,
    created: '2025-01-01',
    updated: '2025-01-01',
  }

  const defaultTx = {
    payment_method: 'Débito' as const,
    created: '2025-01-01',
    updated: '2025-01-01',
  }

  // Helper para montar contexto base
  function createBaseContext(overrides?: Partial<FinancialContextData>): FinancialContextData {
    return {
      accounts: [dummyAccount],
      transactions: [],
      bills: [],
      recurringBills: [],
      recurrences: [],
      installments: [],
      invoices: [],
      creditCards: [],
      budgets: [],
      goals: [],
      investments: [],
      ...overrides,
    }
  }

  /**
   * TESTE A: Média alimentação R$ 1.000, mês atual R$ 1.500 → anomalia +50% detectada.
   */
  it('TESTE A: detecta anomalia de aumento de +50% em alimentação vs média dos últimos 3 meses', () => {
    const curMonth = '2025-04'
    const pastMonths = ['2025-03', '2025-02', '2025-01']

    const transactions: Transaction[] = [
      // 3 meses anteriores com R$ 1.000 em Alimentação
      {
        ...defaultTx,
        id: 't1',
        user: 'user1',
        description: 'Mercado Jan',
        value: 1000,
        type: 'despesa',
        category: 'Alimentação',
        date: `${pastMonths[2]}-10`,
        status: 'realizado',
        account: 'acc1',
      },
      {
        ...defaultTx,
        id: 't2',
        user: 'user1',
        description: 'Mercado Fev',
        value: 1000,
        type: 'despesa',
        category: 'Alimentação',
        date: `${pastMonths[1]}-10`,
        status: 'realizado',
        account: 'acc1',
      },
      {
        ...defaultTx,
        id: 't3',
        user: 'user1',
        description: 'Mercado Mar',
        value: 1000,
        type: 'despesa',
        category: 'Alimentação',
        date: `${pastMonths[0]}-10`,
        status: 'realizado',
        account: 'acc1',
      },
      // Mês atual com R$ 1.500 (+50%)
      {
        ...defaultTx,
        id: 't4',
        user: 'user1',
        description: 'Mercado Abr',
        value: 1500,
        type: 'despesa',
        category: 'Alimentação',
        date: `${curMonth}-10`,
        status: 'realizado',
        account: 'acc1',
      },
    ]

    const context = createBaseContext({ transactions, currentMonthKey: curMonth })
    const result = detectAnomalies(context, curMonth)

    expect(result.hasEnoughHistory).toBe(true)
    const catAnomaly = result.anomalies.find((a) => a.category === 'Alimentação')
    expect(catAnomaly).toBeDefined()
    expect(catAnomaly?.variationPct).toBeCloseTo(50, 0)
    expect(catAnomaly?.diffValue).toBe(500)
  })

  /**
   * TESTE B: Receita anterior R$ 10.000, atual R$ 8.000 → queda -20% detectada.
   */
  it('TESTE B: detecta queda relevante de receita de -20%', () => {
    const curMonth = '2025-04'
    const prevMonth = '2025-03'
    const month2 = '2025-02'

    const transactions: Transaction[] = [
      {
        ...defaultTx,
        id: 'r0',
        user: 'user1',
        description: 'Salário Fev',
        value: 10000,
        type: 'receita',
        category: 'Salário',
        date: `${month2}-05`,
        status: 'realizado',
        account: 'acc1',
      },
      {
        ...defaultTx,
        id: 'r1',
        user: 'user1',
        description: 'Salário Mar',
        value: 10000,
        type: 'receita',
        category: 'Salário',
        date: `${prevMonth}-05`,
        status: 'realizado',
        account: 'acc1',
      },
      {
        ...defaultTx,
        id: 'r2',
        user: 'user1',
        description: 'Salário Abr',
        value: 8000,
        type: 'receita',
        category: 'Salário',
        date: `${curMonth}-05`,
        status: 'realizado',
        account: 'acc1',
      },
    ]

    const context = createBaseContext({ transactions, currentMonthKey: curMonth })
    const result = detectAnomalies(context, curMonth)

    const incomeDrop = result.anomalies.find(
      (a) => a.id === 'income-drop-20pct' || a.title.includes('Queda Relevante de Receita'),
    )
    expect(incomeDrop).toBeDefined()
    expect(incomeDrop?.variationPct).toBeCloseTo(-20, 0)
    expect(incomeDrop?.diffValue).toBe(2000)
  })

  /**
   * TESTE C: Saldo projetado R$ 5.000, simular compra R$ 2.000 → novo saldo R$ 3.000.
   */
  it('TESTE C: simula compra de R$ 2.000 calculando deterministicamente impacto no saldo projetado', () => {
    const context = createBaseContext({
      accounts: [{ ...dummyAccount, current_balance: 5000 }],
      bills: [],
      transactions: [],
    })

    const result = evaluateCanSpendPurchase(2000, context, 30)
    expect(result.startingBalance).toBe(5000)
    expect(result.balanceWithoutPurchase).toBe(5000)
    expect(result.balanceWithPurchase).toBe(3000)
    expect(result.willBeNegative).toBe(false)
    expect(result.reasoningText).toContain('não deixaria seu caixa negativo')
    expect(result.reasoningText).toContain('Saldo projetado de R$ 3.000,00')
  })

  /**
   * TESTE D: Usuário novo sem histórico → "Ainda não há histórico suficiente para essa comparação."
   */
  it('TESTE D: usuário sem histórico suficiente não gera anomalias históricas falsas', () => {
    const curMonth = '2025-04'
    const context = createBaseContext({
      transactions: [
        {
          ...defaultTx,
          id: 't1',
          user: 'user_novo',
          description: 'Primeiro gasto',
          value: 300,
          type: 'despesa',
          category: 'Transporte',
          date: `${curMonth}-02`,
          status: 'realizado',
          account: 'acc1',
        },
      ],
      currentMonthKey: curMonth,
    })

    const result = detectAnomalies(context, curMonth)
    expect(result.hasEnoughHistory).toBe(false)
    // Não deve inventar comparações de 3 meses
    const catSpikes = result.anomalies.filter((a) => a.id.startsWith('category-spike-'))
    expect(catSpikes.length).toBe(0)
  })

  /**
   * TESTE E: Executar cálculo de saúde financeira 2x com mesmos dados → pontuação 100% idêntica.
   */
  it('TESTE E: cálculo de Saúde Financeira é estritamente determinístico (mesmo dado = mesmo score)', () => {
    const curMonth = '2025-04'
    const context = createBaseContext({
      accounts: [{ ...dummyAccount, current_balance: 10000 }],
      transactions: [
        {
          ...defaultTx,
          id: 't1',
          user: 'user1',
          description: 'Salário',
          value: 6000,
          type: 'receita',
          category: 'Salário',
          date: `${curMonth}-05`,
          status: 'realizado',
          account: 'acc1',
        },
        {
          ...defaultTx,
          id: 't2',
          user: 'user1',
          description: 'Aluguel',
          value: 2000,
          type: 'despesa',
          category: 'Moradia',
          date: `${curMonth}-10`,
          status: 'realizado',
          account: 'acc1',
        },
      ],
      bills: [],
      budgets: [
        {
          id: 'b1',
          user: 'user1',
          category: 'Moradia',
          limit_value: 2500,
          month: curMonth,
          spent: 2000,
          percentage: 80,
          created: '',
          updated: '',
        },
      ],
      currentMonthKey: curMonth,
    })

    const run1 = calculateHealthScore(context, curMonth)
    const run2 = calculateHealthScore(context, curMonth)

    expect(run1.score).toBe(run2.score)
    expect(run1.level).toBe(run2.level)
    expect(run1.factors.length).toBe(run2.factors.length)
    run1.factors.forEach((f, idx) => {
      expect(f.score).toBe(run2.factors[idx].score)
    })
  })

  /**
   * TESTE F: Usuário A com R$ 10.000, B com R$ 2.000 → IA de A nunca vê dados de B.
   */
  it('TESTE F: isolamento de dados por contexto de usuário autenticado', () => {
    const contextUserA = createBaseContext({
      accounts: [{ ...dummyAccount, id: 'accA', user: 'userA', current_balance: 10000 }],
    })

    const contextUserB = createBaseContext({
      accounts: [{ ...dummyAccount, id: 'accB', user: 'userB', current_balance: 2000 }],
    })

    const simA = evaluateCanSpendPurchase(1000, contextUserA, 30)
    const simB = evaluateCanSpendPurchase(1000, contextUserB, 30)

    expect(simA.startingBalance).toBe(10000)
    expect(simB.startingBalance).toBe(2000)
    expect(simA.balanceWithPurchase).toBe(9000)
    expect(simB.balanceWithPurchase).toBe(1000)
  })

  /**
   * TESTE G: Simular indisponibilidade IA → cálculos determinísticos continuam normais.
   */
  it('TESTE G: fallback seguro mantém resumos e cálculos quando serviço de IA está indisponível', () => {
    const curMonth = '2025-04'
    const context = createBaseContext({
      accounts: [{ ...dummyAccount, current_balance: 4000 }],
      transactions: [
        {
          ...defaultTx,
          id: 't1',
          user: 'user1',
          description: 'Venda',
          value: 1200,
          type: 'receita',
          category: 'Vendas',
          date: '2025-04-10',
          status: 'realizado',
          account: 'acc1',
        },
      ],
      currentMonthKey: curMonth,
    })

    // Resumo semanal é gerado normalmente sem depender de rede externa
    const summary = generateWeeklySummary(context, new Date('2025-04-12'))
    expect(summary.income).toBe(1200)
    expect(summary.formattedSummaryText).toContain('RESUMO DA SEMANA')

    // Local deterministic evaluator responde perguntas de compra e previsão
    const answer = evaluateLocalDeterministicAnswer('Posso gastar R$ 500 agora?', context)
    expect(answer).not.toBeNull()
    expect(answer).toContain('Hoje você possui R$ 4.000,00')
  })
})
