import React, { useState, useMemo, useEffect } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatDate, CATEGORY_SUGGESTIONS } from '@/lib/constants'
import { Goal, GoalContribution } from '@/types/finance'
import {
  Target,
  Plus,
  Trash2,
  Edit2,
  ShieldCheck,
  Plane,
  Car,
  Home,
  GraduationCap,
  PartyPopper,
  Calendar,
  Tag,
  Loader2,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'

const GOAL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Target: Target,
  ShieldCheck: ShieldCheck,
  Plane: Plane,
  Car: Car,
  Home: Home,
  GraduationCap: GraduationCap,
}

type SortKey = 'progress' | 'target_date' | 'target_value'

// Cor da barra conforme percentual: verde > 75, amarelo 50-75, laranja 25-50, vermelho < 25
function progressColor(pct: number): { bar: string; text: string; bg: string } {
  if (pct >= 75) return { bar: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50' }
  if (pct >= 50) return { bar: 'bg-amber-400', text: 'text-amber-600', bg: 'bg-amber-50' }
  if (pct >= 25) return { bar: 'bg-orange-400', text: 'text-orange-600', bg: 'bg-orange-50' }
  return { bar: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50' }
}

// Confete simples via DOM quando uma meta atinge 100%
function fireConfetti() {
  if (typeof document === 'undefined') return
  const colors = ['#10b981', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#ef4444']
  const root = document.body
  for (let i = 0; i < 60; i++) {
    const piece = document.createElement('div')
    piece.style.position = 'fixed'
    piece.style.top = '40%'
    piece.style.left = '50%'
    piece.style.width = '8px'
    piece.style.height = '8px'
    piece.style.borderRadius = '2px'
    piece.style.background = colors[i % colors.length]
    piece.style.zIndex = '9999'
    piece.style.pointerEvents = 'none'
    const angle = Math.random() * Math.PI * 2
    const velocity = 80 + Math.random() * 160
    const dx = Math.cos(angle) * velocity
    const dy = Math.sin(angle) * velocity - 80
    piece.animate(
      [
        { transform: 'translate(-50%, -50%) rotate(0deg)', opacity: 1 },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy + 320}px)) rotate(${Math.random() * 720}deg)`,
          opacity: 0,
        },
      ],
      { duration: 1400 + Math.random() * 600, easing: 'cubic-bezier(0.2, 0.6, 0.4, 1)' },
    )
    root.appendChild(piece)
    setTimeout(() => piece.remove(), 2200)
  }
}

export default function GoalsPage() {
  const {
    goals,
    isLoading,
    loadError,
    refreshAll,
    createGoal,
    updateGoal,
    deleteGoal,
    addGoalContribution,
  } = useFinance()
  const { hideValues } = useAuth()

  // Ordenação
  const [sortKey, setSortKey] = useState<SortKey>('progress')

  // Modal Meta
  const [goalModalOpen, setGoalModalOpen] = useState(false)
  const [goalToEdit, setGoalToEdit] = useState<Goal | null>(null)
  const [name, setName] = useState('')
  const [targetValue, setTargetValue] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [category, setCategory] = useState('Investimentos')
  const [description, setDescription] = useState('')
  const [icon, setIcon] = useState('Target')
  const [color, setColor] = useState('#0E9F6E')
  const [loading, setLoading] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  // Modal Contribuição
  const [contribModalOpen, setContribModalOpen] = useState(false)
  const [targetGoal, setTargetGoal] = useState<Goal | null>(null)
  const [contribValue, setContribValue] = useState('')
  const [contribDate, setContribDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [contribNote, setContribNote] = useState('')

  // Confirmação de exclusão
  const [deleteTarget, setDeleteTarget] = useState<Goal | null>(null)

  // Card expandido (lista de contribuições)
  const [expandedGoal, setExpandedGoal] = useState<string | null>(null)

  // Dispara confete quando uma meta recém-chega a 100%
  const [celebratedIds, setCelebratedIds] = useState<Set<string>>(new Set())
  useEffect(() => {
    goals.forEach((g) => {
      if ((g.percentage || 0) >= 100 && !celebratedIds.has(g.id)) {
        setCelebratedIds((prev) => new Set(prev).add(g.id))
        fireConfetti()
      }
    })
  }, [goals, celebratedIds])

  const sortedGoals = useMemo(() => {
    const arr = [...goals]
    if (sortKey === 'progress') {
      arr.sort((a, b) => (b.percentage || 0) - (a.percentage || 0))
    } else if (sortKey === 'target_date') {
      arr.sort((a, b) => {
        const da = a.target_date || '9999'
        const db = b.target_date || '9999'
        return da < db ? -1 : da > db ? 1 : 0
      })
    } else if (sortKey === 'target_value') {
      arr.sort((a, b) => (b.target_value || 0) - (a.target_value || 0))
    }
    return arr
  }, [goals, sortKey])

  const totalAccumulated = goals.reduce((acc, g) => acc + (g.accumulated || 0), 0)
  const totalTarget = goals.reduce((acc, g) => acc + (g.target_value || 0), 0)

  const handleOpenCreate = () => {
    setGoalToEdit(null)
    setName('')
    setTargetValue('')
    setTargetDate('')
    setCategory('Investimentos')
    setDescription('')
    setIcon('Target')
    setColor('#0E9F6E')
    setFieldErrors({})
    setGoalModalOpen(true)
  }

  const handleOpenEdit = (g: Goal) => {
    setGoalToEdit(g)
    setName(g.name)
    setTargetValue(String(g.target_value || 0))
    setTargetDate(g.target_date ? g.target_date.slice(0, 10) : '')
    setCategory(g.category || 'Investimentos')
    setDescription(g.description || '')
    setIcon(g.icon || 'Target')
    setColor(g.color || '#0E9F6E')
    setFieldErrors({})
    setGoalModalOpen(true)
  }

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    setFieldErrors({})
    const num = parseFloat(targetValue.replace(',', '.'))
    if (isNaN(num) || num <= 0) {
      setFieldErrors({ target_value: 'Informe um valor alvo válido maior que zero.' })
      return
    }
    setLoading(true)
    try {
      const payload: Partial<Goal> = {
        name: name.trim(),
        target_value: num,
        target_date: targetDate ? `${targetDate} 00:00:00.000Z` : undefined,
        category,
        description: description.trim() || undefined,
        icon,
        color,
      }
      if (goalToEdit) {
        await updateGoal(goalToEdit.id, payload)
      } else {
        await createGoal(payload)
      }
      setGoalModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { data?: Record<string, { message: string }>; message?: string }
      if (errorObj?.data) {
        const fe: Record<string, string> = {}
        for (const [k, v] of Object.entries(errorObj.data)) fe[k] = v.message
        setFieldErrors(fe)
      } else {
        setFieldErrors({ name: errorObj?.message || 'Erro ao salvar meta.' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleOpenContrib = (g: Goal) => {
    setTargetGoal(g)
    setContribValue('')
    setContribDate(new Date().toISOString().slice(0, 10))
    setContribNote('')
    setFieldErrors({})
    setContribModalOpen(true)
  }

  const handleSaveContrib = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetGoal) return
    setFieldErrors({})
    const num = parseFloat(contribValue.replace(',', '.'))
    if (isNaN(num) || num <= 0) {
      setFieldErrors({ value: 'Informe um valor de aporte válido.' })
      return
    }
    setLoading(true)
    try {
      await addGoalContribution(
        targetGoal.id,
        num,
        contribNote.trim() || undefined,
        `${contribDate} 12:00:00.000Z`,
      )
      setContribModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { data?: Record<string, { message: string }>; message?: string }
      if (errorObj?.data) {
        const fe: Record<string, string> = {}
        for (const [k, v] of Object.entries(errorObj.data)) fe[k] = v.message
        setFieldErrors(fe)
      } else {
        setFieldErrors({ value: errorObj?.message || 'Erro ao registrar aporte.' })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return
    setLoading(true)
    try {
      await deleteGoal(deleteTarget.id)
      setDeleteTarget(null)
    } catch {
      setFieldErrors({ name: 'Erro ao excluir meta.' })
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) return <LoadingState message="Carregando metas..." />
  if (loadError)
    return <ErrorState message="Não foi possível carregar suas metas." onRetry={refreshAll} />

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
      {goals.length > 0 && (
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
      )}

      {/* Ordenação */}
      {goals.length > 0 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 font-medium">Ordenar por:</span>
          {(
            [
              { key: 'progress', label: 'Progresso' },
              { key: 'target_date', label: 'Data prevista' },
              { key: 'target_value', label: 'Valor alvo' },
            ] as { key: SortKey; label: string }[]
          ).map((opt) => (
            <button
              key={opt.key}
              onClick={() => setSortKey(opt.key)}
              className={`px-3 py-1.5 rounded-full font-semibold transition-colors ${
                sortKey === opt.key
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700 hover:text-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}

      {/* Grid de Metas */}
      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="Nenhuma meta cadastrada"
          description="Defina seus objetivos financeiros — reserva de emergência, viagem, carro novo — e acompanhe cada aporte rumo ao valor final."
          actionLabel="Crie sua primeira meta"
          onAction={handleOpenCreate}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedGoals.map((g) => {
            const IconComponent = GOAL_ICONS[g.icon || 'Target'] || Target
            const accumulated = g.accumulated || 0
            const target = g.target_value || 1
            const pct = g.percentage || 0
            const remaining = g.remaining || 0
            const colors = progressColor(pct)
            const isComplete = pct >= 100
            const isExpanded = expandedGoal === g.id

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
                        title="Editar meta"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(g)}
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg"
                        title="Excluir meta"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Categoria + data prevista */}
                  {(g.category || g.target_date) && (
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {g.category && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 font-medium gap-1"
                        >
                          <Tag className="w-2.5 h-2.5" /> {g.category}
                        </Badge>
                      )}
                      {g.target_date && (
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 px-1.5 font-medium gap-1 text-slate-500"
                        >
                          <Calendar className="w-2.5 h-2.5" /> {formatDate(g.target_date)}
                        </Badge>
                      )}
                    </div>
                  )}

                  {g.description && (
                    <p className="text-[11px] text-slate-400 mb-3 line-clamp-2">{g.description}</p>
                  )}

                  {/* Valores Acumulado vs Restante */}
                  <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                    <div>
                      <span className="text-slate-400">Acumulado:</span>
                      <div className="text-lg font-black text-emerald-600 tabular-nums">
                        {formatCurrency(accumulated, hideValues)}
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400">{isComplete ? 'Status:' : 'Falta:'}</span>
                      <div
                        className={`text-lg font-black tabular-nums ${
                          isComplete ? 'text-emerald-600' : 'text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isComplete ? 'Concluída!' : formatCurrency(remaining, hideValues)}
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso Colorida */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-500">Progresso</span>
                      <span className={`${colors.text} font-bold`}>{pct}%</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${colors.bar} transition-all duration-500`}
                        style={{ width: `${Math.min(100, pct)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {isComplete ? (
                      <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                        <PartyPopper className="w-3.5 h-3.5" /> Meta atingida!
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400">{pct}% alcançado</span>
                    )}
                    {g.contributions && g.contributions.length > 0 && (
                      <button
                        onClick={() => setExpandedGoal(isExpanded ? null : g.id)}
                        className="text-[11px] font-semibold text-slate-400 hover:text-emerald-600"
                      >
                        {isExpanded ? 'Ocultar' : `${g.contributions.length} aportes`}
                      </button>
                    )}
                  </div>
                  <Button
                    size="sm"
                    onClick={() => handleOpenContrib(g)}
                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Aportar
                  </Button>
                </div>

                {/* Lista de contribuições */}
                {isExpanded && g.contributions && g.contributions.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    {g.contributions.map((c: GoalContribution) => (
                      <div key={c.id} className="flex items-center justify-between text-xs py-1">
                        <div className="min-w-0">
                          <span className="font-semibold text-emerald-600 tabular-nums">
                            + {formatCurrency(c.value, hideValues)}
                          </span>
                          {c.note && <span className="text-slate-400 ml-2 truncate">{c.note}</span>}
                          <div className="text-[10px] text-slate-400">{formatDate(c.date)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
              {fieldErrors.name && (
                <span className="text-[11px] text-red-500">{fieldErrors.name}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
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
                {fieldErrors.target_value && (
                  <span className="text-[11px] text-red-500">{fieldErrors.target_value}</span>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="goal-date">Data Prevista</Label>
                <Input
                  id="goal-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="h-10 rounded-xl"
                />
                {fieldErrors.target_date && (
                  <span className="text-[11px] text-red-500">{fieldErrors.target_date}</span>
                )}
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="goal-category">Categoria</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-56">
                  {CATEGORY_SUGGESTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="goal-desc">Descrição (opcional)</Label>
              <Textarea
                id="goal-desc"
                placeholder="Ex: Montar reserva de 6 meses de despesas..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="rounded-xl min-h-[70px] resize-none"
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
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : goalToEdit ? (
                  'Salvar Alterações'
                ) : (
                  'Salvar Meta'
                )}
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
            <div className="grid grid-cols-2 gap-3">
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
                {fieldErrors.value && (
                  <span className="text-[11px] text-red-500">{fieldErrors.value}</span>
                )}
              </div>
              <div className="space-y-1">
                <Label htmlFor="cont-date">Data do Aporte *</Label>
                <Input
                  id="cont-date"
                  type="date"
                  value={contribDate}
                  onChange={(e) => setContribDate(e.target.value)}
                  required
                  className="h-11 rounded-xl"
                />
              </div>
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

            {targetGoal && (
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-xs flex justify-between">
                <span className="text-slate-500">Progresso atual:</span>
                <span className="font-bold text-emerald-600">
                  {targetGoal.percentage || 0}% •{' '}
                  {formatCurrency(targetGoal.accumulated || 0, hideValues)}
                </span>
              </div>
            )}

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
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Salvando...
                  </>
                ) : (
                  'Registrar Aporte'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Meta?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a meta "<strong>{deleteTarget?.name}</strong>"? Todos
              os aportes vinculados também serão removidos. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
            >
              {loading ? 'Excluindo...' : 'Excluir Meta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
