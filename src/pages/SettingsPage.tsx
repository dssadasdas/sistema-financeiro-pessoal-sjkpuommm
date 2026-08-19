import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useFinance } from '@/contexts/FinanceDataContext'
import { useTheme } from '@/contexts/ThemeContext'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage, extractFieldErrors } from '@/lib/pocketbase/errors'
import { User as UserIcon } from '@/types/finance'
import {
  User,
  Shield,
  CreditCard,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Save,
  Trash2,
  Moon,
  Sun,
  Lock,
  Loader2,
  ExternalLink,
  Clock,
  Settings as SettingsIcon,
  MailCheck,
  Send,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
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

const LAST_SYNC_KEY = 'semia_last_sync'

function timeAgo(iso: string): string {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora mesmo'
  if (min === 1) return 'há 1 minuto'
  if (min < 60) return `há ${min} minutos`
  const h = Math.floor(min / 60)
  if (h === 1) return 'há 1 hora'
  if (h < 24) return `há ${h} horas`
  const d = Math.floor(h / 24)
  return `há ${d} dia${d > 1 ? 's' : ''}`
}

function formatDateBR(iso?: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export default function SettingsPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, subscription, isLoading, logout, refreshUser, refreshSubscription } = useAuth()
  const { refreshAll, isLoading: financeLoading } = useFinance()
  const { theme, toggleTheme } = useTheme()

  /* ---------- Perfil ---------- */
  const [name, setName] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)

  useEffect(() => {
    if (user?.name) setName(user.name)
  }, [user?.name])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setProfileSaving(true)
    try {
      await pb.collection('users').update<UserIcon>(user.id, { name })
      await refreshUser()
      toast({ title: 'Perfil atualizado', description: 'Suas alterações foram salvas.' })
    } catch (err) {
      toast({
        title: 'Erro ao salvar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setProfileSaving(false)
    }
  }

  /* ---------- Segurança ---------- */
  const [currentPass, setCurrentPass] = useState('')
  const [newPass, setNewPass] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [passSaving, setPassSaving] = useState(false)
  const [passErrors, setPassErrors] = useState<Record<string, string>>({})
  const [passSuccess, setPassSuccess] = useState(false)

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    setPassErrors({})
    setPassSuccess(false)

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
      // Re-autentica validando a senha atual antes de trocar.
      await pb.collection('users').authWithPassword(user.email, currentPass)
      await pb.collection('users').update(user.id, {
        password: newPass,
        passwordConfirm: confirmPass,
      })
      setPassSuccess(true)
      setCurrentPass('')
      setNewPass('')
      setConfirmPass('')
      toast({ title: 'Senha alterada', description: 'Sua senha foi atualizada com sucesso.' })
    } catch (err) {
      const fieldErrs = extractFieldErrors(err)
      const next: Record<string, string> = {}
      // PocketBase devolve "newPassword" / "oldPassword" em alguns fluxos; tratamos ambos.
      if (fieldErrs.password || fieldErrs.newPassword || fieldErrs.passwordConfirm) {
        next.newPass = fieldErrs.password || fieldErrs.newPassword || fieldErrs.passwordConfirm
      }
      // Erro 401 na authWithPassword -> senha atual incorreta.
      if (
        !next.currentPass &&
        (getErrorMessage(err).toLowerCase().includes('invalid login') ||
          getErrorMessage(err).toLowerCase().includes('incorrect') ||
          getErrorMessage(err).toLowerCase().includes('senha'))
      ) {
        next.currentPass = 'Senha atual incorreta.'
      }
      if (Object.keys(next).length === 0) {
        next.currentPass = getErrorMessage(err)
      }
      setPassErrors(next)
    } finally {
      setPassSaving(false)
    }
  }

  /* ---------- Sincronização ---------- */
  const [lastSync, setLastSync] = useState<string>('')
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem(LAST_SYNC_KEY)
    if (stored) setLastSync(stored)
  }, [])

  const handleSync = async () => {
    setSyncing(true)
    try {
      await Promise.all([refreshAll(), refreshSubscription()])
      const nowIso = new Date().toISOString()
      localStorage.setItem(LAST_SYNC_KEY, nowIso)
      setLastSync(nowIso)
      toast({ title: 'Dados sincronizados', description: 'Tudo atualizado.' })
    } catch (err) {
      toast({
        title: 'Falha ao sincronizar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
    }
  }

  /* ---------- Verificação de e-mail ---------- */
  const [sendingVerification, setSendingVerification] = useState(false)

  const handleSendVerification = async () => {
    if (!user) return
    setSendingVerification(true)
    try {
      await pb.collection('users').requestVerification(user.email)
      toast({
        title: 'E-mail enviado',
        description: 'Verifique sua caixa de entrada e o spam para confirmar seu e-mail.',
      })
    } catch (err) {
      toast({
        title: 'Não foi possível enviar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSendingVerification(false)
    }
  }

  /* ---------- Assinatura ---------- */
  const planLabel = subscription?.plan === 'anual' ? 'Anual' : 'Mensal'
  const planPrice = subscription?.plan === 'anual' ? 'R$ 119,99/ano' : 'R$ 11,99/mês'
  const isActive = subscription?.status === 'ativa'
  const renewalDate = subscription?.expires_at || subscription?.renewed_at

  /* ---------- Conta / Excluir ---------- */
  const handleLogout = () => {
    logout()
    navigate('/login')
  }

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

  /* ---------- Loading / erro ---------- */
  const showSkeleton = isLoading && !user

  const headerTitle = useMemo(() => 'Configurações', [])

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center">
          <SettingsIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{headerTitle}</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Gerencie seu perfil, aparência, segurança e assinatura.
          </p>
        </div>
      </div>

      {showSkeleton ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
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
              Não foi possível carregar seus dados de perfil.
            </p>
            <Button variant="outline" onClick={() => window.location.reload()} className="mt-3">
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ================= Perfil ================= */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                <User className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Perfil
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Suas informações pessoais.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 flex items-center justify-center font-bold text-lg border border-emerald-500/30 flex-shrink-0">
                    {name ? name.slice(0, 1).toUpperCase() : 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                      {name || 'Usuário'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
                    Nome
                  </Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-10 rounded-xl bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700"
                    placeholder="Seu nome"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">
                    E-mail
                  </Label>
                  <Input
                    id="email"
                    value={user.email}
                    readOnly
                    className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/40 text-slate-500 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800"
                  />
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    O e-mail não pode ser alterado.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={profileSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
                >
                  {profileSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Salvar alterações
                </Button>

                {/* Verificação de e-mail */}
                <div
                  className={`mt-2 p-3 rounded-xl border flex items-start gap-2.5 text-xs ${
                    user.verified
                      ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-50 dark:bg-amber-500/10 border-amber-200 dark:border-amber-500/30 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {user.verified ? (
                    <MailCheck className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  ) : (
                    <Send className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    {user.verified ? (
                      <span>E-mail verificado com sucesso.</span>
                    ) : (
                      <>
                        <p className="font-medium">Seu e-mail ainda não foi verificado.</p>
                        <button
                          type="button"
                          onClick={handleSendVerification}
                          disabled={sendingVerification}
                          className="mt-1 inline-flex items-center gap-1 font-semibold underline disabled:opacity-60"
                        >
                          {sendingVerification ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : null}
                          Reenviar e-mail de verificação
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* ================= Aparência ================= */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                <Sun className="w-5 h-5 text-amber-500" />
                Aparência
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Escolha entre tema claro e escuro.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-500/15 flex items-center justify-center">
                    {theme === 'dark' ? (
                      <Moon className="w-5 h-5 text-indigo-300" />
                    ) : (
                      <Sun className="w-5 h-5 text-amber-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">
                      {theme === 'dark' ? 'Tema Escuro' : 'Tema Claro'}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {theme === 'dark' ? 'Ativo agora' : 'Ativo agora'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={theme === 'dark'}
                  onCheckedChange={toggleTheme}
                  aria-label="Alternar tema"
                />
              </div>

              {/* Preview visual */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => theme !== 'light' && toggleTheme()}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    theme === 'light'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="w-full h-12 rounded-lg bg-white border border-slate-200 flex items-center justify-center mb-2">
                    <Sun className="w-5 h-5 text-amber-500" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Claro
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => theme !== 'dark' && toggleTheme()}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    theme === 'dark'
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300'
                  }`}
                >
                  <div className="w-full h-12 rounded-lg bg-[#0b1120] border border-slate-800 flex items-center justify-center mb-2">
                    <Moon className="w-5 h-5 text-indigo-300" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                    Escuro
                  </span>
                </button>
              </div>
            </CardContent>
          </Card>

          {/* ================= Segurança ================= */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                <Shield className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Segurança
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Altere sua senha de acesso.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSavePassword} className="space-y-4">
                {passSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Senha alterada com sucesso!</span>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="currentPass" className="text-slate-700 dark:text-slate-300">
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
                  <Label htmlFor="newPass" className="text-slate-700 dark:text-slate-300">
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
                  <Label htmlFor="confirmPass" className="text-slate-700 dark:text-slate-300">
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
                  Alterar senha
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* ================= Sincronização ================= */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                <RefreshCw className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                Sincronização
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Atualize manualmente os dados do painel.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    syncing
                      ? 'bg-amber-100 dark:bg-amber-500/15'
                      : 'bg-emerald-100 dark:bg-emerald-500/15'
                  }`}
                >
                  {syncing ? (
                    <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">
                    {syncing ? 'Sincronizando...' : 'Sincronizado'}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {lastSync ? `Última sincronização: ${timeAgo(lastSync)}` : 'Sem registros'}
                  </p>
                </div>
              </div>

              <Button
                type="button"
                onClick={handleSync}
                disabled={syncing || financeLoading}
                variant="outline"
                className="rounded-xl font-semibold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
              >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                Sincronizar agora
              </Button>
            </CardContent>
          </Card>

          {/* ================= Assinatura ================= */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                    <CreditCard className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                    Assinatura
                  </CardTitle>
                  <CardDescription className="text-slate-500 dark:text-slate-400">
                    Detalhes do seu plano.
                  </CardDescription>
                </div>
                <Badge
                  className={`text-xs px-3 py-1 font-bold ${
                    isActive
                      ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-500/30'
                      : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-500/30'
                  }`}
                >
                  {isActive ? 'Ativa' : 'Expirada'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 dark:text-slate-500">Plano atual</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {planLabel} — {planPrice}
                  </div>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400 dark:text-slate-500">
                    {isActive ? 'Renovação' : 'Expira em'}
                  </span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {formatDateBR(renewalDate)}
                  </div>
                </div>
              </div>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl font-semibold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Gerenciar assinatura
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white dark:bg-[#121a2b] border-slate-200 dark:border-slate-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-slate-900 dark:text-white">
                      Gerenciar assinatura
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                      Você está no plano <strong>{planLabel}</strong> ({planPrice}).
                      {isActive
                        ? ' Sua assinatura está ativa. Para alterar o plano, cancelar ou atualizar forma de pagamento, acesse a página de planos.'
                        : ' Sua assinatura está expirada. Reative agora para liberar todos os recursos.'}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-transparent border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200">
                      Fechar
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => navigate('/')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    >
                      Ver planos
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </CardContent>
          </Card>

          {/* ================= Conta ================= */}
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2 text-slate-900 dark:text-white">
                <LogOut className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                Conta
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Encerre sua sessão no dispositivo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full rounded-xl font-semibold gap-1.5 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
                  >
                    <LogOut className="w-4 h-4" />
                    Sair da conta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white dark:bg-[#121a2b] border-slate-200 dark:border-slate-800">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-slate-900 dark:text-white">
                      Sair da conta?
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
                      Você precisará informar e-mail e senha para entrar novamente.
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
                      Sair
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 pt-1">
                Semia v1.0.0
              </p>
            </CardContent>
          </Card>

          {/* ================= Ações (excluir conta) ================= */}
          <Card className="rounded-2xl border-red-200 dark:border-red-900/40 bg-white dark:bg-[#121a2b] shadow-sm lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base text-red-600 dark:text-red-400 flex items-center gap-2">
                <Trash2 className="w-4 h-4" />
                Excluir minha conta
              </CardTitle>
              <CardDescription className="text-slate-500 dark:text-slate-400">
                Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="rounded-xl font-semibold gap-1.5 bg-red-600 hover:bg-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir minha conta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-white dark:bg-[#121a2b] border-red-200 dark:border-red-900/50">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-red-600 dark:text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5" />
                      Tem certeza? Esta ação é irreversível.
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-600 dark:text-slate-300">
                      Ao confirmar, sua conta e todos os dados associados (transações, contas,
                      cartões, metas, investimentos...) serão excluídos permanentemente. Esta ação
                      não pode ser desfeita.
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
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
