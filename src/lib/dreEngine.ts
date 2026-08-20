import { Transaction, DreGroup, CategoryItem, Bill, Invoice } from '@/types/finance'
export type { DreGroup }

export const DRE_GROUP_LABELS: Record<DreGroup, string> = {
  receita_bruta: 'Receita Bruta (Vendas / Serviços / Salário)',
  deducoes: '(-) Deduções da Receita (Impostos / Devoluções / Taxas Plataforma)',
  cmv: '(-) CMV / Custo das Mercadorias e Serviços',
  despesas_administrativas: '(-) Despesas Administrativas',
  despesas_comerciais: '(-) Despesas Comerciais e Marketing',
  pessoal: '(-) Despesas com Pessoal / Salários',
  ocupacao: '(-) Ocupação (Aluguel, Condomínio, Energia, Água, Internet)',
  despesas_financeiras: '(-) Despesas Financeiras e Taxas Bancárias',
  outras_operacionais: '(-) Outras Despesas Operacionais',
  outras_receitas_despesas: '(+/-) Outras Receitas / Despesas Não Operacionais',
}

export const DRE_GROUP_SHORT_LABELS: Record<DreGroup, string> = {
  receita_bruta: 'Receita Bruta',
  deducoes: 'Deduções da Receita',
  cmv: 'CMV / Custos',
  despesas_administrativas: 'Despesas Administrativas',
  despesas_comerciais: 'Comercial & Marketing',
  pessoal: 'Pessoal & Salários',
  ocupacao: 'Ocupação & Utilidades',
  despesas_financeiras: 'Despesas Financeiras',
  outras_operacionais: 'Outras Operacionais',
  outras_receitas_despesas: 'Outras Receitas/Despesas',
}

/**
 * Mapeamento padrão inteligente de categorias para grupos da DRE
 */
export const DEFAULT_CATEGORY_DRE_MAP: Record<string, DreGroup> = {
  // Receitas
  Vendas: 'receita_bruta',
  'Venda de Produtos': 'receita_bruta',
  'Prestação de Serviços': 'receita_bruta',
  Salário: 'receita_bruta',
  'Renda Extra': 'receita_bruta',
  Rendimentos: 'outras_receitas_despesas',
  Investimentos: 'outras_receitas_despesas',
  'Outras Receitas': 'receita_bruta',

  // Deduções
  'Taxas de plataforma': 'deducoes',
  'Taxas de Plataforma': 'deducoes',
  'Impostos sobre Venda': 'deducoes',
  Devoluções: 'deducoes',
  Descontos: 'deducoes',

  // CMV
  'Mercadoria / Matéria-prima': 'cmv',
  Mercadorias: 'cmv',
  'Matéria-prima': 'cmv',
  Fornecedores: 'cmv',
  Insumos: 'cmv',
  Compras: 'cmv',

  // Ocupação
  Aluguel: 'ocupacao',
  Moradia: 'ocupacao',
  Energia: 'ocupacao',
  Luz: 'ocupacao',
  Água: 'ocupacao',
  Internet: 'ocupacao',
  Condomínio: 'ocupacao',
  Casa: 'ocupacao',

  // Pessoal
  Salários: 'pessoal',
  'Pró-labore': 'pessoal',
  'Encargos Trabalhistas': 'pessoal',
  Benefícios: 'pessoal',

  // Comercial / Marketing
  Marketing: 'despesas_comerciais',
  Publicidade: 'despesas_comerciais',
  Anúncios: 'despesas_comerciais',
  Comissões: 'despesas_comerciais',

  // Despesas Financeiras
  'Taxas bancárias': 'despesas_financeiras',
  'Taxas e tarifas': 'despesas_financeiras',
  Juros: 'despesas_financeiras',
  IOF: 'despesas_financeiras',

  // Administrativas
  Contabilidade: 'despesas_administrativas',
  Software: 'despesas_administrativas',
  Assinaturas: 'despesas_administrativas',
  Educação: 'despesas_administrativas',
  Escritório: 'despesas_administrativas',

  // Outras Operacionais
  Transporte: 'outras_operacionais',
  Combustível: 'outras_operacionais',
  Alimentação: 'outras_operacionais',
  Saúde: 'outras_operacionais',
  Lazer: 'outras_operacionais',
  Eletrônicos: 'outras_operacionais',
  Outros: 'outras_operacionais',
}

