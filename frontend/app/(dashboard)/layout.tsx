'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,#F5FAF6_0%,#EBF2EC_100%)]">
        <div className="rounded-2xl border border-[#D7E5D9] bg-white px-6 py-4 text-sm font-medium text-[#1B5E3B] shadow-[0_14px_38px_-24px_rgba(27,94,59,0.5)] animate-pulse">
          Cargando entorno...
        </div>
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="flex min-h-screen bg-[#ECF3EE]">
      <Sidebar
        rol={user.rol}
        userId={user.id}
        mobileOpen={mobileSidebarOpen}
        onMobileOpenChange={setMobileSidebarOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar user={user} onOpenSidebar={() => setMobileSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1720px] px-3 py-3 sm:px-4 sm:py-4 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
