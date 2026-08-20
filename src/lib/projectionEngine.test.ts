import { describe, it, expect } from 'vitest'
import { calculateCashFlowProjection, toISODate } from './projectionEngine'
import { Account, Transaction, Bill, Installment } from '@/types/finance'

describe('ETAPA 3 — FLUXO DE CAIXA PROJETADO (Testes Matemáticos Obrigatórios)', () => {
  const today = new Date()
  const todayStr = toISODate(today)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = toISODate(tomorrow)

  const day5 = new Date(today)
  day5.setDate(day5.getDate() + 5)
  const day5Str = toISODate(day5)

  const day10 = new Date(today)
  day10.setDate(day10.getDate() + 10)
  const day10Str = toISODate(day10)

  // TESTE A: Saldo R$ 10.000 + receita R$ 5.000 - despesa R$ 3.000 = R$ 12.000 projetado.
  it('TESTE A: Saldo R$ 10.000 + receita R$ 5.000 - despesa R$ 3.000 = R$ 12.000 projetado', () => {
    const accounts: Account[] = [
      {
        id: 'acc1',
        user: 'u1',
        name: 'Conta Corrente',
        type: 'Conta corrente',
        bank: 'Nubank',
        opening_balance: 10000,
        current_balance: 10000,
        created: '',
        updated: '',
      },
    ]

    const transactions: Transaction[] = [
      {
        id: 't1',
        user: 'u1',
        description: 'Salário',
        value: 5000,
        type: 'receita',
        status: 'pendente',
        payment_method: 'PIX',
        date: day5Str,
        created: '',
        updated: '',
      },
      {
        id: 't2',
        user: 'u1',
        description: 'Aluguel',
        value: 3000,
        type: 'despesa',
        status: 'pendente',
        payment_method: 'PIX',
        date: day10Str,
        created: '',
        updated: '',
      },
    ]

    const result = calculateCashFlowProjection({
      accounts,
      transactions,
      bills: [],
      recurringBills: [],
      installments: [],
      invoices: [],
      days: 30,
      startDate: todayStr,
    })

    expect(result.startingBalance).toBe(10000)
    expect(result.totalIncome).toBe(5000)
    expect(result.totalExpense).toBe(3000)
    expect(result.projectedEndBalance).toBe(12000)
    expect(result.isPositive).toBe(true)
    expect(result.risk.hasRisk).toBe(false)
  })

  // TESTE B: Saldo R$ 10.000 + transferência R$ 4.000 entre contas = saldo consolidado continua R$ 10.000.
  it('TESTE B: Saldo R$ 10.000 + transferência R$ 4.000 entre contas = saldo consolidado continua R$ 10.000', () => {
    const accounts: Account[] = [
      {
        id: 'acc1',
        user: 'u1',
        name: 'Conta Nubank',
        type: 'Conta corrente',
        bank: 'Nubank',
        opening_balance: 6000,
        current_balance: 6000,
        created: '',
        updated: '',
      },
      {
        id: 'acc2',
        user: 'u1',
        name: 'Conta Inter',
        type: 'Conta corrente',
        bank: 'Inter',
        opening_balance: 4000,
        current_balance: 4000,
        created: '',
        updated: '',
      },
    ]

    const transactions: Transaction[] = [
      {
        id: 'trf1',
        user: 'u1',
        description: 'Transferência Nubank -> Inter',
        value: 4000,
        type: 'despesa',
        category: 'Transferência',
        status: 'pendente',
        payment_method: 'Transferência',
        transfer_group_id: 'trf_group_123',
        date: day5Str,
        created: '',
        updated: '',
      },
      {
        id: 'trf2',
        user: 'u1',
        description: 'Transferência Nubank -> Inter',
        value: 4000,
        type: 'receita',
        category: 'Transferência',
        status: 'pendente',
        payment_method: 'Transferência',
        transfer_group_id: 'trf_group_123',
        date: day5Str,
        created: '',
        updated: '',
      },
    ]

    const result = calculateCashFlowProjection({
      accounts,
      transactions,
      bills: [],
      recurringBills: [],
      installments: [],
      invoices: [],
      days: 30,
      startDate: todayStr,
    })

    expect(result.startingBalance).toBe(10000)
    expect(result.totalIncome).toBe(0)
    expect(result.totalExpense).toBe(0)
    expect(result.projectedEndBalance).toBe(10000)
  })

  // TESTE C: Despesa R$ 1.000 vinculada a boleto R$ 1.000 = projeção considera R$ 1.000 (não R$ 2.000).
  it('TESTE C: Despesa R$ 1.000 vinculada a boleto R$ 1.000 = projeção considera R$ 1.000 (não R$ 2.000)', () => {
    const accounts: Account[] = [
      {
        id: 'acc1',
        user: 'u1',
        name: 'Conta Corrente',
        type: 'Conta corrente',
        bank: 'Nubank',
        opening_balance: 5000,
        current_balance: 5000,
        created: '',
        updated: '',
      },
    ]

    const bills: Bill[] = [
      {
        id: 'bill-1',
        user: 'u1',
        description: 'Conta de Luz',
        value: 1000,
        due_date: day5Str,
        status: 'não_pago',
        type: 'pagar',
        generated_transaction: 'tx-bill-1',
        created: '',
        updated: '',
      },
    ]

    const transactions: Transaction[] = [
      {
        id: 'tx-bill-1',
        user: 'u1',
        description: 'Conta de Luz',
        value: 1000,
        type: 'despesa',
        status: 'pendente',
        payment_method: 'Boleto',
        bill_id: 'bill-1',
        date: day5Str,
        created: '',
        updated: '',
      },
    ]

    const result = calculateCashFlowProjection({
      accounts,
      transactions,
      bills,
      recurringBills: [],
      installments: [],
      invoices: [],
      days: 30,
      startDate: todayStr,
    })

    expect(result.startingBalance).toBe(5000)
    expect(result.totalExpense).toBe(1000) // apenas 1x
    expect(result.projectedEndBalance).toBe(4000)
    expect(result.timelineEvents.length).toBe(1)
  })

  // TESTE D: Compra 10x R$ 200. Em 30 dias existe apenas 1 parcela de R$ 200. Não contabilizar R$ 2.000.
  it('TESTE D: Compra 10x R$ 200. Em 30 dias existe apenas 1 parcela de R$ 200. Não contabilizar R$ 2.000', () => {
    const accounts: Account[] = [
      {
        id: 'acc1',
        user: 'u1',
        name: 'Conta Corrente',
        type: 'Conta corrente',
        bank: 'Nubank',
        opening_balance: 5000,
        current_balance: 5000,
        created: '',
        updated: '',
      },
    ]

    const installments: Installment[] = [
      {
        id: 'inst-1',
        user: 'u1',
        description: 'Sofá Parcelado',
        total_value: 2000,
        installment_value: 200,
        total_installments: 10,
        current_installment: 1,
        start_date: day5Str,
        created: '',
        updated: '',
      },
    ]

    const result = calculateCashFlowProjection({
      accounts,
      transactions: [],
      bills: [],
      recurringBills: [],
      installments,
      invoices: [],
      days: 30,
      startDate: todayStr,
    })

    expect(result.startingBalance).toBe(5000)
    expect(result.totalExpense).toBe(200) // apenas a 1ª parcela de 200 nos 30 dias
    expect(result.projectedEndBalance).toBe(4800)
  })

  // TESTE E: Saldo R$ 2.000 - despesa R$ 3.000 = -R$ 1.000. Sistema detecta corretamente o primeiro dia negativo.
  it('TESTE E: Saldo R$ 2.000 - despesa R$ 3.000 = -R$ 1.000. Sistema detecta corretamente o primeiro dia negativo', () => {
    const accounts: Account[] = [
      {
        id: 'acc1',
        user: 'u1',
        name: 'Conta Corrente',
        type: 'Conta corrente',
        bank: 'Nubank',
        opening_balance: 2000,
        current_balance: 2000,
        created: '',
        updated: '',
      },
    ]

    const transactions: Transaction[] = [
      {
        id: 't-neg',
        user: 'u1',
        description: 'Compra Grande',
        value: 3000,
        type: 'despesa',
        status: 'pendente',
        payment_method: 'PIX',
        date: day5Str,
        created: '',
        updated: '',
      },
    ]

    const result = calculateCashFlowProjection({
      accounts,
      transactions,
      bills: [],
      recurringBills: [],
      installments: [],
      invoices: [],
      days: 30,
      startDate: todayStr,
    })

    expect(result.startingBalance).toBe(2000)
    expect(result.totalExpense).toBe(3000)
    expect(result.projectedEndBalance).toBe(-1000)
    expect(result.risk.hasRisk).toBe(true)
    expect(result.risk.firstNegativeDate).toBe(day5Str)
    expect(result.risk.maxDeficit).toBe(1000)
    expect(result.risk.negativeDaysCount).toBeGreaterThan(0)
  })

  // TESTE F: Simulação de -R$ 2.000 sobre saldo de R$ 5.000 = temporário R$ 3.000. Limpar simulação volta a R$ 5.000. Nenhuma transação real criada.
  it('TESTE F: Simulação de -R$ 2.000 sobre saldo de R$ 5.000 = temporário R$ 3.000. Limpar simulação volta a R$ 5.000. Nenhuma transação real criada', () => {
    const accounts: Account[] = [
      {
        id: 'acc1',
        user: 'u1',
        name: 'Conta Corrente',
        type: 'Conta corrente',
        bank: 'Nubank',
        opening_balance: 5000,
        current_balance: 5000,
        created: '',
        updated: '',
      },
    ]

    // Com simulação
    const withSim = calculateCashFlowProjection({
      accounts,
      transactions: [],
      bills: [],
      recurringBills: [],
      installments: [],
      invoices: [],
      days: 30,
      startDate: todayStr,
      simulation: {
        value: 2000,
        date: tomorrowStr,
        type: 'expense',
      },
    })

    expect(withSim.startingBalance).toBe(5000)
    expect(withSim.simulationApplied).toBe(true)
    expect(withSim.totalExpense).toBe(2000)
    expect(withSim.projectedEndBalance).toBe(3000)
    expect(withSim.originalSummary?.projectedEndBalance).toBe(5000)

    // Sem simulação (Limpar simulação)
    const withoutSim = calculateCashFlowProjection({
      accounts,
      transactions: [],
      bills: [],
      recurringBills: [],
      installments: [],
      invoices: [],
      days: 30,
      startDate: todayStr,
      simulation: null,
    })

    expect(withoutSim.startingBalance).toBe(5000)
    expect(withoutSim.simulationApplied).toBe(false)
    expect(withoutSim.totalExpense).toBe(0)
    expect(withoutSim.projectedEndBalance).toBe(5000)
  })
})
