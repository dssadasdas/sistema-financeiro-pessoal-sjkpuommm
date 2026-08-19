import { Link } from 'react-router-dom'

const NotFound = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F6F7F9] px-4">
      <div className="text-center">
        <h1 className="text-6xl font-black text-emerald-600 mb-2">404</h1>
        <p className="text-xl text-slate-700 font-semibold mb-1">Página não encontrada</p>
        <p className="text-sm text-slate-500 mb-6">
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
