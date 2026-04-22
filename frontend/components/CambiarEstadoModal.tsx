"use client";

import { useMemo, useState } from "react";
import type { Estado, Paciente, Rol } from "@/lib/types";
import { ESTADO_LABELS } from "@/lib/types";
import BadgeEstado from "./BadgeEstado";

const ESTADOS_NOTA_OBLIGATORIA = new Set<Estado>([
  "ABANDONO",
  "ALTA_MEDICA",
  "EGRESO_VOLUNTARIO",
]);

const ESTADOS_EGRESO = new Set<Estado>([
  "ABANDONO",
  "ALTA_MEDICA",
  "EGRESO_VOLUNTARIO",
]);

const ESTADO_DESCRIPTIONS: Partial<Record<Estado, string>> = {
  PENDIENTE: "Paciente en espera de contacto.",
  INGRESADO: "Paciente asistió a la CCR.",
  RESCATE: "Se requiere un nuevo esfuerzo de contacto.",
  ABANDONO: "El paciente abandonó el tratamiento. Requiere notas.",
  ALTA_MEDICA: "Alta médica dada por el profesional. Requiere notas.",
  EGRESO_VOLUNTARIO:
    "El paciente decidió terminar por voluntad propia. Requiere notas.",
};

interface Props {
  paciente: Paciente;
  rol: Rol;
  onClose: () => void;
  onConfirm: (estado: Estado, notas: string) => Promise<void>;
}

export default function CambiarEstadoModal({
  paciente,
  rol,
  onClose,
  onConfirm,
}: Props) {
  const [estadoNuevo, setEstadoNuevo] = useState<Estado | "">("");
  const [notas, setNotas] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const estadosPermitidos = useMemo(() => {
    if (rol === "ADMINISTRATIVO") {
      return ESTADOS_EGRESO.has(paciente.estado)
        ? (["INGRESADO", "RESCATE"] as Estado[])
        : (["INGRESADO", "RESCATE"] as Estado[]);
    }

    if (ESTADOS_EGRESO.has(paciente.estado)) {
      return ["PENDIENTE", "INGRESADO", "RESCATE"] as Estado[];
    }

    return [
      "PENDIENTE",
      "INGRESADO",
      "RESCATE",
      "ABANDONO",
      "ALTA_MEDICA",
      "EGRESO_VOLUNTARIO",
    ] as Estado[];
  }, [paciente.estado, rol]);

  const notaObligatoria = estadoNuevo
    ? ESTADOS_NOTA_OBLIGATORIA.has(estadoNuevo)
    : false;
  const esEgreso =
    estadoNuevo &&
    ["ABANDONO", "ALTA_MEDICA", "EGRESO_VOLUNTARIO"].includes(estadoNuevo);

  async function handleConfirm() {
    if (!estadoNuevo) {
      setError("Selecciona un estado para continuar.");
      return;
    }
    if (notaObligatoria && !notas.trim()) {
      setError("Las notas son obligatorias para este tipo de egreso.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await onConfirm(estadoNuevo, notas.trim());
      onClose();
    } catch (e: unknown) {
      const detail =
        e && typeof e === "object" && "detail" in e
          ? (e as { detail: string }).detail
          : "No se pudo cambiar el estado.";
      setError(detail);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl overflow-hidden"
        style={{ border: "1px solid #E6EEE6" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E6EEE6] bg-[#F7FBF8]">
          <h3 className="text-base font-bold text-gray-800">
            Cambiar Estado del Paciente
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            <span className="font-semibold text-gray-700">
              {paciente.nombre}
            </span>
            {" — "}
            <span className="font-mono">{paciente.id_ccr}</span>
          </p>
        </div>

        <div className="p-6 space-y-5">
          {/* Current state */}
          <div className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3 border border-gray-100">
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Estado actual
            </span>
            <BadgeEstado estado={paciente.estado} />
          </div>

          {/* State selector */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-2 uppercase tracking-wider">
              Nuevo Estado
            </label>
            <div className="grid grid-cols-2 gap-2">
              {estadosPermitidos
                .filter((e) => e !== paciente.estado)
                .map((estado) => (
                  <button
                    key={estado}
                    type="button"
                    onClick={() => setEstadoNuevo(estado)}
                    className={`rounded-xl px-4 py-3 text-left text-sm font-semibold transition border-2 ${
                      estadoNuevo === estado
                        ? "border-[#1B5E3B] bg-[#E8F5EE] text-[#1B5E3B]"
                        : "border-gray-100 bg-white text-gray-600 hover:border-[#4CAF7D] hover:bg-[#F7FBF8]"
                    }`}
                  >
                    {ESTADO_LABELS[estado]}
                    {ESTADOS_NOTA_OBLIGATORIA.has(estado) && (
                      <span className="ml-1 text-[10px] font-normal text-orange-500">
                        * notas requeridas
                      </span>
                    )}
                  </button>
                ))}
            </div>
            {estadoNuevo && ESTADO_DESCRIPTIONS[estadoNuevo] && (
              <p className="mt-2 text-[11px] text-gray-500 italic">
                {ESTADO_DESCRIPTIONS[estadoNuevo]}
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1.5 uppercase tracking-wider">
              Notas{" "}
              {notaObligatoria ? (
                <span className="text-orange-500">*</span>
              ) : (
                <span className="text-gray-300">(opcional)</span>
              )}
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={3}
              placeholder={
                notaObligatoria
                  ? `Describe el motivo del ${esEgreso ? "egreso" : "cambio de estado"}…`
                  : "Notas adicionales (opcional)"
              }
              className={`w-full rounded-xl border px-4 py-3 text-sm focus:outline-none resize-none ${
                notaObligatoria && !notas.trim()
                  ? "border-orange-300 focus:border-orange-500 bg-orange-50"
                  : "border-gray-200 focus:border-[#4CAF7D]"
              }`}
            />
          </div>

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-medium">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 py-4 border-t border-[#E6EEE6] flex gap-3 bg-gray-50">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading || !estadoNuevo}
            className="flex-1 rounded-xl bg-[#1B5E3B] py-2.5 text-sm font-bold text-white hover:bg-[#256B47] disabled:opacity-50 transition"
          >
            {loading
              ? "Guardando…"
              : `Confirmar → ${estadoNuevo ? ESTADO_LABELS[estadoNuevo] : "..."}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm text-gray-600 hover:bg-gray-100 transition"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
