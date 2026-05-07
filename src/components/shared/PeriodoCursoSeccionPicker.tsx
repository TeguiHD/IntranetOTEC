import { EntityFilterSelect, type EntityFilterOption } from "./EntityFilterSelect";

export type PickerOption = EntityFilterOption;

type Selected = {
  periodoId?: string | null;
  cursoId?: string | null;
  asignaturaId?: string | null;
};

type Props = {
  periodos?: PickerOption[];
  cursos?: PickerOption[];
  asignaturas?: PickerOption[];
  selected?: Selected;
  preserveParams?: Record<string, string | undefined>;
  formAction?: string;
  layout?: "inline" | "stack";
  labels?: Partial<{ periodo: string; curso: string; asignatura: string }>;
  placeholders?: Partial<{ periodo: string; curso: string; asignatura: string }>;
  emptyLabels?: Partial<{ periodo: string; curso: string; asignatura: string }>;
  autoSubmit?: boolean;
  className?: string;
};

const DEFAULT_LABELS = {
  periodo: "Periodo",
  curso: "Curso",
  asignatura: "Sección",
};

const DEFAULT_PLACEHOLDERS = {
  periodo: "Seleccionar periodo",
  curso: "Seleccionar curso",
  asignatura: "Seleccionar sección",
};

const DEFAULT_EMPTY = {
  periodo: "Todos los periodos",
  curso: "Todos los cursos",
  asignatura: "Todas las secciones",
};

export function PeriodoCursoSeccionPicker({
  periodos,
  cursos,
  asignaturas,
  selected,
  preserveParams,
  formAction,
  layout = "inline",
  labels,
  placeholders,
  emptyLabels,
  autoSubmit = true,
  className,
}: Props) {
  const labelMap = { ...DEFAULT_LABELS, ...labels };
  const placeholderMap = { ...DEFAULT_PLACEHOLDERS, ...placeholders };
  const emptyMap = { ...DEFAULT_EMPTY, ...emptyLabels };

  const wrapperClass =
    layout === "stack"
      ? "flex flex-col gap-3"
      : "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3";

  const hiddenEntries = Object.entries(preserveParams ?? {}).filter(
    ([, value]) => typeof value === "string" && value.length > 0,
  ) as Array<[string, string]>;

  return (
    <form
      method="get"
      action={formAction}
      className={[wrapperClass, className].filter(Boolean).join(" ")}
    >
      {hiddenEntries.map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} readOnly />
      ))}

      {periodos ? (
        <PickerField
          name="periodoId"
          label={labelMap.periodo}
          options={periodos}
          defaultValue={selected?.periodoId}
          placeholder={placeholderMap.periodo}
          emptyLabel={emptyMap.periodo}
          autoSubmit={autoSubmit}
          countLabel="periodos"
        />
      ) : null}

      {cursos ? (
        <PickerField
          name="cursoId"
          label={labelMap.curso}
          options={cursos}
          defaultValue={selected?.cursoId}
          placeholder={placeholderMap.curso}
          emptyLabel={emptyMap.curso}
          autoSubmit={autoSubmit}
          countLabel="cursos"
        />
      ) : null}

      {asignaturas ? (
        <PickerField
          name="asignaturaId"
          label={labelMap.asignatura}
          options={asignaturas}
          defaultValue={selected?.asignaturaId}
          placeholder={placeholderMap.asignatura}
          emptyLabel={emptyMap.asignatura}
          autoSubmit={autoSubmit}
          countLabel="secciones"
        />
      ) : null}

      <noscript>
        <button
          type="submit"
          className="h-11 rounded-xl bg-primary px-4 text-sm font-semibold text-white"
        >
          Aplicar
        </button>
      </noscript>
    </form>
  );
}

type FieldProps = {
  name: string;
  label: string;
  options: PickerOption[];
  defaultValue?: string | null;
  placeholder: string;
  emptyLabel: string;
  autoSubmit: boolean;
  countLabel: string;
};

function PickerField({
  name,
  label,
  options,
  defaultValue,
  placeholder,
  emptyLabel,
  autoSubmit,
  countLabel,
}: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={`${name}-trigger`}
        className="text-xs font-medium uppercase tracking-wide text-text-muted dark:text-gray-400"
      >
        {label}
      </label>
      <EntityFilterSelect
        name={name}
        options={options}
        defaultValue={defaultValue ?? ""}
        placeholder={placeholder}
        emptyLabel={emptyLabel}
        autoSubmit={autoSubmit}
        countLabel={countLabel}
      />
    </div>
  );
}
