import React, { useState } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, BANK_CONFIGS } from '@/lib/constants'
import { Account, BankName, AccountType } from '@/types/finance'
import {
  Building2,
  Plus,
  Edit2,
  Trash2,
  Lock,
  SlidersHorizontal,
  Wallet,
  AlertCircle,
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

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

export default function AccountsPage() {
  const { accounts, createAccount, updateAccount, deleteAccount, adjustAccountBalance } =
    useFinance()
  const { hideValues } = useAuth()

  const [accountModalOpen, setAccountModalOpen] = useState(false)
  const [accountToEdit, setAccountToEdit] = useState<Account | null>(null)
  const [adjustModalOpen, setAdjustModalOpen] = useState(false)
  const [accountToAdjust, setAccountToAdjust] = useState<Account | null>(null)
  const [deleteConfirmAccount, setDeleteConfirmAccount] = useState<Account | null>(null)

  // Form states para conta
  const [name, setName] = useState('')
  const [type, setType] = useState<AccountType>('Conta corrente')
  const [bank, setBank] = useState<BankName>('Nubank')
  const [openingBalance, setOpeningBalance] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Form states para ajuste
  const [newBalance, setNewBalance] = useState('')
  const [adjustNote, setAdjustNote] = useState('')

  const handleOpenCreate = () => {
    setAccountToEdit(null)
    setName('')
    setType('Conta corrente')
    setBank('Nubank')
    setOpeningBalance('0.00')
    setError('')
    setAccountModalOpen(true)
  }

  const handleOpenEdit = (acc: Account) => {
    setAccountToEdit(acc)
    setName(acc.name)
    setType(acc.type)
    setBank(acc.bank)
    setOpeningBalance(String(acc.opening_balance || 0))
    setError('')
    setAccountModalOpen(true)
  }

  const handleSaveAccount = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const config = BANK_CONFIGS[bank] || BANK_CONFIGS['Outro']
      const payload: Partial<Account> = {
        name: name.trim(),
        type,
        bank,
        opening_balance: parseFloat(openingBalance.replace(',', '.')) || 0,
        color: config.cardBg,
      }

      if (accountToEdit) {
        await updateAccount(accountToEdit.id, payload)
      } else {
        await createAccount(payload)
      }
      setAccountModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      setError(errorObj?.message || 'Erro ao salvar conta.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenAdjust = (acc: Account) => {
    setAccountToAdjust(acc)
    setNewBalance(String(acc.current_balance ?? 0))
    setAdjustNote('Ajuste de Saldo')
    setAdjustModalOpen(true)
  }

  const handleSaveAdjust = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!accountToAdjust) return
    const num = parseFloat(newBalance.replace(',', '.'))
    if (isNaN(num)) return

    setLoading(true)
    try {
      await adjustAccountBalance(accountToAdjust.id, num, adjustNote)
      setAdjustModalOpen(false)
    } catch (err: unknown) {
      const errorObj = err as { message?: string }
      alert(errorObj?.message || 'Erro ao ajustar saldo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Bancos e Contas</h2>
          <p className="text-xs sm:text-sm text-slate-500">
            Gerencie suas contas bancárias, carteiras e saldos automáticos
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md font-semibold gap-1.5"
        >
          <Plus className="w-4 h-4" /> Nova Conta
        </Button>
      </div>

      {/* Grid de Cards de Contas */}
      {accounts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-slate-200 dark:border-slate-800">
          <p className="text-slate-500 text-sm">Nenhuma conta cadastrada.</p>
          <Button onClick={handleOpenCreate} variant="outline" className="mt-4 rounded-xl">
            Adicionar Primeira Conta
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {accounts.map((acc) => {
            const config = BANK_CONFIGS[acc.bank] || BANK_CONFIGS['Outro']

            return (
              <Card
                key={acc.id}
                className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden bg-white dark:bg-[#121A2B] flex flex-col justify-between"
              >
                <div>
                  {/* Top Header Card */}
                  <div
                    className={`p-4 text-white bg-gradient-to-r ${config.bgGradient} flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center font-bold text-sm text-white">
                        {config.logoText}
                      </div>
                      <div>
                        <h3 className="font-bold text-base leading-tight">{acc.name}</h3>
                        <span className="text-xs text-white/80">{acc.type}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEdit(acc)}
                        className="p-1.5 rounded-lg bg-black/15 hover:bg-black/25 text-white transition-colors"
                        title="Editar Conta"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {/* Botão de Excluir com Proteção */}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={acc.has_transactions}
                                onClick={() => setDeleteConfirmAccount(acc)}
                                className="h-7 w-7 text-white/80 hover:text-white hover:bg-black/25 disabled:opacity-40 disabled:cursor-not-allowed"
                              >
                                {acc.has_transactions ? (
                                  <Lock className="w-3.5 h-3.5" />
                                ) : (
                                  <Trash2 className="w-3.5 h-3.5" />
                                )}
                              </Button>
                            </span>
                          </TooltipTrigger>
                          {acc.has_transactions && (
                            <TooltipContent className="max-w-xs text-xs p-2 bg-slate-900 text-white rounded-xl">
                              Esta conta possui movimentações vinculadas e não pode ser excluída
                              para não quebrar o histórico.
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>

                  {/* Body Saldos */}
                  <div className="p-5 space-y-3">
                    <div>
                      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        Saldo Atual
                      </span>
                      <div className="text-2xl font-black text-slate-900 dark:text-white tabular-nums mt-0.5">
                        {formatCurrency(acc.current_balance, hideValues)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-100 dark:border-slate-800 text-slate-500">
                      <span>Saldo Previsto (c/ pendentes):</span>
                      <span className="font-bold tabular-nums text-slate-700 dark:text-slate-300">
                        {formatCurrency(acc.projected_balance, hideValues)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Footer Card Actions */}
                <div className="p-3 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    Inicial: {formatCurrency(acc.opening_balance, hideValues)}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleOpenAdjust(acc)}
                    className="h-8 text-xs rounded-xl font-medium gap-1 text-slate-700 dark:text-slate-200 hover:text-emerald-600"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5" /> Ajustar Saldo
                  </Button>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      {/* Modal Nova / Editar Conta */}
      <Dialog open={accountModalOpen} onOpenChange={setAccountModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              {accountToEdit ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
            </DialogTitle>
          </DialogHeader>

          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSaveAccount} className="space-y-4 pt-2">
            <div className="space-y-1">
              <Label htmlFor="acc-name">Nome da Conta *</Label>
              <Input
                id="acc-name"
                placeholder="Ex: Nubank Principal, Itaú Reserva"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-10 rounded-xl"
              />
            </div>

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
              <Label>Tipo de Conta</Label>
              <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Conta corrente">Conta corrente</SelectItem>
                  <SelectItem value="Conta poupança">Conta poupança</SelectItem>
                  <SelectItem value="Carteira">Carteira / Dinheiro Físico</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="acc-init">Saldo Inicial (R$)</Label>
              <Input
                id="acc-init"
                type="number"
                step="0.01"
                placeholder="0,00"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="h-10 rounded-xl font-bold"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAccountModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              >
                {loading ? 'Salvando...' : 'Salvar Conta'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Ajustar Saldo */}
      <Dialog open={adjustModalOpen} onOpenChange={setAdjustModalOpen}>
        <DialogContent className="max-w-md rounded-2xl bg-white dark:bg-[#121A2B]">
          <DialogHeader>
            <DialogTitle className="font-bold text-lg text-slate-900 dark:text-white">
              Ajustar Saldo: {accountToAdjust?.name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveAdjust} className="space-y-4 pt-2">
            <p className="text-xs text-slate-500">
              O sistema criará automaticamente uma transação de ajuste para que o saldo atual da
              conta passe a ser exatamente o novo valor informado.
            </p>

            <div className="space-y-1">
              <Label htmlFor="adj-val">Novo Saldo Real da Conta (R$) *</Label>
              <Input
                id="adj-val"
                type="number"
                step="0.01"
                value={newBalance}
                onChange={(e) => setNewBalance(e.target.value)}
                required
                className="h-11 rounded-xl text-lg font-bold text-emerald-600"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="adj-note">Motivo / Nota do Ajuste</Label>
              <Input
                id="adj-note"
                placeholder="Ex: Conciliação bancária mensal"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setAdjustModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold"
              >
                {loading ? 'Ajustando...' : 'Confirmar Ajuste'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmação de Exclusão de Conta Sem Movimentações */}
      <AlertDialog
        open={deleteConfirmAccount !== null}
        onOpenChange={(open) => !open && setDeleteConfirmAccount(null)}
      >
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Conta Bancária?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a conta "<strong>{deleteConfirmAccount?.name}</strong>
              "? Como ela não possui movimentações, a exclusão é segura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (deleteConfirmAccount) {
                  try {
                    await deleteAccount(deleteConfirmAccount.id)
                  } catch (e: unknown) {
                    const err = e as { message?: string }
                    alert(err?.message || 'Erro ao excluir conta.')
                  }
                  setDeleteConfirmAccount(null)
                }
              }}
              className="bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
