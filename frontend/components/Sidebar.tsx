"use client";

import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Button, Dialog, Modal, ModalOverlay } from "react-aria-components";
import {
  FiActivity,
  FiBarChart2,
  FiBriefcase,
  FiCalendar,
  FiChevronLeft,
  FiClock,
  FiHome,
  FiInbox,
  FiPhone,
  FiSearch,
  FiUpload,
  FiUsers,
  FiX,
  FiLogOut,
  FiUser,
} from "react-icons/fi";
import type { IconType } from "react-icons";
import { api } from "@/lib/api";
import type { Paciente, Rol, Usuario } from "@/lib/types";
import { ESTADO_LABELS } from "@/lib/types";
import { formatearRut, limpiarRut } from "@/lib/rut";
import { useAuth } from "@/lib/auth-context";

interface Item {
  href: string;
  label: string;
  icon: IconType;
  section: "principal" | "gestion" | "analisis" | "admin";
  countKey?: "total" | "mios" | "rescates" | "cola";
}

const BASE_ITEMS: Record<Rol, Item[]> = {
  KINE: [
    { href: "/inicio", label: "Dashboard", icon: FiHome, section: "principal" },
    {
      href: "/calendario",
      label: "Calendario de citas",
      icon: FiCalendar,
      section: "principal",
    },
    {
      href: "/lista-espera",
      label: "Lista de espera",
      icon: FiInbox,
      section: "principal",
      countKey: "total",
    },
    {
      href: "/mis-pacientes",
      label: "Mis pacientes",
      icon: FiUsers,
      section: "principal",
      countKey: "mios",
    },
    {
      href: "/llamados",
      label: "Cola de llamadas",
      icon: FiPhone,
      section: "gestion",
      countKey: "cola",
    },
    {
      href: "/egresos",
      label: "Historial de egresos",
      icon: FiClock,
      section: "gestion",
    },
    {
      href: "/analisis/estadisticas",
      label: "Estadísticas",
      icon: FiBarChart2,
      section: "analisis",
    },
  ],
  ADMINISTRATIVO: [
    { href: "/inicio", label: "Dashboard", icon: FiHome, section: "principal" },
    {
      href: "/calendario",
      label: "Calendario de citas",
      icon: FiCalendar,
      section: "principal",
    },
    {
      href: "/llamados",
      label: "Cola de llamadas",
      icon: FiPhone,
      section: "gestion",
      countKey: "cola",
    },
    {
      href: "/importar",
      label: "Importar derivaciones",
      icon: FiUpload,
      section: "gestion",
    },
    {
      href: "/historial-mensual",
      label: "Historial de cortes",
      icon: FiClock,
      section: "gestion",
    },
    {
      href: "/egresos",
      label: "Historial de egresos",
      icon: FiClock,
      section: "gestion",
    },
    {
      href: "/analisis/estadisticas",
      label: "Estadísticas",
      icon: FiBarChart2,
      section: "analisis",
    },
  ],
  ADMIN: [
    { href: "/inicio", label: "Dashboard", icon: FiHome, section: "principal" },
    {
      href: "/calendario",
      label: "Calendario de citas",
      icon: FiCalendar,
      section: "principal",
    },
    {
      href: "/lista-espera",
      label: "Lista de espera",
      icon: FiInbox,
      section: "principal",
      countKey: "total",
    },
    {
      href: "/mis-pacientes",
      label: "Pacientes asignados",
      icon: FiUsers,
      section: "principal",
      countKey: "mios",
    },
    {
      href: "/llamados",
      label: "Cola de llamadas",
      icon: FiPhone,
      section: "gestion",
      countKey: "cola",
    },
    {
      href: "/importar",
      label: "Importar derivaciones",
      icon: FiUpload,
      section: "gestion",
    },
    {
      href: "/historial-mensual",
      label: "Historial de cortes",
      icon: FiClock,
      section: "gestion",
    },
    {
      href: "/egresos",
      label: "Historial de egresos",
      icon: FiClock,
      section: "gestion",
    },
    {
      href: "/analisis/estadisticas",
      label: "Estadísticas",
      icon: FiBarChart2,
      section: "analisis",
    },
    {
      href: "/usuarios",
      label: "Usuarios",
      icon: FiBriefcase,
      section: "admin",
    },
  ],
};

const SECTION_LABELS: Record<Item["section"], string> = {
  principal: "Principal",
  gestion: "Gestión",
  analisis: "Análisis",
  admin: "Administración",
};