export function getCategoryDreGroup(
  categoryName: string | undefined | null,
  type: 'receita' | 'despesa' | 'ajuste',
  customCategories: CategoryItem[] = [],
  explicitDreGroup?: DreGroup,
): DreGroup {
  if (explicitDreGroup) return explicitDreGroup
  const catTrim = (categoryName || '').trim()

  const custom = customCategories.find((c) => c.name.trim().toLowerCase() === catTrim.toLowerCase())
  if (custom?.dre_group) {
    return custom.dre_group
  }

  // Look in default map
  for (const [key, group] of Object.entries(DEFAULT_CATEGORY_DRE_MAP)) {
    if (key.toLowerCase() === catTrim.toLowerCase()) {
      return group
    }
  }

  // Fallback seguro
  if (type === 'receita') {
    return 'receita_bruta'
  }
  return 'outras_operacionais'
}

export interface DreLineItem {
  category: string
  value: number
  percentageOfGross?: number
  percentageOfNet?: number
  transactionsCount: number
}

export interface DreGroupReport {
  group: DreGroup
  label: string
  total: number
  items: DreLineItem[]
}

export interface DreReport {
  periodLabel: string
  startDate?: string
  endDate?: string

  // Linhas Principais
  receitaBruta: number
  deducoes: number
  receitaLiquida: number

  cmv: number
  lucroBruto: number

  // Grupos Operacionais
  despesasOperacionaisTotal: number
  despesasAdministrativas: number
  despesasComerciais: number
  despesasPessoal: number
  despesasOcupacao: number
  despesasFinanceiras: number
  outrasOperacionais: number

  resultadoOperacional: number

  outrasReceitasDespesas: number
  resultadoLiquido: number

  // Margens
  margemBrutaPct: number
  margemOperacionalPct: number
  margemLiquidaPct: number
  margemEconomiaPct: number

  // Detalhamento por grupo e categorias
  groups: Record<DreGroup, DreGroupReport>

  // Contadores e Validações
  totalTransactionsCount: number
  ignoredTransactionsCount: number // Transferências, aportes, faturas duplicadas ignoradas
}

export interface DreFilterOptions {
  month?: string // "YYYY-MM"
  year?: string // "YYYY"
  startDate?: string // "YYYY-MM-DD"
  endDate?: string // "YYYY-MM-DD"
  customCategories?: CategoryItem[]
}

/**
 * Filtra e valida transações para o DRE eliminando toda dupla contabilização e movimentações não-operacionais:
 * - Transferências (transfer_group_id ou category == 'Transferência' ou 'Ajuste') -> R$ 0
 * - Pagamento de fatura de cartão -> NÃO duplica os itens da fatura
 * - Pagamento de boleto vinculado -> NÃO duplica com a despesa
 * - Investimentos / Resgates -> NÃO contabiliza como despesa/receita operacional
 */
export function isDreEligibleTransaction(t: Transaction): boolean {
  // 1. Não realizado não entra em DRE por competência/caixa realizado
  if (t.status !== 'realizado') return false

  // 2. Ajuste de saldo não é receita nem despesa operacional
  if (t.type === 'ajuste' || t.source === 'ajuste' || t.category === 'Ajuste') return false

  // 3. Transferências entre contas -> NÃO entra no DRE
  if (t.transfer_group_id || t.transfer_target_account || t.category === 'Transferência') {
    return false
  }

  // 4. Pagamento de fatura de cartão -> Ignorar se já houver compras/despesas no cartão
  // (Transações do tipo "Fatura de cartão" ou "Pagamento de fatura" apenas liquidam passivo)
  if (
    t.category === 'Fatura de cartão' ||
    t.category === 'Pagamento de fatura' ||
    t.description?.toLowerCase().includes('pagamento de fatura') ||
    t.description?.toLowerCase().includes('fatura cartão')
  ) {
    return false
  }

  // 5. Investimentos / Aportes / Resgates não entram como despesa operacional
  if (
    t.category === 'Investimentos' ||
    t.category === 'Aporte' ||
    t.category === 'Resgate de Investimento'
  ) {
    return false
  }

  return true
}

/**
 * Calcula a DRE completa e profissional com todas as métricas contábeis e de gestão
 */
