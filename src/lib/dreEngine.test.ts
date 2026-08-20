import { describe, it, expect } from 'vitest'
import {
  calculateDreReport,
  calculateMonthlyComparative,
  isDreEligibleTransaction,
  DreGroup,
} from './dreEngine'
import { Transaction } from '@/types/finance'

describe('Motor DRE & Comparativo — Testes Matemáticos Obrigatórios (Etapa 4)', () => {
  const baseTx: Partial<Transaction> = {
    id: 'tx-1',
    user: 'u-1',
    date: '2025-05-15',
    status: 'realizado',
    payment_method: 'PIX',
    created: '2025-05-15T10:00:00Z',
    updated: '2025-05-15T10:00:00Z',
  }

  // TESTE A — DRE:
  // Receita Bruta: R$ 20.000, Deduções: R$ 2.000 → Receita Líquida: R$ 18.000
  // CMV: R$ 7.000 → Lucro Bruto: R$ 11.000
  // Despesas Operacionais: R$ 6.000 → Resultado Operacional: R$ 5.000
  // Outras despesas: R$ 1.000 → Resultado Líquido: R$ 4.000
  it('TESTE A — DRE: Cálculo contábil em cascata exato', () => {
    const transactions: Transaction[] = [
      {
        ...baseTx,
        id: '1',
        description: 'Venda de Produtos',
        category: 'Vendas',
        value: 20000,
        type: 'receita',
        dre_group: 'receita_bruta',
      } as Transaction,
      {
        ...baseTx,
        id: '2',
        description: 'Taxa de Plataforma / Marketplace',
        category: 'Taxas de plataforma',
        value: 2000,
        type: 'despesa',
        dre_group: 'deducoes',
      } as Transaction,
      {
        ...baseTx,
        id: '3',
        description: 'Fornecedor Mercadoria',
        category: 'Mercadoria / Matéria-prima',
        value: 7000,
        type: 'despesa',
        dre_group: 'cmv',
      } as Transaction,
      {
        ...baseTx,
        id: '4',
        description: 'Aluguel do Galpão',
        category: 'Aluguel',
        value: 3000,
        type: 'despesa',
        dre_group: 'ocupacao',
      } as Transaction,
      {
        ...baseTx,
        id: '5',
        description: 'Salário Funcionários',
        category: 'Salários',
        value: 3000,
        type: 'despesa',
        dre_group: 'pessoal',
      } as Transaction,
      // Total Despesas Operacionais = 3.000 + 3.000 = 6.000
      {
        ...baseTx,
        id: '6',
        description: 'Juros de Empréstimo',
        category: 'Juros',
        value: -1000, // Outras despesas
        type: 'despesa',
        dre_group: 'outras_receitas_despesas',
      } as Transaction,
    ]

    const dre = calculateDreReport(transactions, { month: '2025-05' })

    expect(dre.receitaBruta).toBe(20000)
    expect(dre.deducoes).toBe(2000)
    expect(dre.receitaLiquida).toBe(18000)

    expect(dre.cmv).toBe(7000)
    expect(dre.lucroBruto).toBe(11000)

    expect(dre.despesasOperacionaisTotal).toBe(6000)
    expect(dre.resultadoOperacional).toBe(5000)

    // Resultado líquido: 5.000 - 1.000 = 4.000
    // Como registramos -1000 em outras receitas/despesas
    expect(dre.resultadoLiquido).toBe(4000)
  })

  // TESTE B — MARGENS:
  // Margem Bruta: 11.000 ÷ 18.000 × 100 = 61,11%
  // Margem Operacional: 5.000 ÷ 18.000 × 100 = 27,78%
  // Margem Líquida: 4.000 ÷ 18.000 × 100 = 22,22%
  it('TESTE B — MARGENS: Cálculo percentual sobre a Receita Líquida', () => {
    const transactions: Transaction[] = [
      {
        ...baseTx,
        id: '1',
        description: 'Receita Bruta',
        category: 'Vendas',
        value: 20000,
        type: 'receita',
        dre_group: 'receita_bruta',
      } as Transaction,
      {
        ...baseTx,
        id: '2',
        description: 'Deduções',
        category: 'Taxas de plataforma',
        value: 2000,
        type: 'despesa',
        dre_group: 'deducoes',
      } as Transaction,
      {
        ...baseTx,
        id: '3',
        description: 'CMV',
        category: 'Mercadorias',
        value: 7000,
        type: 'despesa',
        dre_group: 'cmv',
      } as Transaction,
      {
        ...baseTx,
        id: '4',
        description: 'Despesas Operacionais',
        category: 'Aluguel',
        value: 6000,
        type: 'despesa',
        dre_group: 'ocupacao',
      } as Transaction,
      {
        ...baseTx,
        id: '5',
        description: 'Outras despesas',
        category: 'Outros',
        value: -1000,
        type: 'despesa',
        dre_group: 'outras_receitas_despesas',
      } as Transaction,
    ]

    const dre = calculateDreReport(transactions, { month: '2025-05' })

    // Margem Bruta: 11000 / 18000 = 61.1111...%
    expect(dre.margemBrutaPct).toBeCloseTo(61.111, 2)
    // Margem Operacional: 5000 / 18000 = 27.777...%
    expect(dre.margemOperacionalPct).toBeCloseTo(27.778, 2)
    // Margem Líquida: 4000 / 18000 = 22.222...%
    expect(dre.margemLiquidaPct).toBeCloseTo(22.222, 2)
  })

  // TESTE C — TRANSFERÊNCIA NÃO ENTRA NO DRE:
  // Transferência entre contas R$ 5.000 → impacto no DRE: R$ 0
  it('TESTE C — TRANSFERÊNCIA NÃO ENTRA NO DRE: Impacto R$ 0', () => {
    const transactions: Transaction[] = [
      {
        ...baseTx,
        id: 'tx-trf-1',
        description: 'Transferência entre contas Nubank -> Itaú',
        category: 'Transferência',
        value: 5000,
        type: 'despesa',
        transfer_group_id: 'trf_12345',
      } as Transaction,
      {
        ...baseTx,
        id: 'tx-trf-2',
        description: 'Transferência recebida Nubank -> Itaú',
        category: 'Transferência',
        value: 5000,
        type: 'receita',
        transfer_group_id: 'trf_12345',
      } as Transaction,
    ]

    expect(isDreEligibleTransaction(transactions[0])).toBe(false)
    expect(isDreEligibleTransaction(transactions[1])).toBe(false)

    const dre = calculateDreReport(transactions, { month: '2025-05' })
    expect(dre.receitaBruta).toBe(0)
    expect(dre.despesasOperacionaisTotal).toBe(0)
    expect(dre.resultadoLiquido).toBe(0)
    expect(dre.totalTransactionsCount).toBe(0)
    expect(dre.ignoredTransactionsCount).toBe(2)
  })

  // TESTE D — CARTÃO NÃO DUPLICA:
  // Compra R$ 1.000 + pagamento fatura R$ 1.000 → despesa total: R$ 1.000 (NÃO R$ 2.000)
  it('TESTE D — CARTÃO NÃO DUPLICA: Compra R$ 1.000 + pagamento fatura R$ 1.000 -> Total R$ 1.000', () => {
    const transactions: Transaction[] = [
      {
        ...baseTx,
        id: 'tx-compra-cartao',
        description: 'Compra no Supermercado',
        category: 'Alimentação',
        value: 1000,
        type: 'despesa',
        payment_method: 'Crédito',
      } as Transaction,
      {
        ...baseTx,
        id: 'tx-pgto-fatura',
        description: 'Pagamento de fatura Nubank',
        category: 'Fatura de cartão',
        value: 1000,
        type: 'despesa',
        payment_method: 'PIX',
      } as Transaction,
    ]

    const dre = calculateDreReport(transactions, { month: '2025-05' })
    const totalDespesa = dre.deducoes + dre.cmv + dre.despesasOperacionaisTotal

    expect(totalDespesa).toBe(1000)
    expect(dre.totalTransactionsCount).toBe(1)
  })

  // TESTE E — BOLETO NÃO DUPLICA:
  // Despesa R$ 700 + boleto vinculado R$ 700 + pagamento R$ 700 → despesa no relatório: R$ 700 (NÃO R$ 1.400 nem R$ 2.100)
  it('TESTE E — BOLETO NÃO DUPLICA: Apenas uma transação de R$ 700 é computada', () => {
    const transactions: Transaction[] = [
      {
        ...baseTx,
        id: 'tx-boleto-pago',
        description: 'Energia Elétrica Enel',
        category: 'Luz',
        value: 700,
        type: 'despesa',
        status: 'realizado',
        payment_method: 'Boleto',
        bill_id: 'bill-123',
      } as Transaction,
    ]

    const dre = calculateDreReport(transactions, { month: '2025-05' })
    const totalDespesa = dre.deducoes + dre.cmv + dre.despesasOperacionaisTotal

    expect(totalDespesa).toBe(700)
    expect(dre.totalTransactionsCount).toBe(1)
  })

  // TESTE F — COMPARATIVO AUMENTO:
  // Mês anterior R$ 10.000, Mês atual R$ 12.000 → +R$ 2.000, +20%
  it('TESTE F — COMPARATIVO AUMENTO: Mês anterior R$ 10.000 -> Atual R$ 12.000 = +R$ 2.000 (+20%)', () => {
    const transactions: Transaction[] = [
      {
        ...baseTx,
        id: 'tx-prev',
        date: '2025-04-10',
        description: 'Salário Abril',
        category: 'Salário',
        value: 10000,
        type: 'receita',
        dre_group: 'receita_bruta',
      } as Transaction,
      {
        ...baseTx,
        id: 'tx-cur',
        date: '2025-05-10',
        description: 'Salário Maio + Bônus',
        category: 'Salário',
        value: 12000,
        type: 'receita',
        dre_group: 'receita_bruta',
      } as Transaction,
    ]

    const comp = calculateMonthlyComparative(transactions, '2025-05')

    expect(comp.incomePrevious).toBe(10000)
    expect(comp.incomeCurrent).toBe(12000)
    expect(comp.incomeDiff).toBe(2000)
    expect(comp.incomeVariationPct).toBeCloseTo(20, 2)
  })

  // TESTE G — COMPARATIVO REDUÇÃO:
  // Mês anterior R$ 10.000, Mês atual R$ 8.000 → -R$ 2.000, -20%
  it('TESTE G — COMPARATIVO REDUÇÃO: Mês anterior R$ 10.000 -> Atual R$ 8.000 = -R$ 2.000 (-20%)', () => {
    const transactions: Transaction[] = [
      {
        ...baseTx,
        id: 'tx-prev-exp',
        date: '2025-04-10',
        description: 'Compras Abril',
        category: 'Alimentação',
        value: 10000,
        type: 'despesa',
        dre_group: 'outras_operacionais',
      } as Transaction,
      {
        ...baseTx,
        id: 'tx-cur-exp',
        date: '2025-05-10',
        description: 'Compras Maio',
        category: 'Alimentação',
        value: 8000,
        type: 'despesa',
        dre_group: 'outras_operacionais',
      } as Transaction,
    ]

    const comp = calculateMonthlyComparative(transactions, '2025-05')

    expect(comp.expensePrevious).toBe(10000)
    expect(comp.expenseCurrent).toBe(8000)
    expect(comp.expenseDiff).toBe(-2000)
    expect(comp.expenseVariationPct).toBeCloseTo(-20, 2)
  })
})
