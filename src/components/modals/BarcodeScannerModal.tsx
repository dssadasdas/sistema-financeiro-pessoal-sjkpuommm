import React, { useEffect, useRef, useState } from 'react'
import {
  Camera,
  CameraOff,
  Keyboard,
  Clipboard,
  Check,
  AlertCircle,
  Sparkles,
  Maximize2,
  RefreshCw,
  X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

interface BarcodeScannerModalProps {
  open: boolean
  onClose: () => void
  onDetected: (code: string, parsedData?: { value?: number; dueDate?: string }) => void
}

/**
 * Função utilitária para validar e extrair valor/data de linha digitável ou código de barras de boleto brasileiro
 */
export function parseBrazilianBoleto(rawCode: string): {
  cleanCode: string
  formattedCode: string
  value?: number
  dueDate?: string
  isValid: boolean
  type: 'boleto_bancario' | 'arrecadacao' | 'desconhecido'
} {
  const clean = rawCode.replace(/[^\d]/g, '')
  let type: 'boleto_bancario' | 'arrecadacao' | 'desconhecido' = 'desconhecido'
  let value: number | undefined
  let dueDate: string | undefined
  let formattedCode = rawCode

  if (clean.length === 47 || clean.length === 44) {
    type = 'boleto_bancario'
    // Formata linha digitável bancária (AAABC.CCCCX DDDDD.DDDDDY EEEEE.EEEEEZ K UUUUVVVVVVVVVV)
    if (clean.length === 47) {
      formattedCode = `${clean.slice(0, 5)}.${clean.slice(5, 10)} ${clean.slice(10, 15)}.${clean.slice(15, 21)} ${clean.slice(21, 26)}.${clean.slice(26, 32)} ${clean.slice(32, 33)} ${clean.slice(33)}`

      // Extrai fator de vencimento (posições 33 a 37) e valor (posições 37 a 47)
      const factorStr = clean.slice(33, 37)
      const valueStr = clean.slice(37, 47)

      const factor = parseInt(factorStr, 10)
      if (!isNaN(factor) && factor > 0) {
        // Base de cálculo do fator de vencimento: 07/10/1997
        // Nota: boletos após 2025 usam a nova base cíclica, mas calculamos adequadamente
        const baseDate = new Date(1997, 9, 7)
        // Se o fator for >= 1000, adiciona os dias
        if (factor >= 1000) {
          const calcDate = new Date(baseDate)
          calcDate.setDate(calcDate.getDate() + factor)
          // Se cair antes de 2025 e hoje for > 2025, pode ser o ciclo adicional de 9000 dias (FEBRABAN 2025)
          const nowYear = new Date().getFullYear()
          if (calcDate.getFullYear() < 2020 && nowYear >= 2025) {
            calcDate.setDate(calcDate.getDate() + 9000)
          }
          dueDate = calcDate.toISOString().slice(0, 10)
        }
      }

      const valNum = parseInt(valueStr, 10)
      if (!isNaN(valNum) && valNum > 0) {
        value = valNum / 100
      }
    }
  } else if (clean.length === 48) {
    type = 'arrecadacao'
    formattedCode = `${clean.slice(0, 12)} ${clean.slice(12, 24)} ${clean.slice(24, 36)} ${clean.slice(36, 48)}`
    // Concessionárias (energia, água, etc.)
    const valStr = clean.slice(4, 15)
    const valNum = parseInt(valStr, 10)
    if (!isNaN(valNum) && valNum > 0) {
      value = valNum / 100
    }
  }

  return {
    cleanCode: clean,
    formattedCode,
    value,
    dueDate,
    isValid: clean.length >= 44 && clean.length <= 48,
    type,
  }
}

export default function BarcodeScannerModal({
  open,
  onClose,
  onDetected,
}: BarcodeScannerModalProps) {
  const [activeMode, setActiveMode] = useState<'camera' | 'paste' | 'manual'>('camera')
  const [manualCode, setManualCode] = useState('')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [supportedFormats, setSupportedFormats] = useState<string[]>([])
  const [hasNativeDetector, setHasNativeDetector] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const scanIntervalRef = useRef<any>(null)

  useEffect(() => {
    // Checa suporte nativo a BarcodeDetector
    if (typeof window !== 'undefined' && 'BarcodeDetector' in window) {
      setHasNativeDetector(true)
      // @ts-expect-error
      window.BarcodeDetector.getSupportedFormats()
        .then((formats: string[]) => {
          setSupportedFormats(formats)
        })
        .catch(() => {})
    }
  }, [])

  // Inicializa a câmera quando o modal abre no modo 'camera'
  useEffect(() => {
    if (!open) {
      stopCamera()
      return
    }

    if (activeMode === 'camera') {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [open, activeMode])

  const startCamera = async () => {
    setCameraError(null)
    setIsScanning(true)
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Acesso à câmera não suportado neste navegador')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }

      // Inicia detecção contínua se houver BarcodeDetector
      startBarcodeDetection()
    } catch (err: any) {
      console.warn('Câmera indisponível:', err)
      setCameraError(
        'Não foi possível acessar a câmera do dispositivo. Verifique as permissões ou use a digitação/colagem de código.',
      )
      setIsScanning(false)
      setActiveMode('paste')
    }
  }

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current)
      scanIntervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setIsScanning(false)
  }

  const startBarcodeDetection = () => {
    if (typeof window === 'undefined' || !('BarcodeDetector' in window)) {
      return
    }

    try {
      // @ts-expect-error
      const detector = new window.BarcodeDetector({
        formats: ['itf', 'code_128', 'code_39', 'ean_13', 'upc_a', 'qr_code'],
      })

      scanIntervalRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return

        try {
          const barcodes = await detector.detect(videoRef.current)
          if (barcodes && barcodes.length > 0) {
            const code = barcodes[0].rawValue
            if (code) {
              handleCodeFound(code)
            }
          }
        } catch (e) {
          // loop continua
        }
      }, 500)
    } catch (e) {
      console.warn('BarcodeDetector init error:', e)
    }
  }

  const handleCodeFound = (code: string) => {
    stopCamera()
    const parsed = parseBrazilianBoleto(code)
    onDetected(parsed.formattedCode || code, {
      value: parsed.value,
      dueDate: parsed.dueDate,
    })
    onClose()
  }

  const handlePasteFromClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText()
        if (text) {
          setManualCode(text)
        }
      }
    } catch (e) {
      console.warn('Falha ao ler clipboard:', e)
    }
  }

  const handleConfirmManual = () => {
    if (!manualCode.trim()) return
    const parsed = parseBrazilianBoleto(manualCode)
    onDetected(parsed.formattedCode || manualCode.trim(), {
      value: parsed.value,
      dueDate: parsed.dueDate,
    })
    onClose()
  }

  if (!open) return null

  const parsedPreview = manualCode.trim() ? parseBrazilianBoleto(manualCode) : null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-fade-in">
      <div className="bg-white dark:bg-[#121A2B] rounded-3xl w-full max-w-lg border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center font-bold shadow-xs">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white">
                Código de Barras do Boleto
              </h3>
              <p className="text-xs text-slate-500">Câmera, colagem rápida ou digitação</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-xl text-slate-400 hover:text-slate-600"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="p-3 bg-slate-50/70 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800 flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveMode('camera')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeMode === 'camera'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Camera className="w-4 h-4" />
            Câmera do Celular
          </button>
          <button
            type="button"
            onClick={() => setActiveMode('paste')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeMode === 'paste'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800'
            }`}
          >
            <Clipboard className="w-4 h-4" />
            Colar / Digitar
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-4">
          {activeMode === 'camera' && (
            <div className="space-y-4">
              {cameraError ? (
                <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="font-semibold">{cameraError}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setActiveMode('paste')}
                      className="rounded-xl text-xs bg-white dark:bg-slate-900"
                    >
                      Usar Digitação / Colagem
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-4/3 flex items-center justify-center border-2 border-emerald-500/40 shadow-inner">
                  <video ref={videoRef} playsInline muted className="w-full h-full object-cover" />

                  {/* Laser / Scanner Reticle Overlay */}
                  <div className="absolute inset-0 pointer-events-none flex items-center justify-center p-6">
                    <div className="w-full h-24 border-2 border-dashed border-emerald-400 rounded-xl relative flex items-center justify-center shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                      <div className="w-full h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
                      <span className="absolute -bottom-6 text-[10px] font-bold text-white bg-black/60 px-2 py-0.5 rounded-full">
                        Alinhe a linha ou barras do boleto aqui
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-500 text-center">
                Aponte a câmera para o código de barras ou linha digitável impressa no boleto.
              </p>
            </div>
          )}

          {activeMode === 'paste' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    Linha digitável ou Código de Barras
                  </Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handlePasteFromClipboard}
                    className="h-7 text-xs rounded-lg gap-1 border-slate-200"
                  >
                    <Clipboard className="w-3.5 h-3.5" /> Colar
                  </Button>
                </div>
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Ex: 34191.79001 01043.510047 91020.150008 5 95600000070000"
                  className="font-mono text-xs rounded-xl h-11"
                  autoFocus
                />
              </div>

              {parsedPreview && parsedPreview.cleanCode.length > 0 && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-semibold">Identificação:</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] font-bold ${
                        parsedPreview.isValid
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                          : 'bg-amber-50 text-amber-700 border-amber-300'
                      }`}
                    >
                      {parsedPreview.isValid
                        ? parsedPreview.type === 'boleto_bancario'
                          ? 'Boleto Bancário Válido'
                          : 'Arrecadação / Concessionária'
                        : 'Código incompleto / manual'}
                    </Badge>
                  </div>

                  {parsedPreview.value !== undefined && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Valor detectado:</span>
                      <strong className="text-emerald-600 font-bold">
                        R$ {parsedPreview.value.toFixed(2)}
                      </strong>
                    </div>
                  )}

                  {parsedPreview.dueDate && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 font-semibold">Vencimento detectado:</span>
                      <strong className="text-slate-900 dark:text-white font-bold">
                        {parsedPreview.dueDate.split('-').reverse().join('/')}
                      </strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="rounded-xl text-xs font-semibold"
          >
            Cancelar
          </Button>

          {activeMode === 'paste' ? (
            <Button
              type="button"
              disabled={!manualCode.trim()}
              onClick={handleConfirmManual}
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold gap-1.5"
            >
              <Check className="w-4 h-4" /> Aplicar Código
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => setActiveMode('paste')}
              className="rounded-xl text-xs font-bold"
            >
              Digitar Manualmente
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
