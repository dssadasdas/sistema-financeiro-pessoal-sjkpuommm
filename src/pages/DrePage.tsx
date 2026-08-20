import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, formatMonthYear, CATEGORY_SUGGESTIONS } from '@/lib/constants'
import {
  calculateDreReport,
  DRE_GROUP_LABELS,
  DRE_GROUP_SHORT_LABELS,
  DreGroup,
  DreReport,
} from '@/lib/dreEngine'
import { exportDrePdf } from '@/lib/pdfExporter'
import { LoadingState, ErrorState } from '@/components/States'
import {
  FileText,
  Download,
  Calendar,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
  Building2,
  UserCheck,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  PieChart as PieIcon,
  Tag,
  CheckCircle2,
  SlidersHorizontal,
  HelpCircle,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { useToast } from '@/hooks/use-toast'

type PeriodMode = 'month' | 'year' | 'custom'

export default function DrePage() {
  const { transactions, customCategories, saveCategoryDreGroup, isLoading, loadError, refreshAll } =
    useFinance()
  const { user, hideValues } = useAuth()
  const { toast } = useToast()

  const [periodMode, setPeriodMode] = useState<PeriodMode>('month')
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7))
  const [selectedYear, setSelectedYear] = useState(() => String(new Date().getFullYear()))
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
  })
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10))

  const [activeTab, setActiveTab] = useState<'resumo' | 'detalhada' | 'categorias'>('resumo')
  const [viewMode, setViewMode] = useState<'empresarial' | 'pessoal'>('empresarial')
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    receita_bruta: true,
    deducoes: true,
    cmv: true,
    despesas_administrativas: true,
    despesas_comerciais: true,
    pessoal: true,
    ocupacao: true,
    despesas_financeiras: true,
    outras_operacionais: true,
    outras_receitas_despesas: true,
  })

  // Modal de edição de grupo DRE de categoria
  const [catEditOpen, setCatEditOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<string>('')
  const [editingGroup, setEditingGroup] = useState<DreGroup>('outras_operacionais')
  const [editingType, setEditingType] = useState<'receita' | 'despesa'>('despesa')
  const [isSavingCat, setIsSavingCat] = useState(false)

  // Cálculo da DRE
  const dreReport = useMemo<DreReport>(() => {
    if (periodMode === 'month') {
      return calculateDreReport(transactions, {
        month: selectedMonth,
        customCategories,
      })
    }
    if (periodMode === 'year') {
      return calculateDreReport(transactions, {
        year: selectedYear,
        customCategories,
      })
    }
    return calculateDreReport(transactions, {
      startDate: customStart,
      endDate: customEnd,
      customCategories,
    })
  }, [
    transactions,
    periodMode,
    selectedMonth,
    selectedYear,
    customStart,
    customEnd,
    customCategories,
  ])

  // Todas as categorias presentes nas transações + existentes no sistema
  const allKnownCategories = useMemo(() => {
    const set = new Set<string>(CATEGORY_SUGGESTIONS)
    transactions.forEach((t) => {
      if (t.category) set.add(t.category.trim())
    })
    customCategories.forEach((c) => {
      if (c.name) set.add(c.name.trim())
    })
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [transactions, customCategories])

  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => ({ ...prev, [group]: !prev[group] }))
  }

  const handleExportPdf = () => {
    exportDrePdf(dreReport, user?.name || 'Usuário')
    toast({
      title: 'DRE Exportada',
      description: 'O relatório em PDF foi gerado e enviado para impressão/download.',
    })
  }

  const handleOpenCatEdit = (
    catName: string,
    currentGroup?: DreGroup,
    type?: 'receita' | 'despesa',
  ) => {
    setEditingCategory(catName)
    setEditingGroup(currentGroup || 'outras_operacionais')
    setEditingType(type || 'despesa')
    setCatEditOpen(true)
  }

  const handleSaveCatGroup = async () => {
    if (!editingCategory) return
    setIsSavingCat(true)
    try {
      await saveCategoryDreGroup(editingCategory, editingGroup, editingType)
      toast({
        title: 'Classificação atualizada',
        description: `Categoria "${editingCategory}" classificada como "${DRE_GROUP_SHORT_LABELS[editingGroup]}".`,
      })
      setCatEditOpen(false)
    } catch (e) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a classificação.',
        variant: 'destructive',
      })
    } finally {
      setIsSavingCat(false)
    }
  }

  if (isLoading) {
    return <LoadingState message="Calculando Demonstrativo de Resultado (DRE)..." />
  }

  if (loadError) {
    return (
      <ErrorState message="Não foi possível carregar os dados para a DRE." onRetry={refreshAll} />
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              DRE — Demonstrativo de Resultado
            </h2>
            <Badge className="bg-emerald-600 text-white gap-1 text-[11px] font-bold py-0.5">
              <Building2 className="w-3 h-3" /> Contábil & Gerencial
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-500">
            Estrutura contábil profissional para apuração real de Lucro Bruto, Resultado Operacional
            e Margem Líquida.
          </p>
        </div>

        {/* Ações: Período + Alternador Modo + Exportar PDF */}
        <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto justify-start lg:justify-end">
          {/* Seletor de Tipo de Período */}
          <Select value={periodMode} onValueChange={(v: PeriodMode) => setPeriodMode(v)}>
            <SelectTrigger className="h-9 w-32 rounded-xl text-xs font-semibold">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="month">Mensal</SelectItem>
              <SelectItem value="year">Anual</SelectItem>
              <SelectItem value="custom">Personalizado</SelectItem>
            </SelectContent>
          </Select>

          {/* Inputs de período */}
          {periodMode === 'month' && (
            <Input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 w-36 rounded-xl font-bold text-xs"
            />
          )}

          {periodMode === 'year' && (
            <Input
              type="number"
              min="2020"
              max="2035"
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="h-9 w-24 rounded-xl font-bold text-xs"
            />
          )}

          {periodMode === 'custom' && (
            <div className="flex items-center gap-1">
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="h-9 w-32 rounded-xl text-xs"
              />
              <span className="text-xs text-slate-400">até</span>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="h-9 w-32 rounded-xl text-xs"
              />
            </div>
          )}

          {/* Botão Exportar PDF */}
          <Button
            onClick={handleExportPdf}
            variant="outline"
            size="sm"
            className="h-9 rounded-xl font-bold text-xs gap-1.5 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" /> Exportar PDF
          </Button>
        </div>
      </div>

      {/* Regra Crítica: DRE NÃO É FLUXO DE CAIXA (Aviso Informativo) */}
      <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3 text-xs text-amber-900 dark:text-amber-200">
        <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>Regra Contábil:</strong> O DRE mede a <em>capacidade de gerar lucro</em> e não se
          confunde com fluxo de caixa. Transferências entre contas (R$ 0), pagamentos de faturas de
          cartão e aportes de investimento não duplicam e não são computados como despesa
          operacional.
          {dreReport.ignoredTransactionsCount > 0 && (
            <span className="ml-1 text-slate-500 dark:text-slate-400">
              ({dreReport.ignoredTransactionsCount} movimentação(ões) não-operacionais preservadas e
              excluídas do DRE).
            </span>
          )}
        </div>
      </div>

      {/* 4 Cards de Indicadores Principais (Margens & Lucro) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Receita Líquida */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Receita Líquida
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
            {formatCurrency(dreReport.receitaLiquida, hideValues)}
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <span>Receita Bruta: {formatCurrency(dreReport.receitaBruta, hideValues)}</span>
            <span className="text-orange-600 font-medium">
              −{formatCurrency(dreReport.deducoes, hideValues)}
            </span>
          </div>
        </Card>

        {/* Lucro Bruto & Margem Bruta */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Lucro Bruto
            </span>
            <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 font-bold text-[10px]">
              MB: {dreReport.margemBrutaPct.toFixed(1)}%
            </Badge>
          </div>
          <div className="text-2xl font-black text-emerald-600 tabular-nums mt-1">
            {formatCurrency(dreReport.lucroBruto, hideValues)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            CMV / Custos: −{formatCurrency(dreReport.cmv, hideValues)}
          </div>
        </Card>

        {/* Resultado Operacional & Margem Operacional */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Res. Operacional
            </span>
            <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 font-bold text-[10px]">
              MO: {dreReport.margemOperacionalPct.toFixed(1)}%
            </Badge>
          </div>
          <div
            className={`text-2xl font-black tabular-nums mt-1 ${
              dreReport.resultadoOperacional >= 0 ? 'text-blue-600' : 'text-red-600'
            }`}
          >
            {formatCurrency(dreReport.resultadoOperacional, hideValues)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            Desp. Operacionais: −{formatCurrency(dreReport.despesasOperacionaisTotal, hideValues)}
          </div>
        </Card>

        {/* Resultado Líquido & Margem Líquida */}
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
              Resultado Líquido
            </span>
            <Badge
              className={`font-bold text-[10px] ${
                dreReport.resultadoLiquido >= 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                  : 'bg-red-100 text-red-800 dark:bg-red-950/60 dark:text-red-300'
              }`}
            >
              ML: {dreReport.margemLiquidaPct.toFixed(1)}%
            </Badge>
          </div>
          <div
            className={`text-2xl font-black tabular-nums mt-1 ${
              dreReport.resultadoLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {dreReport.resultadoLiquido >= 0 ? '+' : ''}
            {formatCurrency(dreReport.resultadoLiquido, hideValues)}
          </div>
          <div className="text-[11px] text-slate-400 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            Taxa de Economia: {dreReport.margemEconomiaPct.toFixed(1)}% da receita
          </div>
        </Card>
      </div>

      {/* Navegação por Abas: Resumo Executivo / DRE Detalhada / Classificação de Categorias */}
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as 'resumo' | 'detalhada' | 'categorias')}
        className="w-full"
      >
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl">
            <TabsTrigger value="resumo" className="rounded-xl text-xs font-bold px-4 py-2">
              <Sparkles className="w-3.5 h-3.5 mr-1.5" /> Resumo Executivo
            </TabsTrigger>
            <TabsTrigger value="detalhada" className="rounded-xl text-xs font-bold px-4 py-2">
              <FileText className="w-3.5 h-3.5 mr-1.5" /> DRE Detalhada
            </TabsTrigger>
            <TabsTrigger value="categorias" className="rounded-xl text-xs font-bold px-4 py-2">
              <Tag className="w-3.5 h-3.5 mr-1.5" /> Mapeamento de Categorias
            </TabsTrigger>
          </TabsList>

          {activeTab === 'detalhada' && (
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === 'empresarial' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('empresarial')}
                className="rounded-xl text-xs font-bold h-8"
              >
                <Building2 className="w-3.5 h-3.5 mr-1" /> Visão Empresarial
              </Button>
              <Button
                variant={viewMode === 'pessoal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('pessoal')}
                className="rounded-xl text-xs font-bold h-8"
              >
                <UserCheck className="w-3.5 h-3.5 mr-1" /> Visão Simplificada (Pessoal)
              </Button>
            </div>
          )}
        </div>

        {/* ABA 1: RESUMO EXECUTIVO (Respostas Rápidas) */}
        <TabsContent value="resumo" className="space-y-6 mt-0">
          <ExecutiveSummaryTab dre={dreReport} hideValues={hideValues} />
        </TabsContent>

        {/* ABA 2: DRE DETALHADA */}
        <TabsContent value="detalhada" className="space-y-6 mt-0">
          {viewMode === 'pessoal' ? (
            <SimplifiedPersonalDreTab dre={dreReport} hideValues={hideValues} />
          ) : (
            <DetailedCorporateDreTab
              dre={dreReport}
              hideValues={hideValues}
              expandedGroups={expandedGroups}
              toggleGroup={toggleGroup}
              onEditCategory={handleOpenCatEdit}
            />
          )}
        </TabsContent>

        {/* ABA 3: MAPEAMENTO DE CATEGORIAS DRE */}
        <TabsContent value="categorias" className="space-y-4 mt-0">
          <CategoryMappingTab
            categories={allKnownCategories}
            customCategories={customCategories}
            onEditCategory={handleOpenCatEdit}
          />
        </TabsContent>
      </Tabs>

      {/* Modal de Edição de Grupo DRE da Categoria */}
      <Dialog open={catEditOpen} onOpenChange={setCatEditOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Classificar Categoria no DRE</DialogTitle>
            <DialogDescription className="text-xs">
              Altere o grupo contábil para categorizar receitas, deduções, CMV ou grupos de despesa.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Categoria
              </label>
              <Input
                value={editingCategory}
                disabled
                className="mt-1 font-bold rounded-xl bg-slate-100 dark:bg-slate-800"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Tipo
              </label>
              <Select
                value={editingType}
                onValueChange={(v: 'receita' | 'despesa') => setEditingType(v)}
              >
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="despesa">Despesa / Custo</SelectItem>
                  <SelectItem value="receita">Receita</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Grupo no DRE
              </label>
              <Select value={editingGroup} onValueChange={(v: DreGroup) => setEditingGroup(v)}>
                <SelectTrigger className="mt-1 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(DRE_GROUP_LABELS).map(([k, label]) => (
                    <SelectItem key={k} value={k}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setCatEditOpen(false)}
              className="rounded-xl text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveCatGroup}
              disabled={isSavingCat}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold"
            >
              {isSavingCat ? 'Salvando...' : 'Salvar Classificação'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ----------------------------------------------------
// SUBCOMPONENTES DAS ABAS
// ----------------------------------------------------

/**
 * ABA 1: RESUMO EXECUTIVO (Respostas diretas e rápidas)
 */
function ExecutiveSummaryTab({ dre, hideValues }: { dre: DreReport; hideValues: boolean }) {
  const totalDespesas = dre.deducoes + dre.cmv + dre.despesasOperacionaisTotal
  const situation = dre.resultadoLiquido >= 0 ? 'Positiva / Lucrativa' : 'Atenção / Déficit'

  return (
    <div className="space-y-6">
      {/* 8 Perguntas Diretas do Relatório Executivo */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          Diagnóstico Rápido — {dre.periodLabel}
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-semibold block">1. Quanto entrou?</span>
            <span className="text-lg font-black text-emerald-600 tabular-nums mt-1 block">
              +{formatCurrency(dre.receitaBruta, hideValues)}
            </span>
            <span className="text-[11px] text-slate-500">Receita Bruta total apurada</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-semibold block">2. Quanto saiu?</span>
            <span className="text-lg font-black text-orange-600 tabular-nums mt-1 block">
              −{formatCurrency(totalDespesas, hideValues)}
            </span>
            <span className="text-[11px] text-slate-500">Deduções, CMV e Despesas</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-semibold block">3. Quanto sobrou?</span>
            <span
              className={`text-lg font-black tabular-nums mt-1 block ${
                dre.resultadoLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {dre.resultadoLiquido >= 0 ? '+' : ''}
              {formatCurrency(dre.resultadoLiquido, hideValues)}
            </span>
            <span className="text-[11px] text-slate-500">Resultado Líquido final</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-semibold block">4. Situação geral</span>
            <span
              className={`text-lg font-black mt-1 block ${
                dre.resultadoLiquido >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {situation}
            </span>
            <span className="text-[11px] text-slate-500">
              {dre.resultadoLiquido >= 0 ? 'Operação superavitária' : 'Operação com déficit'}
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-semibold block">
              5. Qual a margem líquida?
            </span>
            <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums mt-1 block">
              {dre.margemLiquidaPct.toFixed(1)}%
            </span>
            <span className="text-[11px] text-slate-500">Retorno sobre a Receita</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-semibold block">
              6. Qual o Lucro Bruto?
            </span>
            <span className="text-lg font-black text-emerald-600 tabular-nums mt-1 block">
              {formatCurrency(dre.lucroBruto, hideValues)}
            </span>
            <span className="text-[11px] text-slate-500">
              Margem Bruta: {dre.margemBrutaPct.toFixed(1)}%
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-semibold block">7. Custo Operacional</span>
            <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums mt-1 block">
              {formatCurrency(dre.despesasOperacionaisTotal, hideValues)}
            </span>
            <span className="text-[11px] text-slate-500">Despesas de administração/vendas</span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
            <span className="text-xs text-slate-400 font-semibold block">8. Taxa de Economia</span>
            <span className="text-lg font-black text-emerald-600 tabular-nums mt-1 block">
              {dre.margemEconomiaPct.toFixed(1)}%
            </span>
            <span className="text-[11px] text-slate-500">Percentual poupado da receita</span>
          </div>
        </div>
      </Card>

      {/* Síntese em cascata gráfica */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
        <h3 className="font-bold text-base text-slate-900 dark:text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-indigo-600" />
          Cascata de Formação do Resultado ({dre.periodLabel})
        </h3>

        <div className="space-y-3">
          {/* 1. Receita Bruta */}
          <div className="p-3.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                (+) Receita Bruta Operacional
              </span>
            </div>
            <span className="font-black text-emerald-600 text-base tabular-nums">
              {formatCurrency(dre.receitaBruta, hideValues)}
            </span>
          </div>

          {/* 2. Deduções */}
          <div className="p-3.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2 pl-4">
              <span className="font-medium text-orange-700 dark:text-orange-300 text-sm">
                (−) Deduções da Receita
              </span>
            </div>
            <span className="font-bold text-orange-600 text-sm tabular-nums">
              −{formatCurrency(dre.deducoes, hideValues)}
            </span>
          </div>

          {/* 3. Receita Líquida */}
          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/60 font-bold flex items-center justify-between">
            <span className="text-slate-900 dark:text-white text-sm">(=) Receita Líquida</span>
            <span className="font-black text-slate-900 dark:text-white text-base tabular-nums">
              {formatCurrency(dre.receitaLiquida, hideValues)}
            </span>
          </div>

          {/* 4. CMV */}
          <div className="p-3.5 rounded-xl bg-orange-50/50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2 pl-4">
              <span className="font-medium text-orange-700 dark:text-orange-300 text-sm">
                (−) CMV / Custo de Mercadorias e Serviços
              </span>
            </div>
            <span className="font-bold text-orange-600 text-sm tabular-nums">
              −{formatCurrency(dre.cmv, hideValues)}
            </span>
          </div>

          {/* 5. Lucro Bruto */}
          <div className="p-3.5 rounded-xl bg-emerald-100/60 dark:bg-emerald-900/40 font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-emerald-900 dark:text-emerald-200 text-sm">
                (=) Lucro Bruto
              </span>
              <Badge className="bg-emerald-600 text-white text-[10px]">
                {dre.margemBrutaPct.toFixed(1)}% Margem
              </Badge>
            </div>
            <span className="font-black text-emerald-700 dark:text-emerald-300 text-base tabular-nums">
              {formatCurrency(dre.lucroBruto, hideValues)}
            </span>
          </div>

          {/* 6. Despesas Operacionais */}
          <div className="p-3.5 rounded-xl bg-red-50/50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/40 flex items-center justify-between">
            <div className="flex items-center gap-2 pl-4">
              <span className="font-medium text-red-700 dark:text-red-300 text-sm">
                (−) Despesas Operacionais
              </span>
            </div>
            <span className="font-bold text-red-600 text-sm tabular-nums">
              −{formatCurrency(dre.despesasOperacionaisTotal, hideValues)}
            </span>
          </div>

          {/* 7. Resultado Operacional */}
          <div className="p-3.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 font-bold flex items-center justify-between border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-2">
              <span className="text-blue-900 dark:text-blue-200 text-sm">
                (=) Resultado Operacional
              </span>
              <Badge className="bg-blue-600 text-white text-[10px]">
                {dre.margemOperacionalPct.toFixed(1)}% Margem
              </Badge>
            </div>
            <span
              className={`font-black text-base tabular-nums ${
                dre.resultadoOperacional >= 0 ? 'text-blue-600' : 'text-red-600'
              }`}
            >
              {formatCurrency(dre.resultadoOperacional, hideValues)}
            </span>
          </div>

          {/* 8. Outras Receitas/Despesas */}
          {dre.outrasReceitasDespesas !== 0 && (
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/30 flex items-center justify-between text-xs">
              <span className="pl-4 text-slate-500">
                (+/−) Outras Receitas e Despesas Não Operacionais
              </span>
              <span className="font-bold tabular-nums">
                {formatCurrency(dre.outrasReceitasDespesas, hideValues)}
              </span>
            </div>
          )}

          {/* 9. Resultado Líquido Final */}
          <div
            className={`p-4 rounded-2xl font-black flex items-center justify-between shadow-sm ${
              dre.resultadoLiquido >= 0 ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base">(=) RESULTADO LÍQUIDO DO PERÍODO</span>
              <Badge className="bg-white/20 text-white text-xs border-0">
                ML: {dre.margemLiquidaPct.toFixed(1)}%
              </Badge>
            </div>
            <span className="text-xl sm:text-2xl tabular-nums">
              {formatCurrency(dre.resultadoLiquido, hideValues)}
            </span>
          </div>
        </div>
      </Card>
    </div>
  )
}

/**
 * ABA 2 (A): DRE EMPRESARIAL DETALHADA COM TODAS AS LINHAS E CATEGORIAS
 */
function DetailedCorporateDreTab({
  dre,
  hideValues,
  expandedGroups,
  toggleGroup,
  onEditCategory,
}: {
  dre: DreReport
  hideValues: boolean
  expandedGroups: Record<string, boolean>
  toggleGroup: (g: string) => void
  onEditCategory: (cat: string, grp?: DreGroup, type?: 'receita' | 'despesa') => void
}) {
  const renderGroupSection = (
    groupKey: DreGroup,
    title: string,
    total: number,
    isNegative = true,
  ) => {
    const grp = dre.groups[groupKey]
    const isExpanded = expandedGroups[groupKey] !== false
    const hasItems = grp && grp.items.length > 0

    return (
      <div className="border-b border-slate-100 dark:border-slate-800 last:border-0">
        <div
          onClick={() => toggleGroup(groupKey)}
          className="p-3 sm:p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasItems ? (
              isExpanded ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )
            ) : (
              <span className="w-4" />
            )}
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-200 truncate">
              {title}
            </span>
            {hasItems && (
              <Badge variant="outline" className="text-[10px] text-slate-400 hidden sm:inline-flex">
                {grp.items.length} cat.
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`font-bold text-sm tabular-nums ${
                total === 0 ? 'text-slate-400' : isNegative ? 'text-orange-600' : 'text-emerald-600'
              }`}
            >
              {total > 0 && isNegative ? '−' : ''}
              {formatCurrency(total, hideValues)}
            </span>
            <span className="text-xs text-slate-400 tabular-nums w-12 text-right hidden sm:block">
              {dre.receitaLiquida > 0
                ? `${((total / dre.receitaLiquida) * 100).toFixed(1)}%`
                : '0,0%'}
            </span>
          </div>
        </div>

        {/* Itens detalhados */}
        {isExpanded && hasItems && (
          <div className="bg-slate-50/60 dark:bg-slate-900/40 divide-y divide-slate-100/70 dark:divide-slate-800/50 pl-6 sm:pl-8 pr-3 sm:pr-4 py-1">
            {grp.items.map((item) => (
              <div
                key={item.category}
                className="py-2 flex items-center justify-between text-xs hover:bg-slate-100/60 dark:hover:bg-slate-800/40 rounded-lg px-2 transition-colors"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-slate-700 dark:text-slate-300 truncate">
                    {item.category}
                  </span>
                  <span className="text-[10px] text-slate-400">({item.transactionsCount} txs)</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditCategory(
                        item.category,
                        groupKey,
                        groupKey === 'receita_bruta' ? 'receita' : 'despesa',
                      )
                    }}
                    title="Alterar grupo DRE"
                    className="text-slate-400 hover:text-emerald-600"
                  >
                    <SlidersHorizontal className="w-3 h-3 ml-1" />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <span className="font-mono font-medium text-slate-700 dark:text-slate-300 tabular-nums">
                    {isNegative ? '−' : '+'}
                    {formatCurrency(item.value, hideValues)}
                  </span>
                  <span className="text-[11px] text-slate-400 tabular-nums w-12 text-right hidden sm:block">
                    {(item.percentageOfNet || 0).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm overflow-hidden">
      {/* Header da Tabela Contábil */}
      <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
        <span>Estrutura e Grupos de Resultado</span>
        <div className="flex items-center gap-4">
          <span>Valor (R$)</span>
          <span className="w-12 text-right hidden sm:block">Part. %</span>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {/* 1. Receita Bruta */}
        {renderGroupSection(
          'receita_bruta',
          '1. RECEITA BRUTA OPERACIONAL',
          dre.receitaBruta,
          false,
        )}

        {/* 2. Deduções */}
        {renderGroupSection('deducoes', '2. (-) Deduções da Receita Bruta', dre.deducoes, true)}

        {/* Totalizador: Receita Líquida */}
        <div className="p-3.5 sm:p-4 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between font-bold border-y border-emerald-200 dark:border-emerald-800/60">
          <span className="text-emerald-900 dark:text-emerald-200 text-sm">
            (=) RECEITA OPERACIONAL LÍQUIDA
          </span>
          <div className="flex items-center gap-4">
            <span className="text-base text-emerald-700 dark:text-emerald-300 tabular-nums font-black">
              {formatCurrency(dre.receitaLiquida, hideValues)}
            </span>
            <span className="text-xs text-emerald-700 dark:text-emerald-300 w-12 text-right hidden sm:block">
              100,0%
            </span>
          </div>
        </div>

        {/* 3. CMV */}
        {renderGroupSection('cmv', '3. (-) CMV / Custo de Mercadorias e Serviços', dre.cmv, true)}

        {/* Totalizador: Lucro Bruto */}
        <div className="p-3.5 sm:p-4 bg-emerald-100/50 dark:bg-emerald-900/30 flex items-center justify-between font-bold border-y border-emerald-300 dark:border-emerald-700">
          <div className="flex items-center gap-2">
            <span className="text-emerald-950 dark:text-emerald-100 text-sm">(=) LUCRO BRUTO</span>
            <Badge className="bg-emerald-600 text-white text-[10px]">
              MB: {dre.margemBrutaPct.toFixed(1)}%
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-base text-emerald-800 dark:text-emerald-200 tabular-nums font-black">
              {formatCurrency(dre.lucroBruto, hideValues)}
            </span>
            <span className="text-xs text-emerald-800 dark:text-emerald-200 w-12 text-right hidden sm:block">
              {dre.margemBrutaPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 4. Despesas Operacionais por Grupos */}
        <div className="p-2.5 bg-slate-100/70 dark:bg-slate-900/80 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">
          4. DESPESAS OPERACIONAIS
        </div>

        {renderGroupSection(
          'despesas_administrativas',
          '4.1 (-) Despesas Administrativas',
          dre.despesasAdministrativas,
          true,
        )}
        {renderGroupSection(
          'despesas_comerciais',
          '4.2 (-) Despesas Comerciais & Marketing',
          dre.despesasComerciais,
          true,
        )}
        {renderGroupSection(
          'pessoal',
          '4.3 (-) Despesas com Pessoal & Salários',
          dre.despesasPessoal,
          true,
        )}
        {renderGroupSection(
          'ocupacao',
          '4.4 (-) Ocupação (Aluguel, Luz, Água, Internet)',
          dre.despesasOcupacao,
          true,
        )}
        {renderGroupSection(
          'despesas_financeiras',
          '4.5 (-) Despesas Financeiras & Tarifas',
          dre.despesasFinanceiras,
          true,
        )}
        {renderGroupSection(
          'outras_operacionais',
          '4.6 (-) Outras Despesas Operacionais',
          dre.outrasOperacionais,
          true,
        )}

        {/* Totalizador: Resultado Operacional */}
        <div className="p-3.5 sm:p-4 bg-blue-50/70 dark:bg-blue-950/40 flex items-center justify-between font-bold border-y border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2">
            <span className="text-blue-950 dark:text-blue-200 text-sm">
              (=) RESULTADO OPERACIONAL
            </span>
            <Badge className="bg-blue-600 text-white text-[10px]">
              MO: {dre.margemOperacionalPct.toFixed(1)}%
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span
              className={`text-base tabular-nums font-black ${
                dre.resultadoOperacional >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-600'
              }`}
            >
              {formatCurrency(dre.resultadoOperacional, hideValues)}
            </span>
            <span className="text-xs text-blue-700 dark:text-blue-300 w-12 text-right hidden sm:block">
              {dre.margemOperacionalPct.toFixed(1)}%
            </span>
          </div>
        </div>

        {/* 5. Outras Receitas/Despesas */}
        {renderGroupSection(
          'outras_receitas_despesas',
          '5. (+/-) Outras Receitas / Despesas Não Operacionais',
          dre.outrasReceitasDespesas,
          dre.outrasReceitasDespesas < 0,
        )}

        {/* Totalizador Final: Resultado Líquido */}
        <div
          className={`p-4 sm:p-5 flex items-center justify-between font-black ${
            dre.resultadoLiquido >= 0 ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base sm:text-lg uppercase">(=) RESULTADO LÍQUIDO DO PERÍODO</span>
            <Badge className="bg-white/20 text-white border-0 text-xs">
              ML: {dre.margemLiquidaPct.toFixed(1)}%
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xl sm:text-2xl tabular-nums">
              {formatCurrency(dre.resultadoLiquido, hideValues)}
            </span>
            <span className="text-xs text-white/90 w-12 text-right hidden sm:block">
              {dre.margemLiquidaPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * ABA 2 (B): DRE PESSOAL SIMPLIFICADO (Para finanças pessoais sem complicação)
 */
function SimplifiedPersonalDreTab({ dre, hideValues }: { dre: DreReport; hideValues: boolean }) {
  const totalDespesas = dre.deducoes + dre.cmv + dre.despesasOperacionaisTotal

  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm space-y-4">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <UserCheck className="w-5 h-5 text-emerald-600" />
          Demonstrativo Pessoal Simplificado — {dre.periodLabel}
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Visão direta e sem jargões contábeis para controle do orçamento pessoal e familiar.
        </p>
      </div>

      <div className="space-y-3 pt-2">
        {/* 1. Receitas Totais */}
        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-between">
          <div>
            <span className="font-bold text-emerald-900 dark:text-emerald-200 text-sm block">
              (+) Total de Receitas
            </span>
            <span className="text-xs text-slate-500">
              Salário, bônus, rendimentos e rendas extras
            </span>
          </div>
          <span className="text-xl font-black text-emerald-600 tabular-nums">
            +{formatCurrency(dre.receitaBruta, hideValues)}
          </span>
        </div>

        {/* 2. Despesas Totais */}
        <div className="p-4 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-orange-100 dark:border-orange-900/40 flex items-center justify-between">
          <div>
            <span className="font-bold text-orange-900 dark:text-orange-200 text-sm block">
              (−) Total de Gastos e Despesas
            </span>
            <span className="text-xs text-slate-500">
              Moradia, alimentação, transporte, compras e contas
            </span>
          </div>
          <span className="text-xl font-black text-orange-600 tabular-nums">
            −{formatCurrency(totalDespesas, hideValues)}
          </span>
        </div>

        {/* 3. Resultado / Economia */}
        <div
          className={`p-5 rounded-2xl flex items-center justify-between font-black text-white ${
            dre.resultadoLiquido >= 0 ? 'bg-emerald-600' : 'bg-red-600'
          }`}
        >
          <div>
            <span className="text-base uppercase block">(=) Resultado Líquido</span>
            <span className="text-xs text-white/80 font-normal">
              {dre.resultadoLiquido >= 0 ? 'Economia poupada no período' : 'Déficit no período'}
            </span>
          </div>
          <div className="text-right">
            <span className="text-2xl tabular-nums block">
              {formatCurrency(dre.resultadoLiquido, hideValues)}
            </span>
            <span className="text-xs text-white/90">
              Taxa de Economia: {dre.margemEconomiaPct.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  )
}

/**
 * ABA 3: MAPEAMENTO E CLASSIFICAÇÃO DE CATEGORIAS
 */
function CategoryMappingTab({
  categories,
  customCategories,
  onEditCategory,
}: {
  categories: string[]
  customCategories: any[]
  onEditCategory: (cat: string, grp?: DreGroup, type?: 'receita' | 'despesa') => void
}) {
  return (
    <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
      <div className="border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
        <h3 className="font-bold text-base text-slate-900 dark:text-white flex items-center gap-2">
          <Tag className="w-5 h-5 text-emerald-600" />
          Mapeamento Contábil das Categorias
        </h3>
        <p className="text-xs text-slate-400 mt-1">
          Vincule cada categoria existente ao respectivo grupo da DRE (Receita Bruta, Deduções, CMV,
          Ocupação, Pessoal, etc.).
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {categories.map((catName) => {
          const custom = customCategories.find(
            (c) => c.name?.toLowerCase() === catName.toLowerCase(),
          )
          const dreGroup = custom?.dre_group || 'outras_operacionais'
          const label = DRE_GROUP_SHORT_LABELS[dreGroup as DreGroup] || 'Outras Operacionais'

          return (
            <div
              key={catName}
              onClick={() => onEditCategory(catName, dreGroup, custom?.type || 'despesa')}
              className="p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="min-w-0 pr-2">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200 block truncate">
                  {catName}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium truncate block">
                  {label}
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-slate-400 hover:text-emerald-600"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
              </Button>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
