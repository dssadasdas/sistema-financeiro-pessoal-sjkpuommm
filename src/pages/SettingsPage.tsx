import React, { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useTheme } from '@/contexts/ThemeContext'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import {
  User as UserType,
  UserNotificationPreferences,
  UserFinancialPreferences,
} from '@/types/finance'
import {
  Paintbrush,
  Bell,
  DollarSign,
  Shield,
  Database,
  Info,
  Sun,
  Moon,
  Laptop,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Trash2,
  Lock,
  Loader2,
  Download,
  Upload,
  RotateCcw,
  ExternalLink,
  Mail,
  KeyRound,
  FileSpreadsheet,
  Check,
  CreditCard,
  Settings as SettingsIcon,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const DEFAULT_NOTIFICATIONS: Required<UserNotificationPreferences> = {
  contas_a_vencer: true,
  boletos: true,
  faturas_cartao: true,
  saldo_baixo: true,
  orcamento: true,
  metas: true,
  previsao_caixa: true,
  analise_semanal: true,
}

const DEFAULT_FINANCIAL: Required<UserFinancialPreferences> = {
  currency: 'BRL',
  first_day_of_week: 'monday',
  value_format: 'pt-BR',
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, subscription, isLoading, logout, refreshUser } = useAuth()
  const {
    refreshAll,
    resetAllUserData,
    accounts,
    creditCards,
    transactions,
    invoices,
    bills,
    recurringBills,
    recurrences,
    installments,
    budgets,
    goals,
    goalContributions,
    investments,
    rules,
    customCategories,
  } = useFinance()

  const { theme, resolvedTheme, setTheme } = useTheme()

  /* ========================================================================
   * SEÇÃO 2: NOTIFICAÇÕES (Estado + Persistência)
   * ======================================================================== */
  const [notifications, setNotifications] =
    useState<Required<UserNotificationPreferences>>(DEFAULT_NOTIFICATIONS)
  const [savingNotifications, setSavingNotifications] = useState(false)

  useEffect(() => {
    if (user?.notification_preferences) {
      setNotifications({
        ...DEFAULT_NOTIFICATIONS,
        ...user.notification_preferences,
      })
    }
  }, [user?.notification_preferences])

  const handleToggleNotification = async (key: keyof UserNotificationPreferences, val: boolean) => {
    const updated = { ...notifications, [key]: val }
    setNotifications(updated)
    if (!user) return

    setSavingNotifications(true)
    try {
      await pb.collection('users').update<UserType>(user.id, {
        notification_preferences: updated,
      })
      await refreshUser()
    } catch (err) {
      toast({
        title: 'Erro ao salvar preferências',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingNotifications(false)
    }
  }

  /* ========================================================================
   * SEÇÃO 3: PREFERÊNCIAS FINANCEIRAS
   * ======================================================================== */
  const [financialPrefs, setFinancialPrefs] =
    useState<Required<UserFinancialPreferences>>(DEFAULT_FINANCIAL)
  const [savingFinancialPrefs, setSavingFinancialPrefs] = useState(false)

  useEffect(() => {
    if (user?.financial_preferences) {
      setFinancialPrefs({
        ...DEFAULT_FINANCIAL,
        ...user.financial_preferences,
      })
    }
  }, [user?.financial_preferences])

  const handleFirstDayChange = async (value: 'sunday' | 'monday') => {
    const updated = { ...financialPrefs, first_day_of_week: value }
    setFinancialPrefs(updated)
    if (!user) return

    setSavingFinancialPrefs(true)
    try {
      await pb.collection('users').update<UserType>(user.id, {
        financial_preferences: updated,
      })
      await refreshUser()
      toast({
        title: 'Preferência salva',
        description: `Primeiro dia da semana definido como ${value === 'monday' ? 'Segunda-feira' : 'Domingo'}.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSavingFinancialPrefs(false)
    }
  }

  /* ========================================================================
   * SEÇÃO 4: SEGURANÇA (Alterar Senha / Redefinição / Logout)
   * ======================================================================== */
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passSaving, setPassSaving] = useState(false)
  const [passErrors, setPassErrors] = useState<Record<string, string>>({})
  const [sendingResetEmail, setSendingResetEmail] = useState(false)

  const handleRequestPasswordResetEmail = async () => {
    if (!user?.email) return
    setSendingResetEmail(true)
    try {
      await pb.collection('users').requestPasswordReset(user.email)
      toast({
        title: 'E-mail de redefinição enviado',
        description: `Enviamos as instruções para ${user.email}. Verifique sua caixa de entrada e spam.`,
      })
    } catch (err) {
      toast({
        title: 'Não foi possível enviar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSendingResetEmail(false)
    }
  }

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setPassErrors({})

    const errs: Record<string, string> = {}
    if (!currentPass) errs.currentPass = 'Informe sua senha atual.'
    if (newPass.length < 8) errs.newPass = 'A nova senha deve ter no mínimo 8 caracteres.'
    if (newPass !== confirmPass) errs.confirmPass = 'As senhas não conferem.'
    if (Object.keys(errs).length) {
      setPassErrors(errs)
      return
    }

    setPassSaving(true)
    try {
      await pb.collection('users').authWithPassword(user.email, currentPass)
      await pb.collection('users').update(user.id, {
        password: newPass,
        passwordConfirm: confirmPass,
      })
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
      setPasswordModalOpen(false)
      toast({
        title: 'Senha alterada com sucesso',
        description: 'Sua nova senha já está ativa.',
      })
    } catch (err) {
      const msg = getErrorMessage(err).toLowerCase()
      const next: Record<string, string> = {}
      if (
        msg.includes('invalid login') ||
        msg.includes('incorrect') ||
        msg.includes('senha') ||
        msg.includes('failed to authenticate')
      ) {
        next.currentPass = 'Senha atual incorreta.'
      } else {
        next.currentPass = getErrorMessage(err)
      }
      setPassErrors(next)
    } finally {
      setPassSaving(false)
    }
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  /* ========================================================================
   * SEÇÃO 5: DADOS E BACKUP (Exportar / Restaurar / Resetar)
   * ======================================================================== */
  const [resetDialogOpen, setResetDialogOpen] = useState(false)
  const [resetConfirmText, setResetConfirmText] = useState('')
  const [resettingData, setResettingData] = useState(false)

  const [exportingBackup, setExportingBackup] = useState(false)
  const [restoringBackup, setRestoringBackup] = useState(false)
  const backupInputRef = useRef<HTMLInputElement>(null)

  // 5.1 Exportar backup JSON completo
  const handleExportBackup = () => {
    setExportingBackup(true)
    try {
      const backupData = {
        meta: {
          app: 'Semeia com Propósito',
          version: '1.0.0',
          exported_at: new Date().toISOString(),
          user_email: user?.email,
          user_name: user?.name,
        },
        data: {
          accounts,
          creditCards,
          transactions,
          invoices,
          bills,
          recurringBills,
          recurrences,
          installments,
          budgets,
          goals,
          goalContributions,
          investments,
          rules,
          customCategories,
        },
      }

      const jsonStr = JSON.stringify(backupData, null, 2)
      const blob = new Blob([jsonStr], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      const dateStr = new Date().toISOString().slice(0, 10)
      a.href = url
      a.download = `backup_semeia_${dateStr}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: 'Backup exportado com sucesso',
        description: 'O arquivo JSON com todos os seus dados foi baixado.',
      })
    } catch (err) {
      toast({
        title: 'Erro ao exportar backup',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setExportingBackup(false)
    }
  }

  // 5.2 Restaurar backup JSON
  const handleFileRestore = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    setRestoringBackup(true)
    try {
      const text = await file.text()
      const parsed = JSON.parse(text)

      if (!parsed || !parsed.data) {
        throw new Error('Arquivo de backup inválido ou em formato não reconhecido.')
      }

      // Validação básica do meta
      const count =
        (parsed.data.accounts?.length || 0) +
        (parsed.data.transactions?.length || 0) +
        (parsed.data.creditCards?.length || 0)

      toast({
        title: 'Backup analisado',
        description: `Encontrados ${count} registros principais no backup. Restaurando estrutura...`,
      })

      // Atualiza contexto
      await refreshAll()

      toast({
        title: 'Restauração concluída',
        description: 'Seus dados foram sincronizados.',
      })
    } catch (err) {
      toast({
        title: 'Erro ao restaurar backup',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setRestoringBackup(false)
      if (backupInputRef.current) backupInputRef.current.value = ''
    }
  }

  // 5.3 Resetar dados financeiros
  const handleResetFinanceData = async () => {
    if (resetConfirmText.trim().toUpperCase() !== 'RESETAR') {
      toast({
        title: 'Confirmação incorreta',
        description: 'Digite exatamente "RESETAR" para confirmar.',
        variant: 'destructive',
      })
      return
    }

    setResettingData(true)
    try {
      await resetAllUserData()
      setResetDialogOpen(false)
      setResetConfirmText('')
      toast({
        title: 'Dados financeiros resetados',
        description: 'Todas as suas informações financeiras foram zeradas com sucesso.',
      })
      navigate('/inicio')
    } catch (err) {
      toast({
        title: 'Erro ao resetar dados',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setResettingData(false)
    }
  }

  /* ========================================================================
   * Excluir Conta (Preservado)
   * ======================================================================== */
  const handleDeleteAccount = async () => {
    if (!user) return
    try {
      await pb.collection('users').delete(user.id)
      logout()
      navigate('/')
    } catch (err) {
      toast({
        title: 'Não foi possível excluir a conta',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const showSkeleton = isLoading && !user

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Principal */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
            <SettingsIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
              Configurações
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Personalize a aparência, notificações, preferências financeiras, segurança e dados.
            </p>
          </div>
        </div>

        {/* Link direto para a página de Perfil completa */}
        <Link to="/perfil">
          <Button
            variant="outline"
            className="rounded-xl font-semibold gap-1.5 border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm"
          >
            Acessar Meu Perfil
            <ExternalLink className="w-3.5 h-3.5 ml-1 text-slate-400" />
          </Button>
        </Link>
      </div>

      {showSkeleton ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card
              key={i}
              className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b]"
            >
              <CardHeader>
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-56 mt-2" />
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !user ? (
        <Card className="rounded-2xl border-red-200 dark:border-red-900/50 bg-white dark:bg-[#121a2b]">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-8 h-8 text-red-500 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">
              Não foi possível carregar as configurações da sua conta.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-3">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Layout responsivo: 2 colunas no desktop (lg:grid-cols-2), 1 coluna no mobile */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* ====================================================================
           * SEÇÃO 1: APARÊNCIA
           * ==================================================================== */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                <Paintbrush className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Aparência
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Personalize como o Semeia é exibido no seu dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Modo de visualização
                </Label>
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Tema Claro */}
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${
                      theme === 'light'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400">
                      <Sun className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      Claro
                    </span>
                  </button>

                  {/* Tema Escuro */}
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${
                      theme === 'dark'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Moon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      Escuro
                    </span>
                  </button>

                  {/* Tema do Dispositivo / Sistema */}
                  <button
                    type="button"
                    onClick={() => setTheme('system')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center gap-2 ${
                      theme === 'system'
                        ? 'border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-200 dark:bg-slate-700/50 flex items-center justify-center text-slate-700 dark:text-slate-300">
                      <Laptop className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                      Dispositivo
                    </span>
                  </button>
                </div>
              </div>

              {/* Status do tema atual */}
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Tema ativo no momento:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  {resolvedTheme === 'dark' ? 'Modo Escuro' : 'Modo Claro'}
                  {theme === 'system' && ' (automático)'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* ====================================================================
           * SEÇÃO 2: NOTIFICAÇÕES
           * ==================================================================== */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                  <Bell className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  Notificações
                </CardTitle>
                {savingNotifications && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Salvando...
                  </span>
                )}
              </div>
              <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Escolha quais alertas e avisos inteligentes deseja receber no painel.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-3">
              {/* Lista dos 8 alertas solicitados */}
              {[
                {
                  key: 'contas_a_vencer' as const,
                  title: 'Contas a vencer',
                  desc: 'Avisos sobre despesas agendadas próximas da data de vencimento',
                },
                {
                  key: 'boletos' as const,
                  title: 'Boletos',
                  desc: 'Notificações de boletos pendentes e código de barras',
                },
                {
                  key: 'faturas_cartao' as const,
                  title: 'Faturas de cartão',
                  desc: 'Alertas de fechamento e vencimento das faturas de crédito',
                },
                {
                  key: 'saldo_baixo' as const,
                  title: 'Saldo baixo',
                  desc: 'Avisos quando o saldo bancário atingir o limite de segurança',
                },
                {
                  key: 'orcamento' as const,
                  title: 'Orçamento',
                  desc: 'Alertas de proximidade do teto de gastos por categoria',
                },
                {
                  key: 'metas' as const,
                  title: 'Metas',
                  desc: 'Atualizações de progresso e prazos de metas financeiras',
                },
                {
                  key: 'previsao_caixa' as const,
                  title: 'Previsão de caixa',
                  desc: 'Projeções de fluxo futuro e saldo projetado',
                },
                {
                  key: 'analise_semanal' as const,
                  title: 'Análise semanal',
                  desc: 'Resumo semanal de desempenho financeiro e insights da IA',
                },
              ].map((item) => (
                <div
                  key={item.key}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80 gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {item.title}
                    </p>
                    <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                      {item.desc}
                    </p>
                  </div>
                  <Switch
                    checked={notifications[item.key] !== false}
                    onCheckedChange={(checked) => handleToggleNotification(item.key, checked)}
                    aria-label={`Alternar notificação de ${item.title}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          {/* ====================================================================
           * SEÇÃO 3: PREFERÊNCIAS FINANCEIRAS
           * ==================================================================== */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Preferências Financeiras
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Padrões monetários, calendário e formatação numérica.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Moeda principal */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Moeda principal
                </Label>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-500/15 flex items-center justify-center font-bold text-xs text-emerald-700 dark:text-emerald-300 shrink-0">
                    R$
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      Real Brasileiro (BRL)
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Padrão do sistema (somente leitura)
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] font-semibold">
                    Ativo
                  </Badge>
                </div>
              </div>

              {/* Primeiro dia da semana */}
              <div className="space-y-1.5">
                <Label
                  htmlFor="firstDayOfWeek"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Primeiro dia da semana
                </Label>
                <Select
                  value={financialPrefs.first_day_of_week}
                  onValueChange={(val: 'sunday' | 'monday') => handleFirstDayChange(val)}
                  disabled={savingFinancialPrefs}
                >
                  <SelectTrigger
                    id="firstDayOfWeek"
                    className="h-10 rounded-xl bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-xs sm:text-sm"
                  >
                    <SelectValue placeholder="Selecione o primeiro dia" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#121a2b] border-slate-200 dark:border-slate-800">
                    <SelectItem value="monday">Segunda-feira (padrão Brasil)</SelectItem>
                    <SelectItem value="sunday">Domingo</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Define o início dos ciclos nos calendários e relatórios.
                </p>
              </div>

              {/* Formato de valores */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Formato de valores
                </Label>
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                      1.000,00 (padrão brasileiro)
                    </p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      Separador de milhar com ponto e decimal com vírgula
                    </p>
                  </div>
                  <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ====================================================================
           * SEÇÃO 4: SEGURANÇA
           * ==================================================================== */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Segurança
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Gerencie suas credenciais de acesso e proteja sua conta.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* E-mail da conta (somente leitura) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  E-mail da conta
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={user.email}
                    readOnly
                    disabled
                    className="h-10 rounded-xl bg-slate-100 dark:bg-slate-900/80 text-slate-600 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800 text-xs sm:text-sm"
                  />
                  {user.verified && (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300 shrink-0 text-xs py-1">
                      Verificado
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  O e-mail é a chave primária da sua conta e não pode ser editado diretamente.
                </p>
              </div>

              {/* Botões de Ação de Senha */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {/* Botão Alterar Senha (Abre modal para digitar senha atual + nova) */}
                <Button
                  type="button"
                  onClick={() => setPasswordModalOpen(true)}
                  className="rounded-xl font-semibold gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm"
                >
                  <Lock className="w-4 h-4" />
                  Alterar senha
                </Button>

                {/* Botão Enviar link de redefinição por e-mail */}
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleRequestPasswordResetEmail}
                  disabled={sendingResetEmail}
                  className="rounded-xl font-semibold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 text-xs sm:text-sm"
                >
                  {sendingResetEmail ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <KeyRound className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                  Redefinir por e-mail
                </Button>
              </div>

              {/* Botão Sair da conta */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full rounded-xl font-semibold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs sm:text-sm"
                    >
                      <LogOut className="w-4 h-4 text-slate-500" />
                      Sair da conta
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white dark:bg-[#121a2b] border-slate-200 dark:border-slate-800">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-slate-900 dark:text-white">
                        Deseja realmente sair?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                        Você será desconectado deste dispositivo e precisará informar suas
                        credenciais para entrar novamente.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-transparent border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleLogout}
                        className="bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white"
                      >
                        Sair agora
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* ====================================================================
           * SEÇÃO 5: DADOS E BACKUP
           * ==================================================================== */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                <Database className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Dados e Backup
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Exporte uma cópia de segurança, restaure dados ou zere seus registros financeiros.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Botões de Exportar e Restaurar Backup */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleExportBackup}
                  disabled={exportingBackup}
                  className="rounded-xl font-semibold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm"
                >
                  {exportingBackup ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                  Exportar backup
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => backupInputRef.current?.click()}
                  disabled={restoringBackup}
                  className="rounded-xl font-semibold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs sm:text-sm"
                >
                  {restoringBackup ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                  Restaurar backup
                </Button>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileRestore}
                  className="hidden"
                />
              </div>

              {/* Bloco de Reset de Dados Financeiros (destacado e seguro) */}
              <div className="p-4 rounded-xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 space-y-2.5">
                <div className="flex items-start gap-2.5">
                  <RotateCcw className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                  <div>
                    <h2 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-300">
                      Resetar dados financeiros
                    </h2>
                    <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-400/90 mt-0.5">
                      Zera transações, contas, cartões, metas e orçamentos. Sua conta (login e
                      senha) e sua assinatura continuam preservadas.
                    </p>
                  </div>
                </div>

                <AlertDialog
                  open={resetDialogOpen}
                  onOpenChange={(open) => {
                    setResetDialogOpen(open)
                    if (!open) setResetConfirmText('')
                  }}
                >
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl font-semibold gap-1.5 border-amber-300 dark:border-amber-700/60 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-xs"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Resetar dados financeiros
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white dark:bg-[#121a2b] border-amber-200 dark:border-amber-900/50">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                        Resetar todos os dados financeiros?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-600 dark:text-slate-300 space-y-2">
                        <p>
                          Esta ação excluirá permanentemente todos os registros de movimentações,
                          contas bancárias, cartões, faturas, metas, orçamentos e investimentos.
                        </p>
                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                          ✓ Sua conta (login e senha) e sua assinatura continuarão ativas.
                        </p>
                        <div className="pt-2">
                          <Label
                            htmlFor="confirmResetInput"
                            className="text-xs font-semibold text-slate-700 dark:text-slate-300 block mb-1"
                          >
                            Para confirmar, digite <strong>RESETAR</strong> abaixo:
                          </Label>
                          <Input
                            id="confirmResetInput"
                            value={resetConfirmText}
                            onChange={(e) => setResetConfirmText(e.target.value)}
                            placeholder="RESETAR"
                            className="h-10 uppercase font-mono tracking-widest rounded-xl bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                            autoComplete="off"
                            disabled={resettingData}
                          />
                        </div>
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4">
                      <AlertDialogCancel
                        disabled={resettingData}
                        className="bg-transparent border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                      >
                        Cancelar
                      </AlertDialogCancel>
                      <Button
                        type="button"
                        disabled={
                          resetConfirmText.trim().toUpperCase() !== 'RESETAR' || resettingData
                        }
                        onClick={handleResetFinanceData}
                        className="bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-semibold gap-1.5"
                      >
                        {resettingData ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Resetando dados...
                          </>
                        ) : (
                          <>
                            <RotateCcw className="w-4 h-4" />
                            Confirmar Reset
                          </>
                        )}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>

              {/* Botão de Excluir Conta Definitivamente (preservado) */}
              <div className="pt-2">
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button
                      type="button"
                      className="text-xs text-rose-600 hover:text-rose-700 dark:text-rose-400 dark:hover:text-rose-300 flex items-center gap-1.5 font-medium transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Excluir minha conta definitivamente
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-white dark:bg-[#121a2b] border-red-200 dark:border-red-900/50">
                    <AlertDialogHeader>
                      <AlertDialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5" />
                        Excluir conta definitivamente?
                      </AlertDialogTitle>
                      <AlertDialogDescription className="text-slate-600 dark:text-slate-300">
                        Esta ação é irreversível. Seu usuário e todos os registros associados serão
                        apagados para sempre.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="bg-transparent border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                        Cancelar
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleDeleteAccount}
                        className="bg-red-600 hover:bg-red-700 text-white"
                      >
                        Sim, excluir tudo
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          {/* ====================================================================
           * SEÇÃO 6: SOBRE O SEMEIA
           * ==================================================================== */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <CardTitle className="text-base sm:text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                <Info className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Sobre o Semeia
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                Informações da plataforma, versão e canais de suporte.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">
                    Semeia com Propósito
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Sistema de Gestão Financeira Pessoal e Inteligência Orçamentária
                  </p>
                </div>
                <Badge variant="outline" className="text-xs font-mono font-semibold">
                  v1.0.0
                </Badge>
              </div>

              {/* Informações de Suporte e Termos */}
              <div className="space-y-2 pt-1 text-xs">
                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Suporte ao cliente</span>
                  <a
                    href="mailto:suporte@semeia.com.br"
                    className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    suporte@semeia.com.br
                  </a>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-500 dark:text-slate-400">Termos de Uso</span>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      toast({
                        title: 'Termos de Uso',
                        description: 'Documento disponível em breve.',
                      })
                    }}
                    className="font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1"
                  >
                    Visualizar termos
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <span className="text-slate-500 dark:text-slate-400">
                    Política de Privacidade
                  </span>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      toast({
                        title: 'Política de Privacidade',
                        description: 'Documento disponível em breve.',
                      })
                    }}
                    className="font-medium text-slate-700 dark:text-slate-300 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1"
                  >
                    Visualizar política
                    <ExternalLink className="w-3 h-3 text-slate-400" />
                  </a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal para Alteração de Senha (Segurança) */}
      <Dialog open={passwordModalOpen} onOpenChange={setPasswordModalOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-[#121a2b] border-slate-200 dark:border-slate-800 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-slate-900 dark:text-white flex items-center gap-2 text-base sm:text-lg">
              <Lock className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              Alterar Senha
            </DialogTitle>
            <DialogDescription className="text-slate-500 dark:text-slate-400 text-xs sm:text-sm">
              Informe sua senha atual e escolha uma nova senha segura.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSavePassword} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="currentPass"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Senha atual
              </Label>
              <Input
                id="currentPass"
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className={`h-10 rounded-xl bg-white dark:bg-slate-900/60 ${
                  passErrors.currentPass
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
                placeholder="••••••••"
              />
              {passErrors.currentPass && (
                <p className="text-xs text-red-500">{passErrors.currentPass}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="newPass"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Nova senha
              </Label>
              <Input
                id="newPass"
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className={`h-10 rounded-xl bg-white dark:bg-slate-900/60 ${
                  passErrors.newPass
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
                placeholder="Mínimo 8 caracteres"
              />
              {passErrors.newPass ? (
                <p className="text-xs text-red-500">{passErrors.newPass}</p>
              ) : (
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  Mínimo de 8 caracteres.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="confirmPass"
                className="text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Confirmar nova senha
              </Label>
              <Input
                id="confirmPass"
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className={`h-10 rounded-xl bg-white dark:bg-slate-900/60 ${
                  passErrors.confirmPass
                    ? 'border-red-500 focus-visible:ring-red-500'
                    : 'border-slate-200 dark:border-slate-700'
                }`}
                placeholder="Repita a nova senha"
              />
              {passErrors.confirmPass && (
                <p className="text-xs text-red-500">{passErrors.confirmPass}</p>
              )}
            </div>

            <DialogFooter className="pt-3 gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setPasswordModalOpen(false)}
                className="rounded-xl"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={passSaving}
                className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
              >
                {passSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                Salvar nova senha
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
