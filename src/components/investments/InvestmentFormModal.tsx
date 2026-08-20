import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import {
  Investment,
  InvestmentType,
  InvestmentCategoryGroup,
  InvestmentYieldType,
  InvestmentTaxRegime,
} from '@/types/finance'
import { FINANCIAL_INSTITUTIONS } from '@/data/institutions'
import {
  Landmark,
  TrendingUp,
  Coins,
  ShieldCheck,
  Globe2,
  Building2,
  HelpCircle,
  ArrowLeft,
  Loader2,
  Check,
} from 'lucide-react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useToast } from '@/hooks/use-toast'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  investmentToEdit?: Investment | null
}

interface TypeOption {
  type: InvestmentType
  label: string
  category: InvestmentCategoryGroup
  icon: string
  description: string
}

const TYPE_OPTIONS: TypeOption[] = [
  // Renda Fixa
  {
    type: 'cdb',
    label: 'CDB',
    category: 'renda_fixa',
    icon: '💰',
    description: 'Certificado de Depósito Bancário',
  },
  {
    type: 'rdb',
    label: 'RDB',
    category: 'renda_fixa',
    icon: '💰',
    description: 'Recibo de Depósito Bancário',
  },
  {
    type: 'lci',
    label: 'LCI',
    category: 'renda_fixa',
    icon: '🏠',
    description: 'Letra Imobiliária (Isenta IR)',
  },
  {
    type: 'lca',
    label: 'LCA',
    category: 'renda_fixa',
    icon: '🌾',
    description: 'Letra Agropecuária (Isenta IR)',
  },
  {
    type: 'tesouro_selic',
    label: 'Tesouro Selic',
    category: 'renda_fixa',
    icon: '🏛️',
    description: 'Títulos Públicos Pós-fixados',
  },
  {
    type: 'tesouro_prefixado',
    label: 'Tesouro Prefixado',
    category: 'renda_fixa',
    icon: '🏛️',
    description: 'Taxa fixa garantida até vencimento',
  },
  {
    type: 'tesouro_ipca',
    label: 'Tesouro IPCA+',
    category: 'renda_fixa',
    icon: '🏛️',
    description: 'Proteção contra inflação',
  },
  {
    type: 'cdi100',
    label: '100% CDI',
    category: 'renda_fixa',
    icon: '📈',
    description: 'Liquidez diária atrelada ao CDI',
  },
  {
    type: 'debentures',
    label: 'Debêntures',
    category: 'renda_fixa',
    icon: '📑',
    description: 'Títulos de dívida corporativa',
  },
  {
    type: 'cri',
    label: 'CRI',
    category: 'renda_fixa',
    icon: '🏢',
    description: 'Certificados Imobiliários',
  },
  {
    type: 'cra',
    label: 'CRA',
    category: 'renda_fixa',
    icon: '🚜',
    description: 'Certificados do Agronegócio',
  },
  {
    type: 'poupanca',
    label: 'Poupança',
    category: 'renda_fixa',
    icon: '🐷',
    description: 'Caderneta tradicional',
  },

  // Renda Variável
  {
    type: 'acao',
    label: 'Ações BR',
    category: 'renda_variavel',
    icon: '📊',
    description: 'Mercado de ações B3',
  },
  {
    type: 'fii',
    label: 'FIIs',
    category: 'renda_variavel',
    icon: '🏢',
    description: 'Fundos Imobiliários',
  },
  {
    type: 'etf',
    label: 'ETFs Brasil',
    category: 'renda_variavel',
    icon: '🧺',
    description: 'Índices negociados em bolsa',
  },
  {
    type: 'bdr',
    label: 'BDRs',
    category: 'renda_variavel',
    icon: '🌐',
    description: 'Empresas globais na B3',
  },
  {
    type: 'fiagro',
    label: 'Fiagros',
    category: 'renda_variavel',
    icon: '🌱',
    description: 'Fundos das Cadeias Agroindustriais',
  },

  // Fundos
  {
    type: 'fundo_rf',
    label: 'Fundo Renda Fixa',
    category: 'fundos',
    icon: '🏦',
    description: 'Carteiras conservadoras',
  },
  {
    type: 'fundo_multimercado',
    label: 'Fundo Multimercado',
    category: 'fundos',
    icon: '🏦',
    description: 'Estratégias diversificadas',
  },
  {
    type: 'fundo_acoes',
    label: 'Fundo de Ações',
    category: 'fundos',
    icon: '🏦',
    description: 'Gestão profissional em ações',
  },
  {
    type: 'fundo_cambial',
    label: 'Fundo Cambial',
    category: 'fundos',
    icon: '🏦',
    description: 'Exposição a moedas fortes',
  },
  {
    type: 'fundo_imobiliario',
    label: 'Fundo Imobiliário (Geral)',
    category: 'fundos',
    icon: '🏦',
    description: 'Fundos de tijolo, papel ou FoFs',
  },

  // Cripto
  {
    type: 'bitcoin',
    label: 'Bitcoin (BTC)',
    category: 'cripto',
    icon: '₿',
    description: 'Ouro digital descentralizado',
  },
  {
    type: 'ethereum',
    label: 'Ethereum (ETH)',
    category: 'cripto',
    icon: 'Ξ',
    description: 'Plataforma de smart contracts',
  },
  {
    type: 'cripto_alt',
    label: 'Altcoins / Outras Criptos',
    category: 'cripto',
    icon: '🪙',
    description: 'SOL, ADA, XRP, LINK, etc.',
  },

  // Previdência
  {
    type: 'pgbl',
    label: 'PGBL',
    category: 'previdencia',
    icon: '🛡️',
    description: 'Dedução no IRPF completo',
  },
  {
    type: 'vgbl',
    label: 'VGBL',
    category: 'previdencia',
    icon: '🛡️',
    description: 'Tributação apenas no rendimento',
  },

  // Internacional
  {
    type: 'acao_us',
    label: 'Ações EUA (Stocks)',
    category: 'internacional',
    icon: '🇺🇸',
    description: 'Mercado americano (NYSE/NASDAQ)',
  },
  {
    type: 'etf_internacional',
    label: 'ETF Internacional',
    category: 'internacional',
    icon: '🌍',
    description: 'Exposição a mercados globais',
  },
  {
    type: 'dolar',
    label: 'Dólar (USD)',
    category: 'internacional',
    icon: '💵',
    description: 'Moeda americana',
  },
  {
    type: 'euro',
    label: 'Euro (EUR)',
    category: 'internacional',
    icon: '💶',
    description: 'Moeda europeia',
  },

  // Outros
  {
    type: 'ouro',
    label: 'Ouro',
    category: 'outros',
    icon: '🥇',
    description: 'Metal precioso de proteção',
  },
  {
    type: 'ativo_personalizado',
    label: 'Ativo Personalizado',
    category: 'outros',
    icon: '✨',
    description: 'Qualquer outro investimento',
  },
]

