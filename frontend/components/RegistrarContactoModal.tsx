"use client";

import { useState } from "react";
import { FiPhone, FiX } from "react-icons/fi";
import type { Paciente } from "@/lib/types";
import { formatearRut } from "@/lib/rut";
import { api } from "@/lib/api";

function fechaHoraLocalDefault() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

interface Props {
  paciente: Paciente;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RegistrarContactoModal({
  paciente,
  onClose,
  onSuccess,
}: Props) {
  const [notas, setNotas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [showScheduler, setShowScheduler] = useState(false);
  const [fechaHora, setFechaHora] = useState(fechaHoraLocalDefault());

  async function handleSubmit(contesto: boolean) {
    if (contesto && !fechaHora) {
      setError("Selecciona fecha y hora para programar la atención.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await api.post(`/pacientes/${paciente.id}/registrar-llamado/`, {
        contesto,
        notas,
      });

      if (contesto && fechaHora) {
        const isoValue = new Date(fechaHora).toISOString();
        await api.post(`/pacientes/${paciente.id}/programar-atencion/`, {
          fecha_hora: isoValue,
        });
      }

      onSuccess();
      onClose();
    } catch (e: unknown) {
      const msg =
        e && typeof e === "object" && "detail" in e
          ? (e as { detail: string }).detail
          : "Error al registrar contacto";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  function aplicarHorarioRapido(hora: string) {
    const base = fechaHora || fechaHoraLocalDefault();
    const fecha = base.slice(0, 10);
    setFechaHora(`${fecha}T${hora}`);
  }

  const intentoUno = paciente.n_intentos_contacto === 1;
  const intentoDosOMas = paciente.n_intentos_contacto >= 2;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4">
      <div 
        className="w-full max-w-md rounded-2xl bg-white shadow-xl overflow-hidden ccr-fade-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#D4E4D4] bg-[#F7FBF8] px-5 py-4">
          <div className="flex items-center gap-2 text-[#1A3828]">
            <FiPhone className="text-xl" />
            <h2 className="text-sm font-semibold uppercase tracking-[0.05em]">
              Registrar Contacto
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-[#587261] hover:bg-[#E2EBE4]"
          >
            <FiX size={18} />
          </button>
        </div>

        <div className="p-5">
          {error && (
            <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
              {error}
            </div>
          )}

          <div className="mb-5">
            <h3 className="font-semibold text-gray-800">{paciente.nombre}</h3>
            <p className="text-xs text-gray-500">
              RUT: {formatearRut(paciente.rut)} • Teléfono:{" "}
              <span className="font-medium text-gray-700">{paciente.telefono || "No especificado"}</span>
            </p>
            {intentoUno && (
              <p className="mt-1 text-xs font-semibold text-[#E65100]">
                ⚠️ 1 intento previo registrado
              </p>
            )}
            {intentoDosOMas && (
              <p className="mt-1 text-xs font-semibold text-[#B71C1C]">
                🚨 Próximo intento fallido pasará a Rescate
              </p>
            )}
          </div>

          {!showScheduler ? (
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700">
                  Observaciones del llamado (opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Ej. Dejó mensaje, número equivocado, etc."
                  rows={3}
                  className="w-full resize-none rounded-lg border border-[#D4E4D4] px-3 py-2 text-sm focus:border-verde-ccr focus:outline-none focus:ring-1 focus:ring-verde-ccr"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduler(true)}
                  disabled={loading}
                  className="rounded-lg bg-[#2A6848] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1A4530] disabled:opacity-50"
                >
                  Contestó
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit(false)}
                  disabled={loading}
                  className={`rounded-lg py-2.5 text-sm font-semibold text-white shadow-sm transition disabled:opacity-50 ${
                    intentoDosOMas ? "bg-[#D32F2F] hover:bg-red-800" : "bg-[#ED8121] hover:bg-[#C96B18]"
                  }`}
                >
                  No Contestó
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="rounded-lg bg-[#F5F9F6] p-3 border border-[#E6EEE6]">
                <p className="text-xs text-[#2A6848] font-semibold mb-2">✅ Paciente contestó</p>
                <p className="text-[11px] text-gray-600">Ahora programa la fecha de su atención, el paciente pasará directo a estado INGRESADO.</p>
              </div>

              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-gray-500">
                  Fecha y hora de atención
                </label>
                <input
                  type="datetime-local"
                  value={fechaHora}
                  onChange={(e) => setFechaHora(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-[#4CAF7D] focus:outline-none"
                />
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => aplicarHorarioRapido("09:00")}
                    className="rounded-full border border-[#D9E8DE] bg-[#F7FBF8] px-2.5 py-1 text-[10px] font-semibold text-[#2A6848] hover:bg-[#ECF6EF]"
                  >
                    09:00
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarHorarioRapido("12:00")}
                    className="rounded-full border border-[#D9E8DE] bg-[#F7FBF8] px-2.5 py-1 text-[10px] font-semibold text-[#2A6848] hover:bg-[#ECF6EF]"
                  >
                    12:00
                  </button>
                  <button
                    type="button"
                    onClick={() => aplicarHorarioRapido("15:00")}
                    className="rounded-full border border-[#D9E8DE] bg-[#F7FBF8] px-2.5 py-1 text-[10px] font-semibold text-[#2A6848] hover:bg-[#ECF6EF]"
                  >
                    15:00
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-gray-700">
                  Observaciones (opcional)
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-[#D4E4D4] px-3 py-2 text-sm focus:border-verde-ccr focus:outline-none focus:ring-1 focus:ring-verde-ccr"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowScheduler(false)}
                  disabled={loading}
                  className="flex-1 rounded-lg border border-gray-200 bg-white py-2.5 text-sm font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:opacity-50"
                >
                  Atrás
                </button>
                <button
                  type="button"
                  onClick={() => void handleSubmit(true)}
                  disabled={loading}
                  className="flex-1 rounded-lg bg-[#2A6848] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#1A4530] disabled:opacity-50"
                >
                  {loading ? "Guardando..." : "Confirmar"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
