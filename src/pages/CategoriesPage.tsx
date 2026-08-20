import React, { useState } from 'react'
import { useFinance } from '@/contexts/FinanceDataContext'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { CategoryItem } from '@/types/finance'
import { Tag, Plus, Trash2, Loader2, TrendingUp, TrendingDown, Filter } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { LoadingState, ErrorState, EmptyState } from '@/components/States'

export default function CategoriesPage() {
  const { toast } = useToast()
  const { customCategories, createCategory, deleteCategory, isLoading, loadError, refreshAll } =
    useFinance()

  const [newCatName, setNewCatName] = useState('')
  const [newCatType, setNewCatType] = useState<'receita' | 'despesa'>('despesa')
  const [categorySubmitting, setCategorySubmitting] = useState(false)
  const [deletingCatId, setDeletingCatId] = useState<string | null>(null)
  const [categoryToDelete, setCategoryToDelete] = useState<CategoryItem | null>(null)
  const [filterType, setFilterType] = useState<'todos' | 'receita' | 'despesa'>('todos')

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newCatName.trim()
    if (!trimmed) {
      toast({
        title: 'Nome obrigatório',
        description: 'Informe o nome da categoria.',
        variant: 'destructive',
      })
      return
    }

    setCategorySubmitting(true)
    try {
      await createCategory(trimmed, newCatType)
      setNewCatName('')
      toast({
        title: 'Categoria adicionada',
        description: `Categoria "${trimmed}" cadastrada com sucesso.`,
      })
    } catch (err) {
      toast({
        title: 'Erro ao criar categoria',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setCategorySubmitting(false)
    }
  }

  const handleConfirmDeleteCategory = async () => {
    if (!categoryToDelete) return
    setDeletingCatId(categoryToDelete.id)
    try {
      await deleteCategory(categoryToDelete.id)
      toast({
        title: 'Categoria excluída',
        description: `Categoria "${categoryToDelete.name}" foi removida.`,
      })
      setCategoryToDelete(null)
    } catch (err) {
      toast({
        title: 'Erro ao excluir',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setDeletingCatId(null)
    }
  }

  const filteredCategories = customCategories.filter((cat) => {
    if (filterType === 'todos') return true
    return cat.type === filterType
  })

  const expenseCount = customCategories.filter((c) => c.type === 'despesa').length
  const incomeCount = customCategories.filter((c) => c.type === 'receita').length

  if (isLoading) {
    return <LoadingState message="Carregando categorias..." />
  }

  if (loadError) {
    return <ErrorState message="Não foi possível carregar as categorias." onRetry={refreshAll} />
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
            <Tag className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
              Categorias
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              Gerencie suas categorias personalizadas de receitas e despesas
            </p>
          </div>
        </div>

        {/* Resumo rápido */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className="text-xs px-3 py-1 font-medium bg-white dark:bg-[#121A2B] border-slate-200 dark:border-slate-800"
          >
            <TrendingDown className="w-3.5 h-3.5 text-red-500 mr-1.5" />
            {expenseCount} Despesas
          </Badge>
          <Badge
            variant="outline"
            className="text-xs px-3 py-1 font-medium bg-white dark:bg-[#121A2B] border-slate-200 dark:border-slate-800"
          >
            <TrendingUp className="w-3.5 h-3.5 text-emerald-500 mr-1.5" />
            {incomeCount} Receitas
          </Badge>
        </div>
      </div>

      {/* Formulário para adicionar nova categoria */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2 text-slate-900 dark:text-white">
            <Plus className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Nova Categoria
          </CardTitle>
          <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
            Cadastre uma nova etiqueta para classificar seus lançamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAddCategory} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
              <div className="sm:col-span-6 space-y-1.5">
                <Label
                  htmlFor="catName"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Nome da categoria *
                </Label>
                <Input
                  id="catName"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ex: Supermercado, Freelance, Educação, Lazer..."
                  className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700"
                  disabled={categorySubmitting}
                />
              </div>

              <div className="sm:col-span-4 space-y-1.5">
                <Label
                  htmlFor="catType"
                  className="text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Tipo *
                </Label>
                <Select
                  value={newCatType}
                  onValueChange={(val) => setNewCatType(val as 'receita' | 'despesa')}
                  disabled={categorySubmitting}
                >
                  <SelectTrigger
                    id="catType"
                    className="h-10 rounded-xl bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-[#121a2b] border-slate-200 dark:border-slate-800">
                    <SelectItem value="despesa">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-red-500" />
                        <span>Despesa</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="receita">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span>Receita</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Button
                  type="submit"
                  disabled={categorySubmitting || !newCatName.trim()}
                  className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold gap-1.5"
                >
                  {categorySubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                  Adicionar
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Lista de Categorias */}
      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3">
          <div>
            <CardTitle className="text-base text-slate-900 dark:text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              Categorias Cadastradas ({customCategories.length})
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Categorias que você criou para organizar suas finanças
            </CardDescription>
          </div>

          {/* Filtro por tipo */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100 dark:bg-slate-900/60 p-1 rounded-xl border border-slate-200 dark:border-slate-800 text-xs w-full sm:w-auto">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-1 hidden sm:inline" />
            <button
              type="button"
              onClick={() => setFilterType('todos')}
              className={`flex-1 sm:flex-initial px-2 py-1 rounded-lg font-medium transition-colors text-center ${
                filterType === 'todos'
                  ? 'bg-white dark:bg-[#121A2B] text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Todas ({customCategories.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('despesa')}
              className={`flex-1 sm:flex-initial px-2 py-1 rounded-lg font-medium transition-colors text-center ${
                filterType === 'despesa'
                  ? 'bg-white dark:bg-[#121A2B] text-red-600 dark:text-red-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Despesas ({expenseCount})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('receita')}
              className={`flex-1 sm:flex-initial px-2 py-1 rounded-lg font-medium transition-colors text-center ${
                filterType === 'receita'
                  ? 'bg-white dark:bg-[#121A2B] text-emerald-600 dark:text-emerald-400 shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Receitas ({incomeCount})
            </button>
          </div>
        </CardHeader>

        <CardContent>
          {customCategories.length === 0 ? (
            <EmptyState
              icon={Tag}
              title="Nenhuma categoria personalizada"
              description="Adicione suas categorias personalizadas acima para organizar melhor suas receitas e despesas."
            />
          ) : filteredCategories.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 dark:text-slate-400">
              Nenhuma categoria encontrada com o filtro selecionado.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredCategories.map((cat) => {
                const isReceita = cat.type === 'receita'
                const isDeletingThis = deletingCatId === cat.id

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0 pr-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          isReceita ? 'bg-emerald-500' : 'bg-red-500'
                        }`}
                        style={cat.color ? { backgroundColor: cat.color } : undefined}
                      />
                      <span className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                        {cat.name}
                      </span>
                      <Badge
                        className={`text-[10px] px-2 py-0.5 font-semibold flex-shrink-0 ${
                          isReceita
                            ? 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-300/60 dark:border-emerald-500/30'
                            : 'bg-red-100 dark:bg-red-500/15 text-red-700 dark:text-red-300 border border-red-300/60 dark:border-red-500/30'
                        }`}
                      >
                        {isReceita ? 'Receita' : 'Despesa'}
                      </Badge>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={isDeletingThis}
                      onClick={() => setCategoryToDelete(cat)}
                      className="h-8 w-8 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg flex-shrink-0"
                      title="Excluir categoria"
                    >
                      {isDeletingThis ? (
                        <Loader2 className="w-4 h-4 animate-spin text-red-500" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* AlertDialog de confirmação de exclusão */}
      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => {
          if (!open) setCategoryToDelete(null)
        }}
      >
        <AlertDialogContent className="bg-white dark:bg-[#121a2b] border-slate-200 dark:border-slate-800">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-slate-900 dark:text-white">
              Excluir categoria {categoryToDelete ? `"${categoryToDelete.name}"` : ''}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 dark:text-slate-400">
              Transações que usam esta categoria não serão afetadas, mas a categoria deixará de
              aparecer na lista de opções para novos lançamentos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={!!deletingCatId}
              className="bg-transparent border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={!!deletingCatId}
              onClick={handleConfirmDeleteCategory}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold"
            >
              {deletingCatId ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                  Excluindo...
                </>
              ) : (
                'Excluir categoria'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