export function calculateDreReport(
  transactions: Transaction[],
  options: DreFilterOptions = {},
): DreReport {
  const { month, year, startDate, endDate, customCategories = [] } = options

  // Filtra por data
  const filtered = transactions.filter((t) => {
    if (!isDreEligibleTransaction(t)) return false
    const date = t.date || ''

    if (startDate && endDate) {
      return date >= startDate && date <= endDate
    }
    if (month) {
      return date.startsWith(month)
    }
    if (year) {
      return date.startsWith(year)
    }
    return true
  })

  // Inicializa estrutura de grupos
  const groups: Record<DreGroup, DreGroupReport> = {
    receita_bruta: {
      group: 'receita_bruta',
      label: DRE_GROUP_LABELS.receita_bruta,
      total: 0,
      items: [],
    },
    deducoes: {
      group: 'deducoes',
      label: DRE_GROUP_LABELS.deducoes,
      total: 0,
      items: [],
    },
    cmv: {
      group: 'cmv',
      label: DRE_GROUP_LABELS.cmv,
      total: 0,
      items: [],
    },
    despesas_administrativas: {
      group: 'despesas_administrativas',
      label: DRE_GROUP_LABELS.despesas_administrativas,
      total: 0,
      items: [],
    },
    despesas_comerciais: {
      group: 'despesas_comerciais',
      label: DRE_GROUP_LABELS.despesas_comerciais,
      total: 0,
      items: [],
    },
    pessoal: {
      group: 'pessoal',
      label: DRE_GROUP_LABELS.pessoal,
      total: 0,
      items: [],
    },
    ocupacao: {
      group: 'ocupacao',
      label: DRE_GROUP_LABELS.ocupacao,
      total: 0,
      items: [],
    },
    despesas_financeiras: {
      group: 'despesas_financeiras',
      label: DRE_GROUP_LABELS.despesas_financeiras,
      total: 0,
      items: [],
    },
    outras_operacionais: {
      group: 'outras_operacionais',
      label: DRE_GROUP_LABELS.outras_operacionais,
      total: 0,
      items: [],
    },
    outras_receitas_despesas: {
      group: 'outras_receitas_despesas',
      label: DRE_GROUP_LABELS.outras_receitas_despesas,
      total: 0,
      items: [],
    },
  }

  // Agrupamento por categoria e grupo DRE
  const categoryMap: Record<
    string,
    { group: DreGroup; category: string; value: number; count: number }
  > = {}

  filtered.forEach((t) => {
    const val = Number(t.value || 0)
    const cat = (t.category || (t.type === 'receita' ? 'Outras Receitas' : 'Outros')).trim()
    const group = getCategoryDreGroup(cat, t.type, customCategories, t.dre_group)

    const key = `${group}:::${cat}`
    if (!categoryMap[key]) {
      categoryMap[key] = { group, category: cat, value: 0, count: 0 }
    }
    categoryMap[key].value += val
    categoryMap[key].count += 1
  })

  // Preenche os grupos
  Object.values(categoryMap).forEach((item) => {
    const grp = groups[item.group]
    if (grp) {
      grp.total += item.value
      grp.items.push({
        category: item.category,
        value: item.value,
        transactionsCount: item.count,
      })
    }
  })

  // Ordena itens de cada grupo pelo maior valor
  Object.values(groups).forEach((g) => {
    g.items.sort((a, b) => b.value - a.value)
  })

  // Cálculos DRE
  const receitaBruta = groups.receita_bruta.total
  const deducoes = groups.deducoes.total
  const receitaLiquida = receitaBruta - deducoes

  const cmv = groups.cmv.total
  const lucroBruto = receitaLiquida - cmv

  const despesasAdministrativas = groups.despesas_administrativas.total
  const despesasComerciais = groups.despesas_comerciais.total
  const despesasPessoal = groups.pessoal.total
  const despesasOcupacao = groups.ocupacao.total
  const despesasFinanceiras = groups.despesas_financeiras.total
  const outrasOperacionais = groups.outras_operacionais.total

  const despesasOperacionaisTotal =
    despesasAdministrativas +
    despesasComerciais +
    despesasPessoal +
    despesasOcupacao +
    despesasFinanceiras +
    outrasOperacionais

  const resultadoOperacional = lucroBruto - despesasOperacionaisTotal

  const outrasReceitasDespesas = groups.outras_receitas_despesas.total
  // Outras receitas/despesas somam ou diminuem conforme o contexto
  const resultadoLiquido = resultadoOperacional + outrasReceitasDespesas

  // Margens em relação à Receita Líquida (ou Bruta se Líquida for zero)
  const baseReceita = receitaLiquida > 0 ? receitaLiquida : receitaBruta > 0 ? receitaBruta : 0

  const margemBrutaPct = baseReceita > 0 ? (lucroBruto / baseReceita) * 100 : 0
  const margemOperacionalPct = baseReceita > 0 ? (resultadoOperacional / baseReceita) * 100 : 0
  const margemLiquidaPct = baseReceita > 0 ? (resultadoLiquido / baseReceita) * 100 : 0
  const totalDespesas = deducoes + cmv + despesasOperacionaisTotal
  const margemEconomiaPct =
    receitaBruta > 0 ? ((receitaBruta - totalDespesas) / receitaBruta) * 100 : 0

  // Calcula percentuais em relação à receita líquida para cada item
  Object.values(groups).forEach((g) => {
    g.items.forEach((item) => {
      item.percentageOfGross = receitaBruta > 0 ? (item.value / receitaBruta) * 100 : 0
      item.percentageOfNet = baseReceita > 0 ? (item.value / baseReceita) * 100 : 0
    })
  })

  // Label do período
  let periodLabel = 'Período Completo'
  if (month) {
    const [y, m] = month.split('-')
    const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1)
    periodLabel = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  } else if (year) {
    periodLabel = `Ano de ${year}`
  } else if (startDate && endDate) {
    periodLabel = `${startDate.split('-').reverse().join('/')} até ${endDate.split('-').reverse().join('/')}`
  }

  const ignoredCount = transactions.length - filtered.length

  return {
    periodLabel,
    startDate,
    endDate,
    receitaBruta,
    deducoes,
    receitaLiquida,
    cmv,
    lucroBruto,
    despesasOperacionaisTotal,
    despesasAdministrativas,
    despesasComerciais,
    despesasPessoal,
    despesasOcupacao,
    despesasFinanceiras,
    outrasOperacionais,
    resultadoOperacional,
    outrasReceitasDespesas,
    resultadoLiquido,
    margemBrutaPct,
    margemOperacionalPct,
    margemLiquidaPct,
    margemEconomiaPct,
    groups,
    totalTransactionsCount: filtered.length,
    ignoredTransactionsCount: ignoredCount,
  }
}

