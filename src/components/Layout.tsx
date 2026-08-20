import React, { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useFinance } from '@/contexts/FinanceDataContext'
import { formatCurrency } from '@/lib/constants'
import pb from '@/lib/pocketbase/client'
import {
  LayoutDashboard,
  ArrowLeftRight,
  Landmark,
  CreditCard,
  Tag,
  Target,
  Sparkles,
  Settings,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Eye,
  EyeOff,
  Plus,
  Home,
  Repeat,
  User,
} from 'lucide-react'
import { SemeiaLogo } from '@/components/SemeiaLogo'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import TransactionModal from '@/components/modals/TransactionModal'
import FastTransactionDrawer from '@/components/modals/FastTransactionDrawer'
import CentralDeAlertas from '@/components/CentralDeAlertas'
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer'
import { ArrowDownCircle, ArrowUpCircle, ArrowLeftRight as TransferIcon } from 'lucide-react'

type NavItem = {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string; fill?: string }>
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/inicio', icon: LayoutDashboard },
  { label: 'Transações', path: '/transacoes', icon: ArrowLeftRight },
  { label: 'Contas', path: '/contas', icon: Landmark },
  { label: 'Cartões', path: '/cartoes', icon: CreditCard },
  { label: 'Categorias', path: '/categorias', icon: Tag },
  { label: 'Metas', path: '/metas', icon: Target },
  { label: 'Assistente IA', path: '/ia-financeira', icon: Sparkles },
]

function isActivePath(pathname: string, path: string) {
  return pathname === path || (path !== '/inicio' && pathname.startsWith(path + '/'))
}

function SidebarNav({ onNavigate, pathname }: { onNavigate?: () => void; pathname: string }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive = isActivePath(pathname, item.path)
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Icon
              className={`w-[18px] h-[18px] flex-shrink-0 ${
                isActive
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-slate-400 dark:text-slate-500'
              }`}
              fill={isActive ? 'currentColor' : 'none'}
            />
            <span>{item.label}</span>
          </NavLink>
        )
      })}
    </nav>
  )
}

function UserAvatar({
  user,
  size = 'w-10 h-10',
  textSize = 'text-sm',
}: {
  user: {
    id?: string
    name?: string
    display_name?: string
    avatar?: string
    email?: string
  } | null
  size?: string
  textSize?: string
}) {
  const avatarUrl =
    user?.avatar && user?.id ? pb.files.getURL(user, user.avatar, { thumb: '100x100' }) : null

  const displayName = user?.display_name || user?.name || user?.email || 'U'
  const initials = displayName.trim().slice(0, 2).toUpperCase()

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className={`${size} rounded-full object-cover border border-emerald-500/30 flex-shrink-0`}
      />
    )
  }

  return (
    <div
      className={`${size} rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold ${textSize} border border-emerald-500/30 flex-shrink-0 select-none`}
    >
      {initials}
    </div>
  )
}

