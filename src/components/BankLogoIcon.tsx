import React from 'react'
import { FINANCIAL_INSTITUTIONS, findInstitution } from '@/data/institutions'

interface BankLogoIconProps {
  institutionId?: string
  bankName?: string
  className?: string
  size?: number
  customColor?: string
}

export const BankLogoIcon: React.FC<BankLogoIconProps> = ({
  institutionId,
  bankName,
  className = 'w-6 h-6',
  size = 24,
  customColor,
}) => {
  const institution = institutionId
    ? FINANCIAL_INSTITUTIONS.find((i) => i.id === institutionId) || findInstitution(bankName)
    : findInstitution(bankName)

  const id = institution.id

  if (id === 'nubank') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#820AD1" />
        <path
          d="M14 34V15.5C14 14.67 14.67 14 15.5 14H18.5C19.33 14 20 14.67 20 15.5V26.5C20 28.5 21.5 30 23.5 30C25.5 30 27 28.5 27 26.5V15.5C27 14.67 27.67 14 28.5 14H31.5C32.33 14 33 14.67 33 15.5V26.5C33 31.5 29 35.5 24 35.5C19 35.5 15 31.5 15 26.5V34H14Z"
          fill="white"
        />
      </svg>
    )
  }

  if (id === 'itau') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#EC7000" />
        <rect x="10" y="10" width="28" height="28" rx="7" fill="#003399" />
        <text
          x="24"
          y="29"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="13"
          fontWeight="900"
          fill="#FFE600"
          textAnchor="middle"
        >
          itaú
        </text>
      </svg>
    )
  }

  if (id === 'bradesco') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#CC092F" />
        <path
          d="M24 13C17.925 13 13 17.925 13 24C13 30.075 17.925 35 24 35C27.2 35 30.075 33.625 32.075 31.425L28.8 28.575C27.525 29.85 25.85 30.625 24 30.625C20.35 30.625 17.375 27.65 17.375 24C17.375 20.35 20.35 17.375 24 17.375C25.85 17.375 27.525 18.15 28.8 19.425L32.075 16.575C30.075 14.375 27.2 13 24 13Z"
          fill="white"
        />
        <circle cx="31" cy="24" r="3.5" fill="white" />
      </svg>
    )
  }

  if (id === 'caixa' || id === 'caixa_tem') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#005CA9" />
        <path
          d="M15 15L23 23L15 31H19L25 25L31 31H35L27 23L35 15H31L25 21L19 15H15Z"
          fill="#F37021"
        />
        <path
          d="M22 23L17 18H20.5L24 21.5L27.5 18H31L26 23L31 28H27.5L24 24.5L20.5 28H17L22 23Z"
          fill="white"
        />
      </svg>
    )
  }

  if (id === 'banco_do_brasil') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#003882" />
        <path
          d="M24 11L13 22L24 33L35 22L24 11ZM24 17.5L28.5 22L24 26.5L19.5 22L24 17.5Z"
          fill="#FCDB00"
        />
        <path d="M13 26L24 37L35 26L31.5 22.5L24 30L16.5 22.5L13 26Z" fill="#FCDB00" />
      </svg>
    )
  }

  if (id === 'santander') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#EC0000" />
        <path
          d="M20 34C17.5 31.5 16 27.5 17 24C17.5 22 19 20 20 18C20 20.5 21 22 22 24C22.5 21 23.5 18 24 14C25 18 26.5 21 27 24C28 22 29 20.5 29 18C30 20 31.5 22 32 24C33 27.5 31.5 31.5 29 34C26.5 36.5 22.5 36.5 20 34Z"
          fill="white"
        />
      </svg>
    )
  }

  if (id === 'inter') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#FF7A00" />
        <text
          x="24"
          y="29"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="12"
          fontWeight="900"
          fill="white"
          letterSpacing="-0.5"
          textAnchor="middle"
        >
          inter
        </text>
      </svg>
    )
  }

  if (id === 'c6') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#242424" />
        <text
          x="24"
          y="30"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="15"
          fontWeight="900"
          fill="#FFB800"
          letterSpacing="0.5"
          textAnchor="middle"
        >
          C6
        </text>
      </svg>
    )
  }

  if (id === 'sicoob') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#003641" />
        <circle cx="18" cy="24" r="7" fill="#00AE9D" />
        <circle cx="30" cy="24" r="7" fill="#88C057" />
        <path
          d="M24 19.5C25.5 20.8 26.5 22.3 26.5 24C26.5 25.7 25.5 27.2 24 28.5C22.5 27.2 21.5 25.7 21.5 24C21.5 22.3 22.5 20.8 24 19.5Z"
          fill="#005B60"
        />
      </svg>
    )
  }

  if (id === 'sicredi') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#006633" />
        <path
          d="M16 26C16 20 20 16 26 16C28 16 30 17 32 18.5L29 21.5C28 20.5 27 20 26 20C22.5 20 20 22.5 20 26C20 29.5 22.5 32 26 32C28.5 32 30.5 30.5 31.5 28.5H26V25H35.5V31C33.5 34 30 36 26 36C20 36 16 32 16 26Z"
          fill="#78BE20"
        />
      </svg>
    )
  }

  if (id === 'btg_pactual') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#001E62" />
        <text
          x="24"
          y="29"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="11"
          fontWeight="900"
          fill="#FFFFFF"
          letterSpacing="-0.2"
          textAnchor="middle"
        >
          BTG
        </text>
      </svg>
    )
  }

  if (id === 'safra') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#0F1E36" />
        <rect x="8" y="8" width="32" height="32" rx="6" stroke="#B89758" strokeWidth="2" />
        <text
          x="24"
          y="29"
          fontFamily="Georgia, serif"
          fontSize="12"
          fontWeight="bold"
          fill="#B89758"
          letterSpacing="1"
          textAnchor="middle"
        >
          SAFRA
        </text>
      </svg>
    )
  }

  if (id === 'picpay') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#11C76F" />
        <path
          d="M17 15H25C29 15 32 18 32 22C32 26 29 29 25 29H22V34H17V15ZM22 24.5H24.5C26 24.5 27 23.5 27 22C27 20.5 26 19.5 24.5 19.5H22V24.5Z"
          fill="white"
        />
      </svg>
    )
  }

  if (id === 'mercado_pago' || id === 'mercado_livre') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#009EE3" />
        <path
          d="M15 26C15 26 18 20 22 20C24 20 26 22 28 22C30 22 33 26 33 26C33 26 30 30 26 30C24 30 22 28 20 28C18 28 15 26 15 26Z"
          fill="white"
        />
        <circle cx="21" cy="17" r="3" fill="#FFE600" />
        <circle cx="27" cy="17" r="3" fill="#FFE600" />
      </svg>
    )
  }

  if (id === 'neon') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#002B49" />
        <path d="M16 15H21L27 26V15H32V33H27L21 22V33H16V15Z" fill="#00E5FF" />
      </svg>
    )
  }

  if (id === 'pagbank') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#00B140" />
        <path
          d="M17 15H25C28.5 15 31 17.5 31 21C31 24.5 28.5 27 25 27H22V33H17V15ZM22 23H24.5C26 23 27 22 27 21C27 20 26 19 24.5 19H22V23Z"
          fill="#FFCC00"
        />
      </svg>
    )
  }

  if (id === 'stone') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#00A868" />
        <circle cx="24" cy="24" r="11" fill="none" stroke="white" strokeWidth="4" />
        <circle cx="24" cy="24" r="4" fill="white" />
      </svg>
    )
  }

  if (id === 'infinitepay') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#0A0A0A" />
        <path
          d="M18 19C15.5 19 13.5 21 13.5 23.5C13.5 26 15.5 28 18 28C20.5 28 22.5 26 24 24C25.5 22 27.5 20 30 20C32.5 20 34.5 22 34.5 24.5C34.5 27 32.5 29 30 29C27.5 29 25.5 27 24 25"
          stroke="#00FF66"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    )
  }

  if (id === 'will_bank') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#FFEE00" />
        <text
          x="24"
          y="29"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="12"
          fontWeight="900"
          fill="#1A1A1A"
          textAnchor="middle"
        >
          will:
        </text>
      </svg>
    )
  }

  if (id === '99pay') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#FF6B00" />
        <text
          x="24"
          y="30"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="17"
          fontWeight="900"
          fill="#FFC700"
          textAnchor="middle"
        >
          99
        </text>
      </svg>
    )
  }

  if (id === 'recargapay') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#FF6A13" />
        <path d="M26 13L16 26H23L21 35L31 22H24L26 13Z" fill="white" />
      </svg>
    )
  }

  if (id === 'xp') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#000000" />
        <text
          x="24"
          y="30"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="16"
          fontWeight="900"
          fill="#FFB800"
          letterSpacing="0.5"
          textAnchor="middle"
        >
          XP
        </text>
      </svg>
    )
  }

  if (id === 'banrisul') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#004F9F" />
        <path d="M17 33L24 15L31 33H26.5L24 26L21.5 33H17Z" fill="#71C5E8" />
      </svg>
    )
  }

  if (id === 'brb') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#005BA4" />
        <text
          x="24"
          y="29"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="12"
          fontWeight="900"
          fill="#FFFFFF"
          letterSpacing="0.5"
          textAnchor="middle"
        >
          BRB
        </text>
      </svg>
    )
  }

  if (id === 'bmg') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#FF5A00" />
        <text
          x="24"
          y="29"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="12"
          fontWeight="900"
          fill="#FFFFFF"
          letterSpacing="0.5"
          textAnchor="middle"
        >
          BMG
        </text>
      </svg>
    )
  }

  if (id === 'pan') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#0083CA" />
        <text
          x="24"
          y="29"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontSize="13"
          fontWeight="900"
          fill="#FFFFFF"
          letterSpacing="0.5"
          textAnchor="middle"
        >
          PAN
        </text>
      </svg>
    )
  }

  if (id === 'carteira_fisica') {
    return (
      <svg
        viewBox="0 0 48 48"
        width={size}
        height={size}
        className={className}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <rect width="48" height="48" rx="12" fill="#10B981" />
        <rect x="13" y="16" width="22" height="16" rx="3" stroke="white" strokeWidth="2.5" />
        <circle cx="28" cy="24" r="2" fill="white" />
      </svg>
    )
  }

  // Fallback para 'outro' ou desconhecido
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="48" rx="12" fill={customColor || '#64748B'} />
      <path
        d="M24 13L13 19V21H35V19L24 13ZM16 23V31H19V23H16ZM22.5 23V31H25.5V23H22.5ZM29 23V31H32V23H29ZM13 33V35H35V33H13Z"
        fill="white"
      />
    </svg>
  )
}
