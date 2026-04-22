"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import type {
  Estado,
  MovimientoPaciente,
  Paciente,
  Usuario,
} from "@/lib/types";
import { ESTADO_LABELS, PRIORIDAD_LABELS } from "@/lib/types";
import { formatearRut } from "@/lib/rut";
import { FiActivity, FiClock, FiUser, FiX } from "react-icons/fi";
import BadgeEstado from "./BadgeEstado";
import BadgePrioridad from "./BadgePrioridad";
import CambiarEstadoModal from "./CambiarEstadoModal";
import EditarPacienteModal from "./EditarPacienteModal";

interface Props {
  paciente: Paciente;
  usuario: Usuario;
  onClose: () => void;
  onRefresh: () => void;
}

function calcularDiasDesde(fecha: string | null | undefined) {
  if (!fecha) return null;

  const inicio = new Date(`${fecha}T00:00:00`);
  if (Number.isNaN(inicio.getTime())) return null;

  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  const diffMs = hoy.getTime() - inicio.getTime();
  if (diffMs < 0) return 0;

  return Math.floor(diffMs / 86400000);
}

function calcularDiasEntre(
  inicio: string | null | undefined,
  fin: string | null | undefined,
) {
  if (!inicio || !fin) return null;

  const inicioFecha = new Date(inicio);
  const finFecha = new Date(fin);
  if (Number.isNaN(inicioFecha.getTime()) || Number.isNaN(finFecha.getTime())) {
    return null;
  }

  inicioFecha.setHours(0, 0, 0, 0);
  finFecha.setHours(0, 0, 0, 0);

  const diffMs = finFecha.getTime() - inicioFecha.getTime();
  if (diffMs < 0) return 0;

  return Math.floor(diffMs / 86400000);
}

function formatearDuracion(dias: number | null) {
  if (dias === null) return "Sin dato";
  return dias === 1 ? "1 día" : `${dias} días`;
}

function formatearFechaHora(fecha: string) {
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("es-CL");
}