function SidebarFooter({ onNavigate, logout }: { onNavigate?: () => void; logout: () => void }) {
  const { resolvedTheme, toggleTheme } = useTheme()
  const { hideValues, toggleHideValues } = useAuth()
  return (
    <div className="px-3 py-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
      {/* Meu Perfil */}
      <NavLink
        to="/perfil"
        onClick={onNavigate}
        className={({ isActive }) =>
          `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
            isActive
              ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
          }`
        }
      >
        <User className="w-[18px] h-[18px] text-slate-400 dark:text-slate-500 flex-shrink-0" />
        <span>Meu Perfil</span>
      </NavLink>

      {/* Configurações + toggle de tema lado a lado */}
      <div className="flex items-center gap-1">
        <NavLink
          to="/configuracoes"
          onClick={onNavigate}
          className={({ isActive }) =>
            `flex-1 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
            }`
          }
        >
          <Settings className="w-[18px] h-[18px] text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <span>Configurações</span>
        </NavLink>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 text-slate-500 dark:text-slate-400 hover:text-amber-500 dark:hover:text-amber-400 shrink-0"
          title={resolvedTheme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          aria-label={resolvedTheme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
        >
          {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>

      <div className="flex items-center justify-between pt-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleHideValues}
          className="h-8 px-2 text-xs text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 gap-1.5"
          title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
        >
          {hideValues ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          <span>{hideValues ? 'Mostrar' : 'Ocultar'}</span>
        </Button>

        <button
          onClick={logout}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-950/40 hover:text-red-600 dark:hover:text-red-400 transition-colors"
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Sair</span>
        </button>
      </div>
    </div>
  )
}

export default function Layout() {
  const { user, logout, hideValues, toggleHideValues } = useAuth()
  const { totalCurrentBalance } = useFinance()
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Quick Actions Bottom Sheet (+)
  const [actionsDrawerOpen, setActionsDrawerOpen] = useState(false)

  // Fast Transaction Launch Drawer
  const [fastDrawerOpen, setFastDrawerOpen] = useState(false)
  const [fastDrawerType, setFastDrawerType] = useState<
    'receita' | 'despesa' | 'transferencia' | 'ajuste'
  >('despesa')

  // Legacy fallback TransactionModal (caso necessário)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddType, setQuickAddType] = useState<'receita' | 'despesa' | 'ajuste'>('despesa')

  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleOpenFastAction = (type: 'receita' | 'despesa' | 'transferencia') => {
    setActionsDrawerOpen(false)
    setFastDrawerType(type)
    setFastDrawerOpen(true)
  }

  const currentTitle = () => {
    const item = navItems.find((n) => isActivePath(location.pathname, n.path))
    if (item) return item.label
    if (location.pathname.startsWith('/perfil')) return 'Meu Perfil'
    if (location.pathname.startsWith('/cartoes/')) return 'Detalhe do Cartão'
    if (location.pathname.startsWith('/configuracoes')) return 'Configurações'
    if (location.pathname.startsWith('/categorias')) return 'Categorias'
    if (location.pathname.startsWith('/metas')) return 'Metas Financeiras'
    return 'Semeia'
  }

  const greetingName = user?.display_name || user?.name || 'Usuário'

  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 flex">
      {/* Sidebar Desktop (apenas 1024px+) */}
      <aside className="hidden lg:flex flex-col w-[264px] flex-shrink-0 h-screen sticky top-0 bg-white dark:bg-[#0f1626] border-r border-slate-200 dark:border-slate-800">
        {/* Logo */}
        <div className="h-16 px-5 flex items-center border-b border-slate-100 dark:border-slate-800">
          <Link to="/inicio" className="flex items-center">
            <SemeiaLogo size="md" />
          </Link>
        </div>

        {/* Greeting / Profile Link */}
        <Link
          to="/perfil"
          className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
        >
          <UserAvatar user={user} size="w-10 h-10" textSize="text-xs" />
          <div className="min-w-0 flex-1">
            <p className="text-xs text-slate-400 dark:text-slate-500">Olá,</p>
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
              {greetingName}
            </p>
          </div>
        </Link>

        <SidebarNav pathname={location.pathname} />
        <SidebarFooter logout={handleLogout} />
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Topbar mobile + tablet (abaixo de 1024px): Saudação + Alertas + Menu */}
        <header className="lg:hidden sticky top-0 z-30 bg-white dark:bg-[#0f1626] border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <Link to="/perfil" className="flex items-center gap-2.5 min-w-0">
              <UserAvatar user={user} size="w-9 h-9" textSize="text-xs" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-400 dark:text-slate-400 leading-none">
                  Olá,
                </p>
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight mt-0.5">
                  {greetingName}
                </p>
              </div>
            </Link>

            <div className="flex items-center gap-1">
              <CentralDeAlertas />
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-600 dark:text-slate-300 touch-target flex-shrink-0 h-9 w-9"
                onClick={() => setDrawerOpen(true)}
                aria-label="Abrir menu"
              >
                <Menu className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </header>

        {/* Desktop slim topbar (apenas 1024px+) */}
        <header className="hidden lg:flex sticky top-0 z-20 h-16 bg-white/90 dark:bg-[#0f1626]/90 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-8 items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            {currentTitle()}
          </h1>
          <div className="flex items-center gap-3">
            <CentralDeAlertas />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-xs font-medium">
              <span className="text-slate-500 dark:text-slate-400">Saldo geral:</span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {formatCurrency(totalCurrentBalance, hideValues)}
              </span>
            </div>
          </div>
        </header>

        {/* Content - padding 16px mobile, 20px tablet (768-1023), 24px desktop */}
        <main
          className="flex-1 w-full max-w-[1280px] mx-auto p-3 sm:p-4 md:p-5 lg:p-6 lg:pb-8 min-w-0"
          style={{
            paddingBottom: 'calc(5.5rem + env(safe-area-inset-bottom, 0px))',
          }}
        >
          <Outlet />
        </main>
      </div>

      {/* Drawer mobile + tablet (abaixo de 1024px) com scrim + 280ms ease-out */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 dark:bg-black/60 animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-white dark:bg-[#0f1626] shadow-2xl flex flex-col"
            style={{
              animation: 'drawer-in 280ms ease-out',
            }}
          >
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center">
                <SemeiaLogo size="md" />
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-500 dark:text-slate-400"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <Link
              to="/perfil"
              onClick={() => setDrawerOpen(false)}
              className="px-5 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
            >
              <UserAvatar user={user} size="w-10 h-10" textSize="text-xs" />
              <div className="min-w-0 flex-1">
                <p className="text-xs text-slate-400 dark:text-slate-500">Olá,</p>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  {greetingName}
                </p>
              </div>
            </Link>

            <SidebarNav pathname={location.pathname} onNavigate={() => setDrawerOpen(false)} />
            <SidebarFooter onNavigate={() => setDrawerOpen(false)} logout={handleLogout} />
          </div>
          <style>{`@keyframes drawer-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
        </div>
      )}

      {/* Bottom navigation mobile + tablet (abaixo de 1024px): 5 itens (Início, Transações, +, Cartões, IA) */}
      <nav
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#0f1626] border-t border-slate-200 dark:border-slate-800 px-2 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.04)] dark:shadow-none pointer-events-auto"
        style={{
          height: 'calc(4rem + env(safe-area-inset-bottom, 0px))',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom, 0px))',
        }}
      >
        <NavLink
          to="/inicio"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Início</span>
        </NavLink>

        <NavLink
          to="/transacoes"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <ArrowLeftRight className="w-5 h-5 mb-0.5" />
          <span>Transações</span>
        </NavLink>

        {/* Central + button (Abre Quick Actions Drawer) */}
        <div className="relative -top-4">
          <button
            onClick={() => setActionsDrawerOpen(true)}
            className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 transition-all text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 ring-4 ring-white dark:ring-[#0f1626]"
            aria-label="Abrir Ações Rápidas"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        <NavLink
          to="/cartoes"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <CreditCard className="w-5 h-5 mb-0.5" />
          <span>Cartões</span>
        </NavLink>

        <NavLink
          to="/ia-financeira"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <Sparkles className="w-5 h-5 mb-0.5" />
          <span>IA</span>
        </NavLink>
      </nav>

      {/* Drawer de Ações Rápidas (Bottom Sheet com 3 botões grandes inspirados na referência) */}
      <Drawer open={actionsDrawerOpen} onOpenChange={setActionsDrawerOpen}>
        <DrawerContent className="max-w-md mx-auto rounded-t-3xl border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] text-slate-900 dark:text-white p-0 shadow-2xl overflow-hidden">
          <div className="pt-3 pb-2 px-6">
            <DrawerHeader className="p-0 text-center">
              <DrawerTitle className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Lançamento Rápido
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                Selecione o tipo de movimentação financeira rápida
              </DrawerDescription>
            </DrawerHeader>
          </div>

          <div className="p-4 sm:p-6 pt-2 pb-8">
            <div className="grid grid-cols-3 gap-2 sm:gap-4">
              {/* Tile 1: Adicionar Despesa */}
              <button
                type="button"
                onClick={() => handleOpenFastAction('despesa')}
                className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60 active:scale-95 transition-all group min-w-0"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-rose-500/60 bg-rose-500/10 flex items-center justify-center text-rose-500 group-hover:scale-110 group-hover:bg-rose-500 group-hover:text-white transition-all mb-2 sm:mb-3 shrink-0">
                  <ArrowDownCircle className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-normal text-slate-500 dark:text-slate-300 leading-tight text-center truncate max-w-full">
                  adicionar
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white leading-tight text-center mt-0.5 truncate max-w-full">
                  despesa
                </span>
              </button>

              {/* Tile 2: Criar Transferência */}
              <button
                type="button"
                onClick={() => handleOpenFastAction('transferencia')}
                className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60 active:scale-95 transition-all group min-w-0"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-blue-500/60 bg-blue-500/10 flex items-center justify-center text-blue-500 group-hover:scale-110 group-hover:bg-blue-500 group-hover:text-white transition-all mb-2 sm:mb-3 shrink-0">
                  <TransferIcon className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-normal text-slate-500 dark:text-slate-300 leading-tight text-center truncate max-w-full">
                  criar uma
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white leading-tight text-center mt-0.5 truncate max-w-full">
                  transferência
                </span>
              </button>

              {/* Tile 3: Adicionar Receita */}
              <button
                type="button"
                onClick={() => handleOpenFastAction('receita')}
                className="flex flex-col items-center justify-center p-2.5 sm:p-4 rounded-2xl bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/80 dark:hover:bg-slate-700/80 border border-slate-200/80 dark:border-slate-700/60 active:scale-95 transition-all group min-w-0"
              >
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-emerald-500/60 bg-emerald-500/10 flex items-center justify-center text-emerald-500 group-hover:scale-110 group-hover:bg-emerald-500 group-hover:text-white transition-all mb-2 sm:mb-3 shrink-0">
                  <ArrowUpCircle className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.2]" />
                </div>
                <span className="text-[10px] sm:text-[11px] font-normal text-slate-500 dark:text-slate-300 leading-tight text-center truncate max-w-full">
                  adicionar
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-slate-900 dark:text-white leading-tight text-center mt-0.5 truncate max-w-full">
                  receita
                </span>
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      {/* Fast Transaction Flow Drawer */}
      <FastTransactionDrawer
        open={fastDrawerOpen}
        onOpenChange={setFastDrawerOpen}
        initialType={fastDrawerType}
      />

      {/* Fallback modal */}
      <TransactionModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        initialType={quickAddType}
      />
    </div>
  )
}
