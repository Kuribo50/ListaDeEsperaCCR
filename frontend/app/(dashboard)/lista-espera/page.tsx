"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { useSearchParams } from "next/navigation";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import type { Column, FilterFn, VisibilityState } from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { FiFilter, FiRefreshCw, FiSearch } from "react-icons/fi";
import { formatearRut } from "@/lib/rut";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { usePersistentTableState } from "@/lib/tables/usePersistentTableState";
import type { Categoria, Paciente, Prioridad } from "@/lib/types";
import { CATEGORIA_LABELS, PRIORIDAD_LABELS } from "@/lib/types";
import FichaPaciente from "@/components/FichaPaciente";
import BadgePrioridad from "@/components/BadgePrioridad";
import EditarPacienteModal from "@/components/EditarPacienteModal";

const PRIORIDAD_ORDER: Record<Prioridad, number> = {
  ALTA: 0,
  MEDIANA: 1,
  MODERADA: 2,
  LICENCIA_MEDICA: 3,
};

type WaitlistRow = {
  patient: Paciente;
  nombre: string;
  rut: string;
  rutRaw: string;
  edad: number;
  diagnostico: string;
  prioridad: Prioridad;
  prioridadLabel: string;
  categoria: Categoria;
  categoriaLabel: string;
  dias_en_lista: number;
  diasLabel: string;
  searchIndex: string;
};

type ColumnMeta = {
  label: string;
  kind?: "text" | "number";
  filterable?: boolean;
  align?: "left" | "center" | "right";
};

type FilterDraftState = Record<string, string[]>;
type FilterQueryState = Record<string, string>;
type AssignContactDraft = {
  telefono: string;
  telefono_recados: string;
  email: string;
};

function normalizeRut(value: string) {
  return value.toLowerCase().replace(/[^0-9k]/g, "");
}

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("es-CL")
    .trim();
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

const multiSelectFilter: FilterFn<WaitlistRow> = (
  row,
  columnId,
  filterValue,
) => {
  if (typeof filterValue === "string") {
    const query = filterValue.trim();
    if (!query) return true;

    const cellValue = String(row.getValue(columnId) ?? "");
    if (columnId === "rut") {
      return normalizeRut(cellValue).includes(normalizeRut(query));
    }

    return normalizeSearchText(cellValue).includes(normalizeSearchText(query));
  }

  const selected = Array.isArray(filterValue) ? filterValue : [];
  if (selected.length === 0) return true;
  return selected.includes(String(row.getValue(columnId)));
};

multiSelectFilter.autoRemove = (value) =>
  typeof value === "string"
    ? value.trim().length === 0
    : !Array.isArray(value) || value.length === 0;

const columnHelper = createColumnHelper<WaitlistRow>();

function getColumnMeta(column: Column<WaitlistRow>): ColumnMeta {
  return (column.columnDef.meta ?? { label: column.id }) as ColumnMeta;
}

function sortFilterValues(columnId: string, values: string[]) {
  if (columnId === "edad" || columnId === "dias_en_lista") {
    return [...values].sort((a, b) => Number(a) - Number(b));
  }

  if (columnId === "prioridadLabel") {
    return [...values].sort((a, b) => {
      const aKey = Object.entries(PRIORIDAD_LABELS).find(
        ([, label]) => label === a,
      )?.[0] as Prioridad | undefined;
      const bKey = Object.entries(PRIORIDAD_LABELS).find(
        ([, label]) => label === b,
      )?.[0] as Prioridad | undefined;
      return (
        (aKey ? PRIORIDAD_ORDER[aKey] : 999) -
        (bKey ? PRIORIDAD_ORDER[bKey] : 999)
      );
    });
  }

  return [...values].sort((a, b) => a.localeCompare(b, "es"));
}

function matchesFilterSearch(columnId: string, option: string, query: string) {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return true;

  if (columnId === "rut") {
    return normalizeRut(option).includes(normalizeRut(trimmedQuery));
  }

  return normalizeSearchText(option).includes(normalizeSearchText(trimmedQuery));
}

const BASE_COLUMN_VISIBILITY: VisibilityState = {
  nombre: true,
  rut: true,
  edad: true,
  diagnostico: true,
  prioridadLabel: true,
  categoriaLabel: true,
  dias_en_lista: true,
  acciones: true,
};

function getResponsiveColumnVisibility(width: number): VisibilityState {
  if (width < 768) {
    return {
      ...BASE_COLUMN_VISIBILITY,
      edad: false,
      diagnostico: false,
      prioridadLabel: false,
      categoriaLabel: false,
    };
  }

  if (width < 1200) {
    return {
      ...BASE_COLUMN_VISIBILITY,
      diagnostico: false,
      categoriaLabel: false,
    };
  }

  return BASE_COLUMN_VISIBILITY;
}

