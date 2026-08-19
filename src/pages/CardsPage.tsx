import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, BANK_CONFIGS } from '@/lib/constants'
import { CreditCard, BankName, CardBrand } from '@/types/finance'
import {
  CreditCard as CreditCardIcon,
  Plus,
  Eye,
  EyeOff,
  ChevronRight,
  Sparkles,
  Calendar,
  Layers,
  Edit2,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
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

const BANKS_LIST: BankName[] = [
  'Nubank',
  'Caixa',
  'Itaú',
  'Bradesco',
  'Santander',
  'Banco do Brasil',
  'Inter',
  'C6',
  'Sicoob',
  'PicPay',
  'Mercado Pago',
  'Neon',
  'Banco CSF/Atacadão',
  'Outro',
]

export default function CardsPage() {
  const { creditCards, createCreditCard, updateCreditCard, deleteCreditCard } = useFinance()
  const { hideValues: globalHideValues } = useAuth()
  const navigate = useNavigate()

  // Olho independente por cartão (estado local de sessão)
  const [hiddenCardIds, setHiddenCardIds] = useState<Record<string, boolean>>({})

  const toggleCardEye = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setHiddenCardIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }))
  }

  // Modal Novo / Editar Cartão
  const [modalOpen, setModalOpen] = useState(false)
  const [cardToEdit, setCardToEdit] = useState<CreditCard | null>(null)
  const [name, setName] = useState('')
  const [bank, setBank] = useState<BankName>('Nubank')
  const [limit, setLimit] = useState('')
  const [closingDay, setClosingDay] = useState('15')
  const [dueDay, setDueDay] = useState('22')
  const [lastFour, setLastFour] = useState('1234')
  const [brand, setBrand] = useState<CardBrand>('Mastercard')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [deleteConfirmCard, setDeleteConfirmCard] = useState<CreditCard | null>(null)

  const handleOpenCreate = () => {
    setCardToEdit(null)
    setName('')
    setBank('Nubank')
    setLimit('5000')
    setClosingDay('15')
    setDueDay('22')
    setLastFour('1234')
    setBrand('Mastercard')
    setError('')
    setModalOpen(true)
  }

  const handleOpenEdit = (card: CreditCard, e: React.MouseEvent) => {
    e.stopPropagation()
    setCardToEdit(card)
    setName(card.name)
    setBank(card.bank)
    setLimit(String(card.limit || 0))
    setClosingDay(String(card.closing_day || 15))
    setDueDay(String(card.due_day || 22))
    setLastFour(card.last_four || '1234')
    setBrand(card.brand || 'Mastercard')
    setError('')
    setModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const payload: Partial<CreditCard> = {
        name: name.trim(),
        bank,
        limit: parseFloat(limit.replace(',', '.')) || 0,
        closing_day: parseInt(closingDay, 10) || 15,
        due_day: parseInt(dueDay, 10) || 22,
        last_four: lastFour.trim().slice(-4),
        brand,
      }

      if (cardToEdit) {
        await updateCreditCard(cardToEdit.id, payload)
      } else {
        await createCreditCard(payload)
      }
      setModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setError(errorObj?.message || 'Erro ao salvar cartão.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Cartões de Crédito</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Acompanhe faturas abertas, limites disponíveis e compras por emissor
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" /> Novo Cartão
        </Button>
      </div>

      {/* Grid de Cartões Estilizados */}
      {creditCards.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-sm">Nenhum cartão de crédito cadastrado.</p>
          <Button onClick={handleOpenCreate} variant="outline" className="mt-4 rounded-xl">
            Adicionar Primeiro Cartão
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creditCards.map((card) => {
            const config = BANK_CONFIGS[card.bank] || BANK_CONFIGS['Outro']
            const isMasked = hiddenCardIds[card.id] || globalHideValues

            return (
              <div
                key={card.id}
                onClick={() => navigate(`/cartoes/${card.id}`)}
                className="group cursor-pointer rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-200 overflow-hidden flex flex-col justify-between"
              >
                {/* Visual Estilizado do Cartão Físico no Topo */}
                <div
                  className={`p-6 text-white bg-gradient-to-tr ${config.bgGradient} relative overflow-hidden flex flex-col justify-between h-48 shadow-inner`}
                >
                  {/* Círculos decorativos sutis */}
                  <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />

                  {/* Topo do cartão: Logo Banco + Botão Olho + Ações */}
                  <div className="flex items-center justify-between z-10">
                    <div className="flex items-center gap-2">
                      <span className="font-black text-lg tracking-wider drop-shadow-sm">
                        {config.logoText}
                      </span>
                      <span className="text-xs text-white/75 font-medium px-2 py-0.5 rounded bg-black/20">
                        {card.brand || 'Crédito'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Botão de Olho Independente por Cartão */}
                      <button
                        onClick={(e) => toggleCardEye(card.id, e)}
                        className="p-1.5 rounded-lg bg-black/20 hover:bg-black/35 text-white transition-colors"
                        title={
                          isMasked ? 'Revelar dados deste cartão' : 'Ocultar dados deste cartão'
                        }
                      >
                        {isMasked ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <button
                        onClick={(e) => handleOpenEdit(card, e)}
                        className="p-1.5 rounded-lg bg-black/20 hover:bg-black/35 text-white transition-colors"
                        title="Editar Cartão"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Centro do Cartão: Chip + Número Mascarado */}
                  <div className="z-10 my-auto">
                    <div className="w-9 h-7 rounded-md bg-amber-300/80 border border-amber-400/50 shadow-inner mb-2 flex items-center justify-center">
                      <div className="w-6 h-4 border border-amber-600/40 rounded-xs" />
                    </div>
                    <div className="font-mono text-sm sm:text-base tracking-widest text-white/95 font-semibold">
                      {isMasked
                        ? '•••• •••• •••• ••••'
                        : `•••• •••• •••• ${card.last_four || '0000'}`}
                    </div>
                  </div>

                  {/* Base do Cartão: Nome + Fechamento/Vencimento */}
                  <div className="flex items-end justify-between z-10 text-xs">
                    <div>
                      <span className="text-[10px] uppercase text-white/70 block leading-none">
                        Titular
                      </span>
                      <span className="font-bold tracking-wide">{card.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] uppercase text-white/70 block leading-none">
                        Fech / Venc
                      </span>
                      <span className="font-bold font-mono">
                        {card.closing_day} / {card.due_day}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Corpo de Métricas */}
                <div className="p-5 space-y-4">
                  {/* Fatura Atual & Limite Disponível */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">
                        Fatura Atual
                      </span>
                      <div className="text-lg font-black text-slate-900 dark:text-white tabular-nums">
                        {formatCurrency(card.current_invoice_total, isMasked)}
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-[11px] text-slate-400 uppercase font-semibold">
                        Disponível
                      </span>
                      <div className="text-lg font-black text-emerald-600 tabular-nums">
                        {formatCurrency(card.available_limit, isMasked)}
                      </div>
                    </div>
                  </div>

                  {/* Barra de Progresso do Limite Utilizado */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Uso do Limite Total ({formatCurrency(card.limit, isMasked)})</span>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {card.used_percentage}%
                      </span>
                    </div>
                    <Progress value={card.used_percentage} className="h-2 rounded-full" />
                  </div>
                </div>

                {/* Footer do Card */}
                <div className="px-5 py-3 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-emerald-600 group-hover:text-emerald-700">
                  <span>Ver Fatura & Compras</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Novo / Editar Cartão */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              {cardToEdit ? 'Editar Cartão de Crédito' : 'Novo Cartão de Crédito'}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-3.5 pt-2">
            <div className="space-y-1">
              <Label htmlFor="card-name">Nome do Cartão *</Label>
              <Input
                id="card-name"
                placeholder="Ex: Nubank Ultravioleta, Black Itaú"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Banco Emissor</Label>
                <Select value={bank} onValueChange={(v) => setBank(v as BankName)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="max-h-56">
                    {BANKS_LIST.map((b) => (
                      <SelectItem key={b} value={b}>
                        {b}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Bandeira</Label>
                <Select value={brand} onValueChange={(v) => setBrand(v as CardBrand)}>
                  <SelectTrigger className="h-10 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mastercard">Mastercard</SelectItem>
                    <SelectItem value="Visa">Visa</SelectItem>
                    <SelectItem value="Elo">Elo</SelectItem>
                    <SelectItem value="Amex">American Express</SelectItem>
                    <SelectItem value="Hipercard">Hipercard</SelectItem>
                    <SelectItem value="Outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label htmlFor="card-limit">Limite (R$) *</Label>
                <Input
                  id="card-limit"
                  type="number"
                  step="0.01"
                  value={limit}
                  onChange={(e) => setLimit(e.target.value)}
                  required
                  className="h-10 rounded-xl font-bold"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="card-close">Dia Fech.</Label>
                <Input
                  id="card-close"
                  type="number"
                  min={1}
                  max={31}
                  value={closingDay}
                  onChange={(e) => setClosingDay(e.target.value)}
                  required
                  className="h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="card-due">Dia Venc.</Label>
                <Input
                  id="card-due"
                  type="number"
                  min={1}
                  max={31}
                  value={dueDay}
                  onChange={(e) => setDueDay(e.target.value)}
                  required
                  className="h-10 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="card-last4">Últimos 4 Dígitos</Label>
              <Input
                id="card-last4"
                maxLength={4}
                placeholder="Ex: 8824"
                value={lastFour}
                onChange={(e) => setLastFour(e.target.value)}
                required
                className="h-10 rounded-xl font-mono tracking-wider"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
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
                {loading ? 'Salvando...' : 'Salvar Cartão'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
