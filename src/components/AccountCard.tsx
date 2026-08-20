import React, { useState } from 'react'
import { Account } from '@/types/finance'
import { findInstitution } from '@/data/institutions'
import { BankLogoIcon } from '@/components/BankLogoIcon'
import { formatCurrency } from '@/lib/constants'
import {
  Landmark,
  PiggyBank,
  TrendingUp,
  Wallet,
  Eye,
  EyeOff,
  MoreVertical,
  Edit2,
  ArrowRightLeft,
  Trash2,
  ChevronRight,
  Star,
  Layers,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

const ACCOUNT_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  'Conta corrente': Landmark,
  'Conta poupança': PiggyBank,
  Outro: TrendingUp,
  Carteira: Wallet,
}

interface AccountCardProps {
  account: Account
  isPrimary?: boolean
  isArchived?: boolean
  isExpanded?: boolean
  globalHideValues?: boolean
  onToggleExpand: (id: string) => void
  onEdit: (account: Account) => void
  onAdjustBalance: (account: Account) => void
  onTransfer: (account: Account) => void
  onSetPrimary: (account: Account) => void
  onDelete: (account: Account) => void
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  isPrimary = false,
  isArchived = false,
  isExpanded = false,
  globalHideValues = false,
  onToggleExpand,
  onEdit,
  onAdjustBalance,
  onTransfer,
  onSetPrimary,
  onDelete,
}) => {
  // Controle de visibilidade individual do saldo do card
  const [individualHidden, setIndividualHidden] = useState(false)

  const isValueHidden = globalHideValues || individualHidden
  const institution = findInstitution(account.bank || account.name)
  const isPositive = (account.current_balance || 0) >= 0

  // Identidade sutil por banco (apenas detalhe/borda superior ou lateral suave)
  const primaryColor = account.color || institution.primaryColor

  return (
    <Card
      className={`relative rounded-2xl border transition-all duration-200 bg-white dark:bg-[#121A2B] shadow-xs hover:shadow-md overflow-hidden ${
        isArchived
          ? 'opacity-65 border-dashed border-slate-300 dark:border-slate-700'
          : 'border-slate-200/90 dark:border-slate-800'
      }`}
    >
      {/* Detalhe visual sutil no topo do card (barra de 3px com a cor da instituição) */}
      <div
        className="h-[3.5px] w-full"
        style={{
          backgroundColor: primaryColor,
          opacity: isArchived ? 0.4 : 0.9,
        }}
      />

      <CardContent className="p-4 sm:p-5">
        {/* Cabeçalho do Card */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Logo do Banco em destaque nítido com proporção contida */}
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl flex-shrink-0 flex items-center justify-center p-0.5 shadow-xs overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
              <BankLogoIcon
                institutionId={institution.id}
                bankName={account.bank}
                customColor={account.color}
                size={42}
                className="w-full h-full object-contain"
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <h3
                  className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate"
                  title={account.name}
                >
                  {account.name}
                </h3>
                {isPrimary && (
                  <Badge
                    variant="default"
                    className="text-[9px] font-extrabold uppercase px-1.5 py-0 h-4.5 bg-emerald-600 hover:bg-emerald-600 text-white rounded-md flex items-center gap-1 shadow-xs tracking-wider"
                  >
                    <Star className="w-2.5 h-2.5 fill-white" /> Principal
                  </Badge>
                )}
                {isArchived && (
                  <Badge
                    variant="secondary"
                    className="text-[9px] font-bold px-1.5 py-0 h-4.5 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md"
                  >
                    Arquivada
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mt-1">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  {institution.shortName}
                </span>
                <span className="text-slate-300 dark:text-slate-600 text-[10px]">•</span>
                <Badge
                  variant="outline"
                  className="text-[10px] font-medium px-1.5 py-0 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 text-slate-600 dark:text-slate-400"
                >
                  {account.type}
                </Badge>
                {institution.code && (
                  <span className="text-[10px] font-mono text-slate-400 hidden xs:inline-block">
                    #{institution.code}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ações do Topo: Olho de Saldo + Menu de 3 Pontos */}
          <div className="flex items-center gap-0.5 flex-shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
              onClick={() => setIndividualHidden(!individualHidden)}
              title={isValueHidden ? 'Mostrar saldo' : 'Ocultar saldo'}
            >
              {isValueHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white"
                  title="Mais opções da conta"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-52 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-lg"
              >
                <DropdownMenuItem
                  onClick={() => onEdit(account)}
                  className="cursor-pointer text-xs font-medium py-2 gap-2"
                >
                  <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                  Editar dados da conta
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onToggleExpand(account.id)}
                  className="cursor-pointer text-xs font-medium py-2 gap-2"
                >
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                  {isExpanded ? 'Ocultar movimentações' : 'Ver movimentações'}
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onTransfer(account)}
                  className="cursor-pointer text-xs font-medium py-2 gap-2"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-emerald-600" />
                  Transferir desta conta
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => onAdjustBalance(account)}
                  className="cursor-pointer text-xs font-medium py-2 gap-2"
                >
                  <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                  Ajustar saldo da conta
                </DropdownMenuItem>

                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

                {!isPrimary && (
                  <DropdownMenuItem
                    onClick={() => onSetPrimary(account)}
                    className="cursor-pointer text-xs font-medium py-2 gap-2 text-emerald-600 dark:text-emerald-400"
                  >
                    <Star className="w-3.5 h-3.5" />
                    Definir como Principal
                  </DropdownMenuItem>
                )}

                <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />

                <DropdownMenuItem
                  onClick={() => onDelete(account)}
                  className="cursor-pointer text-xs font-medium py-2 gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Bloco de Saldo */}
        <div className="py-3 px-3.5 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 my-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Saldo Atual
            </span>
            {account.projected_balance !== undefined &&
              account.projected_balance !== account.current_balance && (
                <span
                  className="text-[10px] text-slate-400"
                  title="Saldo incluindo lançamentos pendentes"
                >
                  Proj: {formatCurrency(account.projected_balance, isValueHidden)}
                </span>
              )}
          </div>

          <div
            className={`text-xl sm:text-2xl font-black tabular-nums tracking-tight mt-0.5 break-words ${
              isPositive
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            {formatCurrency(account.current_balance, isValueHidden)}
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
            <span>Saldo inicial: {formatCurrency(account.opening_balance, isValueHidden)}</span>
            <button
              type="button"
              onClick={() => onAdjustBalance(account)}
              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              Ajustar
            </button>
          </div>
        </div>

        {/* Rodapé do Card com Ações Rápidas */}
        <div className="flex items-center justify-between gap-2 mt-3 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onTransfer(account)}
            className="rounded-xl text-xs font-semibold gap-1.5 h-8.5 px-3 border-slate-200 dark:border-slate-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 hover:text-emerald-600 dark:hover:text-emerald-400 hover:border-emerald-200 transition-colors"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onToggleExpand(account.id)}
            className="rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 gap-1 h-8.5 px-2.5"
          >
            {isExpanded ? 'Ocultar' : 'Extrato'}
            <ChevronRight
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isExpanded ? 'rotate-90 text-emerald-600' : ''
              }`}
            />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
