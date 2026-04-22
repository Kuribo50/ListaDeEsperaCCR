"use client";
import { formatearRut } from "@/lib/rut";

import type { Paciente, Usuario } from "@/lib/types";
import {
  CATEGORIA_LABELS,
  getKineColor,
  getKineRowBackground,
} from "@/lib/types";
import BadgePrioridad from "./BadgePrioridad";
import BadgeEstado from "./BadgeEstado";

interface Props {
  paciente: Paciente;
  usuario: Usuario;
  onVerFicha: (paciente: Paciente) => void;
  onAsignarme: (paciente: Paciente) => Promise<void>;
  onProgramar: (paciente: Paciente) => void;
  onContactar: (paciente: Paciente) => void;
  onEliminar?: (paciente: Paciente) => void;
  isMisPacientes?: boolean;
  daysMode?: "lista" | "ingreso" | "llamados";
  showProximaAtencion?: boolean;
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

function toCapitalizedWords(value: string) {
  const normalized = value
    .trim()
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("es-CL");
  return normalized.replace(/\p{L}+/gu, (word) => {
    const [first = "", ...rest] = Array.from(word);
    return `${first.toLocaleUpperCase("es-CL")}${rest.join("")}`;
  });
}

export default function PacienteRow({
  paciente,
  usuario,
  onVerFicha,
  onAsignarme,
  onProgramar,
  onContactar,
  onEliminar,
  isMisPacientes = false,
  daysMode = isMisPacientes ? "ingreso" : "lista",
  showProximaAtencion = true,
}: Props) {
  const proximaAtencion = paciente.proxima_atencion
    ? new Date(paciente.proxima_atencion)
    : null;
  const proximaAtencionValida =
    proximaAtencion && !Number.isNaN(proximaAtencion.getTime());

  const kineColor = getKineColor(paciente.kine_asignado_nombre);
  const rowBg = getKineRowBackground(paciente.kine_asignado_nombre);
  const diasDesdeIngreso =
    calcularDiasDesde(paciente.fecha_ingreso ?? paciente.fecha_cambio_estado) ??
    paciente.dias_en_lista;
  const diasDesdeLlamados =
    calcularDiasDesde(paciente.fecha_cambio_estado) ?? paciente.dias_en_lista;
  const diasMostrados =
    daysMode === "ingreso"
      ? paciente.estado === "INGRESADO"
        ? diasDesdeIngreso
        : paciente.dias_en_lista
      : daysMode === "llamados"
        ? diasDesdeLlamados
        : paciente.dias_en_lista;
  const diasCriticos = diasMostrados > 90;
  const puedeAsignarse =
    paciente.kine_asignado === null && usuario.rol === "KINE";
  const estadoProgramable = ["PENDIENTE", "RESCATE", "INGRESADO"].includes(
    paciente.estado,
  );
  const puedeProgramar =
    showProximaAtencion &&
    estadoProgramable &&
    paciente.kine_asignado !== null &&
    ((usuario.rol === "KINE" && paciente.kine_asignado === usuario.id) ||
      usuario.rol === "ADMIN");

  const puedeContactar = 
    ["PENDIENTE", "RESCATE"].includes(paciente.estado) && 
    paciente.kine_asignado !== null &&
    ((usuario.rol === "KINE" && paciente.kine_asignado === usuario.id) || 
     ["ADMIN", "ADMINISTRATIVO"].includes(usuario.rol));

  return (
    <tr
      className="cursor-pointer border-b border-[#E1EBE4] hover:brightness-[0.99]"
      style={{ backgroundColor: rowBg }}
      onClick={() => onVerFicha(paciente)}
    >
      <td className="max-w-[170px] border-r border-[#E1EBE4] px-4 py-2.5 font-semibold text-[#243D2E]">
        <div className="truncate">{toCapitalizedWords(paciente.nombre)}</div>
      </td>
      <td className="border-r border-[#E1EBE4] px-4 py-2.5 font-mono text-[#3F5648]">
        {formatearRut(paciente.rut)}
      </td>
      <td className="border-r border-[#E1EBE4] px-4 py-2.5 text-[#40594B]">{paciente.edad}</td>
      <td className="max-w-[220px] border-r border-[#E1EBE4] px-4 py-2.5 text-[#31493A]">
        <div className="truncate">{toCapitalizedWords(paciente.diagnostico)}</div>
      </td>
      <td className="border-r border-[#E1EBE4] px-4 py-2.5">
        <BadgePrioridad prioridad={paciente.prioridad} />
      </td>
      <td className="border-r border-[#E1EBE4] px-4 py-2.5 text-[#3D5648]">
        {toCapitalizedWords(CATEGORIA_LABELS[paciente.categoria] ?? paciente.categoria)}
      </td>
      <td className="border-r border-[#E1EBE4] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <span
            className="h-2 w-2 rounded-full"
            style={{
              backgroundColor: paciente.kine_asignado ? kineColor : "#9CA3AF",
            }}
          />
          <span className="max-w-[110px] truncate text-[#2D4336]">
            {toCapitalizedWords(paciente.kine_asignado_nombre ?? "Sin asignar")}
          </span>
        </div>
      </td>
      <td className="border-r border-[#E1EBE4] px-4 py-2.5">
        <BadgeEstado estado={paciente.estado} />
      </td>
      {showProximaAtencion && (
        <td className="whitespace-nowrap border-r border-[#E1EBE4] px-4 py-2.5 text-[#2D4336]">
          {proximaAtencionValida ? (
            <div className="leading-tight">
              <p className="font-medium">
                {proximaAtencion!.toLocaleDateString("es-CL")}
              </p>
              <p className="text-[11px] text-[#6A8374]">
                {proximaAtencion!.toLocaleTimeString("es-CL", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          ) : (
            <span className="text-[#7B9588]">Sin programar</span>
          )}
        </td>
      )}
      <td
        className={`border-r border-[#E1EBE4] px-4 py-2.5 text-center font-semibold ${
          diasCriticos ? "bg-[#FFEBEE] text-[#C62828]" : "text-[#2D4336]"
        }`}
        title={`${diasMostrados} ${
          daysMode === "ingreso"
            ? "días desde ingreso"
            : daysMode === "llamados"
              ? "días en llamados"
              : "días en lista"
        }`}
      >
        {diasMostrados}
      </td>
      <td className="whitespace-nowrap px-4 py-2.5 text-right">
        <div className="inline-flex gap-2">
          {puedeAsignarse && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void onAsignarme(paciente);
              }}
              className="rounded-lg border border-[#155437] bg-[#1B5E3B] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-[#256B47]"
            >
              Asignarme
            </button>
          )}
          {puedeProgramar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onProgramar(paciente);
              }}
              className="rounded-lg border border-[#BFD3C8] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#1B5E3B] hover:bg-[#F3F8F5]"
            >
              {paciente.proxima_atencion ? "Reprogramar" : "Próxima atención"}
            </button>
          )}
          {puedeContactar && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onContactar(paciente);
              }}
              className="rounded-lg border border-[#ED8121] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#ED8121] hover:bg-[#FFF3E0]"
            >
              Llamar
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onVerFicha(paciente);
            }}
            className="rounded-lg border border-[#B8D1C0] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#3D5648] hover:bg-[#DFECE4]"
          >
            Ver ficha
          </button>
          {onEliminar && usuario.rol === "ADMIN" && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEliminar(paciente);
              }}
                className="rounded-lg border border-[#F5C2C7] bg-[#F8D7DA] px-2.5 py-1.5 text-[11px] font-semibold text-[#B32626] hover:bg-[#F5C2C7]"
              >
                Eliminar
              </button>
          )}
        </div>
      </td>
    </tr>
  );
}
