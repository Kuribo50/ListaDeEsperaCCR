'use client'

import { useCallback, useMemo, useState, useEffect } from 'react'
import type { ComponentType } from 'react'
import { FiRefreshCw, FiSearch } from 'react-icons/fi'
import { formatearRut } from '@/lib/rut'
import { useAuth } from '@/lib/auth-context'
import { api } from '@/lib/api'
import type { Estado, Paciente } from '@/lib/types'
import { CATEGORIA_LABELS, ESTADO_LABELS } from '@/lib/types'
import FichaPaciente from '@/components/FichaPaciente'
import BadgePrioridad from '@/components/BadgePrioridad'

type EgresoState = Extract<Estado, 'ALTA_MEDICA' | 'EGRESO_VOLUNTARIO' | 'ABANDONO' | 'DERIVADO'>

const EGRESO_STATES: EgresoState[] = [
  'ALTA_MEDICA',
  'EGRESO_VOLUNTARIO',
  'ABANDONO',
  'DERIVADO',
]

const EGRESO_COLORS: Record<EgresoState, { bg: string; text: string; border: string }> = {
  ALTA_MEDICA: { bg: '#ECFDF5', text: '#065F46', border: '#6EE7B7' },
  EGRESO_VOLUNTARIO: { bg: '#EFF6FF', text: '#1E40AF', border: '#BFDBFE' },
  ABANDONO: { bg: '#FFF7ED', text: '#9A3412', border: '#FDBA74' },
  DERIVADO: { bg: '#F5F3FF', text: '#5B21B6', border: '#C4B5FD' },
}

function normalizeRut(value: string) {
  return value.toLowerCase().replace(/[^0-9k]/g, '')
}

function normalizeSearchText(value: string) {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase('es-CL')
    .trim()
}

function toCapitalizedWords(value: string) {
  const normalized = String(value ?? '')
    .trim()
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es-CL')
  return normalized.replace(/\p{L}+/gu, (word) => {
    const [first = '', ...rest] = Array.from(word)
    return `${first.toLocaleUpperCase('es-CL')}${rest.join('')}`
  })
}

const RefreshIcon: ComponentType<{ size?: number; className?: string }> =
  FiRefreshCw ?? (() => null)
const SearchIcon: ComponentType<{ size?: number; className?: string }> =
  FiSearch ?? (() => null)
const PriorityBadge = (BadgePrioridad ??
  (({ prioridad }: { prioridad: Paciente['prioridad'] }) => (
    <span className="rounded-full bg-[#F0F5F2] px-2 py-0.5 text-[11px] font-semibold text-[#40594B]">
      {toCapitalizedWords(prioridad)}
    </span>
  ))) as ComponentType<{ prioridad: Paciente['prioridad'] }>
const PatientSheet = FichaPaciente as ComponentType<any> | undefined

function calcularDiasDesde(fecha: string | null | undefined) {
  if (!fecha) return null
  const inicio = new Date(`${fecha}T00:00:00`)
  if (Number.isNaN(inicio.getTime())) return null

  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  const diffMs = hoy.getTime() - inicio.getTime()
  if (diffMs < 0) return 0
  return Math.floor(diffMs / 86400000)
}

function calcularDiferenciaDias(
  desde: string | null | undefined,
  hasta: string | null | undefined,
) {
  if (!desde || !hasta) return null
  const inicio = new Date(`${desde}T00:00:00`)
  const fin = new Date(`${hasta}T00:00:00`)
  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fin.getTime())) return null

  const diffMs = fin.getTime() - inicio.getTime()
  if (diffMs < 0) return 0
  return Math.floor(diffMs / 86400000)
}

function calcularDiasAtendido(paciente: Paciente) {
  if (!paciente.fecha_ingreso) return paciente.dias_en_lista
  const diasAtendido = calcularDiferenciaDias(
    paciente.fecha_ingreso,
    paciente.fecha_egreso ?? paciente.fecha_cambio_estado,
  )
  if (diasAtendido !== null) return diasAtendido

  const diasDesdeIngreso = calcularDiasDesde(paciente.fecha_ingreso)
  return diasDesdeIngreso ?? paciente.dias_en_lista
}

