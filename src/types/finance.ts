export type BankName =
  | 'Nubank'
  | 'Caixa'
  | 'Itaú'
  | 'Bradesco'
  | 'Santander'
  | 'Banco do Brasil'
  | 'Inter'
  | 'C6'
  | 'Sicoob'
  | 'PicPay'
  | 'Mercado Pago'
  | 'Neon'
  | 'Banco CSF/Atacadão'
  | 'Outro'

export type AccountType = 'Conta corrente' | 'Conta poupança' | 'Carteira' | 'Outro'
export type PaymentMethod = 'Dinheiro' | 'PIX' | 'Débito' | 'Crédito' | 'Boleto' | 'Transferência'
export type TransactionType = 'receita' | 'despesa' | 'ajuste'
export type TransactionStatus = 'realizado' | 'pendente'
export type TransactionSource =
  | 'manual'
  | 'importado'
  | 'fatura'
  | 'recorrência'
  | 'parcela'
  | 'ajuste'
export type CardBrand = 'Visa' | 'Mastercard' | 'Elo' | 'Amex' | 'Hipercard' | 'Outro'
export type InvoiceStatus = 'aberta' | 'paga'
export type BillStatus = 'pago' | 'não_pago'
export type BillType = 'pagar' | 'receber'
export type RecurringFrequency = 'mensal' | 'semanal' | 'trimestral' | 'anual'
export type InvestmentType = 'bitcoin' | 'ethereum' | 'acao' | 'fii' | 'renda_fixa' | 'cdi100'
export type PlanType = 'mensal' | 'anual'
export type SubscriptionStatus = 'ativa' | 'bloqueada'
export type SubscriptionProvider = 'stripe' | 'mercadopago'

export type DreGroup =
  | 'receita_bruta'
  | 'deducoes'
  | 'cmv'
  | 'despesas_administrativas'
  | 'despesas_comerciais'
  | 'pessoal'
  | 'ocupacao'
  | 'despesas_financeiras'
  | 'outras_operacionais'
  | 'outras_receitas_despesas'

export interface CategoryItem {
  id: string
  user?: string
  name: string
  type: 'receita' | 'despesa'
  dre_group: DreGroup
  color?: string
  icon?: string
  created?: string
  updated?: string
}

// Tipos da integração de pagamentos (frontend) — espelham os valores usados
// pelas rotas de checkout do backend e pelo contexto de auth.
export type PaymentProvider = 'stripe' | 'mercadopago'
export type SubscriptionPlan = 'monthly' | 'yearly' | 'none'

export interface User {
  id: string
  email: string
  name?: string
  avatar?: string
  phone?: string
  birth_date?: string
  city?: string
  state?: string
  display_name?: string
  verified?: boolean
  created: string
  updated: string
}

export interface Account {
  id: string
  user: string
  name: string
  type: AccountType
  bank: BankName
  opening_balance: number
  color?: string
  created: string
  updated: string
  // Computed on client
  current_balance?: number
  projected_balance?: number
  has_transactions?: boolean
}

export interface CreditCard {
  id: string
  user: string
  name: string
  bank: BankName
  limit: number
  closing_day: number
  due_day: number
  last_four: string
  brand?: CardBrand
  created: string
  updated: string
  // Computed
  current_invoice_total?: number
  available_limit?: number
  used_percentage?: number
}

export interface Invoice {
  id: string
  user: string
  credit_card: string
  reference: string // "YYYY-MM"
  closing_date?: string
  due_date?: string
  total: number
  status: InvoiceStatus
  paid_at?: string
  payment_transaction?: string
  created: string
  updated: string
  expand?: {
    credit_card?: CreditCard
    payment_transaction?: Transaction
  }
}

export interface InvoiceItem {
  id: string
  invoice: string
  description: string
  value: number
  category?: string
  date?: string
  installments?: string
  is_imported?: boolean
  created: string
  updated: string
}

export interface Transaction {
  id: string
  user: string
  description: string
  value: number
  category?: string
  date: string
  payment_method: PaymentMethod
  status: TransactionStatus
  type: TransactionType
  account?: string
  credit_card?: string
  installment_group?: string
  bill_id?: string
  transfer_target_account?: string
  transfer_group_id?: string
  source?: TransactionSource
  paid_at?: string
  dre_group?: DreGroup
  created: string
  updated: string
  expand?: {
    account?: Account
    credit_card?: CreditCard
    installment_group?: Installment
    bill_id?: Bill
    transfer_target_account?: Account
  }
}

