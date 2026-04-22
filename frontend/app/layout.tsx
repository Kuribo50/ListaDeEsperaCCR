import type { Metadata } from 'next'
import { Manrope, Sora } from 'next/font/google'
import { AuthProvider } from '@/lib/auth-context'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
})

const sora = Sora({
  subsets: ['latin'],
  variable: '--font-sora',
})

export const metadata: Metadata = {
  title: 'Lista de Espera CCR',
  description: 'CESFAM Dr. Alberto Reyes – DISAM Tomé – Servicio de Salud Talcahuano',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={`${manrope.variable} ${sora.variable}`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
