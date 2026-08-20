import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Wallet, Lock, Mail, Eye, EyeOff, Loader2, AlertCircle, User } from 'lucide-react'
import { extractFieldErrors, getErrorMessage } from '@/lib/pocketbase/errors'
import pb from '@/lib/pocketbase/client'
import { useToast } from '@/hooks/use-toast'

export default function SignupPage() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [generalError, setGeneralError] = useState('')
  const [loading, setLoading] = useState(false)
  const { signup } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [params] = useSearchParams()
  const preselectedPlan = params.get('plan') === 'anual' ? 'anual' : 'mensal'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})
    setGeneralError('')

    const newErrors: Record<string, string> = {}
    if (password.length < 8) newErrors.password = 'A senha deve conter no mínimo 8 caracteres.'
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setLoading(true)
    try {
      await signup(email, password, name)
      // Solicita o e-mail de verificação (requer configuração SMTP no PocketBase)
      try {
        await pb.collection('users').requestVerification(email)
      } catch (_) {
        /* não bloqueia o cadastro se o SMTP não estiver configurado */
      }
      toast({
        title: 'Conta criada!',
        description: 'Enviamos um e-mail de verificação para confirmar seu endereço.',
      })
      // Após o cadastro, leva direto para o paywall para escolher o plano.
      navigate('/paywall', { replace: true })
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
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-2">
            <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur border border-white/30 flex items-center justify-center text-white shadow-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-white">Semeia</span>
          </Link>
        </div>

        <Card className="rounded-3xl border-white/40 dark:border-slate-800 shadow-2xl bg-white dark:bg-[#121a2b]">
          <CardContent className="p-5 sm:p-7">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white text-center">
              Criar sua conta
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 text-center mt-1.5 mb-6">
              Comece a organizar suas finanças em poucos minutos.
            </p>
            {generalError && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-600">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{generalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Nome</Label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Seu nome completo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className={`pl-9 h-11 rounded-xl ${
                      errors.name ? 'border-red-500 focus-visible:ring-red-500' : ''
                    }`}
                  />
                </div>
                {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
              </div>

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
                    placeholder="Mínimo 8 caracteres"
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

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl mt-1"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando conta...
                  </>
                ) : (
                  'Criar conta'
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-slate-100 text-center">
              <p className="text-sm text-slate-500">
                Já tem uma conta?{' '}
                <Link to="/login" className="font-semibold text-emerald-600 hover:underline">
                  Entrar
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
