"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { ResumenReporte, KineReporte } from "@/lib/types";
import { ESTADO_LABELS, PRIORIDAD_LABELS } from "@/lib/types";
import { ProgressBar } from "react-aria-components";

const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function EstadisticasPage() {
  const { user } = useAuth();
  const now = new Date();
  const [mes, setMes] = useState(now.getMonth() + 1);
  const [anio, setAnio] = useState(now.getFullYear());
  const [resumen, setResumen] = useState<ResumenReporte | null>(null);
  const [kines, setKines] = useState<KineReporte[]>([]);
  const [loading, setLoading] = useState(false);

  async function cargar() {
    setLoading(true);
    try {
      const [r, k] = await Promise.all([
        api.get<ResumenReporte>(`/reportes/resumen/?mes=${mes}&anio=${anio}`),
        api.get<{ mes: number; anio: number; kines: KineReporte[] }>(
          `/reportes/por-kine/?mes=${mes}&anio=${anio}`,
        ),
      ]);
      setResumen(r);
      setKines(k.kines);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user) void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, anio, user]);

  if (!user) return null;

  return (
    <div className="space-y-6">
      <header className="ccr-panel ccr-fade-up rounded-3xl p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#648170]">
              Análisis y Reportes
            </p>
            <h1 className="mt-1 text-2xl font-semibold text-[#173122] sm:text-[28px]">
              Estadísticas del CCR
            </h1>
            <p className="mt-1.5 text-sm text-[#55705F]">
              Visualiza el comportamiento de la lista y la carga operativa por Kinesiólogo.
            </p>
          </div>
          
          <div className="flex bg-[#F5FAF6] border border-[#D7E8DD] rounded-xl p-2 gap-2 mt-4 sm:mt-0">
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="bg-white border border-[#D7E8DD] rounded-lg px-3 py-2 text-sm font-semibold text-[#295C40] focus:outline-none focus:ring-2 focus:ring-[#60B689]"
            >
              {MESES.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={anio}
              onChange={(e) => setAnio(Number(e.target.value))}
              className="bg-white border border-[#D7E8DD] rounded-lg px-3 py-2 text-sm font-semibold text-[#295C40] focus:outline-none focus:ring-2 focus:ring-[#60B689]"
            >
              {[2023, 2024, 2025, 2026, 2027].map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4">
          <div className="h-32 animate-pulse rounded-2xl border border-[#D9E6DA] bg-white" />
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="h-64 animate-pulse rounded-2xl border border-[#D9E6DA] bg-white" />
            <div className="h-64 animate-pulse rounded-2xl border border-[#D9E6DA] bg-white" />
          </div>
        </div>
      ) : resumen ? (
        <div className="space-y-6">
          <section className="ccr-panel flex flex-col justify-center items-center text-center rounded-2xl p-6 sm:p-8 bg-gradient-to-r from-[#F4FEF7] to-[#FAFFFC]">
            <p className="text-[14px] font-semibold uppercase tracking-widest text-[#508B6B]">
              Volumen Total (Mes Seleccionado)
            </p>
            <p className="mt-2 text-6xl font-bold text-[#1F5436] tracking-tighter">
              {resumen.total_pacientes}
            </p>
            <p className="mt-2 text-[13px] text-[#698B77] max-w-[40ch]">
              Pacientes únicos contabilizados durante el periodo seleccionado entre ingresos y egresos.
            </p>
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="ccr-panel rounded-2xl p-6">
              <h2 className="text-[16px] font-semibold text-[#193425] mb-5">
                Distribución por Estado
              </h2>
              <div className="space-y-4">
                {resumen.por_estado.map((e) => (
                  <div key={e.estado}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#2B4535]">
                        {ESTADO_LABELS[e.estado as keyof typeof ESTADO_LABELS] ?? e.estado}
                      </span>
                      <span className="text-[#617C6A] font-bold">{e.total}</span>
                    </div>
                    <ProgressBar
                      aria-label={`Estado ${e.estado}`}
                      value={e.total}
                      minValue={0}
                      maxValue={Math.max(resumen.total_pacientes, 1)}
                    >
                      {({ percentage }) => (
                        <div className="h-2.5 rounded-full bg-[#ECF3EE]">
                          <div
                            className="h-2.5 rounded-full bg-[linear-gradient(90deg,#2B8A5A_0%,#46A575_100%)]"
                            style={{ width: `${percentage ?? 0}%` }}
                          />
                        </div>
                      )}
                    </ProgressBar>
                  </div>
                ))}
              </div>
            </div>

            <div className="ccr-panel rounded-2xl p-6">
              <h2 className="text-[16px] font-semibold text-[#193425] mb-5">
                Distribución por Prioridad Clínica
              </h2>
              <div className="space-y-4">
                {resumen.por_prioridad.map((p) => (
                  <div key={p.prioridad}>
                    <div className="mb-1.5 flex items-center justify-between text-sm">
                      <span className="font-semibold text-[#2B4535]">
                        {PRIORIDAD_LABELS[p.prioridad as keyof typeof PRIORIDAD_LABELS] ?? p.prioridad}
                      </span>
                      <span className="text-[#617C6A] font-bold">{p.total}</span>
                    </div>
                    <ProgressBar
                      aria-label={`Prioridad ${p.prioridad}`}
                      value={p.total}
                      minValue={0}
                      maxValue={Math.max(resumen.total_pacientes, 1)}
                    >
                      {({ percentage }) => (
                        <div className="h-2.5 rounded-full bg-[#ECF3EE]">
                          <div
                            className="h-2.5 rounded-full bg-[linear-gradient(90deg,#2D6B8C_0%,#488DAF_100%)]"
                            style={{ width: `${percentage ?? 0}%` }}
                          />
                        </div>
                      )}
                    </ProgressBar>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="ccr-panel rounded-2xl overflow-hidden">
            <div className="px-6 py-5 border-b border-[#E9F3ED] bg-[#FDFEFD]">
              <h2 className="text-[16px] font-semibold text-[#193425]">
                Carga Operativa por Kinesiólogo
              </h2>
              <p className="text-[13px] text-[#698B77] mt-1">
                Desglose de pacientes asignados a cada profesional.
              </p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F8FCF9] border-b border-[#E9F3ED]">
                    <th className="text-left px-6 py-4 font-bold text-[#456A55]">Profesional</th>
                    <th className="text-center px-4 py-4 font-bold text-[#456A55]">Total Carga</th>
                    <th className="text-center px-4 py-4 font-bold text-[#456A55]">Ingresados</th>
                    <th className="text-center px-4 py-4 font-bold text-[#456A55]">Pendientes (Cola)</th>
                    <th className="text-center px-4 py-4 font-bold text-[#456A55]">Rescates</th>
                    <th className="text-center px-4 py-4 font-bold text-[#456A55]">Altas Médicas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F7F4] bg-white">
                  {kines.map((k, idx) => (
                    <tr key={idx} className="hover:bg-[#FDFHFB] transition-colors">
                      <td className="px-6 py-4 font-bold text-[#1D3B2A]">
                        {k["kine_asignado__nombre"] ?? (
                          <span className="text-gray-400 font-medium italic bg-gray-100 px-2 py-0.5 rounded">Sin Asignar</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-bold text-[#1B5E3B] bg-[#EAF6EE] px-2.5 py-1 rounded-full">
                          {k.total}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center font-semibold text-[#2B8A5A]">{k.ingresados}</td>
                      <td className="px-4 py-4 text-center font-semibold text-[#F0993D]">{k.pendientes}</td>
                      <td className="px-4 py-4 text-center font-semibold text-[#D32F2F]">{k.rescate}</td>
                      <td className="px-4 py-4 text-center font-semibold text-[#3081A8]">{k.altas}</td>
                    </tr>
                  ))}
                  {kines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-[#698B77]">
                        No hay datos operativos registrados para este periodo.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : (
        <div className="ccr-panel rounded-xl border-[#E7C7C7] bg-[#FFF4F4] p-4 text-sm text-[#9E1F1F]">
          <p>No se encontraron datos para el mes seleccionado.</p>
        </div>
      )}
    </div>
  );
}