export interface MonthlyComparative {
  currentMonthKey: string
  previousMonthKey: string
  currentMonthLabel: string
  previousMonthLabel: string

  // Receita
  incomeCurrent: number
  incomePrevious: number
  incomeDiff: number
  incomeVariationPct: number

  // Despesas
  expenseCurrent: number
  expensePrevious: number
  expenseDiff: number
  expenseVariationPct: number

  // Resultado
  resultCurrent: number
  resultPrevious: number
  resultDiff: number
  resultVariationPct: number

  // Margem e Economia
  marginCurrent: number
  marginPrevious: number
  marginDiff: number

  savingsCurrent: number
  savingsPrevious: number
  savingsDiff: number

  // Análise de Categorias
  topExpenseCategory: { category: string; value: number; percentage: number } | null
  fastestGrowingCategory: {
    category: string
    current: number
    previous: number
    diff: number
    pct: number
  } | null
  fastestFallingCategory: {
    category: string
    current: number
    previous: number
    diff: number
    pct: number
  } | null
  top5Expenses: { category: string; value: number; percentage: number }[]
  top5Incomes: { category: string; value: number; percentage: number }[]

  // Insights gerados matematicamente
  insights: string[]
}

/**
 * Calcula o comparativo detalhado Mês Atual vs Mês Anterior com variações e insights matemáticos
 */
