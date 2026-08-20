import React, { useState, useMemo, useRef, useEffect } from 'react'
import {
  FINANCIAL_INSTITUTIONS,
  FinancialInstitution,
  findInstitution,
  searchInstitutions,
} from '@/data/institutions'
import { BankLogoIcon } from '@/components/BankLogoIcon'
import { Search, Check, ChevronDown, Building2, Palette } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface BankSelectorProps {
  value: string // shortName or name or id
  onChange: (
    institution: FinancialInstitution,
    customDetails?: { name?: string; color?: string; code?: string },
  ) => void
  customName?: string
  customColor?: string
  customCode?: string
  onCustomDetailsChange?: (details: { name: string; color: string; code: string }) => void
  label?: string
  error?: string
  disabled?: boolean
}

export const BankSelector: React.FC<BankSelectorProps> = ({
  value,
  onChange,
  customName = '',
  customColor = '#64748B',
  customCode = '',
  onCustomDetailsChange,
  label = 'Instituição / Banco',
  error,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectedInstitution = useMemo(() => {
    return findInstitution(value)
  }, [value])

  const filteredInstitutions = useMemo(() => {
    return searchInstitutions(search)
  }, [search])

  const isOther = selectedInstitution.id === 'outro'

  useEffect(() => {
    if (open) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 100)
    } else {
      setSearch('')
    }
  }, [open])

  const handleSelect = (inst: FinancialInstitution) => {
    onChange(inst, {
      name: inst.id === 'outro' ? customName : inst.shortName,
      color: inst.id === 'outro' ? customColor : inst.primaryColor,
      code: inst.id === 'outro' ? customCode : inst.code,
    })
    setOpen(false)
  }

  const handleCustomNameChange = (newName: string) => {
    if (onCustomDetailsChange) {
      onCustomDetailsChange({
        name: newName,
        color: customColor,
        code: customCode,
      })
    }
  }

  const handleCustomColorChange = (newColor: string) => {
    if (onCustomDetailsChange) {
      onCustomDetailsChange({
        name: customName,
        color: newColor,
        code: customCode,
      })
    }
  }

  const handleCustomCodeChange = (newCode: string) => {
    if (onCustomDetailsChange) {
      onCustomDetailsChange({
        name: customName,
        color: customColor,
        code: newCode,
      })
    }
  }

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {label} *
        </Label>
      )}

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className="w-full h-12 justify-between rounded-xl px-3 border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] hover:bg-slate-50 dark:hover:bg-slate-900/60 shadow-sm"
          >
            <div className="flex items-center gap-2.5 min-w-0 text-left">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center shadow-xs">
                <BankLogoIcon
                  institutionId={selectedInstitution.id}
                  customColor={isOther && customColor ? customColor : undefined}
                  size={32}
                  className="w-8 h-8 object-contain"
                />
              </div>
              <div className="min-w-0 flex flex-col">
                <span className="font-semibold text-xs sm:text-sm text-slate-900 dark:text-white truncate">
                  {isOther && customName.trim() ? customName : selectedInstitution.name}
                </span>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                  {selectedInstitution.code && (
                    <span className="font-mono">Cód: {selectedInstitution.code}</span>
                  )}
                  {selectedInstitution.code && <span>•</span>}
                  <span className="capitalize">{selectedInstitution.type.replace('_', ' ')}</span>
                </div>
              </div>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-[calc(100vw-2rem)] sm:w-[420px] p-0 rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121A2B] shadow-xl z-50"
          align="start"
          sideOffset={6}
        >
          {/* Campo de Busca Inteligente */}
          <div className="p-3 border-b border-slate-100 dark:border-slate-800">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                ref={searchInputRef}
                placeholder="Pesquise por nome (Nubank), código (341), etc..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 h-9 rounded-xl text-xs bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus-visible:ring-1"
              />
            </div>
            <div className="flex items-center justify-between mt-2 px-1 text-[11px] text-slate-400">
              <span>{filteredInstitutions.length} instituições encontradas</span>
              <span>Ex: Nubank, 341, Itaú, Sicoob</span>
            </div>
          </div>

          {/* Lista de Instituições */}
          <div className="max-h-72 overflow-y-auto p-1.5 divide-y divide-slate-50 dark:divide-slate-900/50 scrollbar-thin">
            {filteredInstitutions.length === 0 ? (
              <div className="py-8 text-center px-4">
                <Building2 className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Nenhuma instituição encontrada para "{search}"
                </p>
                <p className="text-[11px] text-slate-400 mt-1 mb-3">
                  Você pode usar a opção «Outro banco / instituição» e personalizar.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const otherInst = FINANCIAL_INSTITUTIONS.find((i) => i.id === 'outro')!
                    handleSelect(otherInst)
                    if (onCustomDetailsChange && search.trim()) {
                      onCustomDetailsChange({
                        name: search.trim(),
                        color: customColor,
                        code: customCode,
                      })
                    }
                  }}
                  className="rounded-xl text-xs"
                >
                  Usar "{search.trim() || 'Outro'}" como Novo Banco
                </Button>
              </div>
            ) : (
              filteredInstitutions.map((inst) => {
                const isSelected = selectedInstitution.id === inst.id
                return (
                  <button
                    key={inst.id}
                    type="button"
                    onClick={() => handleSelect(inst)}
                    className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition-all ${
                      isSelected
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-950 dark:text-emerald-200'
                        : 'hover:bg-slate-100 dark:hover:bg-slate-900/80 text-slate-900 dark:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl flex-shrink-0 flex items-center justify-center shadow-xs overflow-hidden">
                        <BankLogoIcon
                          institutionId={inst.id}
                          size={36}
                          className="w-9 h-9 object-contain"
                        />
                      </div>
                      <div className="min-w-0 flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-xs truncate">{inst.shortName}</span>
                          {inst.popular && (
                            <Badge
                              variant="secondary"
                              className="text-[9px] px-1 py-0 h-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium"
                            >
                              Popular
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 truncate">
                          <span className="truncate">{inst.name}</span>
                          {inst.code && (
                            <>
                              <span>•</span>
                              <span className="font-mono font-medium text-slate-500">
                                #{inst.code}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {isSelected && (
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0 ml-2" />
                    )}
                  </button>
                )
              })
            )}
          </div>

          {/* Rodapé com botão rápido Outro */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">Não encontrou o seu?</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                const otherInst = FINANCIAL_INSTITUTIONS.find((i) => i.id === 'outro')!
                handleSelect(otherInst)
              }}
              className="h-7 text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700"
            >
              + Outro Banco / Cooperativa
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Formulário complementar quando seleciona "Outro banco / instituição" */}
      {isOther && (
        <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/40 space-y-3 animate-in fade-in-50 duration-200">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Personalização da Instituição
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">Nome do Banco / Instituição *</Label>
              <Input
                placeholder="Ex: Cooperativa Regional, Carteira EUR"
                value={customName}
                onChange={(e) => handleCustomNameChange(e.target.value)}
                className="h-9 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-[11px] text-slate-500">Código Compe (Opcional)</Label>
              <Input
                placeholder="Ex: 999"
                value={customCode}
                onChange={(e) => handleCustomCodeChange(e.target.value)}
                className="h-9 rounded-lg text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-[11px] text-slate-500">Cor do Card / Detalhe Visual</Label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={customColor || '#64748B'}
                onChange={(e) => handleCustomColorChange(e.target.value)}
                className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 cursor-pointer p-0.5 bg-white dark:bg-slate-900"
              />
              <span className="text-xs font-mono text-slate-600 dark:text-slate-400">
                {customColor || '#64748B'}
              </span>
              <div className="flex items-center gap-1.5 ml-auto">
                {['#820AD1', '#EC7000', '#005CA9', '#003882', '#EC0000', '#10B981', '#64748B'].map(
                  (c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => handleCustomColorChange(c)}
                      className="w-5 h-5 rounded-full border border-white/50 shadow-xs transition-transform hover:scale-110"
                      style={{ backgroundColor: c }}
                    />
                  ),
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {error && <span className="text-[11px] text-red-500 font-medium block">{error}</span>}
    </div>
  )
}
