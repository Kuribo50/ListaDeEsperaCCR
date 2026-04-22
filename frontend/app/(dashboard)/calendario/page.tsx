"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type { Paciente } from "@/lib/types";
import { ESTADO_LABELS } from "@/lib/types";
import { formatearRut, limpiarRut } from "@/lib/rut";
import ProximaAtencionModal from "@/components/ProximaAtencionModal";
import { useAuth } from "@/lib/auth-context";
import { motion, AnimatePresence } from "framer-motion";
import {
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiClock,
  FiUser,
  FiUserPlus,
  FiRefreshCw,
  FiArrowRight,
} from "react-icons/fi";
import Link from "next/link";

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function fromDateKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00`);
}

function formatMonthYear(date: Date) {
  return new Intl.DateTimeFormat("es-CL", {
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDay(dateKey: string) {
  return new Intl.DateTimeFormat("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(fromDateKey(dateKey));
}

const ESTADOS_PROGRAMABLES = new Set(["PENDIENTE", "RESCATE", "INGRESADO"]);

function dateKeyFromDateTime(value: string) {
  return toDateKey(new Date(value));
}

function sameMonth(dateKey: string, reference: Date) {
  const date = fromDateKey(dateKey);
  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
}

const tunnelVariants = {
  initial: { opacity: 0, scale: 0.98, y: 10 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: { duration: 0.4, staggerChildren: 0.03 }
  }
};

const itemVariants = {
  initial: { opacity: 0, y: 5 },
  animate: { opacity: 1, y: 0 }
};

export default function CalendarioPage() {
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mesActual, setMesActual] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() =>
    toDateKey(new Date()),
  );
  const [programando, setProgramando] = useState<Paciente | null>(null);

  const cargar = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const endpoint =
        user.rol === "KINE" ? "/pacientes/?solo_mios=1" : "/pacientes/";
      const data = await api.get<Paciente[]>(endpoint);
      setPacientes(data);
    } catch {
      setError("No se pudo cargar el calendario.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!sameMonth(fechaSeleccionada, mesActual)) {
      setFechaSeleccionada(
        toDateKey(new Date(mesActual.getFullYear(), mesActual.getMonth(), 1)),
      );
    }
  }, [mesActual, fechaSeleccionada]);

  const pacientesProgramables = useMemo(() => {
    if (!user) return [] as Paciente[];
    return pacientes.filter((paciente) => {
      const asignado = paciente.kine_asignado !== null;
      const estadoProgramable = ESTADOS_PROGRAMABLES.has(paciente.estado);
      const esPropio = paciente.kine_asignado === user.id;
      if (!asignado || !estadoProgramable) return false;
      if (user.rol === "KINE") return esPropio;
      return user.rol === "ADMIN" || user.rol === "ADMINISTRATIVO";
    });
  }, [pacientes, user]);

  const porFecha = useMemo(() => {
    const mapa = new Map<string, Paciente[]>();
    for (const p of pacientesProgramables) {
      if (!p.proxima_atencion) continue;
      const fecha = dateKeyFromDateTime(p.proxima_atencion);
      const lista = mapa.get(fecha) ?? [];
      lista.push(p);
      mapa.set(fecha, lista);
    }
    return mapa;
  }, [pacientesProgramables]);

  const diasDelMes = useMemo(() => {
    const inicio = new Date(mesActual.getFullYear(), mesActual.getMonth(), 1);
    const fin = new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 0);
    const celdas: Array<Date | null> = Array(inicio.getDay()).fill(null);
    for (let d = 1; d <= fin.getDate(); d++) {
      celdas.push(new Date(mesActual.getFullYear(), mesActual.getMonth(), d));
    }
    while (celdas.length % 7 !== 0) celdas.push(null);
    return celdas;
  }, [mesActual]);

  const pacientesDelDia = porFecha.get(fechaSeleccionada) ?? [];
  const pacientesSinFecha = pacientesProgramables.filter(p => !p.proxima_atencion);

  return (
    <motion.div 
      variants={tunnelVariants}
      initial="initial"
      animate="animate"
      className="space-y-4 max-w-[1600px] mx-auto"
    >
      {/* Header Section */}
      <motion.header variants={itemVariants} className="ccr-panel rounded-[2rem] p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1B5E3B] text-white shadow-lg shadow-green-900/10">
              <FiCalendar size={24} />
            </div>
            <div>
              <h1 className="text-xl font-black text-[#162C20]">Calendario</h1>
              <p className="text-[10px] font-bold text-[#55705F] uppercase tracking-widest mt-0.5">Gestión de Atenciones</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-gray-50 border border-gray-100">
            <button
              onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() - 1, 1))}
              className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500 hover:text-[#1B5E3B]"
            >
              <FiChevronLeft size={18} />
            </button>
            <div className="px-4 text-center min-w-[120px]">
              <p className="text-base font-black text-[#1B5E3B] capitalize leading-none">{formatMonthYear(mesActual).split(' ')[0]}</p>
              <p className="text-[9px] font-bold uppercase text-[#729080] tracking-widest mt-0.5">{mesActual.getFullYear()}</p>
            </div>
            <button
              onClick={() => setMesActual(new Date(mesActual.getFullYear(), mesActual.getMonth() + 1, 1))}
              className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-gray-500 hover:text-[#1B5E3B]"
            >
              <FiChevronRight size={18} />
            </button>
          </div>
        </div>
      </motion.header>

      {error && (
        <motion.div variants={itemVariants} className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold">
          {error}
        </motion.div>
      )}

      <div className="grid gap-4 lg:grid-cols-12 items-start">
        {/* Calendar Grid */}
        <motion.section variants={itemVariants} className="ccr-panel rounded-[2rem] p-5 lg:col-span-8 shadow-sm">
           <div className="grid grid-cols-7 gap-1 text-center mb-4">
              {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d, i) => (
                <div key={`${d}-${i}`} className="text-[9px] font-black text-gray-300 uppercase tracking-widest py-1">
                  {d}
                </div>
              ))}
           </div>
           
           {loading ? (
             <div className="grid grid-cols-7 gap-2">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-xl bg-gray-50 animate-pulse" />
                ))}
             </div>
           ) : (
             <div className="grid grid-cols-7 gap-2">
                {diasDelMes.map((dia, index) => {
                  if (!dia) return <div key={`empty-${index}`} />;
                  const dateKey = toDateKey(dia);
                  const items = porFecha.get(dateKey) ?? [];
                  const isSelected = fechaSeleccionada === dateKey;
                  const isToday = dateKey === toDateKey(new Date());
                  const hasAppointments = items.length > 0;

                  return (
                    <motion.button
                      key={dateKey}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setFechaSeleccionada(dateKey)}
                      className={`relative h-16 sm:h-20 flex flex-col items-center justify-center rounded-2xl border-2 transition-all ${
                        isSelected 
                          ? "bg-[#1B5E3B] border-[#1B5E3B] shadow-lg shadow-green-900/20 text-white" 
                          : isToday 
                            ? "bg-[#EAF6EE] border-[#1B5E3B]/20 text-[#1B5E3B]" 
                            : "bg-white border-gray-50 hover:border-[#1B5E3B]/10 hover:bg-gray-50/50"
                      }`}
                    >
                      <span className={`text-sm font-black ${isSelected ? "text-white" : "text-[#162C20]"}`}>
                        {dia.getDate()}
                      </span>
                      
                      {hasAppointments && (
                        <div className="mt-1 flex gap-0.5">
                           <div className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white' : 'bg-[#1B5E3B]'}`} />
                           {items.length > 1 && <div className={`h-1 w-1 rounded-full ${isSelected ? 'bg-white/60' : 'bg-[#1B5E3B]/40'}`} />}
                        </div>
                      )}
                    </motion.button>
                  );
                })}
             </div>
           )}
        </motion.section>

        {/* Selected Day & Pending Section */}
        <motion.aside variants={itemVariants} className="lg:col-span-4 space-y-6">
           {/* Selected Day Card */}
           <div className="ccr-panel rounded-3xl p-6 shadow-sm overflow-hidden relative">
              <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                 <FiClock size={80} />
              </div>
              <div className="mb-4">
                 <p className="text-[10px] font-bold uppercase tracking-widest text-[#729080]">Día Seleccionado</p>
                 <h3 className="text-xl font-black text-[#1B5E3B] capitalize mt-1">{formatDay(fechaSeleccionada)}</h3>
              </div>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                 {pacientesDelDia.length > 0 ? (
                   pacientesDelDia.map(p => (
                     <div key={p.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 group hover:bg-white hover:shadow-md transition-all">
                        <div className="flex items-start justify-between">
                           <div className="min-w-0 flex-1">
                              <p className="font-bold text-[#162C20] line-clamp-1">{p.nombre}</p>
                              <div className="flex items-center gap-2 mt-1">
                                 <span className="text-[10px] font-bold text-[#1B5E3B] opacity-70 uppercase tracking-widest">
                                    {p.proxima_atencion ? new Date(p.proxima_atencion).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                 </span>
                                 <span className="h-1 w-1 rounded-full bg-gray-200" />
                                 <span className="text-[10px] font-bold text-gray-400 capitalize">{ESTADO_LABELS[p.estado].toLowerCase()}</span>
                              </div>
                           </div>
                           <button 
                             onClick={() => setProgramando(p)}
                             className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border-2 border-gray-100 text-[10px] font-black text-gray-900 hover:border-[#1B5E3B] hover:bg-[#EAF6EE] transition-all shadow-sm active:scale-95"
                           >
                              <FiRefreshCw size={12} className="text-[#1B5E3B]" />
                              Reprogramar
                           </button>
                        </div>
                     </div>
                   ))
                 ) : (
                   <div className="py-10 text-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/50">
                      <FiUser size={32} className="mx-auto text-gray-300 mb-2 opacity-40" />
                      <p className="text-sm font-bold text-gray-400">Sin citas para este día</p>
                   </div>
                 )}
              </div>
           </div>

           {/* Pending List Card */}
           <div className="ccr-panel rounded-3xl p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                 <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-[#729080]">Por Agendar</p>
                    <h3 className="text-xl font-black text-[#162C20] mt-1">{pacientesSinFecha.length} Pacientes</h3>
                 </div>
                 <div className="h-10 w-10 flex items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                    <FiUserPlus size={20} />
                 </div>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                 {pacientesSinFecha.length > 0 ? (
                   pacientesSinFecha.slice(0, 5).map(p => (
                     <div key={p.id} className="flex items-center justify-between p-3 rounded-2xl border border-gray-50 bg-gray-50/30 hover:bg-white hover:shadow-sm transition-all group">
                        <div className="min-w-0">
                           <p className="font-bold text-gray-700 text-xs line-clamp-1">{p.nombre}</p>
                           <p className="text-[10px] text-gray-400 mt-0.5">{p.kine_asignado_nombre || 'Sin profesional'}</p>
                        </div>
                        <button 
                          onClick={() => setProgramando(p)}
                          className="px-3 py-1.5 rounded-lg bg-[#1B5E3B] text-white text-[10px] font-black hover:bg-[#15452C] transition-all active:scale-95 shadow-sm"
                        >
                           Agendar
                        </button>
                     </div>
                   ))
                 ) : (
                    <div className="py-6 text-center opacity-40">
                       <p className="text-xs font-bold text-gray-400">Todo al día</p>
                    </div>
                 )}
                 {pacientesSinFecha.length > 5 && (
                    <p className="text-center text-[10px] font-bold text-gray-300 mt-2">+{pacientesSinFecha.length - 5} más pendientes</p>
                 )}
              </div>
           </div>
        </motion.aside>
      </div>

      <AnimatePresence>
        {programando && (
          <ProximaAtencionModal
            paciente={programando}
            fechaInicial={`${fechaSeleccionada}T09:00`}
            onClose={() => setProgramando(null)}
            onConfirm={async (fechaHora) => {
              await api.post(`/pacientes/${programando.id}/programar-atencion/`, {
                fecha_hora: fechaHora,
              });
              await cargar();
            }}
            onClear={
              programando.proxima_atencion
                ? async () => {
                    await api.delete(
                      `/pacientes/${programando.id}/programar-atencion/`,
                    );
                    await cargar();
                  }
                : undefined
            }
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}
