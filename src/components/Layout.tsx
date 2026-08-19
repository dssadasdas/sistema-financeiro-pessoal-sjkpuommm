import React, { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useFinance } from '@/contexts/FinanceDataContext'
import { formatCurrency } from '@/lib/constants'
import {
  LayoutDashboard,
  ArrowLeftRight,
  CreditCard,
  Receipt,
  Repeat,
  PieChart,
  Target,
  TrendingUp,
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
  Wallet,
  Home,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import TransactionModal from '@/components/modals/TransactionModal'

type NavItem = {
  label: string
  path: string
  icon: React.ComponentType<{ className?: string; fill?: string }>
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/inicio', icon: LayoutDashboard },
  { label: 'Transações', path: '/transacoes', icon: ArrowLeftRight },
  { label: 'Extrato', path: '/extrato', icon: Receipt },
  { label: 'Cartões de Crédito', path: '/cartoes', icon: CreditCard },
  { label: 'Contas a Pagar', path: '/contas-e-boletos', icon: Receipt },
  { label: 'Recorrências', path: '/recorrentes', icon: Repeat },
  { label: 'Orçamentos', path: '/orcamento', icon: PieChart },
  { label: 'Metas', path: '/metas', icon: Target },
  { label: 'Investimentos', path: '/investimentos', icon: TrendingUp },
  { label: 'Assistente IA', path: '/ia-financeira', icon: Sparkles },
]

function SidebarNav({ onNavigate, pathname }: { onNavigate?: () => void; pathname: string }) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        const isActive =
          pathname === item.path ||
          (item.path !== '/inicio' && pathname.startsWith(item.path + '/'))
        return (
          <NavLink
            key={item.path}
            to={item.path}
            onClick={onNavigate}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
              isActive
                ? 'bg-emerald-50 text-emerald-700 font-semibold'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Icon
              className={`w-[18px] h-[18px] flex-shrink-0 ${
                isActive ? 'text-emerald-600' : 'text-slate-400'
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

function SidebarFooter({ onNavigate, logout }: { onNavigate?: () => void; logout: () => void }) {
  const { theme, toggleTheme } = useTheme()
  const { hideValues, toggleHideValues } = useAuth()
  return (
    <div className="px-3 py-3 border-t border-slate-100 space-y-1">
      <div className="flex items-center gap-1 px-1 pb-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleHideValues}
          className="h-9 w-9 text-slate-500 hover:text-emerald-600"
          title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
        >
          {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 text-slate-500 hover:text-amber-500"
          title="Alternar tema"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </Button>
      </div>
      <NavLink
        to="/configuracoes"
        onClick={onNavigate}
        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
      >
        <Settings className="w-[18px] h-[18px] text-slate-400" />
        <span>Configurações</span>
      </NavLink>
      <button
        onClick={logout}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-colors"
      >
        <LogOut className="w-[18px] h-[18px] flex-shrink-0" />
        <span>Sair</span>
      </button>
    </div>
  )
}

export default function Layout() {
  const { user, logout, hideValues } = useAuth()
  const { totalCurrentBalance } = useFinance()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddType, setQuickAddType] = useState<'receita' | 'despesa' | 'ajuste'>('despesa')

  const location = useLocation()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleOpenQuickAdd = (type: 'receita' | 'despesa' | 'ajuste') => {
    setQuickAddType(type)
    setQuickAddOpen(true)
  }

  const currentTitle = () => {
    const item = navItems.find(
      (n) => location.pathname === n.path || location.pathname.startsWith(n.path + '/'),
    )
    if (item) return item.label
    if (location.pathname.startsWith('/cartoes/')) return 'Detalhe do Cartão'
    return 'Finanças'
  }

  return (
    <div className="min-h-screen bg-[#F6F7F9] text-slate-900 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex flex-col w-[264px] flex-shrink-0 h-screen sticky top-0 bg-white border-r border-slate-200">
        {/* Logo */}
        <div className="h-16 px-5 flex items-center gap-2.5 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-slate-900">Finanças</span>
        </div>

        {/* Greeting */}
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
            {user?.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
          </div>
          <div className="min-w-0">
            <p className="text-xs text-slate-400">Olá,</p>
            <p className="text-sm font-semibold text-slate-800 truncate">
              {user?.name || 'Usuário'}
            </p>
          </div>
        </div>

        <SidebarNav pathname={location.pathname} />
        <SidebarFooter logout={handleLogout} />
      </aside>

      {/* Main column */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile sticky header */}
        <header className="lg:hidden sticky top-0 z-30 h-16 bg-white border-b border-slate-200 px-4 flex items-center justify-between">
          <Link to="/inicio" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Wallet className="w-4.5 h-4.5" />
            </div>
            <span className="font-extrabold text-lg tracking-tight text-slate-900">Finanças</span>
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="text-slate-600"
            onClick={() => setDrawerOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="w-5 h-5" />
          </Button>
        </header>

        {/* Desktop slim topbar */}
        <header className="hidden lg:flex sticky top-0 z-20 h-16 bg-white/90 backdrop-blur border-b border-slate-200 px-8 items-center justify-between">
          <h1 className="text-lg font-bold tracking-tight text-slate-900">{currentTitle()}</h1>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium">
            <span className="text-slate-500">Saldo geral:</span>
            <span className="font-bold text-emerald-600 tabular-nums">
              {formatCurrency(totalCurrentBalance, hideValues)}
            </span>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 w-full max-w-[1280px] mx-auto p-4 lg:p-6 pb-28 lg:pb-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile drawer with scrim + 280ms ease-out */}
      {drawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/40 animate-fade-in"
            onClick={() => setDrawerOpen(false)}
          />
          <div
            className="absolute left-0 top-0 h-full w-[280px] max-w-[85vw] bg-white shadow-2xl flex flex-col"
            style={{
              animation: 'drawer-in 280ms ease-out',
            }}
          >
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white">
                  <Wallet className="w-5 h-5" />
                </div>
                <span className="font-extrabold text-lg tracking-tight text-slate-900">
                  Finanças
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-slate-500"
                onClick={() => setDrawerOpen(false)}
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </Button>
            </div>

            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-sm border border-emerald-500/30">
                {user?.name ? user.name.slice(0, 1).toUpperCase() : 'U'}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400">Olá,</p>
                <p className="text-sm font-semibold text-slate-800 truncate">
                  {user?.name || 'Usuário'}
                </p>
              </div>
            </div>

            <SidebarNav pathname={location.pathname} onNavigate={() => setDrawerOpen(false)} />
            <SidebarFooter onNavigate={() => setDrawerOpen(false)} logout={handleLogout} />
          </div>
          <style>{`@keyframes drawer-in { from { transform: translateX(-100%); } to { transform: translateX(0); } }`}</style>
        </div>
      )}

      {/* Mobile bottom navigation */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 px-2 h-16 flex items-center justify-around shadow-[0_-2px_10px_rgba(0,0,0,0.04)]">
        <NavLink
          to="/inicio"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 h-full text-[10px] font-medium transition-colors ${
              isActive ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`
          }
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Início</span>
        </NavLink>

        <NavLink
          to="/transacoes"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 h-full text-[10px] font-medium transition-colors ${
              isActive ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`
          }
        >
          <ArrowLeftRight className="w-5 h-5 mb-0.5" />
          <span>Transações</span>
        </NavLink>

        {/* Central + button */}
        <div className="relative -top-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 ring-4 ring-white"
                aria-label="Adicionar"
              >
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" side="top" className="w-48 rounded-2xl p-1.5 mb-2">
              <DropdownMenuItem
                onClick={() => handleOpenQuickAdd('receita')}
                className="cursor-pointer text-emerald-600 font-medium py-2 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" /> Nova Receita
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleOpenQuickAdd('despesa')}
                className="cursor-pointer text-orange-600 font-medium py-2 rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" /> Nova Despesa
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleOpenQuickAdd('ajuste')}
                className="cursor-pointer text-blue-600 font-medium py-2 rounded-xl"
              >
                <Repeat className="w-4 h-4 mr-2" /> Ajuste de Saldo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <NavLink
          to="/cartoes"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 h-full text-[10px] font-medium transition-colors ${
              isActive ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`
          }
        >
          <CreditCard className="w-5 h-5 mb-0.5" />
          <span>Cartões</span>
        </NavLink>

        <NavLink
          to="/investimentos"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-16 h-full text-[10px] font-medium transition-colors ${
              isActive ? 'text-emerald-600 font-bold' : 'text-slate-500'
            }`
          }
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span>Investimentos</span>
        </NavLink>
      </nav>

      {/* Quick add modal */}
      <TransactionModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        initialType={quickAddType}
      />
    </div>
  )
}
