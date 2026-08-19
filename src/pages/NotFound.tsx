import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9] dark:bg-[#0b1120] px-4">
      <div className="text-center">
        <h1 className="text-6xl font-black text-emerald-600 dark:text-emerald-400 mb-2">404</h1>
        <p className="text-xl text-slate-700 dark:text-slate-200 font-semibold mb-1">
          Página não encontrada
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
          A página que você procura não existe ou foi movida.
        </p>
        <Link
          to="/"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm"
        >
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}

export default NotFound
