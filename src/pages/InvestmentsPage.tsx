import React, { useState } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/constants'
import { Investment, InvestmentType } from '@/types/finance'
import {
  TrendingUp,
  Plus,
  RefreshCw,
  Trash2,
  Edit2,
  CheckCircle2,
  ShieldCheck,
  Percent,
  Coins,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function InvestmentsPage() {
  const {
    investments,
    totalInvested,
    totalInvestmentsResult,
    createInvestment,
    updateInvestment,
    deleteInvestment,
    refreshCryptoQuotes,
  } = useFinance()
  const { hideValues } = useAuth()

  const [modalOpen, setModalOpen] = useState(false)
  const [invToEdit, setInvToEdit] = useState<Investment | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Form states
  const [type, setType] = useState<InvestmentType>('cdi100')
  const [name, setName] = useState('')
  const [symbol, setSymbol] = useState('')
  const [appliedValue, setAppliedValue] = useState('')
  const [quantity, setQuantity] = useState('')
  const [unitPrice, setUnitPrice] = useState('')
  const [applicationDate, setApplicationDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  )
  const [currentPrice, setCurrentPrice] = useState('')
  const [loading, setLoading] = useState(false)

  const handleOpenCreate = () => {
    setInvToEdit(null)
    setType('cdi100')
    setName('CDB 100% CDI')
    setSymbol('CDI')
    setAppliedValue('5000')
    setQuantity('')
    setUnitPrice('')
    setApplicationDate(new Date().toISOString().slice(0, 10))
    setCurrentPrice('')
    setModalOpen(true)
  }

  const handleOpenEdit = (inv: Investment) => {
    setInvToEdit(inv)
    setType(inv.type)
    setName(inv.name)
    setSymbol(inv.symbol || '')
    setAppliedValue(String(inv.applied_value || 0))
    setQuantity(String(inv.quantity || ''))
    setUnitPrice(String(inv.unit_price || ''))
    setApplicationDate(
      inv.application_date
        ? inv.application_date.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    )
    setCurrentPrice(String(inv.current_price || ''))
    setModalOpen(true)
  }

  const handleRefreshQuotes = async () => {
    setIsRefreshing(true)
    try {
      await refreshCryptoQuotes()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const applied = parseFloat(appliedValue.replace(',', '.')) || 0
    const qty = parseFloat(quantity.replace(',', '.')) || undefined
    const unitP = parseFloat(unitPrice.replace(',', '.')) || undefined
    const curP = parseFloat(currentPrice.replace(',', '.')) || undefined

    setLoading(true)
    try {
      const payload: Partial<Investment> = {
        type,
        name: name.trim(),
        symbol: symbol.trim().toUpperCase() || undefined,
        applied_value: applied,
        quantity: qty,
        unit_price: unitP,
        application_date: `${applicationDate} 12:00:00.000Z`,
        current_price: curP,
      }

      if (invToEdit) {
        await updateInvestment(invToEdit.id, payload)
      } else {
        await createInvestment(payload)
      }
      setModalOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // Cálculo Regressivo de IR para CDB (dias aplicados)
  const calculateCdbTaxes = (appliedDateStr?: string, grossProfit = 0) => {
    if (!appliedDateStr || grossProfit <= 0) return { irPct: 22.5, irValue: 0, iofValue: 0 }
    const start = new Date(appliedDateStr).getTime()
    const now = Date.now()
    const days = Math.max(1, Math.floor((now - start) / (1000 * 60 * 60 * 24)))

    // Tabela Regressiva IR
    let irPct = 22.5
    if (days > 720) irPct = 15.0
    else if (days > 360) irPct = 17.5
    else if (days > 180) irPct = 20.0

    // IOF quando < 30 dias
    let iofPct = 0
    if (days < 30) {
      iofPct = Math.max(0, (30 - days) * 3) // aproximação decrescente
    }

    const iofValue = (grossProfit * iofPct) / 100
    const taxableAfterIof = Math.max(0, grossProfit - iofValue)
    const irValue = (taxableAfterIof * irPct) / 100

    return { days, irPct, irValue, iofValue, netProfit: grossProfit - irValue - iofValue }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Investimentos</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe Bitcoin, Ethereum, Renda Fixa e evolução estimada de CDB 100% CDI
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleRefreshQuotes}
            disabled={isRefreshing}
            variant="outline"
            className="rounded-xl text-xs gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? 'Atualizando...' : 'Atualizar Cotações'}
          </Button>
          <Button
            onClick={handleOpenCreate}
            className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
          >
            <Plus className="w-4 h-4" /> Novo Ativo
          </Button>
        </div>
      </div>

      {/* Cards Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">
            Patrimônio Investido
          </span>
          <div className="text-3xl font-black text-slate-900 dark:text-white tabular-nums mt-1">
            {formatCurrency(totalInvested, hideValues)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">Total aplicado em aportes</span>
        </Card>

        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-white dark:bg-[#121A2B] shadow-sm">
          <span className="text-xs font-semibold uppercase text-slate-400">Resultado Estimado</span>
          <div
            className={`text-3xl font-black tabular-nums mt-1 ${
              totalInvestmentsResult >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {totalInvestmentsResult >= 0 ? '+' : ''}
            {formatCurrency(totalInvestmentsResult, hideValues)}
          </div>
          <span className="text-xs text-slate-500 mt-1 block">
            Valor atual total: {formatCurrency(totalInvested + totalInvestmentsResult, hideValues)}
          </span>
        </Card>
      </div>

      {/* Grid de Ativos */}
      {investments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-sm">Nenhum investimento registrado.</p>
          <Button onClick={handleOpenCreate} variant="outline" className="mt-4 rounded-xl">
            Adicionar Primeiro Ativo
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {investments.map((inv) => {
            const isCrypto = inv.type === 'bitcoin' || inv.type === 'ethereum'
            const isCdi = inv.type === 'cdi100'
            const applied = inv.applied_value || 0
            const currentTotal = inv.current_total_value || applied
            const profit = inv.profit_loss || 0
            const pct = inv.profit_loss_pct || 0

            const cdbTaxInfo = isCdi ? calculateCdbTaxes(inv.application_date, profit) : null

            return (
              <Card
                key={inv.id}
                className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs ${
                          inv.type === 'bitcoin'
                            ? 'bg-amber-500 text-white'
                            : inv.type === 'ethereum'
                              ? 'bg-indigo-600 text-white'
                              : isCdi
                                ? 'bg-emerald-600 text-white'
                                : 'bg-blue-600 text-white'
                        }`}
                      >
                        {inv.type === 'bitcoin' ? '₿' : inv.type === 'ethereum' ? 'Ξ' : '%'}
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {inv.name}
                        </h3>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold">
                            {inv.symbol || inv.type}
                          </Badge>
                          {isCrypto && (
                            <span className="text-[10px] text-slate-400 font-mono">
                              {inv.quantity} {inv.symbol}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(inv)}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteInvestment(inv.id)}
                        className="p-1 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Valores */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-slate-400">Valor Atual:</span>
                      <div className="text-xl font-black text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(currentTotal, hideValues)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Aplicado:</span>
                      <div className="text-sm font-bold text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatCurrency(applied, hideValues)}
                      </div>
                    </div>
                  </div>

                  {/* Rentabilidade Chip */}
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between text-xs">
                    <span className="text-slate-500 font-medium">Rentabilidade:</span>
                    <span
                      className={`font-extrabold tabular-nums ${
                        profit >= 0 ? 'text-emerald-600' : 'text-red-600'
                      }`}
                    >
                      {profit >= 0 ? '+' : ''}
                      {formatCurrency(profit, hideValues)} ({pct.toFixed(2)}%)
                    </span>
                  </div>

                  {/* Informações Fiscais para CDI */}
                  {cdbTaxInfo && cdbTaxInfo.days && (
                    <div className="mt-3 p-2.5 rounded-xl bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-500/20 text-[11px] space-y-1 text-slate-600 dark:text-slate-300">
                      <div className="flex justify-between font-medium">
                        <span>Tempo de aplicação:</span>
                        <span>{cdbTaxInfo.days} dias</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Alíquota IR Regressivo:</span>
                        <span className="font-bold">{cdbTaxInfo.irPct}%</span>
                      </div>
                      <div className="flex justify-between text-emerald-700 dark:text-emerald-300 font-bold">
                        <span>Líquido estimado:</span>
                        <span>
                          {formatCurrency(applied + (cdbTaxInfo.netProfit || 0), hideValues)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Desde: {formatDate(inv.application_date || inv.created)}</span>
                  {inv.current_price && (
                    <span className="font-mono">
                      Cotação: {formatCurrency(inv.current_price, hideValues)}
                    </span>
                  )}
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Novo / Editar Investimento */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              {invToEdit ? 'Editar Ativo' : 'Adicionar Ativo de Investimento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label>Tipo de Investimento</Label>
              <Select value={type} onValueChange={(v) => setType(v as InvestmentType)}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cdi100">CDB 100% CDI / Renda Fixa</SelectItem>
                  <SelectItem value="bitcoin">Bitcoin (BTC)</SelectItem>
                  <SelectItem value="ethereum">Ethereum (ETH)</SelectItem>
                  <SelectItem value="acao">Ação Brasileira (B3)</SelectItem>
                  <SelectItem value="fii">Fundo Imobiliário (FII)</SelectItem>
                  <SelectItem value="renda_fixa">Tesouro / LCI / LCA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="inv-name">Nome do Ativo *</Label>
              <Input
                id="inv-name"
                placeholder="Ex: CDB Liquidez Diária, Bitcoin"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="inv-sym">Símbolo (Ticker)</Label>
                <Input
                  id="inv-sym"
                  placeholder="BTC, ETH, PETR4, HGLG11"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="h-10 rounded-xl font-mono uppercase"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="inv-val">Valor Aplicado (R$) *</Label>
                <Input
                  id="inv-val"
                  type="number"
                  step="0.01"
                  value={appliedValue}
                  onChange={(e) => setAppliedValue(e.target.value)}
                  required
                  className="h-10 rounded-xl font-bold"
                />
              </div>
            </div>

            {(type === 'bitcoin' || type === 'ethereum' || type === 'acao' || type === 'fii') && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="inv-qty">Quantidade</Label>
                  <Input
                    id="inv-qty"
                    type="number"
                    step="0.00000001"
                    placeholder="Ex: 0.0125 ou 100"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="inv-curp">Preço Atual / Cotação (R$)</Label>
                  <Input
                    id="inv-curp"
                    type="number"
                    step="0.01"
                    placeholder="Atualizado auto"
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(e.target.value)}
                    className="h-10 rounded-xl"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <Label htmlFor="inv-date">Data da Aplicação</Label>
              <Input
                id="inv-date"
                type="date"
                value={applicationDate}
                onChange={(e) => setApplicationDate(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              >
                {loading ? 'Salvando...' : 'Salvar Ativo'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
