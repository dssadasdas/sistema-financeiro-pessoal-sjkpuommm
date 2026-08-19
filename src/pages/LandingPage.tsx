import React from 'react'
import { Link } from 'react-router-dom'
import {
  Wallet,
  CreditCard,
  Target,
  PieChart,
  TrendingUp,
  Sparkles,
  FileSpreadsheet,
  Building2,
  CheckCircle2,
  ArrowRight,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const APP_VERSION = '1.0.0'

const features = [
  {
    icon: Wallet,
    title: 'Controle Financeiro',
    desc: 'Receitas, despesas, transferências e ajustes em tempo real com categorização inteligente.',
    color: 'text-emerald-500 bg-emerald-50',
  },
  {
    icon: Building2,
    title: 'Bancos e Cartões',
    desc: 'Contas de bancos e cartões de crédito com faturas, limites e visual fiel ao emissor.',
    color: 'text-blue-500 bg-blue-50',
  },
  {
    icon: Target,
    title: 'Metas',
    desc: 'Defina objetivos financeiros, acompanhe aportes e celebre cada porcentagem alcançada.',
    color: 'text-teal-500 bg-teal-50',
  },
  {
    icon: PieChart,
    title: 'Orçamento',
    desc: 'Limites por categoria com alertas de consumo para nunca mais estourar o mês.',
    color: 'text-amber-500 bg-amber-50',
  },
  {
    icon: TrendingUp,
    title: 'Investimentos',
    desc: 'Acompanhe criptomoedas e renda fixa com cotação atualizada e evolução de patrimônio.',
    color: 'text-indigo-500 bg-indigo-50',
  },
  {
    icon: FileSpreadsheet,
    title: 'Relatórios',
    desc: 'Gráficos, comparativos mensais e taxa de savings em linguagem simples e clara.',
    color: 'text-rose-500 bg-rose-50',
  },
  {
    icon: Sparkles,
    title: 'IA Financeira',
    desc: 'Um analista pessoal que diagnostica seus gastos e sugere onde economizar.',
    color: 'text-emerald-600 bg-emerald-100',
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#F6F7F9] dark:bg-[#0b1120] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-[#0f1626]/80 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Wallet className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Semia
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" className="font-medium text-slate-600 hover:text-emerald-600">
                Já tenho conta
              </Button>
            </Link>
            <Link to="/registro">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm shadow-emerald-600/30">
                Começar agora
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        {/* Decorative gradient blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-emerald-200/50 dark:bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 -left-32 w-[28rem] h-[28rem] rounded-full bg-teal-200/40 dark:bg-teal-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <Badge className="mb-4 py-1.5 px-3.5 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 font-medium">
            ✨ Seu dinheiro organizado em um só lugar
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight max-w-4xl mx-auto text-slate-900 dark:text-white leading-[1.15]">
            Controle sua vida financeira em{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-600 bg-clip-text text-transparent">
              um só lugar
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Gerencie receitas, despesas, cartões de crédito, contas a pagar, recorrências,
            orçamentos, metas e investimentos — tudo com a ajuda de uma IA financeira pessoal.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/registro" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-12 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-lg shadow-emerald-600/25 gap-2"
              >
                Começar agora <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/login" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-12 px-8 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-base"
              >
                Já tenho conta
              </Button>
            </Link>
          </div>

          {/* Floating UI mockup */}
          <div className="mt-14 max-w-4xl mx-auto">
            <div className="p-4 sm:p-6 bg-white dark:bg-[#121a2b] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 text-left">
              <div className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 ml-2">
                    Painel Semia
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border-emerald-300 dark:border-emerald-500/30"
                >
                  Resumo do mês: +R$ 8.500,00 recebidos
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Saldo Total
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
                    R$ 16.500,00
                  </div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 inline-block">
                    ↑ 100% positivo
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Despesas do Mês
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400 tabular-nums mt-1">
                    R$ 814,80
                  </div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 mt-1 inline-block">
                    Dentro do orçamento
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Patrimônio Investido
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                    R$ 15.000,00
                  </div>
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1 inline-block">
                    +R$ 1.940,50 de rendimento
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white dark:bg-[#0f1626] border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Tudo o que você precisa para dominar suas finanças
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-300">
              Interface limpa, moderna e responsiva — funciona impecavelmente no celular e no
              computador.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <Card
                  key={i}
                  className="rounded-2xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-[#121a2b] hover:shadow-lg transition-all duration-200"
                >
                  <CardContent className="p-6">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${f.color}`}
                    >
                      <Icon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
                      {f.title}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                      {f.desc}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-[#F6F7F9] dark:bg-[#0b1120]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <Badge className="mb-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
            Planos simples e transparentes
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Invista na sua tranquilidade financeira
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-300 max-w-xl mx-auto">
            Acesso completo a todas as ferramentas, cartões, relatórios, importador de faturas e IA
            Financeira.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Mensal */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] p-6 sm:p-8 flex flex-col justify-between text-left hover:border-emerald-500/50 transition-all">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Plano Mensal</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  Flexibilidade mês a mês
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                    R$ 11,99
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">/mês</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Todas as contas e bancos
                    ilimitados
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cartões de crédito com
                    controle de faturas
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Metas, Orçamentos e
                    Previsão
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> IA Financeira analista
                  </li>
                </ul>
              </div>
              <Link to="/registro?plan=mensal" className="mt-8">
                <Button className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium h-12">
                  Assinar Mensal
                </Button>
              </Link>
            </Card>

            {/* Anual (destaque) */}
            <Card className="rounded-2xl border-2 border-emerald-500 p-6 sm:p-8 flex flex-col justify-between text-left relative bg-emerald-50/30 dark:bg-[#121a2b] shadow-xl shadow-emerald-500/10">
              <div className="absolute -top-3.5 right-6">
                <Badge className="bg-emerald-600 text-white font-bold text-xs py-1 px-3 shadow-md">
                  Mais econômico · Economize 17%
                </Badge>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Plano Anual</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  O plano preferido dos usuários
                </p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                    R$ 119,99
                  </span>
                  <span className="text-slate-500 dark:text-slate-400 text-sm">/ano</span>
                </div>
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block mt-1">
                  Equivalente a apenas R$ 10,00/mês
                </span>
                <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />{' '}
                    <strong>Todos os recursos inclusos</strong>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Acesso liberado no celular
                    e computador
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Suporte prioritário
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Economize 2 meses
                  </li>
                </ul>
              </div>
              <Link to="/registro?plan=anual" className="mt-8">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-lg shadow-emerald-600/30">
                  Assinar Anual
                </Button>
              </Link>
            </Card>
          </div>

          <p className="mt-6 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5" /> Pagamento confirma o acesso completo ao painel.
          </p>

          {/* Métodos de pagamento aceitos */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Aceitamos cartão de crédito, Pix e boleto
            </span>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <Badge
                variant="outline"
                className="bg-white dark:bg-[#121a2b] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-normal"
              >
                <CreditCard className="w-3.5 h-3.5 mr-1" /> Cartão
              </Badge>
              <Badge
                variant="outline"
                className="bg-white dark:bg-[#121a2b] text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-normal"
              >
                Pix
              </Badge>
              <Badge
                variant="outline"
                className="bg-white dark:bg-[#121a2b] text-slate-600 dark:text-slate-300 border-slate-300 dark:border-slate-700 font-normal"
              >
                Boleto
              </Badge>
              <Badge
                variant="outline"
                className="bg-white dark:bg-[#121a2b] text-[#635BFF] dark:text-[#7d78ff] border-slate-300 dark:border-slate-700 font-normal"
              >
                Stripe
              </Badge>
              <Badge
                variant="outline"
                className="bg-white dark:bg-[#121a2b] text-[#00B1EA] dark:text-[#33c0f0] border-slate-300 dark:border-slate-700 font-normal"
              >
                Mercado Pago
              </Badge>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-white dark:bg-[#0f1626] border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Wallet className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-700">Semia</span>
            <span>· Sistema Financeiro Pessoal</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-emerald-600">
              Entrar
            </Link>
            <Link to="/registro" className="hover:text-emerald-600">
              Criar conta
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <span>© {new Date().getFullYear()} Semia</span>
            <span className="text-slate-300">·</span>
            <span>v{APP_VERSION}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
