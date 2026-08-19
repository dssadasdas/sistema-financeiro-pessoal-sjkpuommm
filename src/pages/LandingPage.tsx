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
  ShieldCheck,
  Lock,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default function LandingPage() {
  const features = [
    {
      icon: Wallet,
      title: 'Controle Financeiro',
      desc: 'Receitas, despesas, transferências e ajustes em tempo real com categorização inteligente.',
      color: 'text-emerald-500 bg-emerald-50 dark:bg-emerald-950/40',
    },
    {
      icon: Building2,
      title: 'Bancos e Contas',
      desc: 'Saldos calculados automaticamente por movimentação com trava de segurança de histórico.',
      color: 'text-blue-500 bg-blue-50 dark:bg-blue-950/40',
    },
    {
      icon: CreditCard,
      title: 'Cartões de Crédito',
      desc: 'Design fiel ao seu banco emissor, controle de faturas, limites e visualização rápida.',
      color: 'text-purple-500 bg-purple-50 dark:bg-purple-950/40',
    },
    {
      icon: Target,
      title: 'Metas e Conquistas',
      desc: 'Defina objetivos financeiros, acompanhe aportes e celebre cada porcentagem alcançada.',
      color: 'text-teal-500 bg-teal-50 dark:bg-teal-950/40',
    },
    {
      icon: PieChart,
      title: 'Orçamento Mensal',
      desc: 'Limites por categoria com alertas de consumo (verde, âmbar e vermelho) sem surpresas.',
      color: 'text-amber-500 bg-amber-50 dark:bg-amber-950/40',
    },
    {
      icon: TrendingUp,
      title: 'Investimentos Cripto & CDI',
      desc: 'Acompanhe Bitcoin e Ethereum com cotação em tempo real e evolução de CDB 100% CDI.',
      color: 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40',
    },
    {
      icon: FileSpreadsheet,
      title: 'Relatórios Inteligentes',
      desc: 'Gráficos donut, comparativo de 6 meses, taxa de economia e resumo em linguagem simples.',
      color: 'text-rose-500 bg-rose-50 dark:bg-rose-950/40',
    },
    {
      icon: Sparkles,
      title: 'Análise com IA',
      desc: 'Um analista financeiro pessoal que diagnostica seus gastos e sugere onde economizar.',
      color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40',
    },
  ]

  return (
    <div className="min-h-screen bg-[#F6F7FB] dark:bg-[#0B1220] text-slate-900 dark:text-slate-100 flex flex-col selection:bg-emerald-500 selection:text-white">
      {/* Header Landing */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-[#121A2B]/80 border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-md shadow-emerald-500/20 font-black text-xl">
              R
            </div>
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
              Raiz
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/entrar">
              <Button
                variant="ghost"
                className="font-medium text-slate-600 dark:text-slate-300 hover:text-emerald-600"
              >
                Entrar
              </Button>
            </Link>
            <Link to="/cadastrar">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm shadow-emerald-600/30">
                Criar Conta Grátis
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 text-center">
          <Badge className="mb-4 py-1.5 px-3.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
            ✨ O Sistema Financeiro Pessoal Mais Completo e Moderno
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight max-w-4xl mx-auto text-slate-900 dark:text-white leading-[1.15]">
            Sua vida financeira em{' '}
            <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-blue-600 bg-clip-text text-transparent">
              um só lugar
            </span>
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Controle receitas, despesas, bancos, faturas de cartões, metas, orçamento, investimentos
            cripto/CDI e conte com uma IA especialista nos seus dados.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/cadastrar" className="w-full sm:w-auto">
              <Button
                size="lg"
                className="w-full sm:w-auto h-13 px-8 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-base shadow-lg shadow-emerald-600/25 gap-2"
              >
                Começar Agora Grátis <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link to="/entrar" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="w-full sm:w-auto h-13 px-8 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 font-semibold text-base"
              >
                Já possuo conta
              </Button>
            </Link>
          </div>

          {/* Floating UI Mockup */}
          <div className="mt-14 max-w-4xl mx-auto relative">
            <div className="p-4 sm:p-6 bg-white dark:bg-[#121A2B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 text-left">
              <div className="flex flex-wrap items-center justify-between pb-4 mb-4 border-b border-slate-100 dark:border-slate-800 gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="text-xs font-semibold text-slate-400 ml-2">
                    Painel Raiz Financeiro
                  </span>
                </div>
                <Badge
                  variant="outline"
                  className="text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300"
                >
                  Resumo deste mês: +R$ 8.500,00 recebidos
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Saldo Total
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">
                    R$ 16.500,00
                  </div>
                  <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">
                    ↑ 100% positivo
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Despesas do Mês
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-orange-600 tabular-nums mt-1">
                    R$ 814,80
                  </div>
                  <span className="text-xs text-slate-500 mt-1 inline-block">
                    Dentro do orçamento
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Patrimônio Investido
                  </span>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600 tabular-nums mt-1">
                    R$ 15.000,00
                  </div>
                  <span className="text-xs text-emerald-600 font-medium mt-1 inline-block">
                    +R$ 1.940,50 de rendimento
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-16 bg-white dark:bg-[#121A2B]/50 border-y border-slate-200 dark:border-slate-800">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
              Tudo o que você precisa para dominar suas finanças
            </h2>
            <p className="mt-3 text-slate-600 dark:text-slate-400">
              Interface limpa, moderna, sem poluição visual e projetada para funcionar
              impecavelmente no seu celular e no computador.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon
              return (
                <Card
                  key={i}
                  className="rounded-2xl border-slate-200/80 dark:border-slate-800 hover:shadow-lg transition-all duration-200"
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
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      {f.desc}
                    </p>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </section>

      {/* Investments Highlight */}
      <section className="py-16 bg-slate-50 dark:bg-[#0B1220]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <Badge className="mb-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-medium">
                Investimentos em Tempo Real
              </Badge>
              <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-tight">
                Criptomoedas & Renda Fixa integradas
              </h2>
              <p className="mt-4 text-slate-600 dark:text-slate-400 leading-relaxed">
                Acompanhe o valor de mercado de seus Bitcoins e Ethereums atualizados
                automaticamente. Simule a rentabilidade de CDBs 100% CDI com cálculo regressivo de
                Imposto de Renda e IOF.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span>Cotações públicas atualizadas de BTC e ETH</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span>Cálculo de evolução CDI 100% com tabela regressiva de IR</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                  <span>Ações brasileiras e Fundos Imobiliários (FIIs)</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#121A2B] rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <span className="font-bold text-slate-900 dark:text-white">Carteira Modelo</span>
                <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full">
                  +12.9% rentabilidade
                </span>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    ₿
                  </div>
                  <div>
                    <div className="font-semibold text-sm">Bitcoin (BTC)</div>
                    <div className="text-xs text-slate-500">0.0125 BTC</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm tabular-nums">R$ 6.000,00</div>
                  <div className="text-xs text-emerald-600 font-medium">+R$ 1.000,00</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                    %
                  </div>
                  <div>
                    <div className="font-semibold text-sm">CDB 100% CDI</div>
                    <div className="text-xs text-slate-500">Liquidez diária</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm tabular-nums">R$ 10.940,50</div>
                  <div className="text-xs text-emerald-600 font-medium">+R$ 940,50</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section (Mandatory R$ 11,99 e R$ 119,99) */}
      <section className="py-20 bg-white dark:bg-[#121A2B]/60 border-t border-slate-200 dark:border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center">
          <Badge className="mb-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">
            Planos Simples e Transparentes
          </Badge>
          <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white">
            Invista na sua tranquilidade financeira
          </h2>
          <p className="mt-3 text-slate-600 dark:text-slate-400 max-w-xl mx-auto">
            Acesso completo a todas as ferramentas, cartões, relatórios, importador de faturas e IA
            Financeira.
          </p>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {/* Mensal */}
            <Card className="rounded-2xl border-slate-200 dark:border-slate-800 p-6 sm:p-8 flex flex-col justify-between text-left hover:border-emerald-500/50 transition-all">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Plano Mensal</h3>
                <p className="text-sm text-slate-500 mt-1">Flexibilidade mês a mês</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                    R$ 11,99
                  </span>
                  <span className="text-slate-500 text-sm">/mês</span>
                </div>
                <ul className="mt-6 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Todas as contas e bancos
                    ilimitados
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Cartões de crédito com
                    visual do banco
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Importação inteligente de
                    faturas
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
              <Link to="/cadastrar" className="mt-8">
                <Button className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white font-medium h-12">
                  Assinar Mensal
                </Button>
              </Link>
            </Card>

            {/* Anual (Destaque) */}
            <Card className="rounded-2xl border-2 border-emerald-500 p-6 sm:p-8 flex flex-col justify-between text-left relative bg-emerald-50/20 dark:bg-emerald-950/20 shadow-xl shadow-emerald-500/10">
              <div className="absolute -top-3.5 right-6">
                <Badge className="bg-emerald-600 text-white font-bold text-xs py-1 px-3 shadow-md">
                  Mais econômico · Economize 2 meses
                </Badge>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Plano Anual</h3>
                <p className="text-sm text-slate-500 mt-1">O plano preferido dos usuários</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                    R$ 119,99
                  </span>
                  <span className="text-slate-500 text-sm">/ano</span>
                </div>
                <span className="text-xs font-semibold text-emerald-600 block mt-1">
                  Equivalente a apenas R$ 9,99/mês
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
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" /> 2 meses grátis garantidos
                  </li>
                </ul>
              </div>
              <Link to="/cadastrar" className="mt-8">
                <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 shadow-lg shadow-emerald-600/30">
                  Assinar Anual (Economize)
                </Button>
              </Link>
            </Card>
          </div>

          <p className="mt-6 text-xs text-slate-500 flex items-center justify-center gap-2">
            <Lock className="w-3.5 h-3.5" /> Pagamento confirma o acesso completo ao painel do
            usuário.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-8 bg-slate-100 dark:bg-[#0B1220] border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-xs">
              R
            </div>
            <span className="font-bold text-slate-700 dark:text-slate-300">Raiz</span>
            <span>· Sistema Financeiro Pessoal</span>
          </div>
          <div>© {new Date().getFullYear()} Raiz. Todos os direitos reservados.</div>
        </div>
      </footer>
    </div>
  )
}