const ROL_LABELS: Record<string, string> = {
  KINE: "Kinesiólogo/a",
  ADMINISTRATIVO: "Administrativo/a",
  ADMIN: "Administrador/a",
};

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function SidebarNav({
  items,
  pathname,
  counts,
  compact,
  onNavigate,
}: {
  items: Item[];
  pathname: string;
  counts: { total: number; mios: number; rescates: number; cola: number };
  compact: boolean;
  onNavigate?: () => void;
}) {
  const sectionOrder: Item["section"][] = [
    "principal",
    "gestion",
    "analisis",
    "admin",
  ];

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      {sectionOrder.map((section) => {
        const sectionItems = items.filter((item) => item.section === section);
        if (sectionItems.length === 0) return null;

        return (
          <div key={section} className="mb-4 last:mb-0">
            {!compact && (
              <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-[#9FCCB1]">
                {SECTION_LABELS[section]}
              </p>
            )}

            <ul className="space-y-1">
              {sectionItems.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                const count = item.countKey ? counts[item.countKey] : null;

                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={compact ? item.label : undefined}
                      className={classes(
                        "group flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition",
                        compact && "justify-center px-2",
                        active
                          ? "border-[#79D4A6]/50 bg-[#2A6F4C] text-white"
                          : "border-transparent text-[#D2EADC] hover:border-white/15 hover:bg-[#1E5A3F]",
                      )}
                    >
                      <span
                        className={classes(
                          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[15px]",
                          active ? "bg-white/15" : "bg-white/10 text-[#D4E8DA]",
                        )}
                      >
                        <Icon />
                      </span>

                      {!compact && (
                        <>
                          <span className="min-w-0 flex-1 truncate">
                            {item.label}
                          </span>
                          {typeof count === "number" && (
                            <span
                              className={classes(
                                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                                active
                                  ? "bg-white/20 text-white"
                                  : "bg-white/15 text-[#DCEFE3]",
                              )}
                            >
                              {count}
                            </span>
                          )}
                        </>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export default function Sidebar({
  rol,
  userId,
  mobileOpen,
  onMobileOpenChange,
}: {
  rol: Rol;
  userId: number;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}) {
  const { logout, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [compact, setCompact] = useState(false);
  const [counts, setCounts] = useState({
    total: 0,
    mios: 0,
    rescates: 0,
    cola: 0,
  });
  const items = useMemo(() => BASE_ITEMS[rol], [rol]);

  // Search state
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Paciente[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const buscar = useCallback(async (raw: string) => {
    const limpio = limpiarRut(raw);
    if (limpio.length < 3) {
      setSuggestions([]);
      setSearchOpen(false);
      return;
    }
    setLoadingSearch(true);
    try {
      const data = await api.get<Paciente[]>(
        `/pacientes/?search=${encodeURIComponent(limpio)}`
      );
      const seen = new Set<string>();
      const uniq = data.filter((p) => {
        if (seen.has(p.rut)) return false;
        seen.add(p.rut);
        return true;
      });
      setSuggestions(uniq.slice(0, 8));
      setSearchOpen(uniq.length > 0);
    } catch {
      setSuggestions([]);
      setSearchOpen(false);
    } finally {
      setLoadingSearch(false);
    }
  }, []);

  function handleSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatearRut(e.target.value);
    setQuery(formatted);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void buscar(formatted), 300);
  }

  function handleSelect(paciente: Paciente) {
    setSearchOpen(false);
    setQuery("");
    setSuggestions([]);
    router.push(`/paciente/${limpiarRut(paciente.rut)}`);
    onMobileOpenChange(false);
  }

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  useEffect(() => {
    function onOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadCounts() {
      try {
        const [total, mios, rescates, pendientes] = await Promise.all([
          api.get<Paciente[]>("/pacientes/?sin_asignar=1"),
          api.get<Paciente[]>(rol === "ADMIN" ? "/pacientes/?asignados=1" : `/pacientes/?kine=${userId}`),
          api.get<Paciente[]>("/pacientes/?estado=RESCATE"),
          api.get<Paciente[]>("/pacientes/?estado=PENDIENTE"),
        ]);

        if (!mounted) return;

        const cola = [...pendientes, ...rescates].filter(
          (p) => rol === "KINE" ? p.kine_asignado === userId : p.kine_asignado !== null,
        ).length;

        setCounts({
          total: total.length,
          mios: mios.filter((p) => !["ALTA_MEDICA", "EGRESO_VOLUNTARIO", "ABANDONO", "DERIVADO"].includes(p.estado)).length,
          rescates: rescates.length,
          cola,
        });
      } catch {
        if (!mounted) return;
        setCounts({ total: 0, mios: 0, rescates: 0, cola: 0 });
      }
    }

    void loadCounts();

    function onRefreshEvent() {
      void loadCounts();
    }

    window.addEventListener("ccr:refresh-sidebar", onRefreshEvent);

    return () => {
      mounted = false;
      window.removeEventListener("ccr:refresh-sidebar", onRefreshEvent);
    };
  }, [userId]);

  useEffect(() => {
    onMobileOpenChange(false);
  }, [pathname, onMobileOpenChange]);

  return (
    <>
      <aside
        className={classes(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r border-black/10 bg-[linear-gradient(180deg,#173F2D_0%,#102D20_100%)] text-white transition-all duration-300 lg:flex shadow-2xl",
          compact ? "w-[88px]" : "w-[280px]"
        )}
      >
        <div className="flex items-center justify-between px-4 py-6">
          {!compact && (
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shadow-lg border border-white/10">
                <FiActivity className="text-[#79D4A6]" size={18} />
              </div>
              <span className="font-bold tracking-tight text-white/90">CCR Panel</span>
            </div>
          )}

          <Button
            aria-label={compact ? "Expandir menú" : "Contraer menú"}
            onPress={() => setCompact((prev) => !prev)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 outline-none transition hover:bg-white/15 hover:text-white focus-visible:ring-2 focus-visible:ring-[#A8E0C2]"
          >
            <FiChevronLeft
              className={classes("transition-transform duration-300", compact && "rotate-180")}
              size={14}
            />
          </Button>
        </div>

        {!compact && (
          <div ref={searchRef} className="px-4 mb-4 relative">
            <div className="relative group">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-[#79D4A6] transition-colors" size={14} />
              <input
                type="text"
                placeholder="Buscar RUT..."
                value={query}
                onChange={handleSearchChange}
                className="w-full bg-white/5 border border-white/10 rounded-xl py-2 pl-9 pr-4 text-xs outline-none focus:ring-1 focus:ring-[#79D4A6]/50 focus:bg-white/10 transition-all placeholder:text-white/30"
              />
              {loadingSearch && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 border-2 border-[#79D4A6] border-t-transparent animate-spin rounded-full" />
              )}
            </div>

            {searchOpen && suggestions.length > 0 && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-[#1B4B36] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden backdrop-blur-md">
                <ul className="max-h-60 overflow-y-auto">
                  {suggestions.map((p) => (
                    <li key={p.id}>
                      <button
                        onClick={() => handleSelect(p)}
                        className="w-full text-left px-3 py-2 hover:bg-white/10 transition flex flex-col gap-0.5 border-b border-white/5 last:border-0"
                      >
                        <span className="text-[11px] font-semibold truncate leading-tight">{p.nombre}</span>
                        <span className="text-[10px] text-white/50 font-mono">{formatearRut(p.rut)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <SidebarNav
          items={items}
          pathname={pathname}
          counts={counts}
          compact={compact}
        />

        <div className="mt-auto border-t border-white/10 p-4">
          <div className="flex items-center justify-center">
             <div className="h-8 w-8 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                <FiActivity className="text-white/20" size={14} />
             </div>
          </div>
        </div>
      </aside>

      <ModalOverlay
        isOpen={mobileOpen}
        onOpenChange={onMobileOpenChange}
        className="fixed inset-0 z-50 bg-[#102D20]/55 p-3 backdrop-blur-[1px] lg:hidden"
      >
        <Modal className="h-full w-[92vw] max-w-[320px] rounded-2xl border border-[#1E5840] bg-[linear-gradient(180deg,#173F2D_0%,#102D20_100%)] text-white shadow-2xl outline-none">
          <Dialog
            aria-label="Menú principal"
            className="flex h-full flex-col outline-none"
          >
            {({ close }) => (
              <>
                <div className="flex items-center justify-between px-4 py-6 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-white/15 flex items-center justify-center shadow-lg border border-white/10">
                      <FiActivity className="text-[#79D4A6]" size={18} />
                    </div>
                    <span className="font-bold tracking-tight">CCR Panel</span>
                  </div>
                  <Button
                    onPress={close}
                    aria-label="Cerrar menú"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-[#A8E0C2]"
                  >
                    <FiX size={16} />
                  </Button>
                </div>

                <div className="px-4 mt-4 relative">
                  <div className="relative">
                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={14} />
                    <input
                      type="text"
                      placeholder="Buscar RUT..."
                      value={query}
                      onChange={handleSearchChange}
                      className="w-full bg-white/5 border border-white/10 rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-[#79D4A6]/50 focus:bg-white/10 transition-all placeholder:text-white/30"
                    />
                    {loadingSearch && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 h-3 w-3 border-2 border-[#79D4A6] border-t-transparent animate-spin rounded-full" />
                    )}
                  </div>

                  {searchOpen && suggestions.length > 0 && (
                    <div className="absolute top-full left-4 right-4 mt-2 bg-[#1B4B36] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <ul>
                        {suggestions.map((p) => (
                          <li key={p.id}>
                            <button
                              onClick={() => handleSelect(p)}
                              className="w-full text-left px-4 py-3 hover:bg-white/10 transition flex flex-col gap-0.5 border-b border-white/5 last:border-0"
                            >
                              <span className="text-sm font-semibold">{p.nombre}</span>
                              <span className="text-xs text-white/50 font-mono">{formatearRut(p.rut)}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <SidebarNav
                  items={items}
                  pathname={pathname}
                  counts={counts}
                  compact={false}
                  onNavigate={close}
                />

                <div className="mt-auto border-t border-white/10 p-4 pb-8">
                  <div className="flex items-center justify-center">
                    <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold">CCR System v2.0</span>
                  </div>
                </div>
              </>
            )}
          </Dialog>
        </Modal>
      </ModalOverlay>
    </>
  );
}
