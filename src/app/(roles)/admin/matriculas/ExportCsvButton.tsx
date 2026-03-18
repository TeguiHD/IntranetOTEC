"use client";

type MatriculaRow = {
  alumnoNombre: string;
  alumnoApellido: string;
  alumnoRut: string | null;
  alumnoEmail: string | null;
  asignaturaNombre: string;
  estadoPago: string | null;
  montoArancel: string | null;
  activa: boolean | null;
  createdAt: Date | null;
};

type ExportCsvButtonProps = {
  matriculas: MatriculaRow[];
};

const escapeCsvValue = (value: string): string => {
  const normalized = value.replace(/"/g, '""');
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
};

export function ExportCsvButton({ matriculas }: ExportCsvButtonProps) {
  const handleExport = () => {
    const headers = [
      "Nombre",
      "Apellido",
      "RUT",
      "Correo",
      "Asignatura",
      "Estado Pago",
      "Monto Arancel",
      "Matrícula Activa",
      "Fecha Matrícula",
    ];

    const rows = matriculas.map((m) => [
      escapeCsvValue(m.alumnoNombre),
      escapeCsvValue(m.alumnoApellido),
      escapeCsvValue(m.alumnoRut ?? ""),
      escapeCsvValue(m.alumnoEmail ?? ""),
      escapeCsvValue(m.asignaturaNombre),
      escapeCsvValue(m.estadoPago ?? ""),
      escapeCsvValue(m.montoArancel ?? ""),
      m.activa ? "Sí" : "No",
      m.createdAt ? new Date(m.createdAt).toLocaleDateString("es-CL") : "",
    ]);

    const csv = `\uFEFF${[headers, ...rows].map((row) => row.join(",")).join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `matriculas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={matriculas.length === 0}
      className="inline-flex h-9 items-center rounded-lg border border-primary px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-primary-light dark:hover:bg-primary/20"
    >
      Exportar CSV
    </button>
  );
}
