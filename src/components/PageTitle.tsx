import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const APP_NAME = 'Semia'

type TitleEntry = { match: (p: string) => boolean; title: string }

const EXACT: TitleEntry[] = [
  { match: (p) => p === '/', title: 'Sistema Financeiro Pessoal' },
  { match: (p) => p === '/login', title: 'Entrar' },
  { match: (p) => p === '/registro' || p === '/cadastro', title: 'Criar conta' },
  { match: (p) => p === '/paywall', title: 'Assinar plano' },
  { match: (p) => p === '/inicio' || p === '/dashboard', title: 'Dashboard' },
  { match: (p) => p === '/transacoes' || p === '/lancamentos', title: 'Transações' },
  { match: (p) => p === '/extrato', title: 'Extrato' },
  { match: (p) => p === '/contas', title: 'Contas Bancárias' },
  { match: (p) => p === '/cartoes' || p === '/faturas', title: 'Cartões de Crédito' },
  { match: (p) => p === '/contas-a-pagar' || p === '/contas-e-boletos', title: 'Contas a Pagar' },
  { match: (p) => p === '/recorrencias' || p === '/recorrentes', title: 'Recorrências' },
  { match: (p) => p === '/parcelamentos', title: 'Parcelamentos' },
  { match: (p) => p === '/orcamento' || p === '/orcamentos', title: 'Orçamentos' },
  { match: (p) => p === '/metas', title: 'Metas' },
  { match: (p) => p === '/previsao', title: 'Previsão Financeira' },
  { match: (p) => p === '/investimentos', title: 'Investimentos' },
  { match: (p) => p === '/relatorios', title: 'Relatórios' },
  { match: (p) => p === '/ia-financeira' || p === '/assistente', title: 'Assistente IA' },
  { match: (p) => p === '/configuracoes', title: 'Configurações' },
]

const PREFIX: TitleEntry[] = [
  { match: (p) => p.startsWith('/cartoes/'), title: 'Detalhe do Cartão' },
]

function resolveTitle(pathname: string): string {
  const exact = EXACT.find((e) => e.match(pathname))
  if (exact) return exact.title
  const prefix = PREFIX.find((e) => e.match(pathname))
  if (prefix) return prefix.title
  return 'Página não encontrada'
}

export default function PageTitle() {
  const location = useLocation()

  useEffect(() => {
    const page = resolveTitle(location.pathname)
    document.title = `${page} · ${APP_NAME}`
    if (location.pathname === '/') {
      document.title = `${APP_NAME} — Sistema Financeiro Pessoal`
    }
  }, [location.pathname])

  return null
}
