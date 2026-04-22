import type { Prioridad } from '@/lib/types'
import { PRIORIDAD_LABELS } from '@/lib/types'

const ESTILOS: Record<Prioridad, { bg: string; color: string }> = {
  ALTA:           { bg: '#FFEBEE', color: '#B71C1C' },
  MEDIANA:        { bg: '#FFF8E1', color: '#E65100' },
  MODERADA:       { bg: '#E8F5FE', color: '#0D47A1' },
  LICENCIA_MEDICA:{ bg: '#F3E5F5', color: '#6A1B9A' },
}

export default function BadgePrioridad({ prioridad }: { prioridad: Prioridad }) {
  const { bg, color } = ESTILOS[prioridad] ?? { bg: '#F5F5F5', color: '#616161' }
  return (
    <span
      className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold leading-tight whitespace-nowrap"
      style={{ backgroundColor: bg, color }}
    >
      {PRIORIDAD_LABELS[prioridad] ?? prioridad}
    </span>
  )
}
