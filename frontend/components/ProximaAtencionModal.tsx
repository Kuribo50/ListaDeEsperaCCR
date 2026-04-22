"use client";

import { useMemo, useState } from "react";
import type { Paciente } from "@/lib/types";
import { formatearRut } from "@/lib/rut";
import { motion, AnimatePresence } from "framer-motion";
import { FiCalendar, FiClock, FiX, FiCheck, FiTrash2, FiRefreshCw } from "react-icons/fi";

interface Props {
  paciente: Paciente;
  fechaInicial?: string;
  onClose: () => void;
  onConfirm: (fechaHora: string) => Promise<void>;
  onClear?: () => Promise<void>;
}

function toInputDateTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

function fechaHoraLocalDefault() {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return localDate.toISOString().slice(0, 16);
}

const backdropVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 }
};

const modalVariants = {
  initial: { opacity: 0, scale: 0.95, y: 20 },
  animate: { opacity: 1, scale: 1, y: 0, transition: { type: "spring" as const, damping: 25, stiffness: 300 } },
  exit: { opacity: 0, scale: 0.95, y: 10 }
};

export default function ProximaAtencionModal({
  paciente,
  fechaInicial,
  onClose,
  onConfirm,
  onClear,
}: Props) {
  const [fechaHora, setFechaHora] = useState(
    toInputDateTime(fechaInicial) ||
      toInputDateTime(paciente.proxima_atencion) ||
      fechaHoraLocalDefault(),
  );
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fechaActual = useMemo(
    () => paciente.proxima_atencion ?? "",
    [paciente.proxima_atencion],
  );

  async function handleConfirm() {
    if (!fechaHora) {
      setError("Selecciona fecha y hora para continuar.");
      return;
    }
    const isoValue = new Date(fechaHora).toISOString();
    setLoading(true);
    setError("");
    try {
      await onConfirm(isoValue);
      onClose();
    } catch (e: any) {
      setError(e?.detail || "Error al programar.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    if (!onClear) return;
    setLoading(true);
    setError("");
    try {
      await onClear();
      onClose();
    } catch {
      setError("No se pudo eliminar.");
    } finally {
      setLoading(false);
    }
  }

  function aplicarHorarioRapido(hora: string) {
    const base = fechaHora || fechaHoraLocalDefault();
    setFechaHora(`${base.slice(0, 10)}T${hora}`);
  }

  return (
    <motion.div
      variants={backdropVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="fixed inset-0 z-[70] flex items-center justify-center bg-[#05150E]/70 px-4 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        variants={modalVariants}
        className="w-full max-w-md overflow-hidden rounded-[1.5rem] bg-white shadow-[0_20px_50px_rgba(0,0,0,0.3)] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute top-4 right-4 z-10">
           <button onClick={onClose} className="p-2 rounded-full bg-black/5 hover:bg-black/10 text-gray-900 transition-colors">
              <FiX size={20} />
           </button>
        </div>

        <div className="bg-[linear-gradient(135deg,#1B5E3B_0%,#15452C_100%)] p-7 text-white">
           <div className="flex items-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-inner">
                 <FiCalendar size={24} />
              </div>
              <div>
                 <h3 className="text-xl font-black leading-tight tracking-tight">Programar Atención</h3>
                 <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">CCR Gestión Clínica</p>
              </div>
           </div>
           
           <div className="rounded-xl bg-black/20 backdrop-blur-md p-4 border border-white/10 shadow-sm">
              <p className="text-base font-black text-white">{paciente.nombre}</p>
              <p className="text-[10px] font-black opacity-80 mt-1 uppercase tracking-widest">{formatearRut(paciente.rut)}</p>
           </div>
        </div>

        <div className="p-7 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 rounded-xl border-2 border-red-100 text-[11px] font-black text-red-700">
              {error}
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
               <label className="text-[11px] font-black uppercase text-gray-900 tracking-widest flex items-center gap-2">
                 <FiClock size={14} /> Fecha y Hora
               </label>
               {fechaActual && (
                  <span className="text-[10px] font-black text-[#1B5E3B] bg-[#EAF6EE] px-2.5 py-1 rounded-lg border border-[#1B5E3B]/20">
                    Agendada
                  </span>
               )}
            </div>
            
            <input
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
              className="w-full rounded-xl border-2 border-gray-200 bg-white px-4 py-4 text-sm font-black text-gray-900 focus:border-[#1B5E3B] focus:ring-4 focus:ring-green-500/10 focus:outline-none transition-all"
            />
            
            <div className="mt-4">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block mb-2 px-1">Accesos rápidos:</span>
              <div className="flex flex-wrap gap-1.5">
                {["08:00", "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"].map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => aplicarHorarioRapido(h)}
                    className="h-8 px-3 rounded-lg border-2 border-gray-100 bg-white text-[11px] font-black text-gray-900 hover:border-[#1B5E3B] hover:bg-[#EAF6EE] transition-all shadow-sm active:scale-95"
                  >
                    {h}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="px-7 pb-7 flex flex-col gap-3">
           <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 h-14 rounded-xl border-2 border-gray-200 bg-white text-xs font-black text-gray-900 hover:bg-gray-50 transition-all active:scale-95"
              >
                Cerrar Ventana
              </button>
              <button
                onClick={handleConfirm}
                disabled={loading}
                className="flex-[2] h-14 rounded-xl bg-[#1B5E3B] text-white text-base font-black flex items-center justify-center gap-3 shadow-lg shadow-green-900/40 hover:bg-[#15452C] active:scale-[0.98] transition-all disabled:opacity-50"
              >
                {loading ? <FiRefreshCw className="animate-spin" /> : <FiCheck size={22} />}
                {loading ? "Guardando..." : "Confirmar Cita"}
              </button>
           </div>
           
           {onClear && (
            <button
              type="button"
              onClick={handleClear}
              className="w-full h-11 rounded-xl border-2 border-red-100 bg-red-50 text-[10px] font-black uppercase text-red-700 hover:bg-red-100 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-sm"
            >
              <FiTrash2 size={14} /> Eliminar Programación Actual
            </button>
           )}
        </div>
      </motion.div>
    </motion.div>
  );
}