export default function EgresosPage() {
  const { user } = useAuth()
  const [pacientes, setPacientes] = useState<Paciente[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [filtroEstado, setFiltroEstado] = useState<EgresoState | ''>('')
  const [filtroKine, setFiltroKine] = useState('')
  const [seleccionado, setSeleccionado] = useState<Paciente | null>(null)

  const cargar = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      if (user?.rol === 'KINE') {
        const data = await api.get<Paciente[]>('/pacientes/?solo_mios=1')
        setPacientes(data.filter((p) => EGRESO_STATES.includes(p.estado as EgresoState)))
      } else {
        const data = await api.get<Paciente[]>('/pacientes/?is_egreso=1')
        setPacientes(data)
      }
    } catch {
      setPacientes([])
      setError('No se pudo cargar el historial de egresos.')
    } finally {
      setLoading(false)
    }
  }, [user?.rol])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const kineOptions = useMemo(
    () =>
      Array.from(
        new Set(
          pacientes
            .map((p) => p.kine_asignado_nombre?.trim())
            .filter((value): value is string => Boolean(value)),
        ),
      ).sort((a, b) => a.localeCompare(b, 'es')),
    [pacientes],
  )

  const pacientesFiltrados = useMemo(() => {
    const queryText = normalizeSearchText(search)
    const queryRut = normalizeRut(search)

    return pacientes
      .filter((p) => {
        if (filtroEstado && p.estado !== filtroEstado) return false
        if (filtroKine && (p.kine_asignado_nombre ?? '') !== filtroKine) return false

        if (!queryText && !queryRut) return true

        const matchesText =
          normalizeSearchText(p.nombre).includes(queryText) ||
          normalizeSearchText(p.diagnostico).includes(queryText) ||
          normalizeSearchText(p.kine_asignado_nombre ?? '').includes(queryText)
        const matchesRut = normalizeRut(p.rut).includes(queryRut)

        return matchesText || matchesRut
      })
      .sort((a, b) => calcularDiasAtendido(b) - calcularDiasAtendido(a))
  }, [pacientes, filtroEstado, filtroKine, search])

  function clearFilters() {
    setSearch('')
    setFiltroEstado('')
    setFiltroKine('')
  }

  if (!user) return null

  return (
    <div className="space-y-3 text-[13px]">
      <header className="ccr-panel rounded-2xl p-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Historial de Egresos</h1>
              <p className="mt-0.5 text-xs text-[#60786B]">
                Derivaciones concluidas por tipo de egreso.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void cargar()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#C5DDCC] bg-white px-3 py-2 text-[11px] font-semibold text-[#21563B] outline-none transition hover:bg-[#ECF7F0] focus-visible:ring-2 focus-visible:ring-[#60B689] sm:w-auto"
            >
              <RefreshIcon size={13} />
              Recargar
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)_auto]">
            <div className="relative">
              <SearchIcon
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7A9585]"
                size={15}
              />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') event.preventDefault()
                }}
                placeholder="Buscar por nombre, RUT, diagnóstico o kinesiólogo"
                className="w-full rounded-xl border border-[#D5E4D8] bg-white px-9 py-2.5 text-xs outline-none focus:border-[#5FB88C]"
                aria-label="Buscar egresos"
              />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <select
                value={filtroEstado}
                onChange={(event) => setFiltroEstado(event.target.value as EgresoState | '')}
                className="rounded-xl border border-[#D5E4D8] bg-white px-3 py-2.5 text-xs text-[#2D4336] outline-none focus:border-[#5FB88C]"
              >
                <option value="">Todos los tipos de egreso</option>
                {EGRESO_STATES.map((estado) => (
                  <option key={estado} value={estado}>
                    {ESTADO_LABELS[estado]}
                  </option>
                ))}
              </select>

              <select
                value={filtroKine}
                onChange={(event) => setFiltroKine(event.target.value)}
                className="rounded-xl border border-[#D5E4D8] bg-white px-3 py-2.5 text-xs text-[#2D4336] outline-none focus:border-[#5FB88C]"
              >
                <option value="">Todos los kinesiólogos</option>
                {kineOptions.map((kine) => (
                  <option key={kine} value={kine}>
                    {toCapitalizedWords(kine)}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex h-[40px] w-full items-center justify-center rounded-xl border border-[#D5E4D8] bg-white px-3 text-xs font-semibold text-[#294C3A] outline-none transition hover:bg-[#F5FAF7] lg:w-auto"
            >
              Limpiar filtros
            </button>
          </div>

        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      {loading ? (
        <div className="ccr-panel rounded-2xl p-16 text-center text-sm text-gray-400 animate-pulse">
          Cargando registros...
        </div>
      ) : pacientesFiltrados.length === 0 ? (
        <div className="ccr-panel rounded-2xl p-16 text-center text-sm text-gray-500">
          No hay egresos que coincidan con los filtros.
        </div>
      ) : (
        <section className="ccr-panel relative overflow-hidden rounded-2xl bg-white">
          <div className="max-h-[clamp(320px,calc(100dvh-330px),860px)] overflow-auto border-b border-[#D9E6DB]">
            <table className="w-full min-w-max text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-[#D9E6DB] bg-[#F7FBF8]">
                  <th className="border-r border-[#D9E6DB] px-4 py-2.5 text-left font-semibold text-[#2D4336]">
                    Nombre
                  </th>
                  <th className="border-r border-[#D9E6DB] px-4 py-2.5 text-left font-semibold text-[#2D4336]">
                    RUT
                  </th>
                  <th className="border-r border-[#D9E6DB] px-4 py-2.5 text-left font-semibold text-[#2D4336]">
                    Edad
                  </th>
                  <th className="border-r border-[#D9E6DB] px-4 py-2.5 text-left font-semibold text-[#2D4336]">
                    Diagnóstico
                  </th>
                  <th className="border-r border-[#D9E6DB] px-4 py-2.5 text-left font-semibold text-[#2D4336]">
                    Prioridad
                  </th>
                  <th className="border-r border-[#D9E6DB] px-4 py-2.5 text-left font-semibold text-[#2D4336]">
                    Categoría
                  </th>
                  <th className="border-r border-[#D9E6DB] px-4 py-2.5 text-left font-semibold text-[#2D4336]">
                    Kinesiólogo
                  </th>
                  <th className="border-r border-[#D9E6DB] px-4 py-2.5 text-left font-semibold text-[#2D4336]">
                    Tipo de egreso
                  </th>
                  <th className="border-r border-[#D9E6DB] px-4 py-2.5 text-center font-semibold text-[#2D4336]">
                    Días atendido
                  </th>
                  <th className="px-4 py-2.5 text-right font-semibold text-[#2D4336]">
                    Ficha
                  </th>
                </tr>
              </thead>
              <tbody>
                {pacientesFiltrados.map((paciente) => {
                  const estado = (paciente.estado as EgresoState) || 'DERIVADO'
                  const colors = EGRESO_COLORS[estado] ?? EGRESO_COLORS.DERIVADO
                  const diasAtendido = calcularDiasAtendido(paciente)

                  return (
                    <tr
                      key={paciente.id}
                      className="cursor-pointer border-b border-[#E1EBE4] bg-white transition hover:bg-[#E8F4EC]"
                      onClick={() => setSeleccionado(paciente)}
                    >
                      <td className="max-w-[180px] border-r border-[#E1EBE4] px-4 py-2.5 font-semibold text-[#243D2E]">
                        <div className="truncate">{toCapitalizedWords(paciente.nombre)}</div>
                      </td>
                      <td className="border-r border-[#E1EBE4] px-4 py-2.5 font-mono text-[#3F5648]">
                        {formatearRut(paciente.rut)}
                      </td>
                      <td className="border-r border-[#E1EBE4] px-4 py-2.5 text-[#40594B]">
                        {paciente.edad}
                      </td>
                      <td className="max-w-[200px] border-r border-[#E1EBE4] px-4 py-2.5 text-[#31493A]">
                        <div className="truncate">
                          {toCapitalizedWords(paciente.diagnostico)}
                        </div>
                      </td>
                      <td className="border-r border-[#E1EBE4] px-4 py-2.5">
                        <PriorityBadge prioridad={paciente.prioridad} />
                      </td>
                      <td className="border-r border-[#E1EBE4] px-4 py-2.5 text-[#3D5648]">
                        {toCapitalizedWords(
                          CATEGORIA_LABELS[paciente.categoria] ?? paciente.categoria,
                        )}
                      </td>
                      <td className="max-w-[170px] border-r border-[#E1EBE4] px-4 py-2.5 text-[#2D4336]">
                        <div className="truncate">
                          {toCapitalizedWords(paciente.kine_asignado_nombre ?? 'Sin asignar')}
                        </div>
                      </td>
                      <td className="border-r border-[#E1EBE4] px-4 py-2.5">
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold"
                          style={{
                            backgroundColor: colors.bg,
                            color: colors.text,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          {toCapitalizedWords(ESTADO_LABELS[paciente.estado] ?? paciente.estado)}
                        </span>
                      </td>
                      <td className="border-r border-[#E1EBE4] px-4 py-2.5 text-center font-semibold text-[#2D4336]">
                        {diasAtendido}d
                      </td>
                      <td
                        className="px-4 py-2.5 text-right"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => setSeleccionado(paciente)}
                          className="rounded-lg border border-[#B8D1C0] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#3D5648] outline-none transition hover:bg-[#DFECE4]"
                        >
                          Ver ficha
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-1 border-t-2 border-[#C7DCCF] bg-gradient-to-r from-[#EAF5EE] to-[#F3F9F5] px-5 py-3 text-[11px] font-medium text-[#365544] sm:flex-row sm:items-center sm:justify-between">
            <p>
              {pacientesFiltrados.length} egreso
              {pacientesFiltrados.length !== 1 ? 's' : ''} en la tabla
            </p>
            <p className="text-[#4E6F5C]">
              Mostrando {pacientesFiltrados.length} de {pacientes.length}
            </p>
          </div>
        </section>
      )}

      {seleccionado && PatientSheet && (
        <PatientSheet
          paciente={seleccionado}
          usuario={user}
          onClose={() => setSeleccionado(null)}
          onRefresh={() => {
            void cargar()
            setSeleccionado(null)
          }}
        />
      )}
    </div>
  )
}
