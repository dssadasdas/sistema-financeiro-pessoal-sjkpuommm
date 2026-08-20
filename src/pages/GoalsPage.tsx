import React, { useState, useMemo } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/constants'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { Goal } from '@/types/finance'
import {
  Target,
  Plus,
  Trash2,
  Loader2,
  Calendar,
  DollarSign,
  TrendingUp,
  Award,
  Coins,
  Sparkles,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { LoadingState, ErrorState, EmptyState } from '@/components/States'

export default function GoalsPage() {
  const { toast } = useToast()
  const { hideValues } = useAuth()
  const { goals, createGoal, deleteGoal, addGoalContribution, isLoading, loadError, refreshAll } =
    useFinance()

  // Modal de Criação de Meta
  const [createModalOpen, setCreateModalOpen] = useState(false)
  const [goalName, setGoalName] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  // Modal de Aporte em Meta
  const [contribModalOpen, setContribModalOpen] = useState(false)
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null)
  const [contribValue, setContribValue] = useState('')
  const [contribNote, setContribNote] = useState('')
  const [contribDate, setContribDate] = useState(new Date().toISOString().slice(0, 10))
  const [contributing, setContributing] = useState(false)

  // Modal de Exclusão
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Métricas Consolidadas
  const totalTarget = useMemo(() => {
    return goals.reduce((acc, g) => acc + Number(g.target_value || 0), 0)
  }, [goals])

  const totalAccumulated = useMemo(() => {
    return goals.reduce((acc, g) => acc + Number(g.accumulated || 0), 0)
  }, [goals])

  const overallProgress = useMemo(() => {
    if (totalTarget <= 0) return 0
    return Math.min(100, Math.round((totalAccumulated / totalTarget) * 100))
  }, [totalTarget, totalAccumulated])

  const completedGoalsCount = useMemo(() => {
    return goals.filter(
      (g) => (g.accumulated || 0) >= Number(g.target_value || 0) && Number(g.target_value || 0) > 0,
    ).length
  }, [goals])

  // Abrir Modal de Criação
  const handleOpenCreate = () => {
    setGoalName('')
    setTargetValue('')
    setTargetDate('')
    setDescription('')
    setCreateModalOpen(true)
  }

  // Submeter Criação de Meta
  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = goalName.trim()
    const numTarget = parseFloat(targetValue.replace(',', '.'))

    if (!trimmedName) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome da meta.',
        variant: 'destructive',
      })
      return
    }

    if (isNaN(numTarget) || numTarget <= 0) {
      toast({
        title: 'Valor alvo inválido',
        description: 'Informe um valor alvo maior que zero.',
        variant: 'destructive',
      })
      return
    }

    setCreating(true)
    try {
      await createGoal({
        name: trimmedName,
        target_value: numTarget,
        target_date: targetDate || undefined,
        description: description.trim() || undefined,
      })
      toast({
        title: 'Meta criada com sucesso',
        description: `A meta "${trimmedName}" foi adicionada ao seu planejamento.`,
      })
      setCreateModalOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao criar meta',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setCreating(false)
    }
  }

  // Abrir Modal de Aporte
  const handleOpenContribution = (goal: Goal) => {
    setSelectedGoal(goal)
    setContribValue('')
    setContribNote('')
    setContribDate(new Date().toISOString().slice(0, 10))
    setContribModalOpen(true)
  }

  // Submeter Aporte
  const handleAddContribution = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedGoal) return

    const numValue = parseFloat(contribValue.replace(',', '.'))
    if (isNaN(numValue) || numValue <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Informe um valor de aporte maior que zero.',
        variant: 'destructive',
      })
      return
    }

    setContributing(true)
    try {
      await addGoalContribution(
        selectedGoal.id,
        numValue,
        contribNote.trim() || undefined,
        contribDate || undefined,
      )
      toast({
        title: 'Aporte registrado!',
        description: `${formatCurrency(numValue, false)} adicionados à meta "${selectedGoal.name}".`,
      })
      setContribModalOpen(false)
    } catch (err) {
      toast({
        title: 'Erro ao registrar aporte',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setContributing(false)
    }
  }

  // Confirmar Exclusão
  const handleConfirmDelete = async () => {
    if (!goalToDelete) return
    setDeleting(true)
    try {
      await deleteGoal(goalToDelete.id)
      toast({
        title: 'Meta excluída',
        description: `A meta "${goalToDelete.name}" foi removida.`,
      })
      setGoalToDelete(null)
    } catch (err) {
      toast({
        title: 'Erro ao excluir meta',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeleting(false)
    }
  }

  if (isLoading) {
    return <LoadingState message="Carregando metas..." />
  }

  if (loadError) {
    return <ErrorState message="Não foi possível carregar as metas." onRetry={refreshAll} />
  }

  return (
    <div className="space-y-6 max-w-6xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
              Metas Financeiras
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Acompanhe seu progresso e guarde dinheiro para realizar seus sonhos
            </p>
          </div>
        </div>

        <Button
          onClick={handleOpenCreate}
          className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5 h-10 justify-center"
        >
          <Plus className="w-4 h-4" /> Nova Meta
        </Button>
      </div>

      {/* Cards de Resumo */}
      {goals.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center flex-shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Total Acumulado
                </span>
                <p className="text-lg font-black text-emerald-600 tabular-nums truncate">
                  {formatCurrency(totalAccumulated, hideValues)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Valor Total Alvo
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums truncate">
                  {formatCurrency(totalTarget, hideValues)}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-400 uppercase">
                    Progresso Geral
                  </span>
                  <span className="text-xs font-bold text-purple-600 tabular-nums">
                    {overallProgress}%
                  </span>
                </div>
                <Progress value={overallProgress} className="h-2 mt-1.5 rounded-full" />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm">
            <CardContent className="p-4 flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[11px] font-semibold text-slate-400 uppercase">
                  Metas Concluídas
                </span>
                <p className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                  {completedGoalsCount} de {goals.length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Grid de Metas */}
      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta cadastrada"
          description="Crie sua primeira meta financeira (ex: Reserva de Emergência, Viagem, Carro Novo) e comece a registrar seus aportes."
          actionLabel="Criar Primeira Meta"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {goals.map((goal) => {
            const targetVal = Number(goal.target_value || 0)
            const accumulatedVal = Number(goal.accumulated || 0)
            const remainingVal = Math.max(0, targetVal - accumulatedVal)
            const percent =
              targetVal > 0 ? Math.min(100, Math.round((accumulatedVal / targetVal) * 100)) : 0
            const isCompleted = percent >= 100

            return (
              <Card
                key={goal.id}
                className={`rounded-2xl bg-white dark:bg-[#121A2B] border shadow-sm hover:shadow-md transition-all flex flex-col justify-between overflow-hidden ${
                  isCompleted
                    ? 'border-emerald-300 dark:border-emerald-800/80'
                    : 'border-slate-200 dark:border-slate-800'
                }`}
              >
                <CardContent className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  {/* Topo do card: Nome + Status + Ações */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                            isCompleted
                              ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          {isCompleted ? (
                            <Award className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Target className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <h3 className="font-bold text-base text-slate-900 dark:text-white truncate">
                            {goal.name}
                          </h3>
                          {goal.target_date && (
                            <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              Limite: {formatDate(goal.target_date)}
                            </p>
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setGoalToDelete(goal)}
                        className="h-8 w-8 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 flex-shrink-0"
                        title="Excluir Meta"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {goal.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
                        {goal.description}
                      </p>
                    )}
                  </div>

                  {/* Valores & Progresso */}
                  <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Acumulado
                        </span>
                        <span className="text-lg font-black text-emerald-600 tabular-nums block">
                          {formatCurrency(accumulatedVal, hideValues)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">
                          Alvo
                        </span>
                        <span className="text-lg font-black text-slate-900 dark:text-white tabular-nums block">
                          {formatCurrency(targetVal, hideValues)}
                        </span>
                      </div>
                    </div>

                    {/* Barra de Progresso */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs font-semibold">
                        <span className="text-slate-500 dark:text-slate-400">Progresso</span>
                        <span
                          className={`tabular-nums ${
                            isCompleted
                              ? 'text-emerald-600 font-bold'
                              : 'text-slate-700 dark:text-slate-300'
                          }`}
                        >
                          {percent}%
                        </span>
                      </div>
                      <Progress
                        value={percent}
                        className={`h-2.5 rounded-full ${
                          isCompleted ? '[&>div]:bg-emerald-500' : '[&>div]:bg-emerald-600'
                        }`}
                      />
                    </div>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      {isCompleted ? (
                        <Badge className="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30 text-[10px] px-2 py-0.5 gap-1 font-bold">
                          <Sparkles className="w-3 h-3" /> Meta Concluída!
                        </Badge>
                      ) : (
                        <span className="text-slate-500 dark:text-slate-400">
                          Faltam: <strong>{formatCurrency(remainingVal, hideValues)}</strong>
                        </span>
                      )}

                      {goal.contributions && goal.contributions.length > 0 && (
                        <span className="text-slate-400 text-[10px]">
                          {goal.contributions.length} aporte
                          {goal.contributions.length > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botão de Aporte */}
                  <div className="pt-2">
                    <Button
                      type="button"
                      onClick={() => handleOpenContribution(goal)}
                      className="w-full h-10 rounded-xl font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                    >
                      <Plus className="w-4 h-4" /> Adicionar Aporte
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Criar Nova Meta */}
      <Dialog open={createModalOpen} onOpenChange={setCreateModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-emerald-600" />
              Nova Meta Financeira
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateGoal} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="goal-name">Nome da Meta *</Label>
              <Input
                id="goal-name"
                placeholder="Ex: Reserva de Emergência, Viagem Europa..."
                value={goalName}
                onChange={(e) => setGoalName(e.target.value)}
                required
                className="h-10 rounded-xl"
                disabled={creating}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="goal-target">Valor Alvo (R$) *</Label>
                <Input
                  id="goal-target"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={targetValue}
                  onChange={(e) => setTargetValue(e.target.value)}
                  required
                  className="h-10 rounded-xl font-bold"
                  disabled={creating}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="goal-date">Data Limite (Opcional)</Label>
                <Input
                  id="goal-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="h-10 rounded-xl"
                  disabled={creating}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="goal-desc">Descrição / Motivação</Label>
              <Input
                id="goal-desc"
                placeholder="Ex: Guardar 6 meses de despesas fixas para segurança..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-10 rounded-xl text-xs"
                disabled={creating}
              />
            </div>

            <DialogFooter className="pt-3 gap-2 flex-col-reverse sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateModalOpen(false)}
                className="w-full sm:w-auto rounded-xl"
                disabled={creating}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={creating || !goalName.trim() || !targetValue}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5 justify-center"
              >
                {creating ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Criando...
                  </>
                ) : (
                  'Criar Meta'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Aporte */}
      <Dialog open={contribModalOpen} onOpenChange={setContribModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-emerald-600" />
              Adicionar Aporte · {selectedGoal?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleAddContribution} className="space-y-4 pt-2">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Acumulado até agora:</span>
                <span className="font-bold text-emerald-600 tabular-nums">
                  {formatCurrency(selectedGoal?.accumulated || 0, hideValues)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Valor Alvo:</span>
                <span className="font-bold text-slate-900 dark:text-white tabular-nums">
                  {formatCurrency(selectedGoal?.target_value || 0, hideValues)}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="contrib-value">Valor do Aporte (R$) *</Label>
                <Input
                  id="contrib-value"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0,00"
                  value={contribValue}
                  onChange={(e) => setContribValue(e.target.value)}
                  required
                  className="h-10 rounded-xl font-bold"
                  disabled={contributing}
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contrib-date">Data do Aporte *</Label>
                <Input
                  id="contrib-date"
                  type="date"
                  value={contribDate}
                  onChange={(e) => setContribDate(e.target.value)}
                  required
                  className="h-10 rounded-xl"
                  disabled={contributing}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="contrib-note">Observação / Nota</Label>
              <Input
                id="contrib-note"
                placeholder="Ex: Sobra do salário, rendimento de investimento..."
                value={contribNote}
                onChange={(e) => setContribNote(e.target.value)}
                className="h-10 rounded-xl text-xs"
                disabled={contributing}
              />
            </div>

            <DialogFooter className="pt-3 gap-2 flex-col-reverse sm:flex-row">
              <Button
                type="button"
                variant="outline"
                onClick={() => setContribModalOpen(false)}
                className="w-full sm:w-auto rounded-xl"
                disabled={contributing}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={contributing || !contribValue}
                className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5 justify-center"
              >
                {contributing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Guardando...
                  </>
                ) : (
                  'Confirmar Aporte'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* AlertDialog de Confirmação de Exclusão */}
      <AlertDialog
        open={!!goalToDelete}
        onOpenChange={(open) => {
          if (!open) setGoalToDelete(null)
        }}
      >
        <AlertDialogContent className="bg-white dark:bg-[#121a2b] border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              Excluir meta {goalToDelete ? `"${goalToDelete.name}"` : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              Esta ação excluirá permanentemente a meta e todo o histórico de aportes vinculados a
              ela.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={deleting}
              className="bg-transparent border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={deleting}
              onClick={handleConfirmDelete}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Excluindo...
                </>
              ) : (
                'Excluir meta'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
