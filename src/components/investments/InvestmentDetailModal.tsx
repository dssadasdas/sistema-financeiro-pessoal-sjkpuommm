import React, { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Investment, InvestmentContribution, InvestmentEarning } from '@/types/finance'
import { formatCurrency, formatDate } from '@/lib/constants'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { useToast } from '@/hooks/use-toast'
import {
  TrendingUp,
  TrendingDown,
  PlusCircle,
  DollarSign,
  Edit,
  Trash2,
  Calendar,
  Clock,
  Landmark,
  ShieldAlert,
  Percent,
  History,
  Coins,
} from 'lucide-react'
import AporteModal from './AporteModal'
import EarningsModal from './EarningsModal'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  investment: Investment | null
  onEdit: (investment: Investment) => void
}

export default function InvestmentDetailModal({ open, onOpenChange, investment, onEdit }: Props) {
  const { hideValues } = useAuth()
  const { contributions, earnings, deleteInvestment, deleteContribution, deleteEarning } =
    useFinance()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<'info' | 'contributions' | 'earnings'>('info')
  const [showAporteModal, setShowAporteModal] = useState(false)
  const [showEarningsModal, setShowEarningsModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  if (!investment) return null

  const isProfit = (investment.profit_loss || 0) >= 0
  const invContribs = contributions.filter((c) => c.investment === investment.id)
  const invEarnings = earnings.filter((e) => e.investment === investment.id)
  const totalReceivedEarnings = invEarnings.reduce((sum, e) => sum + Number(e.value || 0), 0)

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await deleteInvestment(investment.id)
      toast({
        title: 'Investimento excluído',
        description: 'O ativo foi removido da sua carteira.',
      })
      setShowDeleteConfirm(false)
      onOpenChange(false)
    } catch (err: any) {
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Não foi possível excluir o investimento.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteContrib = async (id: string) => {
    try {
      await deleteContribution(id)
      toast({ title: 'Aporte excluído' })
    } catch (err: any) {
      toast({ title: 'Erro ao excluir aporte', variant: 'destructive' })
    }
  }

  const handleDeleteEarning = async (id: string) => {
    try {
      await deleteEarning(id)
      toast({ title: 'Provento excluído' })
    } catch (err: any) {
      toast({ title: 'Erro ao excluir provento', variant: 'destructive' })
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-white dark:bg-[#0f1626] border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge
                    variant="outline"
                    className="text-xs uppercase bg-slate-50 dark:bg-slate-800"
                  >
                    {investment.category_group || investment.type}
                  </Badge>
                  {investment.symbol && (
                    <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded">
                      {investment.symbol}
                    </span>
                  )}
                  {investment.institution && (
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <Landmark className="w-3 h-3" /> {investment.institution}
                    </span>
                  )}
                </div>
                <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white mt-1.5">
                  {investment.name}
                </DialogTitle>
              </div>

              {/* Botões de Ação Rápida */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-emerald-600"
                  onClick={() => {
                    onOpenChange(false)
                    onEdit(investment)
                  }}
                  title="Editar"
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-500 hover:text-rose-600"
                  onClick={() => setShowDeleteConfirm(true)}
                  title="Excluir"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <DialogDescription className="sr-only">Detalhes do investimento</DialogDescription>
          </DialogHeader>

          {/* Card Principal de Resumo */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-850 border border-slate-200/80 dark:border-slate-800 mt-2">
            <div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Valor Aplicado</p>
              <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {formatCurrency(investment.applied_value || 0, hideValues)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Valor Atual</p>
              <p className="text-sm sm:text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">
                {formatCurrency(
                  investment.current_total_value || investment.applied_value || 0,
                  hideValues,
                )}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Ganho / Perda</p>
              <p
                className={`text-sm sm:text-base font-bold flex items-center gap-1 mt-0.5 ${
                  isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}
              >
                {isProfit ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {formatCurrency(investment.profit_loss || 0, hideValues)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-slate-400 dark:text-slate-500">Rentabilidade</p>
              <p
                className={`text-sm sm:text-base font-bold mt-0.5 ${
                  isProfit ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'
                }`}
              >
                {isProfit ? '+' : ''}
                {(investment.profit_loss_pct || 0).toFixed(2)}%
              </p>
            </div>
          </div>

          {/* Ações: Novo Aporte & Registrar Provento */}
          <div className="flex items-center gap-2 pt-1">
            <Button
              onClick={() => setShowAporteModal(true)}
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold h-9 gap-1.5"
            >
              <PlusCircle className="w-4 h-4" /> Novo Aporte / Venda
            </Button>
            <Button
              onClick={() => setShowEarningsModal(true)}
              variant="outline"
              className="flex-1 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-xs font-semibold h-9 gap-1.5"
            >
              <DollarSign className="w-4 h-4" /> Registrar Rendimento
            </Button>
          </div>

          {/* Abas de Navegação Interna */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 mt-2">
            <button
              onClick={() => setActiveTab('info')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors ${
                activeTab === 'info'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Informações do Produto
            </button>
            <button
              onClick={() => setActiveTab('contributions')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'contributions'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Histórico de Aportes ({invContribs.length})
            </button>
            <button
              onClick={() => setActiveTab('earnings')}
              className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${
                activeTab === 'earnings'
                  ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Coins className="w-3.5 h-3.5" />
              Proventos Recebidos ({invEarnings.length})
            </button>
          </div>

          {/* Conteúdo das Abas */}
          {activeTab === 'info' && (
            <div className="space-y-3.5 text-xs py-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Quantidade & Preço Médio */}
                {investment.quantity !== undefined && investment.quantity > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Quantidade em Carteira</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {investment.quantity} {investment.symbol || 'cotas'}
                    </span>
                  </div>
                )}

                {investment.unit_price !== undefined && investment.unit_price > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Preço Médio de Aquisição</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {formatCurrency(investment.unit_price, hideValues)}
                    </span>
                  </div>
                )}

                {investment.current_price !== undefined && investment.current_price > 0 && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Cotação Atualizada</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {formatCurrency(investment.current_price, hideValues)}
                    </span>
                  </div>
                )}

                {investment.yield_rate !== undefined && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Rentabilidade Contratada</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {investment.yield_type === 'cdi_pct'
                        ? `${investment.yield_rate}% do CDI`
                        : investment.yield_type === 'prefixado'
                          ? `${investment.yield_rate}% a.a. (Prefixado)`
                          : investment.yield_type === 'ipca_mais'
                            ? `IPCA + ${investment.yield_rate}% a.a.`
                            : `${investment.yield_rate}%`}
                    </span>
                  </div>
                )}

                {investment.application_date && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Data da Aplicação</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {formatDate(investment.application_date)}
                    </span>
                  </div>
                )}

                {investment.maturity_date && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Data de Vencimento</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {formatDate(investment.maturity_date)}{' '}
                      {investment.days_until_maturity !== undefined && (
                        <span className="text-xs font-normal text-emerald-600 dark:text-emerald-400">
                          (
                          {investment.days_until_maturity > 0
                            ? `${investment.days_until_maturity} dias restantes`
                            : 'Vencido'}
                          )
                        </span>
                      )}
                    </span>
                  </div>
                )}

                {investment.liquidity && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Liquidez</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm capitalize">
                      {investment.liquidity}
                    </span>
                  </div>
                )}

                {investment.tax_regime && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-slate-400 block mb-0.5">Regime de Tributação</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200 text-sm">
                      {investment.tax_regime === 'isento'
                        ? 'Isento de IR para PF'
                        : investment.tax_regime === 'sem_ir'
                          ? 'Sem incidência de IR'
                          : `Tabela Regressiva (Alíquota estimada: ${investment.estimated_tax_rate || 22.5}%)`}
                    </span>
                  </div>
                )}
              </div>

              {/* Estimativa Líquida de IR */}
              {investment.tax_regime === 'regressivo' &&
                (investment.estimated_tax_value || 0) > 0 && (
                  <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-amber-900 dark:text-amber-200 text-xs">
                          Valor Líquido Estimado de Resgate Hoje
                        </p>
                        <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">
                          IR estimado ({investment.estimated_tax_rate}% sobre lucro de{' '}
                          {formatCurrency(investment.profit_loss || 0, hideValues)}):{' '}
                          {formatCurrency(investment.estimated_tax_value || 0, hideValues)}
                        </p>
                      </div>
                      <p className="text-base font-bold text-amber-950 dark:text-amber-100">
                        {formatCurrency(investment.estimated_net_value || 0, hideValues)}
                      </p>
                    </div>
                  </div>
                )}

              {/* Total de Proventos Acumulados */}
              {totalReceivedEarnings > 0 && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 flex items-center justify-between">
                  <span className="text-emerald-800 dark:text-emerald-200 font-medium">
                    Total em Proventos Recebidos
                  </span>
                  <span className="font-bold text-emerald-700 dark:text-emerald-300 text-sm">
                    {formatCurrency(totalReceivedEarnings, hideValues)}
                  </span>
                </div>
              )}

              {/* Notas */}
              {investment.notes && (
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/60 dark:border-slate-800">
                  <span className="text-slate-400 block mb-0.5">Observações</span>
                  <p className="text-slate-700 dark:text-slate-300 text-xs whitespace-pre-wrap">
                    {investment.notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'contributions' && (
            <div className="space-y-2 py-2">
              {invContribs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhum aporte adicional registrado.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invContribs.map((c) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              c.type === 'compra'
                                ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                                : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                            }`}
                          >
                            {c.type === 'compra' ? 'COMPRA' : 'VENDA'}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {formatDate(c.date)}
                          </span>
                        </div>
                        {c.quantity && c.unit_price ? (
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {c.quantity} un @ {formatCurrency(c.unit_price, hideValues)}
                          </p>
                        ) : null}
                        {c.notes && <p className="text-[11px] text-slate-400 italic">{c.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100">
                          {formatCurrency(c.value, hideValues)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-rose-500"
                          onClick={() => handleDeleteContrib(c.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="space-y-2 py-2">
              {invEarnings.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Nenhum rendimento / provento registrado.
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-slate-800">
                  {invEarnings.map((e) => (
                    <div key={e.id} className="py-2.5 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {e.type.replace('_', ' ')}
                          </Badge>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                            {formatDate(e.date)}
                          </span>
                        </div>
                        {e.notes && <p className="text-[11px] text-slate-400 mt-0.5">{e.notes}</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-xs text-emerald-600 dark:text-emerald-400">
                          +{formatCurrency(e.value, hideValues)}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-slate-400 hover:text-rose-500"
                          onClick={() => handleDeleteEarning(e.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modais de Aporte e Provento Aninhados */}
      <AporteModal
        open={showAporteModal}
        onOpenChange={setShowAporteModal}
        investment={investment}
      />
      <EarningsModal
        open={showEarningsModal}
        onOpenChange={setShowEarningsModal}
        investment={investment}
      />

      {/* Confirmação de Exclusão */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-white dark:bg-[#0f1626]">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              Excluir este investimento?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 text-xs">
              Isso removerá o ativo &ldquo;{investment.name}&rdquo; e todo o histórico de aportes e
              proventos vinculados. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white"
            >
              Excluir Definitivamente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
