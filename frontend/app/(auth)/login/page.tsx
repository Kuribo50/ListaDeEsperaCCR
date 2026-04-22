"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import type { Rol } from "@/lib/types";
import { formatearRut, rutParaApi } from "@/lib/rut";
import type { IconType } from "react-icons";
import {
  FiActivity,
  FiAlertCircle,
  FiClipboard,
  FiEye,
  FiEyeOff,
  FiKey,
  FiLock,
  FiShield,
  FiUser,
} from "react-icons/fi";

const ROL_LABELS: Record<string, string> = {
  KINE: "Kinesiólogo/a",
  ADMINISTRATIVO: "Administrativo/a",
  ADMIN: "Administrador/a",
};

const DEMO_PASSWORD = "Ccr2025*";

const QUICK_USERS: {
  nombre: string;
  rut: string;
  rol: string;
  icon: IconType;
  iconColor: string;
  iconBg: string;
}[] = [
  {
    nombre: "Administrador",
    rut: "66666666K",
    rol: "ADMIN",
    icon: FiShield,
    iconColor: "#3D4AA3",
    iconBg: "bg-[#EEF2FF]",
  },
  {
    nombre: "Seba Salgado",
    rut: "11111111K",
    rol: "KINE",
    icon: FiActivity,
    iconColor: "#1B5E3B",
    iconBg: "bg-[#E8F5EE]",
  },
  {
    nombre: "Administrativa",
    rut: "55555555K",
    rol: "ADMINISTRATIVO",
    icon: FiClipboard,
    iconColor: "#0E7490",
    iconBg: "bg-[#E0F7FA]",
  },
  {
    nombre: "Seba Campos",
    rut: "22222222K",
    rol: "KINE",
    icon: FiActivity,
    iconColor: "#1B5E3B",
    iconBg: "bg-[#E8F5EE]",
  },
  {
    nombre: "Mane",
    rut: "33333333K",
    rol: "KINE",
    icon: FiActivity,
    iconColor: "#1B5E3B",
    iconBg: "bg-[#E8F5EE]",
  },
  {
    nombre: "Ma Ignacia",
    rut: "44444444K",
    rol: "KINE",
    icon: FiActivity,
    iconColor: "#1B5E3B",
    iconBg: "bg-[#E8F5EE]",
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [rut, setRut] = useState(formatearRut(QUICK_USERS[0].rut));
  const [password, setPassword] = useState(DEMO_PASSWORD);
  const [selectedQuickRut, setSelectedQuickRut] = useState(QUICK_USERS[0].rut);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleQuickUserSelect(rutUsuario: string) {
    setSelectedQuickRut(rutUsuario);
    setError("");
    setRut(formatearRut(rutUsuario));
    setPassword(DEMO_PASSWORD);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(rutParaApi(rut), password);
      router.replace("/inicio");
    } catch (err: any) {
      const rawMessage = err?.non_field_errors?.[0] || err?.detail || "Error al iniciar sesión.";
      setError(rawMessage.toLowerCase().includes("no active account") 
        ? "No se encontró una cuenta activa para estas credenciales."
        : rawMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="w-full max-w-5xl ccr-fade-up overflow-hidden rounded-[2.5rem] border border-[#C8DDCD] bg-white shadow-[0_32px_64px_-32px_rgba(18,65,43,0.4)]">
      <div className="grid md:grid-cols-[40%_60%] min-h-[600px]">
        {/* Panel Lateral (Modo Dev / Accesos Rápidos) */}
        <aside className="relative flex flex-col bg-[linear-gradient(160deg,#153C2B_0%,#1D563C_100%)] p-8 text-white overflow-hidden">
          <div className="pointer-events-none absolute -left-12 -top-12 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-16 -right-16 h-64 w-64 rounded-full bg-[#7ED3A6]/10 blur-3xl" />
          <div className="pointer-events-none absolute top-1/4 right-8 h-4 w-4 rounded-full bg-white/20" />
          <div className="pointer-events-none absolute bottom-1/4 left-12 h-6 w-6 rounded-full bg-white/10" />
          
          <div className="relative z-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white mb-6 shadow-lg border border-white/10">
              <FiActivity size={24} />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Acceso Rápido</h2>
            <p className="mt-2 text-sm text-white/60 leading-relaxed max-w-[20ch]">
              Selecciona un entorno de pruebas para ingresar.
            </p>
          </div>

          <div className="relative z-10 mt-8 space-y-3 flex-1 overflow-y-auto pr-2 custom-scrollbar">
             {QUICK_USERS.map((user) => (
                <button
                  key={user.rut}
                  type="button"
                  onClick={() => handleQuickUserSelect(user.rut)}
                  className={`w-full flex items-center gap-4 rounded-xl border p-3.5 transition-all outline-none ${
                    selectedQuickRut === user.rut
                      ? "border-white/40 bg-white/20 shadow-lg translate-x-1"
                      : "border-white/10 bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-white shadow-inner`}>
                     <user.icon size={16} style={{ color: user.iconColor }} />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-bold text-sm truncate leading-tight">{user.nombre}</p>
                    <p className="text-[9px] uppercase tracking-wider text-white/50 font-bold mt-0.5">{ROL_LABELS[user.rol]}</p>
                  </div>
                </button>
              ))}
          </div>

          <div className="mt-8 relative z-10 py-6 px-4 border-t border-white/10 text-center opacity-30">
            <FiShield size={16} className="mx-auto mb-2" />
          </div>
        </aside>

        {/* Panel Formulario */}
        <main className="flex flex-col justify-center p-8 lg:p-14 bg-[radial-gradient(circle_at_85%_10%,#F0F9F3_0%,transparent_40%)]">
          <div className="mb-10 overflow-hidden rounded-2xl border border-[#D9E9DC] bg-[#F6FBF7] p-5 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-[#1B5E3B] shadow-sm border border-[#D9E9DC]">
                <FiKey size={22} />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#4E6A55]">Seguridad Institucional</p>
                <h1 className="text-2xl font-extrabold text-[#162C20]">Iniciar Sesión</h1>
              </div>
            </div>
            <FiShield className="text-[#2A6E49]/20" size={32} />
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 max-w-sm mx-auto w-full">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#3A4E3A] ml-1">RUT</label>
              <div className="relative group">
                <FiUser className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6F8C79] group-focus-within:text-[#1B5E3B] transition-colors" size={18} />
                <input
                  type="text"
                  value={rut}
                  onChange={(e) => setRut(formatearRut(e.target.value))}
                  placeholder="11.111.111-K"
                  maxLength={12}
                  required
                  className="w-full rounded-2xl border border-[#C8D8C8] bg-[#F7FAF7] py-4 pl-12 pr-4 text-sm outline-none transition-all focus:border-[#1B5E3B] focus:bg-white focus:ring-4 focus:ring-[#1B5E3B]/5 shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-[#3A4E3A] ml-1">Contraseña</label>
              <div className="relative group">
                <FiLock className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6F8C79] group-focus-within:text-[#1B5E3B] transition-colors" size={18} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  className="w-full rounded-2xl border border-[#C8D8C8] bg-[#F7FAF7] py-4 pl-12 pr-12 text-sm outline-none transition-all focus:border-[#1B5E3B] focus:bg-white focus:ring-4 focus:ring-[#1B5E3B]/5 shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6A8272] hover:text-[#1B5E3B] transition-colors"
                >
                  {showPassword ? <FiEyeOff size={20} /> : <FiEye size={20} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-3 rounded-xl border border-red-100 bg-red-50 p-4 text-xs font-medium text-red-600">
                <FiAlertCircle className="shrink-0" size={16} />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 rounded-2xl bg-[linear-gradient(135deg,#1B5E3B_0%,#2D7450_100%)] py-4 text-sm font-bold tracking-wide text-white shadow-xl shadow-green-900/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? "Verificando..." : "Acceder al Sistema"}
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
