import React from 'react'

interface SemeiaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  className?: string
  textClassName?: string
  variant?: 'solid' | 'glass' | 'white'
}

const sizeMap = {
  xs: { box: 'w-6 h-6 rounded-lg', text: 'text-base', svg: 16 },
  sm: { box: 'w-8 h-8 rounded-xl', text: 'text-lg', svg: 20 },
  md: { box: 'w-9 h-9 rounded-xl', text: 'text-xl', svg: 22 },
  lg: { box: 'w-11 h-11 rounded-2xl', text: 'text-2xl', svg: 26 },
  xl: { box: 'w-14 h-14 rounded-2xl', text: 'text-3xl', svg: 32 },
}

/**
 * Ícone estilizado do "S" de Semeia:
 * Formato fluido e elegante evocando crescimento, finanças e semeadura,
 * em gradiente verde esmeralda vibrante.
 */
export const SemeiaIcon: React.FC<{ size?: number; className?: string; color?: string }> = ({
  size = 24,
  className = '',
  color = 'currentColor',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M33 13.5C31.2 10.5 27.8 8.5 23.5 8.5C17.7 8.5 13 12.8 13 18C13 23.5 17.5 26.2 24.5 28C30.8 29.6 34.5 32.2 34.5 37C34.5 42.5 29.5 46.5 23.5 46.5C18.2 46.5 14.2 43.8 12 39.5"
        stroke={color}
        strokeWidth="6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Detalhe de broto/semente na ponta superior direita */}
      <circle cx="34.5" cy="11.5" r="2.5" fill={color} />
    </svg>
  )
}

export const SemeiaLogo: React.FC<SemeiaLogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  textClassName = '',
  variant = 'solid',
}) => {
  const conf = sizeMap[size]

  let boxClasses = `${conf.box} flex items-center justify-center shrink-0 transition-transform`
  let iconColor = '#FFFFFF'

  if (variant === 'solid') {
    boxClasses +=
      ' bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white shadow-md shadow-emerald-600/25'
  } else if (variant === 'glass') {
    boxClasses += ' bg-white/15 backdrop-blur-md border border-white/30 text-white shadow-lg'
  } else if (variant === 'white') {
    boxClasses += ' bg-white text-emerald-600 shadow-md'
    iconColor = '#059669'
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div className={boxClasses}>
        <SemeiaIcon size={conf.svg} color={iconColor} />
      </div>
      {showText && (
        <span
          className={`font-extrabold tracking-tight select-none ${conf.text} ${textClassName || 'text-slate-900 dark:text-white'}`}
        >
          Semeia
        </span>
      )}
    </div>
  )
}

export default SemeiaLogo
