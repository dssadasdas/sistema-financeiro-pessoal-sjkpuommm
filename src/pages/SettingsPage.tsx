import React, { useState } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useFinance } from '@/contexts/FinanceDataContext'
import { formatCurrency, formatDate } from '@/lib/constants'
import {
  User,
  Shield,
  CreditCard,
  Sparkles,
  Bell,
  CheckCircle2,
  AlertTriangle,
  LogOut,
  Save,
  Trash2,
  Plus,
  Moon,
  Sun,
  Lock,
  Smartphone,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useTheme } from '@/contexts/ThemeContext'

export default function SettingsPage() {
  const { user, subscription, logout, updateProfile } = useAuth()
  const { rules, saveRule, deleteRule } = useFinance()
  const { theme, toggleTheme } = useTheme()

  // Profile form state
  const [name, setName] = useState(user?.name || '')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileMsg, setProfileMsg] = useState('')

  // New rule state
  const [newPattern, setNewPattern] = useState('')
  const [newCategory, setNewCategory] = useState('Alimentação')
  const [ruleSaving, setRuleSaving] = useState(false)

  // Demo notification toggles
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [pushAlerts, setPushAlerts] = useState(true)
  const [dueDaysAlert, setDueDaysAlert] = useState('3')

  const isSubActive = subscription?.status === 'ativa'
  const planType = subscription?.plan || 'mensal'
  const planPrice = planType === 'anual' ? 'R$ 119,99/ano' : 'R$ 11,99/mês'

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaving(true)
    setProfileMsg('')
    try {
      await updateProfile({ name: name.trim() })
      setProfileMsg('Perfil atualizado com sucesso!')
      setTimeout(() => setProfileMsg(''), 3000)
    } catch {
      setProfileMsg('Erro ao atualizar perfil.')
    } finally {
      setProfileSaving(false)
    }
  }

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPattern.trim()) return
    setRuleSaving(true)
    try {
      await saveRule(newPattern.trim(), newCategory)
      setNewPattern('')
    } catch (err) {
      console.error(err)
    } finally {
      setRuleSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Top Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Configurações</h2>
        <p className="text-xs sm:text-sm text-slate-500">
          Gerencie sua conta, plano de assinatura, preferências e regras inteligentes
        </p>
      </div>

      <Tabs defaultValue="perfil" className="w-full space-y-6">
        <TabsList className="grid grid-cols-4 w-full sm:w-[520px] rounded-2xl p-1 bg-slate-100 dark:bg-slate-800">
          <TabsTrigger value="perfil" className="rounded-xl text-xs sm:text-sm font-semibold">
            Perfil
          </TabsTrigger>
          <TabsTrigger value="assinatura" className="rounded-xl text-xs sm:text-sm font-semibold">
            Assinatura
          </TabsTrigger>
          <TabsTrigger value="regras" className="rounded-xl text-xs sm:text-sm font-semibold">
            Regras IA
          </TabsTrigger>
          <TabsTrigger value="preferencias" className="rounded-xl text-xs sm:text-sm font-semibold">
            Preferências
          </TabsTrigger>
        </TabsList>

        {/* 1. ABA PERFIL */}
        <TabsContent value="perfil" className="space-y-6">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-emerald-600" />
                Dados Pessoais
              </CardTitle>
              <CardDescription>
                Atualize suas informações de identificação no sistema Raiz
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
                {profileMsg && (
                  <div
                    className={`p-3 rounded-xl text-xs font-semibold ${
                      profileMsg.includes('sucesso')
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                        : 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                    }`}
                  >
                    {profileMsg}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label htmlFor="user-name">Nome Completo</Label>
                  <Input
                    id="user-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="user-email">Email Cadastrado</Label>
                  <Input
                    id="user-email"
                    value={user?.email || ''}
                    disabled
                    className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-500 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-slate-400">
                    O email é sua chave única de acesso e login.
                  </p>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={profileSaving}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
                  >
                    <Save className="w-4 h-4" />
                    {profileSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-red-200 dark:border-red-900/40 bg-white dark:bg-[#121A2B] shadow-sm">
            <CardHeader>
              <CardTitle className="text-base text-red-600 flex items-center gap-2">
                <LogOut className="w-4 h-4" />
                Encerrar Sessão
              </CardTitle>
              <CardDescription>
                Desconectar com segurança desta máquina ou dispositivo
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive" onClick={logout} className="rounded-xl font-semibold">
                Sair da Conta
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 2. ABA ASSINATURA */}
        <TabsContent value="assinatura" className="space-y-6">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <CreditCard className="w-5 h-5 text-emerald-600" />
                    Plano de Assinatura Raiz
                  </CardTitle>
                  <CardDescription>
                    Status do seu plano SaaS e informações de renovação
                  </CardDescription>
                </div>
                <Badge
                  className={`text-xs px-3 py-1 font-bold ${
                    isSubActive
                      ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300'
                  }`}
                >
                  {isSubActive ? '✓ Assinatura Ativa' : 'Bloqueada'}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400">Plano Atual</span>
                  <div className="text-lg font-bold text-slate-900 dark:text-white capitalize mt-1">
                    Plano {planType}
                  </div>
                  <span className="text-xs text-emerald-600 font-semibold">{planPrice}</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400">Início da Assinatura</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {subscription?.start_date ? formatDate(subscription.start_date) : 'Hoje'}
                  </div>
                  <span className="text-xs text-slate-400">Acesso ilimitado</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-400">Próxima Renovação</span>
                  <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                    {subscription?.expires_at ? formatDate(subscription.expires_at) : 'Em 30 dias'}
                  </div>
                  <span className="text-xs text-emerald-600 font-semibold">
                    Renovação Automática
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border border-emerald-200 dark:border-emerald-800/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-bold text-sm text-emerald-950 dark:text-emerald-200">
                    Todos os recursos premium inclusos
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-400 mt-0.5">
                    Importação de faturas PDF/OCR, IA Financeira, metas, projeções, multi-contas e
                    orçamentos ilimitados.
                  </p>
                </div>
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  R$ 11,99/mês ou R$ 119,99/ano
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 3. ABA REGRAS IA */}
        <TabsContent value="regras" className="space-y-6">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600" />
                Regras de Categorização Automática
              </CardTitle>
              <CardDescription>
                O sistema usa estas palavras-chave para classificar automaticamente suas transações
                e faturas importadas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Adicionar Regra */}
              <form
                onSubmit={handleAddRule}
                className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-end gap-3"
              >
                <div className="space-y-1 flex-1 w-full sm:w-auto">
                  <Label htmlFor="rule-pattern" className="text-xs">
                    Palavra-chave (match)
                  </Label>
                  <Input
                    id="rule-pattern"
                    placeholder="Ex: IFOOD, UBER, SHELL, DROGASIL"
                    value={newPattern}
                    onChange={(e) => setNewPattern(e.target.value)}
                    required
                    className="h-10 rounded-xl uppercase"
                  />
                </div>

                <div className="space-y-1 w-full sm:w-56">
                  <Label htmlFor="rule-cat" className="text-xs">
                    Categoria Destino
                  </Label>
                  <Input
                    id="rule-cat"
                    placeholder="Ex: Alimentação, Transporte"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    required
                    className="h-10 rounded-xl"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={ruleSaving}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5 h-10 w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4" /> Adicionar Regra
                </Button>
              </form>

              {/* Lista de regras cadastradas */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-500 block">
                  Regras Ativas ({rules.length})
                </span>
                {rules.length === 0 ? (
                  <div className="p-8 text-center rounded-xl bg-slate-50 dark:bg-slate-900/30 text-xs text-slate-400">
                    Nenhuma regra personalizada cadastrada ainda.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {rules.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs group"
                      >
                        <div>
                          <span className="font-mono font-bold text-slate-900 dark:text-white uppercase block">
                            "{r.pattern}"
                          </span>
                          <span className="text-[11px] text-emerald-600 font-semibold">
                            → {r.category}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteRule(r.id)}
                          className="h-7 w-7 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 4. ABA PREFERÊNCIAS */}
        <TabsContent value="preferencias" className="space-y-6">
          <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Bell className="w-5 h-5 text-emerald-600" />
                Aparência e Notificações
              </CardTitle>
              <CardDescription>
                Ajuste temas, notificações de contas e modo de privacidade
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                    {theme === 'dark' ? (
                      <Moon className="w-4 h-4 text-purple-400" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                    Modo Escuro (Dark Mode)
                  </div>
                  <p className="text-xs text-slate-400">
                    Alternar entre o visual claro e o tema escuro de alto contraste
                  </p>
                </div>
                <Switch checked={theme === 'dark'} onCheckedChange={toggleTheme} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    Notificações de Boletos por Email
                  </div>
                  <p className="text-xs text-slate-400">
                    Receba lembretes quando houver contas a vencer nos próximos dias
                  </p>
                </div>
                <Switch checked={emailAlerts} onCheckedChange={setEmailAlerts} />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800">
                <div className="space-y-0.5">
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    Alertas de Faturas de Cartões
                  </div>
                  <p className="text-xs text-slate-400">
                    Avisar no fechamento da fatura com o total estimado
                  </p>
                </div>
                <Switch checked={pushAlerts} onCheckedChange={setPushAlerts} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
