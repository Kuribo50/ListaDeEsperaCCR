"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "react-aria-components";
import {
  FiArrowRight,
  FiBarChart2,
  FiCalendar,
  FiChevronLeft,
  FiChevronRight,
  FiPhone,
  FiRefreshCw,
  FiUser,
  FiUsers,
  FiActivity,
} from "react-icons/fi";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { ESTADO_LABELS } from "@/lib/types";
import type { Estado, Paciente } from "@/lib/types";
import { limpiarRut } from "@/lib/rut";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";

const ACTION_CARDS = [
  {
    title: "Lista de espera",
    href: "/lista-espera",
    description: "Revisa pacientes sin asignar y su prioridad clínica.",
    icon: FiUsers,
    color: "#2E7D52",
    bg: "bg-[#E8F5EE]",
  },
  {
    title: "Mis pacientes",
    href: "/mis-pacientes",
    description: "Accede rápido a tu cartera activa de seguimiento.",
    icon: FiUser,
    color: "#1B5E3B",
    bg: "bg-[#F0F7F2]",
  },
  {
    title: "Cola de llamados",
    href: "/llamados",
    description: "Gestiona rescates y pacientes en contacto telefónico.",
    icon: FiPhone,
    color: "#B04B1F",
    bg: "bg-[#FAF3F0]",
  },
  {
    title: "Estadísticas",
    href: "/analisis/estadisticas",
    description: "Explora tendencias de carga y egresos por periodo.",
    icon: FiBarChart2,
    color: "#3D4AA3",
    bg: "bg-[#EEF2FF]",
  },
];

const COLORS = {
  INGRESADO: "#2B8A5A",
  PENDIENTE: "#F0993D",
  RESCATE: "#D32F2F",
  OTROS: "#94A3B8",
};

