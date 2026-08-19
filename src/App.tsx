import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/toaster'
import { Toaster as Sonner } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider, useAuth } from '@/contexts/AuthContext'
import { ThemeProvider } from '@/contexts/ThemeContext'
import { FinanceDataProvider } from '@/contexts/FinanceDataContext'
import Layout from '@/components/Layout'
import PageTitle from '@/components/PageTitle'
import { Wallet, Loader2 } from 'lucide-react'

// Páginas Públicas
import LandingPage from '@/pages/LandingPage'
import LoginPage from '@/pages/LoginPage'
import SignupPage from '@/pages/SignupPage'
import PaywallPage from '@/pages/PaywallPage'
import ThankYouPage from '@/pages/ThankYouPage'
import NotFound from '@/pages/NotFound'

// Páginas Autenticadas
import DashboardPage from '@/pages/DashboardPage'
import TransactionsPage from '@/pages/TransactionsPage'
import StatementPage from '@/pages/StatementPage'
import AccountsPage from '@/pages/AccountsPage'
import CardsPage from '@/pages/CardsPage'
import CardDetailPage from '@/pages/CardDetailPage'
import BillsPage from '@/pages/BillsPage'
import RecurrencesPage from '@/pages/RecurrencesPage'
import InstallmentsPage from '@/pages/InstallmentsPage'
import BudgetPage from '@/pages/BudgetPage'
import GoalsPage from '@/pages/GoalsPage'
import ForecastPage from '@/pages/ForecastPage'
import InvestmentsPage from '@/pages/InvestmentsPage'
import ReportsPage from '@/pages/ReportsPage'
import AiAdvisorPage from '@/pages/AiAdvisorPage'
import SettingsPage from '@/pages/SettingsPage'

// Full-screen loading spinner with logo
function FullScreenLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F6F7F9] dark:bg-[#0b1120]">
      <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white shadow-lg mb-4">
        <Wallet className="w-6 h-6" />
      </div>
      <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
    </div>
  )
}

// Protected Route Guard
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading, subscription } = useAuth()

  if (isLoading) {
    return <FullScreenLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  // Se assinatura estiver explicitamente bloqueada e não estiver na rota de paywall
  if (subscription && subscription.status === 'bloqueada' && !subscription.admin_released) {
    return <Navigate to="/paywall" replace />
  }

  return <>{children}</>
}

// Public Route Guard (redirects to /inicio if logged in)
function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth()

  if (isLoading) {
    return null
  }

  if (user) {
    return <Navigate to="/inicio" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <FinanceDataProvider>
            <TooltipProvider>
              <Toaster />
              <Sonner />
              <PageTitle />
              <Routes>
                {/* Landing Page Comercial Aberta */}
                <Route
                  path="/"
                  element={
                    <PublicRoute>
                      <LandingPage />
                    </PublicRoute>
                  }
                />

                {/* Autenticação */}
                <Route
                  path="/login"
                  element={
                    <PublicRoute>
                      <LoginPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/cadastro"
                  element={
                    <PublicRoute>
                      <SignupPage />
                    </PublicRoute>
                  }
                />
                <Route
                  path="/registro"
                  element={
                    <PublicRoute>
                      <SignupPage />
                    </PublicRoute>
                  }
                />

                {/* Paywall */}
                <Route path="/paywall" element={<PaywallPage />} />

                {/* Obrigado (retorno pós-checkout) */}
                <Route path="/obrigado" element={<ThankYouPage />} />

                {/* App Shell Autenticado */}
                <Route
                  element={
                    <ProtectedRoute>
                      <Layout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/inicio" element={<DashboardPage />} />
                  <Route path="/dashboard" element={<Navigate to="/inicio" replace />} />
                  <Route path="/transacoes" element={<TransactionsPage />} />
                  <Route path="/lancamentos" element={<Navigate to="/transacoes" replace />} />
                  <Route path="/extrato" element={<StatementPage />} />
                  <Route path="/contas" element={<AccountsPage />} />
                  <Route path="/cartoes" element={<CardsPage />} />
                  <Route path="/cartoes/:id" element={<CardDetailPage />} />
                  <Route path="/faturas" element={<CardsPage />} />
                  <Route path="/contas-a-pagar" element={<BillsPage />} />
                  <Route
                    path="/contas-e-boletos"
                    element={<Navigate to="/contas-a-pagar" replace />}
                  />
                  <Route path="/recorrencias" element={<RecurrencesPage />} />
                  <Route path="/recorrentes" element={<Navigate to="/recorrencias" replace />} />
                  <Route path="/parcelamentos" element={<InstallmentsPage />} />
                  <Route path="/orcamento" element={<BudgetPage />} />
                  <Route path="/orcamentos" element={<Navigate to="/orcamento" replace />} />
                  <Route path="/metas" element={<GoalsPage />} />
                  <Route path="/previsao" element={<ForecastPage />} />
                  <Route path="/investimentos" element={<InvestmentsPage />} />
                  <Route path="/relatorios" element={<ReportsPage />} />
                  <Route path="/ia-financeira" element={<AiAdvisorPage />} />
                  <Route path="/assistente" element={<Navigate to="/ia-financeira" replace />} />
                  <Route path="/configuracoes" element={<SettingsPage />} />
                </Route>

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </TooltipProvider>
          </FinanceDataProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