const CATEGORY_TABS: {
  key: InvestmentCategoryGroup | 'todos'
  label: string
  icon: React.ReactNode
}[] = [
  { key: 'todos', label: 'Todos', icon: <TrendingUp className="w-4 h-4" /> },
  { key: 'renda_fixa', label: 'Renda Fixa', icon: <Landmark className="w-4 h-4" /> },
  { key: 'renda_variavel', label: 'Renda Variável', icon: <TrendingUp className="w-4 h-4" /> },
  { key: 'fundos', label: 'Fundos', icon: <Building2 className="w-4 h-4" /> },
  { key: 'cripto', label: 'Cripto', icon: <Coins className="w-4 h-4" /> },
  { key: 'previdencia', label: 'Previdência', icon: <ShieldCheck className="w-4 h-4" /> },
  { key: 'internacional', label: 'Internacional', icon: <Globe2 className="w-4 h-4" /> },
  { key: 'outros', label: 'Outros', icon: <HelpCircle className="w-4 h-4" /> },
]

export default function InvestmentFormModal({ open, onOpenChange, investmentToEdit }: Props) {
  const { createInvestment, updateInvestment } = useFinance()
  const { toast } = useToast()

  const [step, setStep] = useState<1 | 2>(1)
  const [selectedCategoryTab, setSelectedCategoryTab] = useState<InvestmentCategoryGroup | 'todos'>(
    'todos',
  )
  const [selectedType, setSelectedType] = useState<InvestmentType>('cdb')
  const [isSaving, setIsSaving] = useState(false)

  // Form states
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [appliedValue, setAppliedValue] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [currentPrice, setCurrentPrice] = useState('')
  const [applicationDate, setApplicationDate] = useState(new Date().toISOString().split('T')[0])
  const [institution, setInstitution] = useState('')
  const [maturityDate, setMaturityDate] = useState('')
  const [liquidity, setLiquidity] = useState('diaria')
  const [yieldType, setYieldType] = useState<InvestmentYieldType>('cdi_pct')
  const [yieldRate, setYieldRate] = useState('100')
  const [taxRegime, setTaxRegime] = useState<InvestmentTaxRegime>('regressivo')
  const [notes, setNotes] = useState('')

  // Top crypto coins helper
  const TOP_CRYPTOS = [
    'BTC',
    'ETH',
    'SOL',
    'USDT',
    'DOGE',
    'ADA',
    'XRP',
    'DOT',
    'LINK',
    'AVAX',
    'BNB',
    'POL',
  ]

  useEffect(() => {
    if (investmentToEdit) {
      setSelectedType(investmentToEdit.type || 'cdb')
      setName(investmentToEdit.name || '')
      setSymbol(investmentToEdit.symbol || '')
      setAppliedValue(investmentToEdit.applied_value ? String(investmentToEdit.applied_value) : '')
      setQuantity(investmentToEdit.quantity ? String(investmentToEdit.quantity) : '')
      setUnitPrice(investmentToEdit.unit_price ? String(investmentToEdit.unit_price) : '')
      setCurrentPrice(investmentToEdit.current_price ? String(investmentToEdit.current_price) : '')
      setApplicationDate(
        investmentToEdit.application_date
          ? investmentToEdit.application_date.split('T')[0]
          : new Date().toISOString().split('T')[0],
      )
      setInstitution(investmentToEdit.institution || '')
      setMaturityDate(
        investmentToEdit.maturity_date ? investmentToEdit.maturity_date.split('T')[0] : '',
      )
      setLiquidity(investmentToEdit.liquidity || 'diaria')
      setYieldType(investmentToEdit.yield_type || 'cdi_pct')
      setYieldRate(investmentToEdit.yield_rate ? String(investmentToEdit.yield_rate) : '100')
      setTaxRegime(investmentToEdit.tax_regime || 'regressivo')
      setNotes(investmentToEdit.notes || '')
      setStep(2)
    } else {
      // Reset form
      setStep(1)
      setSelectedType('cdb')
      setName('')
      setSymbol('')
      setAppliedValue('')
      setQuantity('')
      setUnitPrice('')
      setCurrentPrice('')
      setApplicationDate(new Date().toISOString().split('T')[0])
      setInstitution('')
      setMaturityDate('')
      setLiquidity('diaria')
      setYieldType('cdi_pct')
      setYieldRate('100')
      setTaxRegime('regressivo')
      setNotes('')
    }
  }, [investmentToEdit, open])

  const handleSelectType = (option: TypeOption) => {
    setSelectedType(option.type)
    if (!name) setName(option.label)
    if (['lci', 'lca', 'cri', 'cra', 'fiagro'].includes(option.type)) {
      setTaxRegime('isento')
    } else if (['poupanca'].includes(option.type)) {
      setTaxRegime('sem_ir')
    } else {
      setTaxRegime('regressivo')
    }

    if (option.type === 'tesouro_selic' || option.type === 'cdb' || option.type === 'cdi100') {
      setYieldType('cdi_pct')
      setYieldRate('100')
    } else if (option.type === 'tesouro_prefixado') {
      setYieldType('prefixado')
      setYieldRate('12.5')
    } else if (option.type === 'tesouro_ipca') {
      setYieldType('ipca_mais')
      setYieldRate('6.5')
    }
    setStep(2)
  }

  const selectedTypeConfig = TYPE_OPTIONS.find((t) => t.type === selectedType) || TYPE_OPTIONS[0]

  const isVariableIncome = [
    'acao',
    'fii',
    'etf',
    'bdr',
    'fiagro',
    'acao_us',
    'etf_internacional',
  ].includes(selectedType)

  const isCrypto = ['bitcoin', 'ethereum', 'cripto_alt'].includes(selectedType)

  const isFixedIncome = [
    'cdb',
    'rdb',
    'lci',
    'lca',
    'tesouro_selic',
    'tesouro_prefixado',
    'tesouro_ipca',
    'debentures',
    'cri',
    'cra',
    'letras_financeiras',
    'poupanca',
    'cdi100',
    'renda_fixa',
  ].includes(selectedType)

  const isFund = [
    'fundo_rf',
    'fundo_multimercado',
    'fundo_acoes',
    'fundo_cambial',
    'fundo_imobiliario',
  ].includes(selectedType)

  const isPension = ['pgbl', 'vgbl'].includes(selectedType)

  const filteredTypes =
    selectedCategoryTab === 'todos'
      ? TYPE_OPTIONS
      : TYPE_OPTIONS.filter((t) => t.category === selectedCategoryTab)

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome do investimento.',
        variant: 'destructive',
      })
      return
    }

    const appliedValNum = parseFloat(appliedValue.replace(',', '.')) || 0
    const qtyNum = parseFloat(quantity.replace(',', '.')) || undefined
    const unitPriceNum = parseFloat(unitPrice.replace(',', '.')) || undefined
    const curPriceNum = parseFloat(currentPrice.replace(',', '.')) || undefined
    const yieldRateNum = parseFloat(yieldRate.replace(',', '.')) || undefined

    // Se informou qtd e preço unitário mas não valor aplicado, calcula automaticamente
    let finalApplied = appliedValNum
    if (finalApplied === 0 && qtyNum && unitPriceNum) {
      finalApplied = qtyNum * unitPriceNum
    }

    if (finalApplied <= 0 && !qtyNum) {
      toast({
        title: 'Valor ou Quantidade obrigatório',
        description: 'Informe o valor aplicado ou quantidade do ativo.',
        variant: 'destructive',
      })
      return
    }

    setIsSaving(true)
    try {
      const payload: Partial<Investment> = {
        name: name.trim(),
        type: selectedType,
        symbol: symbol.trim() ? symbol.trim().toUpperCase() : undefined,
        applied_value: finalApplied,
        quantity: qtyNum,
        unit_price: unitPriceNum,
        current_price: curPriceNum,
        application_date: applicationDate ? new Date(applicationDate).toISOString() : undefined,
        institution: institution || undefined,
        maturity_date: maturityDate ? new Date(maturityDate).toISOString() : undefined,
        liquidity: liquidity || undefined,
        yield_type: yieldType,
        yield_rate: yieldRateNum,
        tax_regime: taxRegime,
        category_group: selectedTypeConfig.category,
        notes: notes.trim() || undefined,
      }

      if (investmentToEdit) {
        await updateInvestment(investmentToEdit.id, payload)
        toast({ title: 'Investimento atualizado', description: 'Alterações salvas com sucesso.' })
      } else {
        await createInvestment(payload)
        toast({ title: 'Investimento criado', description: 'Ativo adicionado à sua carteira.' })
      }
      onOpenChange(false)
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar o investimento.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-[#0f1626] border-slate-200 dark:border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {step === 2 && !investmentToEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:hover:text-white"
                onClick={() => setStep(1)}
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <DialogTitle className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              {investmentToEdit
                ? 'Editar Investimento'
                : step === 1
                  ? 'Escolha o Tipo de Ativo'
                  : `Cadastrar ${selectedTypeConfig.label}`}
            </DialogTitle>
          </div>
          <DialogDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            {step === 1
              ? 'Selecione a categoria e o produto financeiro que você deseja cadastrar.'
              : 'Preencha os detalhes da sua aplicação para calcular rentabilidade e impostos.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-4 py-2">
            {/* Categorias Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none">
              {CATEGORY_TABS.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategoryTab(cat.key)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedCategoryTab === cat.key
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>

            {/* Grid de Tipos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
              {filteredTypes.map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleSelectType(opt)}
                  className="flex items-start gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 text-left transition-all group"
                >
                  <span className="text-2xl select-none p-2 rounded-lg bg-slate-100 dark:bg-slate-800 shrink-0 group-hover:scale-105 transition-transform">
                    {opt.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                      {opt.label}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                      {opt.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800">
              <span className="text-xl">{selectedTypeConfig.icon}</span>
              <div className="text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  {selectedTypeConfig.label}
                </span>{' '}
                <span className="text-slate-400">({selectedTypeConfig.category})</span>
              </div>
            </div>

            {/* Campos comuns e contextuais */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Ticker / Símbolo para RV ou Cripto */}
              {(isVariableIncome || isCrypto) && (
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    {isCrypto ? 'Símbolo / Cripto' : 'Ticker (Ex: PETR4, HGLG11, IVVB11)'}
                  </Label>
                  {isCrypto ? (
                    <div className="flex gap-2 mt-1">
                      <Select
                        value={symbol || 'BTC'}
                        onValueChange={(val) => {
                          setSymbol(val)
                          if (!name || TOP_CRYPTOS.includes(name)) setName(val)
                        }}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Selecione a moeda" />
                        </SelectTrigger>
                        <SelectContent className="max-h-56">
                          {TOP_CRYPTOS.map((coin) => (
                            <SelectItem key={coin} value={coin}>
                              {coin}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <Input
                      placeholder="Ex: VALE3"
                      value={symbol}
                      onChange={(e) => {
                        const upp = e.target.value.toUpperCase()
                        setSymbol(upp)
                        if (!name || name === symbol) setName(upp)
                      }}
                      className="mt-1 uppercase text-sm font-mono font-semibold"
                    />
                  )}
                </div>
              )}

              {/* Nome do Produto */}
              <div className={isVariableIncome || isCrypto ? '' : 'sm:col-span-2'}>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nome do Ativo / Produto *
                </Label>
                <Input
                  placeholder="Ex: CDB Banco XP 110% CDI, Petrobras PN..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 text-sm"
                  required
                />
              </div>

              {/* Instituição / Corretora */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Instituição / Corretora
                </Label>
                <Select value={institution || 'outro'} onValueChange={setInstitution}>
                  <SelectTrigger className="mt-1 text-sm">
                    <SelectValue placeholder="Selecione a corretora ou banco" />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {FINANCIAL_INSTITUTIONS.filter(
                      (i) =>
                        i.type === 'investimento' ||
                        i.type === 'banco_digital' ||
                        i.type === 'banco_multiplo' ||
                        i.id === 'outro',
                    ).map((inst) => (
                      <SelectItem key={inst.id} value={inst.shortName}>
                        {inst.shortName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Data da Aplicação / Compra */}
              <div>
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Data da Aplicação / Compra
                </Label>
                <Input
                  type="date"
                  value={applicationDate}
                  onChange={(e) => setApplicationDate(e.target.value)}
                  className="mt-1 text-sm"
                />
              </div>

              {/* Para Ações / Cripto: Quantidade e Preço Médio */}
              {isVariableIncome || isCrypto ? (
                <>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Quantidade
                    </Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 100 ou 0,05"
                      value={quantity}
                      onChange={(e) => {
                        const val = e.target.value
                        setQuantity(val)
                        const q = parseFloat(val.replace(',', '.')) || 0
                        const p = parseFloat(unitPrice.replace(',', '.')) || 0
                        if (q > 0 && p > 0) {
                          setAppliedValue(String((q * p).toFixed(2)))
                        }
                      }}
                      className="mt-1 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Preço Médio de Compra (R$)
                    </Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 28,50"
                      value={unitPrice}
                      onChange={(e) => {
                        const val = e.target.value
                        setUnitPrice(val)
                        const p = parseFloat(val.replace(',', '.')) || 0
                        const q = parseFloat(quantity.replace(',', '.')) || 0
                        if (q > 0 && p > 0) {
                          setAppliedValue(String((q * p).toFixed(2)))
                        }
                      }}
                      className="mt-1 text-sm"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Valor Total Aplicado (R$)
                    </Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Calculado automaticamente"
                      value={appliedValue}
                      onChange={(e) => setAppliedValue(e.target.value)}
                      className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                    />
                  </div>
                </>
              ) : (
                /* Para Renda Fixa / Fundos / Previdência: Valor Aplicado */
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Valor Aplicado (R$) *
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Ex: 5000,00"
                    value={appliedValue}
                    onChange={(e) => setAppliedValue(e.target.value)}
                    className="mt-1 text-sm font-semibold text-emerald-600 dark:text-emerald-400"
                    required
                  />
                </div>
              )}

              {/* Renda Fixa: Rentabilidade e Taxa */}
              {isFixedIncome && (
                <>
                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tipo de Rentabilidade
                    </Label>
                    <Select
                      value={yieldType}
                      onValueChange={(v) => setYieldType(v as InvestmentYieldType)}
                    >
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cdi_pct">% do CDI (Ex: 110% CDI)</SelectItem>
                        <SelectItem value="prefixado">Taxa Prefixada (% a.a.)</SelectItem>
                        <SelectItem value="ipca_mais">IPCA + Spread (% a.a.)</SelectItem>
                        <SelectItem value="manual">Manual / Atualização periódica</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Taxa Contratada ({yieldType === 'cdi_pct' ? '%' : '% a.a.'})
                    </Label>
                    <Input
                      type="text"
                      inputMode="decimal"
                      placeholder="Ex: 110 ou 12,5"
                      value={yieldRate}
                      onChange={(e) => setYieldRate(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Data de Vencimento
                    </Label>
                    <Input
                      type="date"
                      value={maturityDate}
                      onChange={(e) => setMaturityDate(e.target.value)}
                      className="mt-1 text-sm"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Liquidez
                    </Label>
                    <Select value={liquidity} onValueChange={setLiquidity}>
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diaria">Liquidez Diária</SelectItem>
                        <SelectItem value="vencimento">No Vencimento</SelectItem>
                        <SelectItem value="d1">D+1</SelectItem>
                        <SelectItem value="d2">D+2 / D+30</SelectItem>
                        <SelectItem value="sem_liquidez">Sem Liquidez</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Tributação (IR)
                    </Label>
                    <Select
                      value={taxRegime}
                      onValueChange={(v) => setTaxRegime(v as InvestmentTaxRegime)}
                    >
                      <SelectTrigger className="mt-1 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="regressivo">Tabela Regressiva (22.5% a 15%)</SelectItem>
                        <SelectItem value="isento">
                          Isento de IR para PF (LCI/LCA/CRI/CRA)
                        </SelectItem>
                        <SelectItem value="sem_ir">Sem incidência / Poupança</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {/* Fundos / Previdência / Outros: Valor Atual Manual */}
              {(isFund || isPension || selectedType === 'ativo_personalizado') && (
                <div>
                  <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Saldo / Valor Atual (R$)
                  </Label>
                  <Input
                    type="text"
                    inputMode="decimal"
                    placeholder="Se diferente do aplicado"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    className="mt-1 text-sm"
                  />
                </div>
              )}

              {/* Observações */}
              <div className="sm:col-span-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Notas / Observações (opcional)
                </Label>
                <Textarea
                  placeholder="Ex: Conta na NuInvest, objetivo aposentadoria..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1 text-sm resize-none h-16"
                />
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSaving}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-semibold"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                {investmentToEdit ? 'Salvar Alterações' : 'Cadastrar Investimento'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
