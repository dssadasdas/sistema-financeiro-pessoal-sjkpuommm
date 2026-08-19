import React, { useState } from 'react'
import { Outlet, NavLink, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { useFinance } from '@/contexts/FinanceDataContext'
import { formatCurrency } from '@/lib/constants'
import {
  Home,
  ArrowLeftRight,
  FileText,
  Building2,
  CreditCard,
  Receipt,
  Repeat,
  Layers,
  PieChart,
  Target,
  TrendingUp,
  BarChart3,
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
  Compass,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import TransactionModal from '@/components/modals/TransactionModal'

export default function Layout() {
  const { user, logout, hideValues, toggleHideValues } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const { totalCurrentBalance, monthIncomeReceived, monthExpensePaid } = useFinance()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddType, setQuickAddType] = useState<'receita' | 'despesa' | 'ajuste'>('despesa')

  const location = useLocation()
  const navigate = useNavigate()

  const navItems = [
    { label: 'Início', path: '/inicio', icon: Home },
    { label: 'Lançamentos', path: '/lancamentos', icon: ArrowLeftRight },
    { label: 'Extrato', path: '/extrato', icon: FileText },
    { label: 'Contas', path: '/contas', icon: Building2 },
    { label: 'Cartões', path: '/cartoes', icon: CreditCard },
    { label: 'Contas e Boletos', path: '/contas-e-boletos', icon: Receipt },
    { label: 'Recorrentes', path: '/recorrentes', icon: Repeat },
    { label: 'Parcelamentos', path: '/parcelamentos', icon: Layers },
    { label: 'Orçamento', path: '/orcamento', icon: PieChart },
    { label: 'Metas', path: '/metas', icon: Target },
    { label: 'Previsão', path: '/previsao', icon: Compass },
    { label: 'Investimentos', path: '/investimentos', icon: TrendingUp },
    { label: 'Relatórios', path: '/relatorios', icon: BarChart3 },
    { label: 'IA Financeira', path: '/ia-financeira', icon: Sparkles, highlighted: true },
    { label: 'Configurações', path: '/configuracoes', icon: Settings },
  ]

  const getCurrentTitle = () => {
    const item = navItems.find((n) => location.pathname.startsWith(n.path))
    if (item) return item.label
    if (location.pathname.startsWith('/cartoes/')) return 'Detalhe do Cartão'
    return 'Raiz Financeiro'
  }

  const handleOpenQuickAdd = (type: 'receita' | 'despesa' | 'ajuste') => {
    setQuickAddType(type)
    setQuickAddOpen(true)
  }

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 flex flex-col font-sans">
      {/* Header Sticky */}
      <header className="sticky top-0 z-30 h-16 bg-white/95 dark:bg-[#121A2B]/95 backdrop-blur border-b border-slate-200 dark:border-slate-800 px-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Hamburger Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-slate-600 dark:text-slate-300"
            onClick={() => setMobileDrawerOpen(true)}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Logo mobile */}
          <Link to="/inicio" className="flex items-center gap-2 lg:hidden">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
              R
            </div>
            <span className="font-extrabold text-xl tracking-tight text-emerald-600">Raiz</span>
          </Link>

          {/* Page Title Desktop */}
          <h1 className="hidden lg:block text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            {getCurrentTitle()}
          </h1>
        </div>

        {/* Header Right Items */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Chip de Resumo Rápido */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 text-xs font-medium">
            <span className="text-slate-500">Saldo Geral:</span>
            <span className="font-bold text-emerald-600 tabular-nums">
              {formatCurrency(totalCurrentBalance, hideValues)}
            </span>
          </div>

          {/* Toggle Ocultar Valores */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleHideValues}
            className="text-slate-600 dark:text-slate-300 hover:text-emerald-600"
            title={hideValues ? 'Mostrar valores' : 'Ocultar valores'}
          >
            {hideValues ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>

          {/* Toggle Tema */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-slate-600 dark:text-slate-300 hover:text-amber-500"
            title="Alternar tema claro/escuro"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Avatar Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-9 w-9 rounded-full bg-emerald-100 dark:bg-emerald-950/60 p-0 text-emerald-700 dark:text-emerald-300 font-bold text-sm border border-emerald-500/30"
              >
                {user?.name ? user.name.slice(0, 2).toUpperCase() : 'RZ'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-xl">
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none">
                    {user?.name || 'Usuário Raiz'}
                  </p>
                  <p className="text-xs leading-none text-slate-500">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => navigate('/configuracoes')}
                className="cursor-pointer"
              >
                <Settings className="w-4 h-4 mr-2" /> Configurações
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigate('/ia-financeira')}
                className="cursor-pointer text-emerald-600"
              >
                <Sparkles className="w-4 h-4 mr-2" /> IA Financeira
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  logout()
                  navigate('/entrar')
                }}
                className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" /> Sair da conta
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex">
        {/* Sidebar Desktop */}
        <aside
          className={`hidden lg:flex flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] transition-all duration-200 z-20 ${
            sidebarCollapsed ? 'w-[72px]' : 'w-[240px]'
          }`}
        >
          {/* Sidebar Brand */}
          <div className="h-16 px-4 flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80">
            <Link to="/inicio" className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                R
              </div>
              {!sidebarCollapsed && (
                <span className="font-extrabold text-xl tracking-tight text-slate-900 dark:text-white">
                  Raiz
                </span>
              )}
            </Link>

            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              title={sidebarCollapsed ? 'Expandir barra' : 'Recolher barra'}
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

          {/* Nav List */}
          <div className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname.startsWith(item.path)
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors relative group ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                  } ${item.highlighted ? 'border border-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20' : ''}`}
                >
                  {isActive && (
                    <div className="absolute left-0 top-2 bottom-2 w-1 bg-emerald-600 rounded-r-full" />
                  )}
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      item.highlighted
                        ? 'text-emerald-600 dark:text-emerald-400 animate-pulse'
                        : isActive
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300'
                    }`}
                  />
                  {!sidebarCollapsed && <span>{item.label}</span>}
                </NavLink>
              )
            })}
          </div>

          {/* Sair Button Desktop Bottom */}
          <div className="p-3 border-t border-slate-100 dark:border-slate-800">
            <button
              onClick={() => {
                logout()
                navigate('/entrar')
              }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30 dark:hover:text-red-400 transition-colors"
            >
              <LogOut className="w-4 h-4 flex-shrink-0" />
              {!sidebarCollapsed && <span>Sair da conta</span>}
            </button>
          </div>
        </aside>

        {/* Content View */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 pb-24 lg:pb-8 max-w-7xl mx-auto w-full">
          <Outlet />
        </main>
      </div>

      {/* Mobile Drawer (Slide-in) */}
      <Sheet open={mobileDrawerOpen} onOpenChange={setMobileDrawerOpen}>
        <SheetContent side="left" className="w-72 p-0 bg-white dark:bg-[#121A2B]">
          <SheetHeader className="p-4 border-b border-slate-100 dark:border-slate-800 text-left">
            <SheetTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm">
                R
              </div>
              <span className="font-extrabold text-xl text-emerald-600">Raiz</span>
            </SheetTitle>
          </SheetHeader>

          <div className="overflow-y-auto py-3 px-2 space-y-1 max-h-[calc(100vh-140px)]">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname.startsWith(item.path)
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileDrawerOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>

          <div className="p-4 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              onClick={() => {
                logout()
                navigate('/entrar')
              }}
              className="w-full text-red-600 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/40"
            >
              <LogOut className="w-4 h-4 mr-2" /> Sair da conta
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Mobile Bottom Navigation Bar (Fixed 5 slots) */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-[#121A2B]/95 backdrop-blur border-t border-slate-200 dark:border-slate-800 px-2 py-1 flex items-center justify-around h-16 shadow-lg">
        {/* 1. Início */}
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

        {/* 2. Lançamentos */}
        <NavLink
          to="/lancamentos"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <ArrowLeftRight className="w-5 h-5 mb-0.5" />
          <span>Lançar</span>
        </NavLink>

        {/* 3. FAB Central (+) */}
        <div className="relative -top-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="w-13 h-13 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center shadow-lg shadow-emerald-600/40 focus:outline-none ring-4 ring-white dark:ring-[#0B1220]"
                aria-label="Adicionar movimentação rápida"
              >
                <Plus className="w-6 h-6 stroke-[2.5]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="center"
              side="top"
              className="w-48 rounded-2xl p-1.5 mb-2 shadow-2xl"
            >
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

        {/* 4. Relatórios */}
        <NavLink
          to="/relatorios"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <BarChart3 className="w-5 h-5 mb-0.5" />
          <span>Relatórios</span>
        </NavLink>

        {/* 5. Configurações */}
        <NavLink
          to="/configuracoes"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-14 h-full text-[10px] font-medium transition-colors ${
              isActive
                ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                : 'text-slate-500 dark:text-slate-400'
            }`
          }
        >
          <Settings className="w-5 h-5 mb-0.5" />
          <span>Ajustes</span>
        </NavLink>
      </nav>

      {/* Quick Add Modal */}
      <TransactionModal
        open={quickAddOpen}
        onOpenChange={setQuickAddOpen}
        initialType={quickAddType}
      />
    </div>
  )
}
