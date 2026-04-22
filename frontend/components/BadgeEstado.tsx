import type { Estado } from '@/lib/types'
import { ESTADO_LABELS } from '@/lib/types'

const ESTILOS: Record<Estado, { bg: string; color: string }> = {
  PENDIENTE: { bg: '#F3F4F6', color: '#4B5563' },
  INGRESADO: { bg: '#E8F5E9', color: '#1B5E20' },
  RESCATE: { bg: '#FFF3E0', color: '#BF360C' },
  ABANDONO: { bg: '#FCE4EC', color: '#880E4F' },
  ALTA_MEDICA: { bg: '#E8F5E9', color: '#1B5E20' },
  EGRESO_VOLUNTARIO: { bg: '#EDE7F6', color: '#4527A0' },
  DERIVADO: { bg: '#E8EAF6', color: '#283593' },
}

export default function BadgeEstado({ estado }: { estado: Estado }) {
  const { bg, color } = ESTILOS[estado] ?? { bg: '#F5F5F5', color: '#616161' }
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold leading-tight whitespace-nowrap"
      style={{ backgroundColor: bg, color }}
    >
      {ESTADO_LABELS[estado] ?? estado}
    </span>
  )
}
