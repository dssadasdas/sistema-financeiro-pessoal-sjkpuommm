import { Loader2, AlertCircle, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function SkeletonCard() {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] p-5 shadow-sm animate-pulse">
      <div className="h-3 w-24 rounded-full bg-slate-100 dark:bg-slate-800 mb-3" />
      <div className="h-7 w-40 rounded-full bg-slate-100 dark:bg-slate-800" />
    </div>
  )
}

export function SkeletonList({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-sm divide-y divide-slate-100 dark:divide-slate-800 overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-3 animate-pulse">
          <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/2 rounded-full bg-slate-100 dark:bg-slate-800" />
            <div className="h-3 w-1/3 rounded-full bg-slate-100 dark:bg-slate-800" />
          </div>
          <div className="h-4 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
        </div>
      ))}
    </div>
  )
}

export function LoadingState({ message = 'Carregando...' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Loader2 className="w-7 h-7 text-emerald-600 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-500">{message}</p>
    </div>
  )
}

export function ErrorState({
  message = 'Não foi possível carregar os dados.',
  onRetry,
}: {
  message?: string
  onRetry?: () => void
}) {
  return (
    <div role="alert" className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/40 text-red-500 flex items-center justify-center mb-3">
        <AlertCircle className="w-6 h-6" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
        Algo deu errado
      </p>
      <p className="text-xs text-slate-500 mb-4 max-w-sm">{message}</p>
      {onRetry && (
        <Button
          onClick={onRetry}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl gap-1.5 font-semibold h-10 px-5"
        >
          <RotateCcw className="w-4 h-4" /> Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center rounded-2xl bg-white dark:bg-[#121A2B] border border-dashed border-slate-200 dark:border-slate-800">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mb-3">
        <Icon className="w-6 h-6" />
      </div>
      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">{title}</p>
      {description && <p className="text-xs text-slate-500 mb-4 max-w-sm">{description}</p>}
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold h-10 px-5"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
