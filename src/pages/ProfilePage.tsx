import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import pb from '@/lib/pocketbase/client'
import { getErrorMessage } from '@/lib/pocketbase/errors'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  User as UserIcon,
  Camera,
  Trash2,
  Save,
  Loader2,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Building2,
  UserCheck,
} from 'lucide-react'

// Auxiliar para formatar telefone BR: (XX) XXXXX-XXXX ou (XX) XXXX-XXXX
function formatPhoneBR(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (!digits) return ''
  if (digits.length <= 2) return `(${digits}`
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`
}

// Redimensiona / comprime imagem para no máximo 400x400 via canvas
async function resizeImageToMax400(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const reader = new FileReader()

    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.onerror = (err) => reject(err)

    img.onload = () => {
      let { width, height } = img
      const maxDim = 400

      if (width > height) {
        if (width > maxDim) {
          height = Math.round((height * maxDim) / width)
          width = maxDim
        }
      } else {
        if (height > maxDim) {
          width = Math.round((width * maxDim) / height)
          height = maxDim
        }
      }

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')

      if (!ctx) {
        reject(new Error('Não foi possível obter contexto do canvas'))
        return
      }

      ctx.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Falha ao gerar imagem comprimida'))
          }
        },
        'image/jpeg',
        0.88,
      )
    }

    img.onerror = (err) => reject(err)
    reader.readAsDataURL(file)
  })
}

export default function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { toast } = useToast()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form states
  const [name, setName] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  // Avatar states
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<Blob | null>(null)
  const [removeAvatarFlag, setRemoveAvatarFlag] = useState(false)

  // Loading & validation
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize fields from user
  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setDisplayName(user.display_name || '')
      setPhone(formatPhoneBR(user.phone || ''))
      // Se a data vier como ISO "2024-05-10 00:00:00.000Z" ou "2024-05-10", pegar YYYY-MM-DD
      if (user.birth_date) {
        const d = user.birth_date.split('T')[0].split(' ')[0]
        setBirthDate(d)
      } else {
        setBirthDate('')
      }
      setCity(user.city || '')
      setState(user.state || '')
      setAvatarPreview(null)
      setSelectedAvatarFile(null)
      setRemoveAvatarFlag(false)
    }
  }, [user])

  // Get current avatar URL from PocketBase if available
  const existingAvatarUrl =
    user?.avatar && user?.id ? pb.files.getURL(user, user.avatar, { thumb: '400x400' }) : null

  // Active display image (preview > existing unless flagged for removal)
  const currentAvatarSrc = removeAvatarFlag ? null : avatarPreview || existingAvatarUrl

  // Iniciais do usuário
  const initials = (name || user?.name || user?.email || 'U').trim().slice(0, 2).toUpperCase()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limitar arquivo a 5MB
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'Selecione uma imagem de até 5MB.',
        variant: 'destructive',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    // Aceita JPG, JPEG, PNG, WEBP
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
    if (!validTypes.includes(file.type)) {
      toast({
        title: 'Formato não suportado',
        description: 'Envie uma imagem nos formatos JPG, PNG ou WEBP.',
        variant: 'destructive',
      })
      if (fileInputRef.current) fileInputRef.current.value = ''
      return
    }

    try {
      const resizedBlob = await resizeImageToMax400(file)
      setSelectedAvatarFile(resizedBlob)
      setRemoveAvatarFlag(false)
      const previewUrl = URL.createObjectURL(resizedBlob)
      setAvatarPreview(previewUrl)
    } catch (err) {
      toast({
        title: 'Erro ao processar imagem',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    }
  }

  const handleRemovePhoto = () => {
    setAvatarPreview(null)
    setSelectedAvatarFile(null)
    setRemoveAvatarFlag(true)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneBR(e.target.value)
    setPhone(formatted)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const errs: Record<string, string> = {}
    if (!name.trim() || name.trim().length < 3) {
      errs.name = 'O nome completo deve ter no mínimo 3 caracteres.'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setSaving(true)

    try {
      const formData = new FormData()
      formData.append('name', name.trim())
      formData.append('display_name', displayName.trim())
      formData.append('phone', phone.trim())
      formData.append('birth_date', birthDate ? `${birthDate} 00:00:00.000Z` : '')
      formData.append('city', city.trim())
      formData.append('state', state.trim().toUpperCase())

      // Upload de avatar ou remoção
      if (selectedAvatarFile) {
        formData.append('avatar', selectedAvatarFile, 'avatar.jpg')
      } else if (removeAvatarFlag) {
        formData.append('avatar', '')
      }

      await pb.collection('users').update(user.id, formData)
      await refreshUser()

      // Limpa estados temporários
      setSelectedAvatarFile(null)
      setRemoveAvatarFlag(false)
      setAvatarPreview(null)

      toast({
        title: 'Perfil salvo com sucesso',
        description: 'Suas informações e foto foram atualizadas.',
      })
    } catch (err) {
      toast({
        title: 'Erro ao salvar perfil',
        description: getErrorMessage(err),
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      {/* Header */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center shrink-0">
          <UserIcon className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white truncate">
            Meu Perfil
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Atualize suas informações pessoais e sua foto de perfil.
          </p>
        </div>
      </div>

      <Card className="rounded-2xl border-slate-200 dark:border-slate-800 bg-white dark:bg-[#121a2b] shadow-sm overflow-hidden">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800/80 pb-4">
          <CardTitle className="text-lg text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            Dados Cadastrais
          </CardTitle>
          <CardDescription className="text-slate-500 dark:text-slate-400">
            Mantenha seus dados sincronizados no sistema Semeia.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Grid principal: 2 colunas no desktop (foto à esquerda, campos à direita) */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
              {/* Coluna Foto de Perfil (esquerda no desktop) */}
              <div className="md:col-span-4 flex flex-col items-center text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/80">
                <Label className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-4 block">
                  Foto de Perfil
                </Label>

                {/* Avatar circular grande */}
                <div className="relative group">
                  <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-md bg-emerald-600 flex items-center justify-center text-white">
                    {currentAvatarSrc ? (
                      <img
                        src={currentAvatarSrc}
                        alt="Foto de perfil"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl font-extrabold tracking-tight select-none">
                        {initials}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-1 right-1 p-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-lg border-2 border-white dark:border-slate-900 transition-transform active:scale-90"
                    title="Alterar foto"
                    aria-label="Alterar foto"
                  >
                    <Camera className="w-4 h-4" />
                  </button>
                </div>

                {/* Input de arquivo invisível */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3 max-w-[200px]">
                  Formatos aceitos: JPG, PNG, WEBP (máx. 5MB).
                </p>

                <div className="flex flex-col w-full gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full rounded-xl text-xs font-semibold border-slate-200 dark:border-slate-700 hover:bg-emerald-50 hover:text-emerald-700 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-300"
                  >
                    <Camera className="w-3.5 h-3.5 mr-1.5 text-emerald-600 dark:text-emerald-400" />
                    Alterar foto
                  </Button>

                  {(currentAvatarSrc || selectedAvatarFile) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleRemovePhoto}
                      className="w-full rounded-xl text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700 dark:hover:bg-rose-950/30"
                    >
                      <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                      Remover foto
                    </Button>
                  )}
                </div>
              </div>

              {/* Coluna Informações Pessoais (direita no desktop) */}
              <div className="md:col-span-8 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nome Completo */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="name" className="text-slate-700 dark:text-slate-300">
                      Nome completo <span className="text-rose-500">*</span>
                    </Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo da Silva"
                      className={`h-10 rounded-xl bg-white dark:bg-slate-900/60 ${
                        errors.name
                          ? 'border-rose-500 focus-visible:ring-rose-500'
                          : 'border-slate-200 dark:border-slate-700'
                      }`}
                    />
                    {errors.name && <p className="text-xs text-rose-500 mt-1">{errors.name}</p>}
                  </div>

                  {/* Nome de Exibição */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="displayName" className="text-slate-700 dark:text-slate-300">
                      Nome de exibição (como quer ser chamado)
                    </Label>
                    <Input
                      id="displayName"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder="Ex: Cadu Silva"
                      className="h-10 rounded-xl bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* E-mail (somente leitura) */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label
                      htmlFor="email"
                      className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                    >
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      E-mail (somente leitura)
                    </Label>
                    <Input
                      id="email"
                      value={user?.email || ''}
                      readOnly
                      disabled
                      className="h-10 rounded-xl bg-slate-100 dark:bg-slate-900/80 text-slate-500 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-800"
                    />
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">
                      O e-mail é a chave de login e não pode ser alterado por aqui.
                    </p>
                  </div>

                  {/* Telefone */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="phone"
                      className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                    >
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      Telefone / WhatsApp
                    </Label>
                    <Input
                      id="phone"
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      className="h-10 rounded-xl bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Data de Nascimento */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="birthDate"
                      className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                    >
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Data de nascimento
                    </Label>
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="h-10 rounded-xl bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Cidade */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="city"
                      className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                    >
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                      Cidade
                    </Label>
                    <Input
                      id="city"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Ex: São Paulo"
                      className="h-10 rounded-xl bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700"
                    />
                  </div>

                  {/* Estado (UF) */}
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="state"
                      className="text-slate-700 dark:text-slate-300 flex items-center gap-1.5"
                    >
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Estado (UF)
                    </Label>
                    <Input
                      id="state"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      placeholder="Ex: SP"
                      maxLength={2}
                      className="h-10 rounded-xl uppercase bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-700"
                    />
                  </div>
                </div>

                {/* Botão de salvar */}
                <div className="pt-4 flex justify-end">
                  <Button
                    type="submit"
                    disabled={saving}
                    className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl h-11 px-6 shadow-sm gap-2"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Salvando alterações...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        Salvar alterações
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
