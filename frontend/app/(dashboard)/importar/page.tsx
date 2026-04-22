"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import type {
  ImportacionConflictoResponse,
  ImportacionHistorialDetalle,
  ImportacionHistorialItem,
  ImportacionPreviewRegistro,
  ImportacionPreviewResultado,
  ImportacionResultado,
} from "@/lib/types";
import IngresoManual from "@/components/IngresoManual";

const PAGE_SIZE = 50;

function filaBackground(registro: ImportacionPreviewRegistro) {
  if (registro.estado === "ERROR") return "#FEF2F2";
  if (registro.estado === "DUPLICADO") return "#FFFBEB";
  return "#FFFFFF";
}

function estadoBadgeStyle(estado: ImportacionHistorialItem["estado"]) {
  if (estado === "COMPLETADO") {
    return { backgroundColor: "#E8F5E9", color: "#1B5E20" };
  }
  if (estado === "CON_ERRORES") {
    return { backgroundColor: "#FFF3E0", color: "#BF360C" };
  }
  if (estado === "REEMPLAZADO") {
    return { backgroundColor: "#F3F4F6", color: "#9E9E9E" };
  }
  return { backgroundColor: "#E8F5EE", color: "#1B5E3B" };
}

export default function ImportarPage() {
  const { user } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportacionPreviewResultado | null>(
    null,
  );
  const [resultado, setResultado] = useState<ImportacionResultado | null>(null);
  const [historial, setHistorial] = useState<ImportacionHistorialItem[]>([]);
  const [detalleHistorial, setDetalleHistorial] = useState<
    Record<string, ImportacionHistorialDetalle>
  >({});
  const [expandido, setExpandido] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [historialLoading, setHistorialLoading] = useState(false);
  const [descargandoPlantilla, setDescargandoPlantilla] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [conflicto, setConflicto] =
    useState<ImportacionConflictoResponse | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetConfirm, setResetConfirm] = useState(false);

  useEffect(() => {
    if (user && !["ADMIN", "ADMINISTRATIVO"].includes(user.rol)) {
      router.replace("/pacientes");
    }
  }, [user, router]);

  useEffect(() => {
    if (user && ["ADMIN", "ADMINISTRATIVO"].includes(user.rol)) {
      void cargarHistorial();
    }
  }, [user]);

  // Auto-previsualizar al seleccionar archivo
  useEffect(() => {
    if (archivo && !previewLoading && !resultado) {
      handlePrevisualizar();
    }
  }, [archivo]);

  const registrosPagina = useMemo(() => {
    if (!preview) return [];
    const start = (pagina - 1) * PAGE_SIZE;
    return preview.registros.slice(start, start + PAGE_SIZE);
  }, [preview, pagina]);

  const totalPaginas = preview
    ? Math.max(1, Math.ceil(preview.registros.length / PAGE_SIZE))
    : 1;
  const historialAgrupado = useMemo(() => {
    const grupos = new Map<
      string,
      {
        key: string;
        periodoLabel: string;
        mes: number;
        anio: number;
        items: ImportacionHistorialItem[];
        usuarios: string[];
        activo: ImportacionHistorialItem | null;
      }
    >();

    for (const item of historial) {
      const mes = item.mes_datos ?? item.mes;
      const anio = item.anio_datos ?? item.anio;
      const key = `${mes}-${anio}`;
      const existente = grupos.get(key);
      if (existente) {
        existente.items.push(item);
      } else {
        grupos.set(key, {
          key,
          periodoLabel: item.periodo_label,
          mes,
          anio,
          items: [item],
          usuarios: [],
          activo: null,
        });
      }
    }

    return Array.from(grupos.values())
      .map((grupo) => {
        grupo.items.sort(
          (a, b) =>
            new Date(b.fecha_subida).getTime() -
            new Date(a.fecha_subida).getTime(),
        );
        grupo.usuarios = Array.from(
          new Set(
            grupo.items
              .map((item) => item.usuario_nombre)
              .filter(Boolean) as string[],
          ),
        );
        grupo.activo =
          grupo.items.find((item) => item.estado !== "REEMPLAZADO") ??
          grupo.items[0] ??
          null;
        return grupo;
      })
      .sort((a, b) => {
        if (a.anio !== b.anio) return b.anio - a.anio;
        return b.mes - a.mes;
      });
  }, [historial]);

  async function cargarHistorial() {
    setHistorialLoading(true);
    try {
      const data = await api.get<ImportacionHistorialItem[]>(
        "/importar/historial/",
      );
      setHistorial(data);
    } catch {
      setHistorial([]);
    } finally {
      setHistorialLoading(false);
    }
  }

  async function cargarDetalle(item: ImportacionHistorialItem) {
    const mes = item.mes_datos ?? item.mes;
    const anio = item.anio_datos ?? item.anio;
    const key = `${mes}-${anio}`;
    if (detalleHistorial[key]) {
      setExpandido(expandido === key ? null : key);
      return;
    }

    try {
      const data = await api.get<ImportacionHistorialDetalle>(
        `/importar/historial/${mes}/${anio}/`,
      );
      setDetalleHistorial((prev) => ({ ...prev, [key]: data }));
      setExpandido(expandido === key ? null : key);
    } catch {
      setExpandido(expandido === key ? null : key);
    }
  }

  async function handlePrevisualizar() {
    if (!archivo) return;
    setPreviewLoading(true);
    setError("");
    setResultado(null);
    setConflicto(null);

    try {
      const form = new FormData();
      form.append("archivo", archivo);
      const data = await api.postForm<ImportacionPreviewResultado>(
        "/importar/previsualizar/",
        form,
      );
      setPreview(data);
      setPagina(1);
    } catch (e: unknown) {
      setPreview(null);
      if (e && typeof e === "object" && "detail" in e) {
        setError((e as { detail: string }).detail);
      } else {
        setError("No se pudo previsualizar el archivo.");
      }
    } finally {
      setPreviewLoading(false);
    }
  }

  async function importarArchivo(forzarReemplazo = false, suplementar = false) {
    if (!archivo) return;
    setImportLoading(true);
    setError("");
    setResultado(null);

    try {
      const form = new FormData();
      form.append("archivo", archivo);
      if (forzarReemplazo) {
        form.append("forzar_reemplazo", "true");
      }
      if (suplementar) {
        form.append("modo_suplementar", "true");
      }
      const data = await api.postForm<ImportacionResultado>(
        "/importar/derivaciones/",
        form,
      );
      setResultado(data);
      setConflicto(null);
      await cargarHistorial();
    } catch (e: unknown) {
      if (
        e &&
        typeof e === "object" &&
        "tipo" in e &&
        (e as ImportacionConflictoResponse).tipo === "conflicto_mes"
      ) {
        setConflicto(e as ImportacionConflictoResponse);
      } else if (e && typeof e === "object" && "detail" in e) {
        setError((e as { detail: string }).detail);
      } else {
        setError("Error al importar el archivo.");
      }
    } finally {
      setImportLoading(false);
    }
  }

  async function descargarPlantilla() {
    setDescargandoPlantilla(true);
    setError("");
    try {
      const blob = await api.getBlob("/importar/plantilla/");
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "Plantilla_Derivaciones_CCR.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (e: unknown) {
      if (e && typeof e === "object" && "detail" in e) {
        setError((e as { detail: string }).detail);
      } else {
        setError("No se pudo descargar la plantilla.");
      }
    } finally {
      setDescargandoPlantilla(false);
    }
  }

  async function handleReset() {
    if (!resetConfirm) {
      setResetConfirm(true);
      return;
    }
    setResetLoading(true);
    setError("");
    setResetConfirm(false);
    try {
      await api.delete("/importar/reset/");
      setHistorial([]);
      setPreview(null);
      setResultado(null);
      setArchivo(null);
      if (fileRef.current) fileRef.current.value = "";
      await cargarHistorial();
      window.dispatchEvent(new CustomEvent("ccr:refresh-sidebar"));
    } catch (e: unknown) {
      if (e && typeof e === "object" && "detail" in e) {
        setError((e as { detail: string }).detail);
      } else {
        setError("No se pudo resetear la población.");
      }
    } finally {
      setResetLoading(false);
    }
  }

  if (!user || !["ADMIN", "ADMINISTRATIVO"].includes(user.rol)) return null;

  return (
    <div className="space-y-5">
      <div>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
          <div>
            <h1 className="text-lg font-bold text-gray-800">
              Importar Derivaciones
            </h1>
            <p className="mt-0.5 text-xs text-gray-400">
              Previsualiza, confirma y revisa el historial mensual de importaciones.
            </p>
            <Link
              href="/historial-mensual"
              className="mt-2 inline-flex rounded-lg border px-3 py-1.5 text-xs font-medium text-[#1B5E3B]"
              style={{ borderColor: "#D4E4D4", backgroundColor: "#FAFCFA" }}
            >
              Ir a historial mensual
            </Link>
          </div>
          {user?.rol === "ADMIN" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
              <button
                onClick={handleReset}
                disabled={resetLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: resetConfirm ? "1.5px solid #DC2626" : "1.5px solid #FCA5A5",
                  backgroundColor: resetConfirm ? "#DC2626" : "#FFF5F5",
                  color: resetConfirm ? "#fff" : "#DC2626",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: resetLoading ? "not-allowed" : "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {resetLoading
                  ? "Reseteando..."
                  : resetConfirm
                  ? "⚠️ Confirmar — borrar sin asignar"
                  : "🗑 Resetear población"}
              </button>
              {resetConfirm && (
                <span style={{ fontSize: 11, color: "#9CA3AF" }}>
                  Se conservan los pacientes asignados
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
        <div
          className="rounded-[10px] bg-white p-6"
          style={{ border: "0.5px solid #D4E4D4" }}
        >
          <div
            style={{
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 10,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 13, color: "#5A7A5A" }}>
              ¿Primera vez? Descarga la plantilla oficial:
            </span>
            <button
              type="button"
              onClick={() => void descargarPlantilla()}
              disabled={descargandoPlantilla}
              style={{
                padding: "6px 14px",
                borderRadius: 7,
                border: "1px solid #2E7D52",
                background: "#E8F5EE",
                color: "#1B5E3B",
                fontSize: 12,
                fontWeight: 500,
                opacity: descargandoPlantilla ? 0.7 : 1,
              }}
            >
              {descargandoPlantilla
                ? "Descargando..."
                : "Descargar plantilla .xlsx"}
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-gray-600">
                Archivo Excel (.xlsx)
              </label>
              <div
                className="cursor-pointer rounded-lg border-2 border-dashed border-gray-200 p-8 text-center transition hover:border-[#2E7D52]"
                style={{ transition: "border-color 0.2s" }}
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = "#2E7D52"; }}
                onDragLeave={(e) => { e.currentTarget.style.borderColor = ""; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.borderColor = "";
                  const file = e.dataTransfer.files?.[0];
                  if (file) {
                    setArchivo(file);
                    setPreview(null);
                    setResultado(null);
                    setError("");
                    setPagina(1);
                    setConflicto(null);
                  }
                }}
              >
                {archivo ? (
                  <div>
                    <p className="text-sm font-medium" style={{ color: "#1B5E3B" }}>
                      📄 {archivo.name}
                    </p>
                    <p className="mt-1 text-xs text-gray-400">
                      {(archivo.size / 1024).toFixed(1)} KB · Haz clic o arrastra para cambiar
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-2xl mb-2">📂</p>
                    <p className="text-sm text-gray-500">
                      Haz clic o arrastra el archivo aquí
                    </p>
                    <p className="mt-1 text-xs text-gray-300">Formato: .xlsx / .xls</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => {
                  setArchivo(e.target.files?.[0] ?? null);
                  setPreview(null);
                  setResultado(null);
                  setError("");
                  setPagina(1);
                  setConflicto(null);
                }}
              />
            </div>

            {error && (
              <p className="rounded bg-red-50 px-3 py-2 text-xs text-red-600">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => void importarArchivo(false)}
                disabled={
                  !archivo || !preview || preview.validos === 0 || importLoading
                }
                className="rounded-lg px-4 py-2.5 text-sm font-semibold text-white transition disabled:opacity-50"
                style={{ backgroundColor: "#1B5E3B" }}
              >
                {importLoading ? "Importando..." : "Confirmar e importar"}
              </button>
              {archivo && !previewLoading && !preview && (
                  <button
                    onClick={handlePrevisualizar}
                    className="rounded-lg border px-4 py-2.5 text-sm font-semibold text-gray-600"
                    style={{ borderColor: "#D4E4D4" }}
                  >
                    Reintentar previsualización
                  </button>
              )}
            </div>
          </div>
        </div>

        {preview && (
          <div
            className="space-y-4 rounded-[10px] bg-white p-6 self-stretch"
            style={{ border: "0.5px solid #D4E4D4" }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-sm font-bold text-gray-700">
                  Resumen de la previsualización
                </h2>
                <p className="mt-1 text-xs text-gray-500">
                  {preview.total} registros encontrados · {preview.duplicados} recurrentes
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span
                  className="rounded-full px-2.5 py-1 text-green-700"
                  style={{ backgroundColor: "#F0FDF4" }}
                >
                  {preview.validos} nuevos
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-amber-700"
                  style={{ backgroundColor: "#FFFBEB" }}
                >
                  {preview.duplicados} recurrentes
                </span>
                <span
                  className="rounded-full px-2.5 py-1 text-red-700"
                  style={{ backgroundColor: "#FEF2F2" }}
                >
                  {preview.errores.length} errores
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
               <div className="bg-[#FAFCFA] p-3 rounded-lg border border-[#E6EEE6]">
                  <p className="text-xs text-gray-500">Nuevos pacientes</p>
                  <p className="text-xl font-bold text-[#1B5E3B]">{preview.validos}</p>
               </div>
               <div className="bg-[#FAFCFA] p-3 rounded-lg border border-[#E6EEE6]">
                  <p className="text-xs text-gray-500">Recurrentes (espera)</p>
                  <p className="text-xl font-bold text-amber-600">{preview.duplicados}</p>
               </div>
            </div>
            
            {preview.errores.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg text-[11px] text-red-700 border border-red-100 max-h-32 overflow-auto">
                    <p className="font-bold mb-1">Se detectaron errores ({preview.errores.length}):</p>
                    {preview.errores.slice(0, 5).map((e, idx) => (
                        <p key={idx}>• Fila {e.fila}: {e.motivo}</p>
                    ))}
                    {preview.errores.length > 5 && <p>...y {preview.errores.length - 5} más</p>}
                </div>
            )}

            <div className="pt-2">
                 <p className="text-[11px] text-gray-400 mb-2 italic">
                    * Los recurrentes ya están en el sistema y se les sumará 1 mes de espera.
                 </p>
            </div>
          </div>
        )}
        
        {!preview && previewLoading && (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-[10px] border border-dashed border-gray-200 animate-pulse self-stretch">
                <p className="text-sm text-gray-500">Analizando el archivo...</p>
            </div>
        )}
        
        {!preview && !previewLoading && !archivo && (
            <div className="hidden lg:flex flex-col items-center justify-center p-12 bg-gray-50 rounded-[10px] border border-dashed border-gray-200 self-stretch opacity-50">
                <p className="text-sm text-gray-400">El resumen aparecerá aquí</p>
            </div>
        )}
      </div>

      {preview && (
        <div
          className="space-y-4 rounded-[10px] bg-white p-5"
          style={{ border: "0.5px solid #D4E4D4" }}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-gray-700">
                Detalle de registros
              </h2>
              <p className="mt-1 text-xs text-gray-500">
                Página {pagina} de {totalPaginas}
              </p>
            </div>
          </div>

          <div
            className="overflow-hidden rounded-[10px]"
            style={{ border: "0.5px solid #D4E4D4" }}
          >
            <div className="max-h-[560px] overflow-auto bg-white">
              <table className="min-w-[1180px] w-full border-collapse text-xs">
                <thead
                  className="sticky top-0 z-10"
                  style={{ backgroundColor: "#FAFCFA", color: "#7A9A7A" }}
                >
                  <tr>
                    {[
                      "NOMBRE",
                      "RUT",
                      "FECHA",
                      "EDAD",
                      "DIAGNÓSTICO",
                      "PRIORIDAD",
                      "DESDE",
                      "ESTADO",
                    ].map((label) => (
                      <th
                        key={label}
                        className="px-3 py-3 text-left text-[11px] font-semibold"
                        style={{ borderBottom: "0.5px solid #D4E4D4" }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {registrosPagina.map((registro, index) => (
                    <tr
                      key={`${registro.hoja ?? "SIN"}-${registro.fila}-${index}`}
                      style={{ backgroundColor: filaBackground(registro) }}
                    >
                      <td className="px-3 py-2.5 text-gray-700">
                        {registro.nombre || "-"}
                      </td>
                      <td className="px-3 py-2.5 font-mono text-gray-600">
                        {registro.rut || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {registro.fecha_derivacion || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {registro.edad || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-gray-700">
                        {registro.diagnostico || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {registro.prioridad || "-"}
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">
                        {registro.percapita_desde || "-"}
                      </td>
                      <td className="px-3 py-2.5">
                        {registro.estado === "OK" && (
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-green-700"
                            style={{ backgroundColor: "#F0FDF4" }}
                          >
                            OK
                          </span>
                        )}
                        {registro.estado === "DUPLICADO" && (
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-amber-700"
                            style={{ backgroundColor: "#FFFBEB" }}
                          >
                            Duplicado
                          </span>
                        )}
                        {registro.estado === "ERROR" && (
                          <span
                            className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-red-700"
                            style={{ backgroundColor: "#FEF2F2" }}
                          >
                            {registro.error || "Error de formato"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-500">
              Página {pagina} de {totalPaginas}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPagina((prev) => Math.max(1, prev - 1))}
                disabled={pagina === 1}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 disabled:opacity-50"
                style={{ borderColor: "#D4E4D4" }}
              >
                Anterior
              </button>
              <button
                type="button"
                onClick={() =>
                  setPagina((prev) => Math.min(totalPaginas, prev + 1))
                }
                disabled={pagina === totalPaginas}
                className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600 disabled:opacity-50"
                style={{ borderColor: "#D4E4D4" }}
              >
                Siguiente
              </button>
            </div>
          </div>
        </div>
      )}

      {resultado && (
        <div
          className="space-y-4 rounded-[10px] bg-white p-5"
          style={{ border: "0.5px solid #D4E4D4" }}
        >
          <h2 className="text-sm font-bold text-gray-700">
            Resultado final de importación
          </h2>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="rounded-lg bg-gray-50 p-3">
              <p className="text-2xl font-bold text-gray-700">
                {resultado.total}
              </p>
              <p className="text-xs text-gray-400">Total detectado</p>
            </div>
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: "#F0FDF4" }}
            >
              <p className="text-2xl font-bold text-green-700">
                {resultado.importados}
              </p>
              <p className="text-xs text-gray-400">Importados</p>
            </div>
            <div
              className="rounded-lg p-3"
              style={{
                backgroundColor:
                  resultado.duplicados > 0 ? "#FFFBEB" : "#F9FAFB",
              }}
            >
              <p
                className="text-2xl font-bold"
                style={{
                  color: resultado.duplicados > 0 ? "#B45309" : "#6B7280",
                }}
              >
                {resultado.duplicados}
              </p>
              <p className="text-xs text-gray-400">Duplicados</p>
            </div>
          </div>

          {resultado.errores.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold text-red-700">
                Detalle de errores:
              </p>
              <div className="max-h-48 space-y-1 overflow-auto">
                {resultado.errores.map((err, i) => (
                  <div
                    key={i}
                    className="flex gap-3 rounded bg-red-50 px-3 py-1.5 text-xs"
                  >
                    <span className="font-mono text-red-400">
                      {err.hoja ? `${err.hoja} · ` : ""}Fila {err.fila}
                    </span>
                    <span className="text-red-700">{err.motivo}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-gray-700">
              Historial de cortes mensuales
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Revisa qué se procesó, quién subió el corte y si un período fue
              reemplazado.
            </p>
          </div>
          {historialLoading && (
            <span className="text-xs text-gray-400">Cargando historial...</span>
          )}
        </div>

        <div
          className="grid"
          style={{
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 10,
          }}
        >
          {historialAgrupado.map((grupo) => {
            const expanded = expandido === grupo.key;
            const detalle = detalleHistorial[grupo.key];
            const activo = grupo.activo;
            const tachado = activo?.estado === "REEMPLAZADO";

            if (!activo) return null;

            return (
              <article
                key={grupo.key}
                className="rounded-[10px] bg-white p-4"
                style={{
                  border: "0.5px solid #D4E4D4",
                  opacity: tachado ? 0.7 : 1,
                }}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3
                        className="text-sm font-semibold text-gray-800"
                        style={{
                          textDecoration: tachado ? "line-through" : "none",
                        }}
                      >
                        {grupo.periodoLabel}
                      </h3>
                      <p className="mt-1 text-[11px] text-gray-500">
                        {grupo.items.length} corte
                        {grupo.items.length !== 1 ? "s" : ""} registrado
                        {grupo.items.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                      style={estadoBadgeStyle(activo.estado)}
                    >
                      {activo.estado_label}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600">
                    <p>{activo.registros_importados} registros importados</p>
                    <p>
                      Última carga:{" "}
                      {new Date(activo.fecha_subida).toLocaleString("es-CL")}
                    </p>
                    <p>
                      Usuario{grupo.usuarios.length !== 1 ? "s" : ""}:{" "}
                      {grupo.usuarios.join(", ") || "No disponible"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void cargarDetalle(activo)}
                    className="rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-600"
                    style={{ borderColor: "#D4E4D4" }}
                  >
                    {expanded ? "Ocultar detalle" : "Ver detalle"}
                  </button>

                  {expanded && (
                    <div className="space-y-2 rounded-lg bg-[#FAFCFA] p-3">
                      {detalle?.items?.map((detalleItem) => (
                        <div
                          key={detalleItem.id}
                          className="space-y-1 border-b border-[#E6EEE6] pb-2 last:border-b-0 last:pb-0"
                        >
                          <p className="text-[11px] font-semibold text-gray-700">
                            {new Date(detalleItem.fecha_subida).toLocaleString(
                              "es-CL",
                            )}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-[11px] text-gray-500">
                              Estado: {detalleItem.estado_label} · Duplicados:{" "}
                              {detalleItem.duplicados}
                            </p>
                            <button
                              type="button"
                              onClick={() => router.push(`/lista-espera?importacion=${detalleItem.id}`)}
                              className="text-[10px] font-bold text-[#1B5E3B] hover:underline"
                            >
                              Ver pacientes de este corte
                            </button>
                          </div>
                          <p className="text-[11px] text-gray-500">
                            Subido por: <span className="font-semibold text-gray-700">{detalleItem.usuario_nombre || "No disponible"}</span>
                          </p>
                          {detalleItem.errores.length > 0 && (
                            <div className="space-y-1">
                              {detalleItem.errores.map((err, index) => (
                                <div
                                  key={`${detalleItem.id}-${index}`}
                                  className="rounded bg-red-50 px-2 py-1 text-[11px] text-red-700"
                                >
                                  {err.hoja ? `${err.hoja} · ` : ""}Fila{" "}
                                  {err.fila}: {err.motivo}
                                </div>
                              ))}
                            </div>
                          )}
                          {detalleItem.errores.length === 0 && (
                            <p className="text-[11px] text-gray-500">
                              Sin errores registrados.
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <IngresoManual />

      {conflicto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="w-full max-w-xl rounded-[10px] bg-white p-5"
            style={{ border: "0.5px solid #D4E4D4" }}
          >
            <h2 className="text-base font-semibold text-gray-800">
              Ya existen datos para estos meses
            </h2>
            <p className="mt-2 text-sm text-gray-600">{conflicto.mensaje}</p>

            <div className="mt-4 space-y-2">
              {conflicto.conflictos.map((item) => (
                <div
                  key={`${item.mes}-${item.anio}-${item.importacion_id}`}
                  className="rounded-lg bg-[#FAFCFA] px-3 py-2 text-sm text-gray-700"
                  style={{ border: "0.5px solid #D4E4D4" }}
                >
                  <p className="font-medium">
                    {item.hoja} {item.anio}
                  </p>
                  <p className="text-xs text-gray-500">
                    Importación previa: {item.importados_previos} registros ·{" "}
                    {new Date(item.fecha_subida_previa).toLocaleString("es-CL")}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs text-gray-500 italic">
              * Complementar sumará meses de espera a pacientes existentes y agregará los nuevos sin borrar lo anterior.
            </p>

            <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end sm:gap-3">
              <button
                type="button"
                onClick={() => setConflicto(null)}
                className="order-last sm:order-first rounded-lg border px-4 py-2 text-sm font-medium text-gray-600"
                style={{ borderColor: "#D4E4D4" }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void importarArchivo(false, true)}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: "#1B5E3B" }}
              >
                Complementar / Actualizar datos
              </button>
              <button
                type="button"
                onClick={() => void importarArchivo(true)}
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
              >
                Reemplazar todo el mes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
