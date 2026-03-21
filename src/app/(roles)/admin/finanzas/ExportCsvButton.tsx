"use client";

type FinanzaRow = {
  id: string;
  tipo: string;
  monto: string;
  descripcion: string;
  categoria: string | null;
  fecha: string;
};

type ExportCsvButtonProps = {
  registros: FinanzaRow[];
};

const escapeCsvValue = (value: string): string => {
  const normalized = value.replace(/"/g, '""');
  return /[",\n]/.test(normalized) ? `"${normalized}"` : normalized;
};

export function ExportFinanzasCsvButton({ registros }: ExportCsvButtonProps) {
  const handleExport = () => {
    const headers = ["Tipo", "Monto", "Descripción", "Categoría", "Fecha"];
    const rows = registros.map((r) => [
      escapeCsvValue(r.tipo),
      r.monto,
      escapeCsvValue(r.descripcion),
      escapeCsvValue(r.categoria ?? ""),
      escapeCsvValue(r.fecha),
    ]);
    const csv = `\uFEFF${[headers, ...rows].map((row) => row.join(",")).join("\n")}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `finanzas_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <button
      type="button"
      onClick={handleExport}
      disabled={registros.length === 0}
      className="inline-flex h-9 items-center rounded-lg border border-primary px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary/10 focus:ring-2 focus:ring-primary/50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-primary-light dark:hover:bg-primary/20"
    >
      Exportar CSV
    </button>
  );
}