export function calculateMonthlyComparative(
  transactions: Transaction[],
  currentMonthStr: string, // "YYYY-MM"
  customCategories: CategoryItem[] = [],
): MonthlyComparative {
  const [curY, curM] = currentMonthStr.split('-').map((n) => parseInt(n, 10))
  const prevDate = new Date(curY, curM - 2, 1)
  const prevMonthStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

  const curDre = calculateDreReport(transactions, {
    month: currentMonthStr,
    customCategories,
  })
  const prevDre = calculateDreReport(transactions, {
    month: prevMonthStr,
    customCategories,
  })

  // Nomes dos meses
  const curD = new Date(curY, curM - 1, 1)
  const currentMonthLabel = curD.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
  const previousMonthLabel = prevDate.toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  // Receitas (Receita Bruta)
  const incomeCurrent = curDre.receitaBruta
  const incomePrevious = prevDre.receitaBruta
  const incomeDiff = incomeCurrent - incomePrevious
  const incomeVariationPct =
    incomePrevious > 0 ? (incomeDiff / incomePrevious) * 100 : incomeCurrent > 0 ? 100 : 0

  // Despesas (Deduções + CMV + Despesas Operacionais)
  const expenseCurrent = curDre.deducoes + curDre.cmv + curDre.despesasOperacionaisTotal
  const expensePrevious = prevDre.deducoes + prevDre.cmv + prevDre.despesasOperacionaisTotal
  const expenseDiff = expenseCurrent - expensePrevious
  const expenseVariationPct =
    expensePrevious > 0 ? (expenseDiff / expensePrevious) * 100 : expenseCurrent > 0 ? 100 : 0

  // Resultado Líquido
  const resultCurrent = curDre.resultadoLiquido
  const resultPrevious = prevDre.resultadoLiquido
  const resultDiff = resultCurrent - resultPrevious
  const resultVariationPct =
    Math.abs(resultPrevious) > 0
      ? ((resultCurrent - resultPrevious) / Math.abs(resultPrevious)) * 100
      : resultCurrent !== 0
        ? 100
        : 0

  // Margem Líquida %
  const marginCurrent = curDre.margemLiquidaPct
  const marginPrevious = prevDre.margemLiquidaPct
  const marginDiff = marginCurrent - marginPrevious

  // Economia %
  const savingsCurrent = curDre.margemEconomiaPct
  const savingsPrevious = prevDre.margemEconomiaPct
  const savingsDiff = savingsCurrent - savingsPrevious

  // Agrupamento de categorias de despesa e receita para ambos os meses
  const curExpenseCats: Record<string, number> = {}
  const prevExpenseCats: Record<string, number> = {}
  const curIncomeCats: Record<string, number> = {}
  const prevIncomeCats: Record<string, number> = {}

  transactions
    .filter((t) => isDreEligibleTransaction(t))
    .forEach((t) => {
      const date = t.date || ''
      const cat = (t.category || (t.type === 'receita' ? 'Outras Receitas' : 'Outros')).trim()
      const val = Number(t.value || 0)

      if (date.startsWith(currentMonthStr)) {
        if (t.type === 'despesa') {
          curExpenseCats[cat] = (curExpenseCats[cat] || 0) + val
        } else if (t.type === 'receita') {
          curIncomeCats[cat] = (curIncomeCats[cat] || 0) + val
        }
      } else if (date.startsWith(prevMonthStr)) {
        if (t.type === 'despesa') {
          prevExpenseCats[cat] = (prevExpenseCats[cat] || 0) + val
        } else if (t.type === 'receita') {
          prevIncomeCats[cat] = (prevIncomeCats[cat] || 0) + val
        }
      }
    })

  // Top 5 despesas do mês atual
  const top5Expenses = Object.entries(curExpenseCats)
    .map(([category, value]) => ({
      category,
      value,
      percentage: expenseCurrent > 0 ? (value / expenseCurrent) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  // Top 5 fontes de receita do mês atual
  const top5Incomes = Object.entries(curIncomeCats)
    .map(([category, value]) => ({
      category,
      value,
      percentage: incomeCurrent > 0 ? (value / incomeCurrent) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  // Maior gasto
  const topExpenseCategory = top5Expenses[0] || null

  // Categoria que mais cresceu e que mais caiu
  const allExpenseCatNames = Array.from(
    new Set([...Object.keys(curExpenseCats), ...Object.keys(prevExpenseCats)]),
  )

  const growthList = allExpenseCatNames
    .map((cat) => {
      const cur = curExpenseCats[cat] || 0
      const prev = prevExpenseCats[cat] || 0
      const diff = cur - prev
      const pct = prev > 0 ? (diff / prev) * 100 : cur > 0 ? 100 : 0
      return { category: cat, current: cur, previous: prev, diff, pct }
    })
    .filter((i) => i.current > 0 || i.previous > 0)

  const fastestGrowingCategory =
    growthList.filter((g) => g.diff > 0).sort((a, b) => b.diff - a.diff)[0] || null

  const fastestFallingCategory =
    growthList.filter((g) => g.diff < 0).sort((a, b) => a.diff - b.diff)[0] || null

  // GERAÇÃO DE INSIGHTS MATEMÁTICOS (100% baseados em dados reais)
  const insights: string[] = []

  // Insight 1: Despesas
  if (expensePrevious > 0) {
    if (expenseDiff < 0) {
      insights.push(
        `Suas despesas diminuíram ${Math.abs(expenseVariationPct).toFixed(1)}% em relação ao mês passado.`,
      )
    } else if (expenseDiff > 0) {
      insights.push(
        `Suas despesas aumentaram ${expenseVariationPct.toFixed(1)}% em relação ao mês anterior.`,
      )
    } else {
      insights.push(`Suas despesas permaneceram estáveis em relação ao mês anterior.`)
    }
  }

  // Insight 2: Resultado Líquido
  if (resultDiff > 0) {
    insights.push(
      `Seu resultado líquido aumentou R$ ${resultDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    )
  } else if (resultDiff < 0) {
    insights.push(
      `Seu resultado líquido reduziu R$ ${Math.abs(resultDiff).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}.`,
    )
  }

  // Insight 3: Maior categoria
  if (topExpenseCategory && topExpenseCategory.percentage > 0) {
    insights.push(
      `${topExpenseCategory.category} representa ${topExpenseCategory.percentage.toFixed(1)}% das suas despesas.`,
    )
  }

  // Insight 4: Categoria que mais aumentou
  if (
    fastestGrowingCategory &&
    fastestGrowingCategory.pct > 5 &&
    fastestGrowingCategory.previous > 0
  ) {
    insights.push(
      `${fastestGrowingCategory.category} aumentou ${fastestGrowingCategory.pct.toFixed(1)}% em relação ao mês anterior.`,
    )
  }

  // Insight 5: Economia / Poupança
  if (incomeCurrent > 0 && curDre.margemEconomiaPct > 0) {
    insights.push(
      `Você economizou ${curDre.margemEconomiaPct.toFixed(1)}% da sua receita neste mês.`,
    )
  }

  return {
    currentMonthKey: currentMonthStr,
    previousMonthKey: prevMonthStr,
    currentMonthLabel,
    previousMonthLabel,
    incomeCurrent,
    incomePrevious,
    incomeDiff,
    incomeVariationPct,
    expenseCurrent,
    expensePrevious,
    expenseDiff,
    expenseVariationPct,
    resultCurrent,
    resultPrevious,
    resultDiff,
    resultVariationPct,
    marginCurrent,
    marginPrevious,
    marginDiff,
    savingsCurrent,
    savingsPrevious,
    savingsDiff,
    topExpenseCategory,
    fastestGrowingCategory,
    fastestFallingCategory,
    top5Expenses,
    top5Incomes,
    insights,
  }
}

/**
 * Calcula série histórica de 6 e 12 meses para gráficos do Comparativo
 */
export function calculateComparativeHistory(
  transactions: Transaction[],
  selectedMonthStr: string, // "YYYY-MM"
  monthsCount: 6 | 12 = 6,
  customCategories: CategoryItem[] = [],
) {
  const [selY, selM] = selectedMonthStr.split('-').map((n) => parseInt(n, 10))
  const base = new Date(selY, selM - 1, 1)

  const MONTHS_SHORT = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ]

  const history = []

  for (let i = monthsCount - 1; i >= 0; i--) {
    const d = new Date(base.getFullYear(), base.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const label = `${MONTHS_SHORT[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`

    const dre = calculateDreReport(transactions, {
      month: key,
      customCategories,
    })

    const despesas = dre.deducoes + dre.cmv + dre.despesasOperacionaisTotal

    history.push({
      monthKey: key,
      label,
      receitas: dre.receitaBruta,
      despesas,
      resultado: dre.resultadoLiquido,
      margem: dre.margemLiquidaPct,
      lucroBruto: dre.lucroBruto,
    })
  }

  return history
}
