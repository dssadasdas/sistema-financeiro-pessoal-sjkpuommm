import React, { useState } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate } from '@/lib/constants'
import { Goal } from '@/types/finance'
import {
  Target,
  Plus,
  Trash2,
  Edit2,
  TrendingUp,
  Sparkles,
  ShieldCheck,
  Plane,
  Car,
  Home,
  GraduationCap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
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

const GOAL_ICONS: Record<string, any> = {
  Target: Target,
  ShieldCheck: ShieldCheck,
  Plane: Plane,
  Car: Car,
  Home: Home,
  GraduationCap: GraduationCap,
}

export default function GoalsPage() {
  const { goals, createGoal, updateGoal, deleteGoal, addGoalContribution } = useFinance()
  const { hideValues } = useAuth()

  // Modal Meta
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null)
  const [name, setName] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [icon, setIcon] = useState('Target')
  const [color, setColor] = useState('#0E9F6E')
  const [loading, setLoading] = useState(false)

  // Modal Contribuição
  const [contribModalOpen, setContribModalOpen] = useState(false)
  const [targetGoal, setTargetGoal] = useState<Goal | null>(null)
  const [contribValue, setContribValue] = useState('')
  const [contribNote, setContribNote] = useState('')

  const totalAccumulated = goals.reduce((acc, g) => acc + (g.accumulated || 0), 0)
  const totalTarget = goals.reduce((acc, g) => acc + (g.target_value || 0), 0)

  const handleOpenCreate = () => {
    setGoalToEdit(null)
    setName('')
    setTargetValue('')
    setIcon('Target')
    setColor('#0E9F6E')
    setGoalModalOpen(true)
  }

  const handleOpenEdit = (g: Goal) => {
    setGoalToEdit(g)
    setName(g.name)
    setTargetValue(String(g.target_value || 0))
    setIcon(g.icon || 'Target')
    setColor(g.color || '#0E9F6E')
    setGoalModalOpen(true)
  }

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(targetValue.replace(',', '.'))
    if (isNaN(num) || num <= 0) return

    setLoading(true)
    try {
      const payload: Partial<Goal> = {
        name: name.trim(),
        target_value: num,
        icon,
        color,
      }

      if (goalToEdit) {
        await updateGoal(goalToEdit.id, payload)
      } else {
        await createGoal(payload)
      }
      setGoalModalOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleOpenContrib = (g: Goal) => {
    setTargetGoal(g)
    setContribValue('')
    setContribNote('')
    setContribModalOpen(true)
  }

  const handleSaveContrib = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetGoal) return
    const num = parseFloat(contribValue.replace(',', '.'))
    if (isNaN(num) || num <= 0) return

    setLoading(true)
    try {
      await addGoalContribution(targetGoal.id, num, contribNote)
      setContribModalOpen(false)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Metas Financeiras</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe o progresso dos seus objetivos de curto, médio e longo prazo
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nova Meta
        </Button>
      </div>

      {/* Hero Card Total Acumulado */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase text-emerald-100">
              Total Acumulado em Metas
            </span>
            <div className="text-3xl sm:text-4xl font-black tabular-nums mt-1">
              {formatCurrency(totalAccumulated, hideValues)}
            </div>
            <span className="text-xs text-emerald-100 mt-1 block">
              Objetivo total somado: {formatCurrency(totalTarget, hideValues)}
            </span>
          </div>

          <div className="bg-white/10 backdrop-blur rounded-xl p-3 border border-white/20 text-xs">
            <span className="text-emerald-100 block">Metas em andamento:</span>
            <span className="text-xl font-bold">{goals.length} ativas</span>
          </div>
        </div>
      </Card>

      {/* Grid de Metas */}
      {goals.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-sm">Nenhuma meta cadastrada.</p>
          <Button onClick={handleOpenCreate} variant="outline" className="mt-4 rounded-xl">
            Criar Minha Primeira Meta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {goals.map((g) => {
            const IconComponent = GOAL_ICONS[g.icon || 'Target'] || Target
            const accumulated = g.accumulated || 0
            const target = g.target_value || 1
            const pct = g.percentage || 0
            const remaining = g.remaining || 0

            return (
              <Card
                key={g.id}
                className="rounded-2xl border-slate-200 dark:border-slate-800 p-5 bg-white dark:bg-[#121A2B] shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs"
                        style={{ backgroundColor: g.color || '#0E9F6E' }}
                      >
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-bold text-base text-slate-900 dark:text-white">
                          {g.name}
                        </h3>
                        <span className="text-xs text-slate-400">
                          Alvo: {formatCurrency(target, hideValues)}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(g)}
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteGoal(g.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Valores Acumulado vs Restante */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-slate-400">Acumulado:</span>
                      <div className="text-lg font-black text-emerald-600 tabular-nums">
                        {formatCurrency(accumulated, hideValues)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">Falta:</span>
                      <div className="text-lg font-black text-slate-700 dark:text-slate-300 tabular-nums">
                        {formatCurrency(remaining, hideValues)}
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Progresso</span>
                      <span className="text-emerald-600 font-bold">{pct}%</span>
                    </div>
                    <Progress value={pct} className="h-2.5 rounded-full" />
                  </div>
                </div>

                {/* Footer Adicionar Contribuição */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {pct >= 100 ? 'Meta Concluída! 🎉' : `${pct}% alcançado`}
                  </span>
                  <Button
                    size="sm"
                    onClick={() => handleOpenContrib(g)}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Aportar
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Nova / Editar Meta */}
      <Dialog open={goalModalOpen} onOpenChange={setGoalModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              {goalToEdit ? 'Editar Meta Financeira' : 'Nova Meta Financeira'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveGoal} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="goal-name">Nome do Objetivo *</Label>
              <Input
                id="goal-name"
                placeholder="Ex: Reserva de Emergência, Carro Novo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="goal-target">Valor Alvo (R$) *</Label>
              <Input
                id="goal-target"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                required
                className="h-10 rounded-xl font-bold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ícone</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Target">Alvo</SelectItem>
                    <SelectItem value="ShieldCheck">Reserva</SelectItem>
                    <SelectItem value="Plane">Viagem</SelectItem>
                    <SelectItem value="Car">Carro</SelectItem>
                    <SelectItem value="Home">Imóvel</SelectItem>
                    <SelectItem value="GraduationCap">Educação</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Cor de Destaque</Label>
                <div className="flex items-center gap-2 mt-1">
                  {['#0E9F6E', '#2563EB', '#8B5CF6', '#F59E0B', '#EF4444', '#EC4899'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        color === c ? 'ring-2 ring-slate-900 dark:ring-white scale-110' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setGoalModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              >
                {loading ? 'Salvando...' : 'Salvar Meta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Adicionar Contribuição */}
      <Dialog open={contribModalOpen} onOpenChange={setContribModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              Aporte na Meta: {targetGoal?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveContrib} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="cont-val">Valor do Aporte (R$) *</Label>
              <Input
                id="cont-val"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={contribValue}
                onChange={(e) => setContribValue(e.target.value)}
                required
                className="h-11 rounded-xl font-bold text-lg text-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="cont-note">Nota / Origem do Aporte</Label>
              <Input
                id="cont-note"
                placeholder="Ex: Economia do mês, Bônus"
                value={contribNote}
                onChange={(e) => setContribNote(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setContribModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              >
                {loading ? 'Salvando...' : 'Registrar Aporte'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