export default function ListaEsperaPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();

  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seleccionado, setSeleccionado] = useState<Paciente | null>(null);
  const [editando, setEditando] = useState<Paciente | null>(null);
  const [asignando, setAsignando] = useState<number | null>(null);
  const [asignarPaciente, setAsignarPaciente] = useState<Paciente | null>(null);
  const [asignarContacto, setAsignarContacto] = useState<AssignContactDraft>({
    telefono: "",
    telefono_recados: "",
    email: "",
  });
  const [asignarError, setAsignarError] = useState("");
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  const [draftFilters, setDraftFilters] = useState<FilterDraftState>({});
  const [filterQueries, setFilterQueries] = useState<FilterQueryState>({});
  const [isPending, startTransition] = useTransition();
  const tableScrollRef = useRef<HTMLDivElement | null>(null);
  const initialTableState = useMemo(
    () => ({
      globalSearch: "",
      sorting: [{ id: "dias_en_lista", desc: true as const }],
      columnFilters: [],
      columnSizing: {},
      columnOrder: [],
      columnVisibility: {},
    }),
    [],
  );
  const {
    state: tableState,
    hasHydrated,
    setGlobalSearch,
    setSorting,
    setColumnFilters,
    setColumnSizing,
    setColumnOrder,
    setColumnVisibility,
    resetTableState,
  } = usePersistentTableState({
    storageKey: "table-prefs:lista-espera",
    initialState: initialTableState,
  });
  const deferredSearch = useDeferredValue(tableState.globalSearch);

  const mes = searchParams.get("mes");
  const anio = searchParams.get("anio");
  const importacionId = searchParams.get("importacion");

  const cargar = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({ sin_asignar: "1" });
      if (mes) params.set("mes", mes);
      if (anio) params.set("anio", anio);
      if (importacionId) params.set("importacion", importacionId);
      const data = await api.get<Paciente[]>(
        `/pacientes/?${params.toString()}`,
      );
      setPacientes(data);
    } catch {
      setPacientes([]);
      setError("No se pudo cargar la lista de espera.");
    } finally {
      setLoading(false);
    }
  }, [mes, anio, importacionId]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  useEffect(() => {
    if (!hasHydrated || typeof window === "undefined") return;

    function applyResponsiveVisibility() {
      const nextVisibility = getResponsiveColumnVisibility(window.innerWidth);
      setColumnVisibility((prev) => {
        const nextEntries = Object.entries(nextVisibility);
        const hasSameValues = nextEntries.every(
          ([key, value]) => prev[key] === value,
        );
        const hasSameLength = Object.keys(prev).length === nextEntries.length;
        if (hasSameValues && hasSameLength) return prev;
        return nextVisibility;
      });
    }

    applyResponsiveVisibility();
    window.addEventListener("resize", applyResponsiveVisibility);
    return () => window.removeEventListener("resize", applyResponsiveVisibility);
  }, [hasHydrated, setColumnVisibility]);

  useEffect(() => {
    if (!hasHydrated) return;

    const defaultActionsWidth = 230;
    setColumnSizing((prev) => {
      const current = prev.acciones;
      if (current === defaultActionsWidth) {
        return prev;
      }
      return { ...prev, acciones: defaultActionsWidth };
    });
  }, [hasHydrated, setColumnSizing]);

  async function handleEliminar(id: number, nombre: string) {
    if (user?.rol !== "ADMIN") return;
    if (!window.confirm(`¿Seguro que deseas eliminar al paciente ${nombre} del sistema de forma permanente?`)) return;
    try {
      await api.delete(`/pacientes/${id}/`);
      void cargar();
    } catch (e) {
      alert("No se pudo eliminar el paciente.");
    }
  }

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!openFilter) return;
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest("[data-filter-root]")) return;
      setOpenFilter(null);
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    return () =>
      document.removeEventListener("pointerdown", onPointerDown, true);
  }, [openFilter]);

  const rowsData = useMemo<WaitlistRow[]>(
    () =>
      pacientes.map((patient) => {
        const rut = formatearRut(patient.rut);
        const rutRaw = normalizeRut(patient.rut);
        const nombreNormalizado = normalizeSearchText(patient.nombre);
        const diagnosticoNormalizado = normalizeSearchText(patient.diagnostico);
        return {
          patient,
          nombre: toCapitalizedWords(patient.nombre),
          rut,
          rutRaw,
          edad: patient.edad,
          diagnostico: toCapitalizedWords(patient.diagnostico),
          prioridad: patient.prioridad,
          prioridadLabel: toCapitalizedWords(
            PRIORIDAD_LABELS[patient.prioridad] ?? patient.prioridad,
          ),
          categoria: patient.categoria,
          categoriaLabel: toCapitalizedWords(
            CATEGORIA_LABELS[patient.categoria] ?? patient.categoria,
          ),
          dias_en_lista: patient.dias_en_lista,
          diasLabel: `${patient.dias_en_lista}d`,
          searchIndex: `${nombreNormalizado} ${rutRaw} ${diagnosticoNormalizado}`,
        };
      }),
    [pacientes],
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("nombre", {
        header: "Nombre",
        enableColumnFilter: true,
        filterFn: multiSelectFilter,
        enableResizing: true,
        size: 280,
        minSize: 220,
        meta: { label: "Nombre", filterable: true } satisfies ColumnMeta,
        cell: (info) => (
          <div
            className="truncate font-semibold text-[#243D2E]"
            title={info.getValue()}
          >
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor("rut", {
        header: "RUT",
        enableColumnFilter: true,
        filterFn: multiSelectFilter,
        enableResizing: true,
        size: 170,
        minSize: 140,
        sortingFn: (a, b) =>
          a.original.rutRaw.localeCompare(b.original.rutRaw, "es"),
        meta: { label: "RUT", filterable: true } satisfies ColumnMeta,
        cell: (info) => (
          <div className="font-mono text-[#3F5648]">{info.getValue()}</div>
        ),
      }),
      columnHelper.accessor("edad", {
        header: "Edad",
        enableColumnFilter: true,
        filterFn: multiSelectFilter,
        enableResizing: true,
        size: 112,
        minSize: 96,
        meta: {
          label: "Edad",
          filterable: true,
          kind: "number",
        } satisfies ColumnMeta,
      }),
      columnHelper.accessor("diagnostico", {
        header: "Diagnóstico",
        enableColumnFilter: true,
        filterFn: multiSelectFilter,
        enableResizing: true,
        size: 240,
        minSize: 180,
        meta: { label: "Diagnóstico", filterable: true } satisfies ColumnMeta,
        cell: (info) => (
          <div className="truncate text-[#31493A]" title={info.getValue()}>
            {info.getValue()}
          </div>
        ),
      }),
      columnHelper.accessor("prioridadLabel", {
        header: "Prioridad",
        enableColumnFilter: true,
        filterFn: multiSelectFilter,
        enableResizing: true,
        size: 150,
        minSize: 130,
        sortingFn: (a, b) =>
          PRIORIDAD_ORDER[a.original.prioridad] -
          PRIORIDAD_ORDER[b.original.prioridad],
        meta: { label: "Prioridad", filterable: true } satisfies ColumnMeta,
        cell: (info) => (
          <BadgePrioridad prioridad={info.row.original.prioridad} />
        ),
      }),
      columnHelper.accessor("categoriaLabel", {
        header: "Categoría",
        enableColumnFilter: true,
        filterFn: multiSelectFilter,
        enableResizing: true,
        size: 150,
        minSize: 130,
        meta: { label: "Categoría", filterable: true } satisfies ColumnMeta,
        cell: (info) => (
          <span className="text-[#3D5648]">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("dias_en_lista", {
        header: "Días en cola",
        enableColumnFilter: true,
        filterFn: multiSelectFilter,
        enableResizing: true,
        size: 136,
        minSize: 116,
        meta: {
          label: "Días en cola",
          filterable: true,
          kind: "number",
        } satisfies ColumnMeta,
        cell: (info) => {
          const critico = info.getValue() > 90;
          return (
            <span
              className={
                critico
                  ? "rounded-full bg-[#FDE8E8] px-2 py-0.5 font-semibold text-[#B32626]"
                  : "rounded-full bg-[#F0F5F2] px-2 py-0.5 font-semibold text-[#40594B]"
              }
            >
              {info.getValue()}d
            </span>
          );
        },
      }),
      columnHelper.display({
        id: "acciones",
        header: "Acciones",
        enableSorting: false,
        enableColumnFilter: false,
        enableResizing: true,
        size: 230,
        minSize: 205,
        meta: { label: "Acciones", align: "right" } satisfies ColumnMeta,
        cell: (info) => {
          const paciente = info.row.original.patient;
          return (
            <div className="flex items-center justify-end gap-1 sm:gap-1.5">
              {user?.rol === "KINE" && (
                <button
                  type="button"
                  disabled={asignando === paciente.id}
                  onClick={() => abrirAsignacionConContacto(paciente)}
                  className="rounded-lg border border-[#155437] bg-[#1B5E3B] px-2.5 py-1.5 text-[11px] font-bold text-white outline-none transition hover:bg-[#124B2E] disabled:opacity-50"
                >
                  {asignando === paciente.id ? "Asignando..." : "Tomar"}
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditando(paciente)}
                className="rounded-lg border border-[#AFCFB9] bg-[#F3FAF5] px-2.5 py-1.5 text-[11px] font-semibold text-[#255D40] outline-none transition hover:bg-[#CCE9DA]"
              >
                Editar
              </button>
              <button
                type="button"
                onClick={() => setSeleccionado(paciente)}
                className="rounded-lg border border-[#B8D1C0] bg-white px-2.5 py-1.5 text-[11px] font-semibold text-[#3D5648] outline-none transition hover:bg-[#DFECE4]"
              >
                Ver ficha
              </button>
              {user?.rol === "ADMIN" && (
                <button
                  type="button"
                  onClick={() => void handleEliminar(paciente.id, paciente.nombre)}
                  className="rounded-lg border border-[#F5C2C7] bg-[#F8D7DA] px-2.5 py-1.5 text-[11px] font-semibold text-[#B32626] outline-none transition hover:bg-[#F5C2C7]"
                >
                  Eliminar
                </button>
              )}
            </div>
          );
        },
      }),
    ],
    [asignando, user?.rol],
  );

  const table = useReactTable({
    data: rowsData,
    columns,
    state: {
      sorting: tableState.sorting,
      columnFilters: tableState.columnFilters,
      columnSizing: tableState.columnSizing,
      columnOrder: tableState.columnOrder,
      columnVisibility: tableState.columnVisibility,
      globalFilter: deferredSearch.trim(),
    },
    filterFns: {
      multiValue: multiSelectFilter,
    },
    globalFilterFn: (row, _columnId, filterValue) => {
      const rawQuery = String(filterValue ?? "").trim();
      if (!rawQuery) return true;
      const query = normalizeSearchText(rawQuery);
      const rutQuery = normalizeRut(rawQuery);
      return (
        row.original.searchIndex.includes(query) ||
        (!!rutQuery && row.original.rutRaw.includes(rutQuery))
      );
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnSizingChange: setColumnSizing,
    onColumnOrderChange: setColumnOrder,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    enableMultiSort: true,
    columnResizeMode: "onChange",
    getRowId: (row) => String(row.patient.id),
  });

  const filteredRows = table.getFilteredRowModel().rows.length;
  const tableRows = table.getRowModel().rows;
  const columnTemplate = useMemo(
    () =>
      table
        .getVisibleLeafColumns()
        .map((column) => `${column.getSize()}px`)
        .join(" "),
    [table, tableState.columnSizing],
  );

  const rowVirtualizer = useVirtualizer({
    count: tableRows.length,
    getScrollElement: () => tableScrollRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  function abrirAsignacionConContacto(p: Paciente) {
    setAsignarPaciente(p);
    setAsignarContacto({
      telefono: p.telefono ?? "",
      telefono_recados: p.telefono_recados ?? "",
      email: p.email ?? "",
    });
    setAsignarError("");
  }

  async function confirmarAsignacionConContacto() {
    if (!asignarPaciente) return;

    const telefono = asignarContacto.telefono.trim();
    const telefonoRecados = asignarContacto.telefono_recados.trim();
    const email = asignarContacto.email.trim();

    if (!telefono && !telefonoRecados && !email) {
      setAsignarError(
        "Ingresa al menos un dato de contacto (teléfono o email).",
      );
      return;
    }

    if (email && !/^\S+@\S+\.\S+$/.test(email)) {
      setAsignarError("El email no tiene un formato válido.");
      return;
    }

    setAsignando(asignarPaciente.id);
    setAsignarError("");
    setError("");
    try {
      await api.patch<Paciente>(`/pacientes/${asignarPaciente.id}/`, {
        telefono,
        telefono_recados: telefonoRecados,
        email,
      });
      await api.post(`/pacientes/${asignarPaciente.id}/asignar/`);
      setAsignarPaciente(null);
      await cargar();
      window.dispatchEvent(new Event("ccr:refresh-sidebar"));
    } catch (e: unknown) {
      const detail =
        e && typeof e === "object" && "detail" in e
          ? (e as { detail: string }).detail
          : "Error al asignar.";
      setAsignarError(detail);
      setError(detail);
    } finally {
      setAsignando(null);
    }
  }

  function getColumnOptions(column: Column<WaitlistRow>) {
    const values = Array.from(column.getFacetedUniqueValues().keys())
      .map((value) => String(value))
      .filter(Boolean);

    return sortFilterValues(column.id, values);
  }

  function openColumnFilter(column: Column<WaitlistRow>) {
    const options = getColumnOptions(column);
    const current = column.getFilterValue();
    const selected = Array.isArray(current) ? current : undefined;
    setDraftFilters((prev) => ({
      ...prev,
      [column.id]: selected?.length ? [...selected] : options,
    }));
    setFilterQueries((prev) => ({ ...prev, [column.id]: "" }));
    setOpenFilter(column.id);
  }

  function applyColumnFilter(
    column: Column<WaitlistRow>,
    selectedOverride?: string[],
  ) {
    const options = getColumnOptions(column);
    const selected = Array.from(
      new Set(selectedOverride ?? draftFilters[column.id] ?? options),
    );
    startTransition(() => {
      column.setFilterValue(
        selected.length === 0 || selected.length === options.length
          ? undefined
          : selected,
      );
      setOpenFilter(null);
    });
  }

  function clearAllFilters() {
    startTransition(() => {
      resetTableState();
      setOpenFilter(null);
      setDraftFilters({});
      setFilterQueries({});
    });
  }

  if (!user) return null;

  return (
    <div className="space-y-3 text-[13px]">
      <header className="ccr-panel rounded-2xl p-4 sm:p-5">
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-lg font-bold text-gray-900">Lista de Espera</h1>
            <button
              type="button"
              onClick={() => void cargar()}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-[#C5DDCC] bg-white px-3 py-2 text-[11px] font-semibold text-[#21563B] outline-none transition hover:bg-[#ECF7F0] focus-visible:ring-2 focus-visible:ring-[#60B689] sm:w-auto sm:justify-start"
            >
              <FiRefreshCw size={13} />
              Recargar
            </button>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <div className="relative">
              <FiSearch
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#7A9585]"
                size={15}
              />
              <input
                type="text"
                value={tableState.globalSearch}
                onChange={(event) => {
                  const value = event.target.value;
                  startTransition(() => setGlobalSearch(value));
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") event.preventDefault();
                }}
                className="w-full rounded-xl border border-[#D5E4D8] bg-white px-9 py-2.5 text-xs outline-none focus:border-[#5FB88C]"
                placeholder="Buscar por nombre, RUT o diagnóstico"
                aria-label="Buscar pacientes"
              />
            </div>

            <button
              type="button"
              onClick={clearAllFilters}
              className="inline-flex h-[42px] w-full items-center justify-center rounded-xl border border-[#D5E4D8] bg-white px-3 text-xs font-semibold text-[#294C3A] outline-none transition hover:bg-[#F5FAF7] sm:w-auto"
            >
              Limpiar filtros
            </button>
          </div>

          {isPending && (
            <p className="text-[11px] text-[#688473]">Actualizando tabla...</p>
          )}
        </div>
      </header>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-medium text-red-700">
          {error}
        </div>
      )}

      <section className="ccr-panel relative overflow-hidden rounded-2xl bg-white">
        {(loading || isPending || !hasHydrated) && (
          <div className="absolute inset-0 z-40 flex items-center justify-center rounded-2xl bg-white/70 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 rounded-lg border border-[#D5E4D8] bg-white px-3 py-2 text-xs font-semibold text-[#2D5B44] shadow-sm">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#9FCAB1] border-t-[#1B5E3B]" />
              Actualizando tabla...
            </div>
          </div>
        )}

        <div
          ref={tableScrollRef}
          className="h-[calc(100dvh-213px)] min-h-[380px] overflow-auto border-b border-[#D9E6DB] [animation:tableFadeIn_260ms_ease-out] sm:h-[calc(100dvh-228px)] lg:h-[calc(100dvh-253px)]"
        >
          <div className="min-w-max rounded-xl border border-[#D9E6DB] bg-white">
            {table.getHeaderGroups().map((headerGroup) => (
              <div
                key={headerGroup.id}
                className="sticky top-0 z-20 grid border-b border-[#D9E6DB] bg-[#F7FBF8]"
                style={{ gridTemplateColumns: columnTemplate }}
              >
                {headerGroup.headers.map((header) => {
                  const meta = getColumnMeta(header.column);
                  const isSorted = header.column.getIsSorted();
                  const sortIndex = table
                    .getState()
                    .sorting.findIndex((item) => item.id === header.column.id);
                  const currentFilter = header.column.getFilterValue();
                  const isFilterActive = Array.isArray(currentFilter)
                    ? currentFilter.length > 0
                    : typeof currentFilter === "string"
                      ? currentFilter.trim().length > 0
                      : false;

                  return (
                    <div
                      key={header.id}
                      className="relative border-r border-[#D9E6DB] px-3 py-2.5 last:border-r-0"
                    >
                      {header.isPlaceholder ? null : (
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={(event) => {
                              if (!header.column.getCanSort()) return;
                              startTransition(() => {
                                header.column.toggleSorting(
                                  undefined,
                                  event.shiftKey,
                                );
                              });
                            }}
                            className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-xs font-semibold text-[#273E30]"
                          >
                            <span className="whitespace-normal leading-tight">
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext(),
                              )}
                            </span>
                            {isSorted && (
                              <span className="text-[11px] text-[#2E6246]">
                                {isSorted === "asc" ? "▲" : "▼"}
                                {sortIndex >= 0 &&
                                table.getState().sorting.length > 1
                                  ? ` ${sortIndex + 1}`
                                  : ""}
                              </span>
                            )}
                          </button>

                          {meta.filterable && (
                            <div data-filter-root className="relative shrink-0">
                              <button
                                type="button"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  if (openFilter === header.column.id) {
                                    setOpenFilter(null);
                                    return;
                                  }
                                  openColumnFilter(header.column);
                                }}
                                className={
                                  isFilterActive
                                    ? "inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#7CBF99] bg-[#EAF7F0] text-[#1E6241]"
                                    : "inline-flex h-7 w-7 items-center justify-center rounded-md border border-[#D4E3D7] bg-white text-[#617D6D] hover:bg-[#F4FAF7]"
                                }
                                aria-label={`Filtrar ${meta.label}`}
                              >
                                <FiFilter size={12} />
                              </button>

                              {openFilter === header.column.id && (
                                <FilterPopover
                                  column={header.column}
                                  sortState={header.column.getIsSorted()}
                                  query={filterQueries[header.column.id] ?? ""}
                                  selectedValues={
                                    draftFilters[header.column.id] ??
                                    getColumnOptions(header.column)
                                  }
                                  onSortAsc={() => {
                                    startTransition(() =>
                                      header.column.toggleSorting(false, true),
                                    );
                                    setOpenFilter(null);
                                  }}
                                  onSortDesc={() => {
                                    startTransition(() =>
                                      header.column.toggleSorting(true, true),
                                    );
                                    setOpenFilter(null);
                                  }}
                                  onClearSort={() => {
                                    startTransition(() =>
                                      header.column.clearSorting(),
                                    );
                                    setOpenFilter(null);
                                  }}
                                  onQueryChange={(value) =>
                                    setFilterQueries((prev) => ({
                                      ...prev,
                                      [header.column.id]: value,
                                    }))
                                  }
                                  onSelectionChange={(values) =>
                                    setDraftFilters((prev) => ({
                                      ...prev,
                                      [header.column.id]: values,
                                    }))
                                  }
                                  onCancel={() => setOpenFilter(null)}
                                  onApply={(selectedValuesOverride) =>
                                    applyColumnFilter(
                                      header.column,
                                      selectedValuesOverride,
                                    )
                                  }
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                      {header.column.getCanResize() && (
                        <button
                          type="button"
                          onDoubleClick={() => header.column.resetSize()}
                          onMouseDown={header.getResizeHandler()}
                          onTouchStart={header.getResizeHandler()}
                          className={`absolute right-0 top-0 h-full w-2 -translate-x-1/2 cursor-col-resize touch-none bg-transparent transition hover:bg-[#8CBDA0]/40 ${header.column.getIsResizing() ? "bg-[#63A882]/50" : ""}`}
                          aria-label={`Redimensionar columna ${meta.label}`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            ))}

            {tableRows.length === 0 ? (
              <div className="flex min-h-[240px] items-center justify-center px-6 py-12 text-xs text-gray-500">
                Sin pacientes en espera con los filtros seleccionados.
              </div>
            ) : (
              <div
                className="relative"
                style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                  const row = tableRows[virtualRow.index];
                  return (
                    <div
                      key={row.id}
                      className="absolute left-0 top-0 grid w-full border-b border-[#E1EBE4] bg-white transition hover:bg-[#E8F4EC]"
                      style={{
                        gridTemplateColumns: columnTemplate,
                        transform: `translateY(${virtualRow.start}px)`,
                      }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const meta = getColumnMeta(cell.column);
                        const alignment =
                          meta.align === "right"
                            ? "text-right"
                            : meta.align === "center"
                              ? "text-center"
                              : "text-left";

                        return (
                          <div
                            key={cell.id}
                            className={`border-r border-[#E1EBE4] px-2 py-1.5 text-[12px] text-[#2D4336] last:border-r-0 sm:px-3 lg:px-4 ${alignment}`}
                          >
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext(),
                            )}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1 border-t-2 border-[#C7DCCF] bg-gradient-to-r from-[#EAF5EE] to-[#F3F9F5] px-5 py-3 text-[11px] font-medium text-[#365544] sm:flex-row sm:items-center sm:justify-between">
          <p>
            {filteredRows} paciente{filteredRows !== 1 ? "s" : ""} en espera
          </p>
          <p className="text-[#4E6F5C]">
            Mostrando {filteredRows} de {rowsData.length}
          </p>
        </div>
      </section>

      {asignarPaciente && (
        <AsignarContactoModal
          paciente={asignarPaciente}
          loading={asignando === asignarPaciente.id}
          draft={asignarContacto}
          error={asignarError}
          onClose={() => {
            if (asignando === asignarPaciente.id) return;
            setAsignarPaciente(null);
            setAsignarError("");
          }}
          onChange={(field, value) => {
            setAsignarContacto((prev) => ({ ...prev, [field]: value }));
          }}
          onConfirm={() => void confirmarAsignacionConContacto()}
        />
      )}

      {seleccionado && (
        <FichaPaciente
          paciente={seleccionado}
          usuario={user}
          onClose={() => setSeleccionado(null)}
          onRefresh={() => {
            void cargar();
            setSeleccionado(null);
          }}
        />
      )}

      {editando && (
        <EditarPacienteModal
          paciente={editando}
          mode="contact-only"
          onClose={() => setEditando(null)}
          onGuardado={(actualizado) => {
            setPacientes((prev) =>
              prev.map((item) =>
                item.id === actualizado.id ? actualizado : item,
              ),
            );
            setEditando(null);
          }}
        />
      )}

      <style jsx>{`
        @keyframes tableFadeIn {
          from {
            opacity: 0.72;
            transform: translateY(4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

type AsignarContactoModalProps = {
  paciente: Paciente;
  draft: AssignContactDraft;
  loading: boolean;
  error: string;
  onClose: () => void;
  onChange: (field: keyof AssignContactDraft, value: string) => void;
  onConfirm: () => void;
};

function AsignarContactoModal({
  paciente,
  draft,
  loading,
  error,
  onClose,
  onChange,
  onConfirm,
}: AsignarContactoModalProps) {
  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ border: "1px solid #DDE9DF" }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="border-b border-[#E6EEE6] bg-gradient-to-r from-[#F6FBF8] to-[#FBFDFB] px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#1F2D24]">
                Completar contacto para asignar
              </h3>
              <p className="mt-1 text-xs text-[#60786B]">
                Registra al menos un medio de contacto para continuar.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[#D4E3D7] bg-white text-[#5F7B6D] transition hover:bg-[#F2F8F4] disabled:opacity-60"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
          <div className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-[#DDEBDF] bg-white px-3 py-2 text-[12px] font-medium text-[#2D4A3A]">
            <span className="truncate">{toCapitalizedWords(paciente.nombre)}</span>
            <span className="text-[#90A79A]">•</span>
            <span className="font-mono text-[11px]">{formatearRut(paciente.rut)}</span>
          </div>
        </div>

        <div className="space-y-4 bg-[#FCFEFD] px-5 py-5 sm:px-6">
          <div className="rounded-xl border border-[#E2ECE4] bg-white px-3 py-2.5 text-[12px] text-[#567062]">
            Puedes ingresar teléfono principal, teléfono de recados y/o correo.
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#5E7568]">
                Teléfono principal
              </label>
              <input
                type="tel"
                value={draft.telefono}
                onChange={(event) => onChange("telefono", event.target.value)}
                placeholder="+56 9 1234 5678"
                className="w-full rounded-xl border border-[#D3E2D6] bg-white px-3 py-2.5 text-sm text-[#2F4338] outline-none transition focus:border-[#4CAF7D] focus:ring-2 focus:ring-[#D9F0E2]"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#5E7568]">
                Teléfono recados
              </label>
              <input
                type="tel"
                value={draft.telefono_recados}
                onChange={(event) =>
                  onChange("telefono_recados", event.target.value)
                }
                placeholder="+56 9 9876 5432"
                className="w-full rounded-xl border border-[#D3E2D6] bg-white px-3 py-2.5 text-sm text-[#2F4338] outline-none transition focus:border-[#4CAF7D] focus:ring-2 focus:ring-[#D9F0E2]"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-[#5E7568]">
              Email
            </label>
            <input
              type="email"
              value={draft.email}
              onChange={(event) => onChange("email", event.target.value)}
              placeholder="nombre@correo.cl"
              className="w-full rounded-xl border border-[#D3E2D6] bg-white px-3 py-2.5 text-sm text-[#2F4338] outline-none transition focus:border-[#4CAF7D] focus:ring-2 focus:ring-[#D9F0E2]"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-[#E6EEE6] bg-[#F8FBF9] px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-[#D0DED3] px-5 py-2.5 text-sm font-medium text-[#587265] transition hover:bg-[#EDF4EF] disabled:opacity-60"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-[#1B5E3B] px-5 py-2.5 text-sm font-bold text-white transition hover:bg-[#256B47] disabled:opacity-50"
          >
            {loading ? "Asignando..." : "Guardar y tomar"}
          </button>
        </div>
      </div>
    </div>
  );
}

type FilterPopoverProps = {
  column: Column<WaitlistRow>;
  sortState: false | "asc" | "desc";
  query: string;
  selectedValues: string[];
  onSortAsc: () => void;
  onSortDesc: () => void;
  onClearSort: () => void;
  onQueryChange: (value: string) => void;
  onSelectionChange: (values: string[]) => void;
  onCancel: () => void;
  onApply: (selectedValuesOverride?: string[]) => void;
};

function FilterPopover({
  column,
  sortState,
  query,
  selectedValues,
  onSortAsc,
  onSortDesc,
  onClearSort,
  onQueryChange,
  onSelectionChange,
  onCancel,
  onApply,
}: FilterPopoverProps) {
  const meta = getColumnMeta(column);
  const options = sortFilterValues(
    column.id,
    Array.from(column.getFacetedUniqueValues().keys())
      .map((value) => String(value))
      .filter(Boolean),
  );
  const visibleOptions = options.filter((option) =>
    matchesFilterSearch(column.id, option, query),
  );
  const allVisibleSelected =
    visibleOptions.length > 0 &&
    visibleOptions.every((option) => selectedValues.includes(option));
  const shouldApplyVisibleOnly =
    query.trim().length > 0 &&
    selectedValues.length === options.length &&
    visibleOptions.length < options.length;

  return (
    <div
      data-filter-root
      className={`absolute top-[calc(100%+8px)] z-50 w-[min(92vw,320px)] rounded-2xl border border-[#D5E4D8] bg-white p-3 shadow-xl ${column.id === "nombre" ? "left-0" : "right-0"}`}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-[12px] font-semibold text-[#2B4636]">
            {meta.label}
          </h3>
          <p className="text-[10px] text-[#7D9487]">Filtro de lista</p>
        </div>
        <button
          type="button"
          onClick={() => onSelectionChange(options)}
          className="text-[10px] font-semibold text-[#688473] hover:text-[#2F4D3D]"
        >
          Limpiar
        </button>
      </div>

      {column.getCanSort() && (
        <div className="mb-3 space-y-1 rounded-xl border border-[#E6EEE6] bg-[#F8FCF9] p-2">
          <button
            type="button"
            onClick={onSortAsc}
            className={`block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-medium ${sortState === "asc" ? "bg-[#EAF7F0] text-[#1E6241]" : "text-[#355442] hover:bg-[#EEF7F1]"}`}
          >
            Ordenar de menor a mayor
          </button>
          <button
            type="button"
            onClick={onSortDesc}
            className={`block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-medium ${sortState === "desc" ? "bg-[#EAF7F0] text-[#1E6241]" : "text-[#355442] hover:bg-[#EEF7F1]"}`}
          >
            Ordenar de mayor a menor
          </button>
          <button
            type="button"
            onClick={onClearSort}
            className="block w-full rounded-md px-2 py-1.5 text-left text-[11px] font-medium text-[#6A8374] hover:bg-[#EEF7F1]"
          >
            Quitar orden
          </button>
        </div>
      )}

      <input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
        placeholder="Buscar opción"
        className="mb-3 w-full rounded-md border border-[#D5E4D8] px-2 py-2 text-xs outline-none focus:border-[#5FB88C]"
      />

      <div className="mb-2 flex items-center justify-between gap-2 px-1 text-[11px]">
        <button
          type="button"
          onClick={() => {
            if (allVisibleSelected) {
              onSelectionChange(
                selectedValues.filter(
                  (value) => !visibleOptions.includes(value),
                ),
              );
              return;
            }
            onSelectionChange(
              Array.from(new Set([...selectedValues, ...visibleOptions])),
            );
          }}
          className="font-semibold text-[#2E6246] hover:underline"
        >
          Seleccionar todo
        </button>
        <span className="text-[#7D9487]">{visibleOptions.length} opciones</span>
      </div>

      <div className="max-h-56 space-y-1 overflow-y-auto rounded-xl border border-[#E6EEE6] p-2">
        {visibleOptions.length === 0 ? (
          <p className="px-2 py-2 text-xs text-[#7D9487]">Sin coincidencias.</p>
        ) : (
          visibleOptions.map((option) => {
            const checked = selectedValues.includes(option);
            return (
              <label
                key={option}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs hover:bg-[#F2F8F4]"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => {
                    if (checked) {
                      onSelectionChange(
                        selectedValues.filter((value) => value !== option),
                      );
                    } else {
                      onSelectionChange([...selectedValues, option]);
                    }
                  }}
                  className="h-3.5 w-3.5"
                />
                <span className="truncate text-[#324D3D]" title={option}>
                  {option}
                </span>
              </label>
            );
          })
        )}
      </div>

      <div className="mt-3 flex items-center justify-end gap-2 border-t border-[#E4ECE6] pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md border border-[#D5E4D8] px-3 py-1.5 text-[11px] font-semibold text-[#5E7868]"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={() =>
            onApply(shouldApplyVisibleOnly ? visibleOptions : undefined)
          }
          className="rounded-md bg-[#1B5E3B] px-3 py-1.5 text-[11px] font-semibold text-white"
        >
          Aplicar
        </button>
      </div>
    </div>
  );
}
