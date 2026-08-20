import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, KeyRound } from 'lucide-react'
import { SemeiaLogo } from '@/components/SemeiaLogo'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [loading, setLoading] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const handleForgotPassword = async () => {
    if (!email) {
      setErrors({ email: 'Informe seu e-mail para receber o link de recuperação.' })
      return
    }
    setResetLoading(true)
    try {
      await pb.collection('users').requestPasswordReset(email)
      toast({
        title: 'E-mail enviado',
        description: 'Se o e-mail existir, você receberá o link de recuperação.',
      })
    } catch (err) {
      toast({
        title: 'Não foi possível enviar',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setResetLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setGeneralError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/inicio')
    } catch (err: unknown) {
      const fieldErrors = extractFieldErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors)
      }
      setGeneralError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-emerald-600">
      {/* Decorative gradient bubbles */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 via-teal-500 to-emerald-700" />
      <div
        className="absolute -top-32 -left-24 w-96 h-96 rounded-full bg-teal-300/40 blur-3xl"
        style={{ animation: 'bubble 14s ease-in-out infinite' }}
      />
      <div
        className="absolute -bottom-40 -right-24 w-[28rem] h-[28rem] rounded-full bg-emerald-300/40 blur-3xl"
        style={{ animation: 'bubble 18s ease-in-out infinite reverse' }}
      />
      <div
        className="absolute top-1/3 right-1/4 w-72 h-72 rounded-full bg-cyan-200/30 blur-3xl"
        style={{ animation: 'bubble 22s ease-in-out infinite' }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center mb-2">
            <SemeiaLogo size="lg" variant="glass" textClassName="text-white" />
          </Link>
        </div>

        <Card className="rounded-3xl border-white/40 shadow-2xl bg-white">
          <CardContent className="p-5 sm:p-7">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 text-center">
              Entrar na sua conta
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 text-center mt-1.5 mb-6">
              Bem-vindo de volta! Acesse seu painel financeiro.
            </p>

            {generalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{generalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">E-mail</Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className={`pl-9 h-11 rounded-xl ${
                      errors.email ? 'border-red-500 focus-visible:ring-red-500' : ''
                    }`}
                  />
                </div>
                {errors.email && <p className="text-xs text-red-500">{errors.email}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    className={`pl-9 pr-10 h-11 rounded-xl ${
                      errors.password ? 'border-red-500 focus-visible:ring-red-500' : ''
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-red-500">{errors.password}</p>}
              </div>

              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  disabled={resetLoading}
                  className="text-xs font-medium text-emerald-600 hover:underline inline-flex items-center gap-1 disabled:opacity-60"
                >
                  {resetLoading ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <KeyRound className="w-3 h-3" />
                  )}
                  Esqueci minha senha
                </button>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl mt-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 dark:border-slate-800 text-center">
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Não tem uma conta?{' '}
                <Link
                  to="/registro"
                  className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
                >
                  Cadastre-se
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <style>{`@keyframes bubble { 0%,100% { transform: translate(0,0) scale(1); } 50% { transform: translate(20px,30px) scale(1.1); } }`}</style>
    </div>
  )
}