export interface Bill {
  id: string
  user: string
  description: string
  value: number
  due_date: string
  category?: string
  barcode?: string
  status: BillStatus
  type?: BillType
  paid_at?: string
  paid_date?: string
  account?: string
  recurring?: boolean
  recurring_bill?: string
  generated_transaction?: string
  created: string
  updated: string
  expand?: {
    account?: Account
    generated_transaction?: Transaction
    recurring_bill?: RecurringBill
  }
}

export interface RecurringBill {
  id: string
  user: string
  description: string
  value: number
  type: BillType
  category?: string
  frequency: RecurringFrequency
  due_day: number
  payment_method?: PaymentMethod
  account?: string
  credit_card?: string
  active: boolean
  start_date?: string
  end_date?: string
  next_date?: string
  last_generated?: string
  repetitions?: number
  generated_count?: number
  created: string
  updated: string
  expand?: {
    account?: Account
    credit_card?: CreditCard
  }
}

export interface Recurrence {
  id: string
  user: string
  description: string
  value: number
  type: 'receita' | 'despesa'
  category?: string
  frequency: 'mensal'
  due_day: number
  payment_method?: PaymentMethod
  account?: string
  active: boolean
  start_date?: string
  end_date?: string
  last_generated?: string
  created: string
  updated: string
  expand?: {
    account?: Account
  }
}

export interface Installment {
  id: string
  user: string
  description: string
  total_value: number
  installment_value: number
  total_installments: number
  current_installment: number
  category?: string
  credit_card?: string
  start_date?: string
  created: string
  updated: string
  expand?: {
    credit_card?: CreditCard
  }
}

export interface Budget {
  id: string
  user: string
  category: string
  limit_value: number
  month: string // "YYYY-MM"
  created: string
  updated: string
  // Computed
  spent?: number
  percentage?: number
}

export interface Goal {
  id: string
  user: string
  name: string
  target_value: number
  target_date?: string
  category?: string
  description?: string
  color?: string
  icon?: string
  created: string
  updated: string
  // Computed
  accumulated?: number
  percentage?: number
  remaining?: number
  contributions?: GoalContribution[]
}

export interface GoalContribution {
  id: string
  goal: string
  value: number
  date: string
  note?: string
  created: string
  updated: string
}

export interface Investment {
  id: string
  user: string
  type: InvestmentType
  symbol?: string
  name: string
  applied_value: number
  quantity?: number
  unit_price?: number
  application_date?: string
  current_price?: number
  last_price_update?: string
  created: string
  updated: string
  // Computed
  current_total_value?: number
  profit_loss?: number
  profit_loss_pct?: number
}

export interface WeeklyAnalysis {
  id: string
  user: string
  week_start: string
  week_end: string
  summary_json: any
  created: string
  updated: string
}

export interface CategorizationRule {
  id: string
  user: string
  keyword: string
  category: string
  is_learned?: boolean
  created: string
  updated: string
}

// Assinatura do usuário na coleção `subscriptions` do PocketBase.
// Os campos snake_case são os nomes reais vindos do PocketBase (definidos na
// migration 0010_subscriptions_payment_providers.js). Os campos camelCase
// (userId, providerSubscriptionId, currentPeriodStart, currentPeriodEnd,
// cancelAtPeriodEnd, createdAt) são aliases expostos pela camada de
// pagamentos do frontend — mantidos opcionais pois nem todo literal os
// preenche (o PocketBase grava apenas os snake_case).
export interface Subscription {
  id: string
  userId?: string // = user (relação) — alias camelCase
  user: string
  plan: PlanType
  status: SubscriptionStatus
  provider?: SubscriptionProvider
  providerSubscriptionId?: string // = provider_subscription_id — alias
  provider_subscription_id?: string
  currentPeriodStart?: string // = current_period_start — alias
  current_period_start?: string
  currentPeriodEnd?: string // = current_period_end — alias
  current_period_end?: string
  cancelAtPeriodEnd?: boolean // = cancel_at_period_end — alias
  cancel_at_period_end?: boolean
  createdAt?: string // = created (autodate) — alias
  created: string
  updated: string
  // Campos legados mantidos por compatibilidade:
  price?: number
  started_at?: string
  renewed_at?: string
  expires_at?: string
  admin_released?: boolean
  provider_customer_id?: string
}
