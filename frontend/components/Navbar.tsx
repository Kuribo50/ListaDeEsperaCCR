'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FiMenu, FiLogOut, FiUser } from 'react-icons/fi'
import { useAuth } from '@/lib/auth-context'
import type { Usuario } from '@/lib/types'

const ROL_LABELS: Record<string, string> = {
  KINE: 'Kinesiólogo/a',
  ADMINISTRATIVO: 'Administrativo/a',
  ADMIN: 'Administrador/a',
}

export default function Navbar({
  user,
  onOpenSidebar,
}: {
  user: Usuario
  onOpenSidebar: () => void
}) {
  const { logout } = useAuth()
  const router = useRouter()
  const fechaActual = useMemo(
    () =>
      new Intl.DateTimeFormat('es-CL', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
      }).format(new Date()),
    [],
  )

  async function handleLogout() {
    await logout()
    router.replace('/login')
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 flex-shrink-0 items-center justify-between border-b border-[#D7E5D9] bg-white/80 px-4 backdrop-blur-md sm:px-6 lg:px-8 shadow-sm">
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#D6E4D8] bg-white text-[#234E39] transition hover:bg-[#F0F7F2] hover:shadow-md lg:hidden"
          aria-label="Abrir menú lateral"
        >
          <FiMenu size={20} />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm font-extrabold text-[#1B5E3B] tracking-tight">CCR Sistema de Gestión</p>
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[#6A8372] opacity-70">
            {fechaActual}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-6">
        <div className="flex items-center gap-3 px-3 py-1.5 rounded-2xl bg-[#F0F7F2]/50 border border-[#D7E5D9]/50 transition-all hover:bg-[#F0F7F2]">
          <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center shadow-sm border border-[#D7E5D9] text-[#1B5E3B]">
            <FiUser size={16} />
          </div>
          <div className="hidden md:block text-right">
            <p className="text-xs font-bold text-gray-800 leading-none">{user.nombre}</p>
            <p className="text-[10px] font-bold text-[#4CAF7D] uppercase tracking-wider mt-0.5">
              {ROL_LABELS[user.rol] ?? user.rol}
            </p>
          </div>
        </div>

        <div className="h-8 w-px bg-[#D7E5D9] mx-1 hidden sm:block" />

        <button
          onClick={handleLogout}
          className="group flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-xs font-bold text-gray-500 border border-[#D7E5D9] transition-all hover:bg-red-50 hover:text-red-600 hover:border-red-200 hover:shadow-sm"
        >
          <span className="hidden sm:inline">Cerrar sesión</span>
          <FiLogOut size={16} className="transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>
    </header>
  )
}