export default function InicioPage() {
  const { user } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [miniCalendarMonth, setMiniCalendarMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedMiniDate, setSelectedMiniDate] = useState(() => toDateKey(new Date()));

  const isKine = user?.rol === "KINE";

  const cargarDashboard = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const data = isKine 
        ? await api.get<Paciente[]>(`/pacientes/?kine=${user.id}`)
        : await api.get<Paciente[]>("/pacientes/");
      setPacientes(data);
      setLastUpdated(new Date());
    } catch {
      setError("No fue posible cargar el dashboard. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  }, [user, isKine]);

  useEffect(() => {
    void cargarDashboard();
  }, [cargarDashboard]);

  const statsData = useMemo(() => {
    const counts = { INGRESADO: 0, PENDIENTE: 0, RESCATE: 0, OTROS: 0 };
    pacientes.forEach(p => {
      if (p.estado === "INGRESADO") counts.INGRESADO++;
      else if (p.estado === "PENDIENTE") counts.PENDIENTE++;
      else if (p.estado === "RESCATE") counts.RESCATE++;
      else counts.OTROS++;
    });
    
    return [
      { name: "Ingresados", value: counts.INGRESADO, color: COLORS.INGRESADO },
      { name: "Pendientes", value: counts.PENDIENTE, color: COLORS.PENDIENTE },
      { name: "Rescate", value: counts.RESCATE, color: COLORS.RESCATE },
      { name: "Otros", value: counts.OTROS, color: COLORS.OTROS },
    ].filter(d => d.value > 0);
  }, [pacientes]);

  const tunnelVariants: Variants = {
    initial: { opacity: 0, scale: 0.8, z: -100, rotateX: 10 },
    animate: { 
      opacity: 1, 
      scale: 1, 
      z: 0, 
      rotateX: 0,
      transition: { 
        duration: 0.8, 
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: Variants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="h-12 w-12 rounded-full border-4 border-[#1B5E3B] border-t-transparent"
        />
      </div>
    );
  }

  return (
    <motion.div 
      variants={tunnelVariants}
      initial="initial"
      animate="animate"
      className="space-y-6 perspective-1000"
    >
      <motion.header variants={itemVariants} className="ccr-panel rounded-3xl p-6 shadow-xl shadow-green-900/5">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#1B5E3B_0%,#2D7450_100%)] text-white shadow-lg shadow-green-900/20">
              <FiActivity size={32} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#648170]">CCR Gestión Clínica</p>
              <h1 className="text-2xl font-extrabold text-[#162C20]">Panel de Control Operativo</h1>
              <p className="mt-1 text-sm text-[#55705F]">
                {isKine ? "Mis pacientes asignados y seguimiento diario." : "Vista de gestión integral del CESFAM."}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-2 px-6 py-4 rounded-2xl bg-[#F4FAF6] border border-[#D2E4D5]">
            <p className="text-sm font-bold text-[#1B5E3B]">{user?.nombre} <span className="mx-1 text-gray-300">|</span> {user?.rol}</p>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-[#6C8A78]">
                Actualizado: {lastUpdated?.toLocaleTimeString()}
              </span>
              <Button
                onPress={() => void cargarDashboard()}
                className="flex items-center gap-2 rounded-lg bg-white border border-[#C5DDCC] px-3 py-1.5 text-xs font-bold text-[#1B5E3B] hover:bg-white/80 transition-all active:scale-95"
              >
                <FiRefreshCw size={12} /> Actualizar
              </Button>
            </div>
          </div>
        </div>
      </motion.header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Charts Section */}
        <motion.section variants={itemVariants} className="ccr-panel rounded-3xl p-6 lg:col-span-8 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#162C20]">Estado de Cartera de Pacientes</h2>
            <div className="flex items-center gap-2 rounded-full bg-[#1B5E3B] px-4 py-1.5 text-xs font-bold text-white shadow-sm">
              Total: {pacientes.length}
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-[300px]">
             <div className="relative h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statsData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                      stroke="none"
                    >
                      {statsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <p className="text-3xl font-extrabold text-[#1B5E3B]">{pacientes.length}</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pacientes</p>
                </div>
             </div>
             
             <div className="flex flex-col justify-center space-y-4">
                {statsData.map((stat) => (
                  <div key={stat.name} className="flex items-center justify-between p-3 rounded-2xl border border-gray-50 bg-gray-50/30 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center gap-3">
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: stat.color }} />
                      <span className="text-sm font-bold text-gray-600 group-hover:text-gray-900">{stat.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-[#1B5E3B]">{stat.value}</span>
                      <span className="text-[10px] font-bold text-gray-400">({Math.round((stat.value / pacientes.length) * 100)}%)</span>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        </motion.section>

        {/* Action Cards Section */}
        <motion.section variants={itemVariants} className="lg:col-span-4 grid grid-cols-1 gap-4">
          {ACTION_CARDS.map((card, i) => (
            <Link key={card.href} href={card.href}>
              <motion.div 
                whileHover={{ scale: 1.02, x: 10 }}
                whileTap={{ scale: 0.98 }}
                className={`ccr-panel h-full flex items-center gap-4 p-5 rounded-3xl transition-all hover:shadow-xl hover:shadow-green-900/5 group`}
              >
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${card.bg} shadow-sm border border-white group-hover:scale-110 transition-transform`}>
                  <card.icon size={24} style={{ color: card.color }} />
                </div>
                <div className="min-w-0">
                  <h3 className="font-bold text-[#162C20] group-hover:text-[#1B5E3B] transition-colors">{card.title}</h3>
                  <p className="text-xs text-[#55705F] line-clamp-1 mt-1 font-medium">{card.description}</p>
                </div>
                <FiArrowRight size={20} className="ml-auto text-gray-300 group-hover:text-[#1B5E3B] transition-all opacity-0 group-hover:opacity-100" />
              </motion.div>
            </Link>
          ))}
        </motion.section>
      </div>

      {/* Agenda/Calendar Section */}
      <motion.section variants={itemVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="ccr-panel rounded-3xl p-6 lg:col-span-5 shadow-sm">
           <div className="mb-6 flex items-center justify-between">
             <h2 className="text-lg font-bold text-[#162C20]">Agenda Semanal</h2>
             <FiCalendar className="text-[#1B5E3B]" size={20} />
           </div>
           
           {/* Mini calendar implementation simplified for UX */}
           <div className="space-y-4">
              <div className="flex items-center justify-between p-2 rounded-xl bg-gray-50">
                 <button onClick={() => setMiniCalendarMonth(new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth() - 1))} className="p-2 hover:bg-white rounded-lg transition-colors"><FiChevronLeft size={18} /></button>
                 <span className="font-bold text-[#1B5E3B] capitalize">{formatoMes(miniCalendarMonth)}</span>
                 <button onClick={() => setMiniCalendarMonth(new Date(miniCalendarMonth.getFullYear(), miniCalendarMonth.getMonth() + 1))} className="p-2 hover:bg-white rounded-lg transition-colors"><FiChevronRight size={18} /></button>
              </div>
              
              <div className="grid grid-cols-7 gap-2">
                 {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => <div key={`${d}-${i}`} className="text-center text-[10px] font-black text-gray-300 uppercase">{d}</div>)}
                 {crearDias(miniCalendarMonth).map((d, j) => {
                   if (!d) return <div key={`empty-${j}`} />;
                   const key = toDateKey(d);
                   const isSelected = key === selectedMiniDate;
                   const isToday = key === toDateKey(new Date());
                   return (
                     <button 
                       key={key} 
                       onClick={() => setSelectedMiniDate(key)}
                       className={`h-10 w-full rounded-xl flex items-center justify-center text-xs font-bold transition-all ${
                         isSelected ? "bg-[#1B5E3B] text-white shadow-lg" : isToday ? "bg-[#EAF6EE] text-[#1B5E3B] border border-[#1B5E3B]/20" : "hover:bg-gray-100 text-[#162C20]"
                       }`}
                     >
                       {d.getDate()}
                     </button>
                   );
                 })}
              </div>
           </div>
        </div>

        <div className="ccr-panel rounded-3xl p-6 lg:col-span-7 shadow-sm">
           <div className="mb-6 flex items-center justify-between border-b border-gray-50 pb-4">
              <h2 className="text-lg font-bold text-[#162C20]">Atenciones Programadas</h2>
              <div className="px-3 py-1 bg-[#1B5E3B]/10 text-[#1B5E3B] rounded-full text-[10px] font-bold">
                {selectedMiniDate.split('-').reverse().join('/')}
              </div>
           </div>
           
           <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
              {pacientes.filter(p => p.proxima_atencion && toDateKey(new Date(p.proxima_atencion)) === selectedMiniDate).length > 0 ? (
                pacientes.filter(p => p.proxima_atencion && toDateKey(new Date(p.proxima_atencion)) === selectedMiniDate).map(p => (
                  <Link key={p.id} href={`/paciente/${limpiarRut(p.rut)}`} className="flex items-center justify-between p-4 rounded-2xl border border-gray-50 bg-gray-50/50 hover:bg-white hover:shadow-md transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-center justify-center h-12 w-16 rounded-xl bg-white border border-gray-100 shadow-sm font-bold text-[#1B5E3B]">
                        <span className="text-xs">{new Date(p.proxima_atencion!).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <div>
                        <p className="font-bold text-[#162C20]">{p.nombre}</p>
                        <p className="text-[10px] font-bold text-[#4CAF7D] uppercase tracking-widest">{ESTADO_LABELS[p.estado]}</p>
                      </div>
                    </div>
                    <FiArrowRight className="text-gray-300 group-hover:text-[#1B5E3B] transition-colors" />
                  </Link>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-10 opacity-40">
                  <FiCalendar size={48} className="mb-2 text-gray-300" />
                  <p className="text-sm font-bold text-gray-400">Sin atenciones registradas para este día</p>
                </div>
              )}
           </div>
        </div>
      </motion.section>
    </motion.div>
  );
}

function toDateKey(valor: Date): string {
  const year = valor.getFullYear();
  const month = String(valor.getMonth() + 1).padStart(2, "0");
  const day = String(valor.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatoMes(valor: Date): string {
  return new Intl.DateTimeFormat("es-CL", { month: "long", year: "numeric" }).format(valor);
}

function crearDias(month: Date) {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const last = new Date(month.getFullYear(), month.getMonth() + 1, 0);
  const days: (Date | null)[] = Array(first.getDay()).fill(null);
  for (let i = 1; i <= last.getDate(); i++) days.push(new Date(month.getFullYear(), month.getMonth(), i));
  return days;
}