function formatearFechaHoraCorta(fecha: string | null | undefined) {
  if (!fecha) return "Sin programar";
  const parsed = new Date(fecha);
  if (Number.isNaN(parsed.getTime())) return "Sin programar";
  return parsed.toLocaleString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function FichaPaciente({
  paciente: pacienteInicial,
  usuario,
  onClose,
  onRefresh,
}: Props) {
  const [paciente, setPaciente] = useState<Paciente>(pacienteInicial);
  const [historial, setHistorial] = useState<MovimientoPaciente[]>([]);
  const [loadingHistorial, setLoadingHistorial] = useState(true);
  const [error, setError] = useState("");
  const [mostrarCambioEstado, setMostrarCambioEstado] = useState(false);
  const [mostrarEdicion, setMostrarEdicion] = useState(false);

  useEffect(() => {
    setPaciente(pacienteInicial);
  }, [pacienteInicial]);

  const puedeCambiarEstado = useMemo(() => {
    if (usuario.rol === "KINE" || usuario.rol === "ADMIN") return true;
    if (usuario.rol === "ADMINISTRATIVO")
      return Boolean(paciente.kine_asignado);
    return false;
  }, [usuario.rol, paciente.kine_asignado]);

  const fechaInicioIngreso = useMemo(() => {
    if (paciente.fecha_ingreso) return paciente.fecha_ingreso;

    const ultimoIngreso = historial.find(
      (mov) => mov.estado_nuevo === "INGRESADO",
    );

    if (ultimoIngreso) return ultimoIngreso.fecha;
    return paciente.fecha_cambio_estado;
  }, [paciente.fecha_ingreso, paciente.fecha_cambio_estado, historial]);

  const diasSeguimiento =
    paciente.estado === "INGRESADO"
      ? (calcularDiasDesde(fechaInicioIngreso) ?? 0)
      : paciente.dias_en_lista;

  const diasSeguimientoLabel =
    paciente.estado === "INGRESADO" ? "Días de ingreso" : "Días en lista";

  const historialCronologico = useMemo(
    () => [...historial].reverse(),
    [historial],
  );

  const resumenSeguimiento = useMemo(() => {
    const notas = historialCronologico.map((mov) =>
      (mov.notas || "").toLowerCase(),
    );

    const faltas = notas.filter(
      (nota) =>
        nota.includes("falta") ||
        nota.includes("inasist") ||
        nota.includes("no asiste") ||
        nota.includes("ausent"),
    ).length;

    const reprogramaciones = notas.filter(
      (nota) =>
        nota.includes("reprogram") ||
        nota.includes("reagenda") ||
        nota.includes("cambio de hora"),
    ).length;

    const rescates = historialCronologico.filter(
      (mov) => mov.estado_nuevo === "RESCATE",
    ).length;

    return {
      faltas,
      reprogramaciones,
      rescates,
      cambiosEstado: historialCronologico.length,
      intentosContacto: paciente.n_intentos_contacto,
    };
  }, [historialCronologico, paciente.n_intentos_contacto]);

  const seguimientoPorEstado = useMemo(() => {
    const inicioBase =
      paciente.creado_en ?? `${paciente.fecha_derivacion}T00:00:00`;

    const eventos = [
      { estado: "PENDIENTE" as Estado, inicio: inicioBase },
      ...historialCronologico.map((mov) => ({
        estado: mov.estado_nuevo as Estado,
        inicio: mov.fecha,
      })),
    ];

    return eventos.map((evento, index) => {
      const siguienteInicio =
        eventos[index + 1]?.inicio ?? new Date().toISOString();
      return {
        ...evento,
        fin: siguienteInicio,
        dias: calcularDiasEntre(evento.inicio, siguienteInicio),
      };
    });
  }, [historialCronologico, paciente.creado_en, paciente.fecha_derivacion]);

  useEffect(() => {
    const originalBodyOverflow = document.body.style.overflow;
    const originalHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalBodyOverflow;
      document.documentElement.style.overflow = originalHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    setLoadingHistorial(true);
    api
      .get<MovimientoPaciente[]>(`/pacientes/${paciente.id}/historial/`)
      .then((data) => {
        if (!mounted) return;
        setHistorial(data);
      })
      .catch(() => {
        if (!mounted) return;
        setHistorial([]);
      })
      .finally(() => {
        if (mounted) setLoadingHistorial(false);
      });
    return () => {
      mounted = false;
    };
  }, [paciente.id]);

  async function handleCambiarEstado(estado: Estado, notas: string) {
    setError("");
    try {
      await api.post(`/pacientes/${paciente.id}/cambiar-estado/`, {
        estado,
        notas,
      });
      onRefresh();
      const nuevoHistorial = await api.get<MovimientoPaciente[]>(
        `/pacientes/${paciente.id}/historial/`,
      );
      setHistorial(nuevoHistorial);
    } catch (e: unknown) {
      const detail =
        e && typeof e === "object" && "detail" in e
          ? (e as { detail: string }).detail
          : "No se pudo cambiar el estado.";
      setError(detail);
      throw e;
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/35"
      onClick={onClose}
    >
      <aside
        className="h-full w-full max-w-2xl overflow-y-auto bg-[#F6FAF7] ccr-fade-up"
        style={{ borderLeft: "1px solid #D4E4D4" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 border-b border-[#D4E4D4] bg-[linear-gradient(120deg,#FFFFFF_0%,#EEF6F0_100%)] px-5 py-3.5 backdrop-blur">
          <div className="flex flex-col gap-3 pr-12 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#648170]">
                Ficha clínica
              </p>
              <h2 className="mt-1 break-words text-xl font-semibold leading-tight text-[#1A3828]">
                {paciente.nombre}
              </h2>
              <p className="mt-1 text-xs text-[#587261]">
                {paciente.id_ccr} · {formatearRut(paciente.rut)}
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-start gap-2 sm:justify-end">
              <BadgePrioridad prioridad={paciente.prioridad} />
              <BadgeEstado estado={paciente.estado} />
              <button
                type="button"
                onClick={() => setMostrarEdicion(true)}
                className="rounded-lg border border-[#BFD3C8] bg-white px-2.5 py-1 text-[11px] font-semibold text-[#1B5E3B] transition hover:bg-[#F3F8F5]"
              >
                Editar
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full border border-[#D3E3D7] bg-white text-[#4B6857] transition hover:bg-[#ECF6EF]"
            aria-label="Cerrar ficha"
          >
            <FiX size={16} />
          </button>
        </div>

        <div className="space-y-4 p-5">
          {error && (
            <p className="rounded-xl border border-[#F1CDCD] bg-[#FFF4F4] px-3 py-2 text-xs text-red-600 ccr-fade-up">
              {error}
            </p>
          )}

          <section
            className="grid grid-cols-1 gap-4 md:grid-cols-3 ccr-fade-up"
            style={{ animationDelay: "60ms" }}
          >
            <div className="ccr-panel rounded-2xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B8574]">
                {diasSeguimientoLabel}
              </p>
              <p className="mt-2 text-3xl font-semibold text-[#173322]">
                {diasSeguimiento}
              </p>
              <p className="mt-1 text-[11px] text-[#74907F]">
                Seguimiento actual
              </p>
            </div>
            <div className="ccr-panel rounded-2xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B8574]">
                Kinesiólogo
              </p>
              <p className="mt-2 text-sm font-semibold text-[#173322] line-clamp-2">
                {paciente.kine_asignado_nombre ?? "Sin asignar"}
              </p>
              <p className="mt-1 text-[11px] text-[#74907F]">
                Responsable actual
              </p>
            </div>
            <div className="ccr-panel rounded-2xl p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B8574]">
                Contacto
              </p>
              <p className="mt-2 text-sm font-semibold text-[#173322]">
                {paciente.telefono || "Sin teléfono"}
              </p>
              <p className="mt-1 text-[11px] text-[#74907F]">
                Teléfono principal
              </p>
            </div>
          </section>

          <section
            className="ccr-panel rounded-2xl p-5 ccr-fade-up"
            style={{ animationDelay: "100ms" }}
          >
            <div className="mb-4 flex items-center gap-2">
              <FiUser className="text-[#2A6848]" />
              <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#264634]">
                Resumen del Paciente
              </h3>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
              <p>
                <span className="font-semibold text-[#264634]">RUT:</span>{" "}
                <span className="text-[#2D4838]">
                  {formatearRut(paciente.rut)}
                </span>
              </p>
              <p>
                <span className="font-semibold text-[#264634]">Edad:</span>{" "}
                <span className="text-[#2D4838]">{paciente.edad}</span>
              </p>
              <p>
                <span className="font-semibold text-[#264634]">
                  Fecha derivación:
                </span>{" "}
                <span className="text-[#2D4838]">
                  {paciente.fecha_derivacion}
                </span>
              </p>
              <p>
                <span className="font-semibold text-[#264634]">Prioridad:</span>{" "}
                <span className="text-[#2D4838]">
                  {PRIORIDAD_LABELS[paciente.prioridad]}
                </span>
              </p>
              <p>
                <span className="font-semibold text-[#264634]">Estado:</span>{" "}
                <span className="text-[#2D4838]">
                  {ESTADO_LABELS[paciente.estado]}
                </span>
              </p>
              <p>
                <span className="font-semibold text-[#264634]">
                  Mayor de 60:
                </span>{" "}
                <span className="text-[#2D4838]">
                  {paciente.mayor_60 ? "Si" : "No"}
                </span>
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold text-[#264634]">
                  Próxima atención:
                </span>{" "}
                <span className="text-[#2D4838]">
                  {formatearFechaHoraCorta(paciente.proxima_atencion)}
                </span>
              </p>
              <p>
                <span className="font-semibold text-[#264634]">
                  Faltas registradas:
                </span>{" "}
                <span className="text-[#2D4838]">
                  {resumenSeguimiento.faltas}
                </span>
              </p>
              <p>
                <span className="font-semibold text-[#264634]">
                  Reprogramaciones:
                </span>{" "}
                <span className="text-[#2D4838]">
                  {resumenSeguimiento.reprogramaciones}
                </span>
              </p>
              <p>
                <span className="font-semibold text-[#264634]">
                  Veces en rescate:
                </span>{" "}
                <span className="text-[#2D4838]">
                  {resumenSeguimiento.rescates}
                </span>
              </p>
              <p>
                <span className="font-semibold text-[#264634]">
                  Cambios de estado:
                </span>{" "}
                <span className="text-[#2D4838]">
                  {resumenSeguimiento.cambiosEstado}
                </span>
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold text-[#264634]">
                  Intentos de contacto:
                </span>{" "}
                <span className="text-[#2D4838]">
                  {resumenSeguimiento.intentosContacto}
                </span>
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold text-[#264634]">
                  Meses en espera total:
                </span>{" "}
                <span className="text-[#2D4838]">
                  {paciente.n_meses_espera ?? 1}{" "}
                  {(paciente.n_meses_espera ?? 1) === 1 ? "mes" : "meses"}
                </span>
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold text-[#264634]">
                  Diagnóstico:
                </span>{" "}
                <span className="text-[#2D4838]">
                  {paciente.diagnostico || "-"}
                </span>
              </p>
              <p className="md:col-span-2">
                <span className="font-semibold text-[#264634]">
                  Observaciones:
                </span>{" "}
                <span className="text-[#2D4838]">
                  {paciente.observaciones || "-"}
                </span>
              </p>
            </div>
          </section>

          <section
            className="ccr-panel rounded-2xl p-5 ccr-fade-up"
            style={{ animationDelay: "140ms" }}
          >
            <div className="mb-4 rounded-xl border border-[#DFE9E2] bg-[#F7FBF8] px-3 py-3 text-xs text-gray-600">
              <div className="mb-2 flex items-center gap-2">
                <FiActivity className="text-[#2A6848]" />
                <span className="font-semibold text-gray-700">
                  Seguimiento por estado
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {seguimientoPorEstado.map((item, index) => (
                  <span
                    key={`${item.estado}-${item.inicio}-${index}`}
                    className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-white px-2.5 py-1 transition hover:-translate-y-0.5"
                    title={`${new Date(item.inicio).toLocaleString("es-CL")} - ${new Date(item.fin).toLocaleString("es-CL")}`}
                  >
                    <BadgeEstado estado={item.estado} />
                    <span className="text-[11px] text-gray-500">
                      {formatearDuracion(item.dias)}
                    </span>
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FiClock className="text-[#2A6848]" />
                <h3 className="text-sm font-semibold uppercase tracking-[0.08em] text-[#264634]">
                  Historial de cambios
                </h3>
              </div>
              {puedeCambiarEstado && (
                <button
                  type="button"
                  onClick={() => setMostrarCambioEstado(true)}
                  className="rounded-xl bg-[#1B5E3B] px-3 py-2 text-xs font-semibold text-white shadow-[0_10px_20px_-14px_rgba(27,94,59,0.8)] transition hover:bg-[#256B47]"
                >
                  Cambiar estado
                </button>
              )}
            </div>

            {loadingHistorial ? (
              <p className="text-sm text-gray-400">Cargando historial...</p>
            ) : historial.length === 0 ? (
              <p className="text-sm text-gray-400">
                Sin movimientos registrados.
              </p>
            ) : (
              <ol className="space-y-3">
                {historialCronologico.map((mov, index) => {
                  const siguiente = historialCronologico[index + 1];
                  const diasEnEstado = calcularDiasEntre(
                    mov.fecha,
                    siguiente?.fecha ?? new Date().toISOString(),
                  );

                  return (
                    <li
                      key={mov.id}
                      className="rounded-xl border border-[#E2EBE4] bg-[#FBFDFB] px-3 py-3 transition hover:border-[#BFD4C6]"
                    >
                      <p className="text-xs font-semibold text-[#2B4435]">
                        {mov.estado_anterior === mov.estado_nuevo || !mov.estado_anterior ? (
                          <span>Actualización de lista oficial</span>
                        ) : (
                          <>
                            {ESTADO_LABELS[mov.estado_anterior as Estado] ?? mov.estado_anterior}{" "}
                            {"->"}{" "}
                            {ESTADO_LABELS[mov.estado_nuevo as Estado] ?? mov.estado_nuevo}
                          </>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-[#617A69]">
                        {formatearFechaHora(mov.fecha)} ·{" "}
                        {mov.usuario_nombre ?? "Sistema"}
                      </p>
                      <p className="mt-0.5 text-xs text-[#617A69]">
                        Duración en este estado:{" "}
                        {formatearDuracion(diasEnEstado)}
                      </p>
                      {mov.notas && (
                        <p className="mt-1 rounded-lg bg-[#F4F8F5] px-2 py-1.5 text-xs text-[#4F6859]">
                          {mov.notas}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>
      </aside>

      {mostrarCambioEstado && (
        <CambiarEstadoModal
          paciente={paciente}
          rol={usuario.rol}
          onClose={() => setMostrarCambioEstado(false)}
          onConfirm={handleCambiarEstado}
        />
      )}

      {mostrarEdicion && (
        <EditarPacienteModal
          paciente={paciente}
          mode="contact-only"
          onClose={() => setMostrarEdicion(false)}
          onGuardado={(actualizado) => {
            setPaciente(actualizado);
            setMostrarEdicion(false);
          }}
        />
      )}
    </div>
  );
}
