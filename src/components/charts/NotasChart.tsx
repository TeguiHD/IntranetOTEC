type NotaItem = {
  nota: string;
  fechaRegistro: string | null;
};

export function NotasChart({ items }: { items: NotaItem[] }) {
  if (items.length === 0) return null;

  const CHART_H = 110;
  const TOP_PAD = 18;   // espacio para etiqueta encima de barra
  const BOT_PAD = 20;   // espacio para fecha debajo
  const LEFT = 24;      // eje Y
  const BAR_W = 26;
  const GAP = 6;
  const TOTAL_H = TOP_PAD + CHART_H + BOT_PAD;
  const TOTAL_W = LEFT + items.length * (BAR_W + GAP) + 8;

  // Escala Y: nota 1.0 (abajo) → 7.0 (arriba)
  const yBar = (nota: number) => {
    const ratio = Math.max(0, Math.min(1, (nota - 1.0) / 6.0));
    return ratio * CHART_H;           // altura de la barra
  };

  // Y pixel del umbral 4.0 (desde arriba del chart area)
  const y4 = TOP_PAD + CHART_H - yBar(4.0);

  return (
    <div className="overflow-x-auto rounded-xl bg-gray-50 p-3 dark:bg-gray-800/40">
      <svg
        viewBox={`0 0 ${TOTAL_W} ${TOTAL_H}`}
        style={{ width: Math.max(TOTAL_W, 200), height: TOTAL_H }}
        aria-label="Historial de notas"
      >
        {/* Líneas de referencia horizontales */}
        {[2, 3, 4, 5, 6, 7].map((y) => {
          const yPx = TOP_PAD + CHART_H - yBar(y);
          const isThreshold = y === 4;
          return (
            <g key={y}>
              <line
                x1={LEFT - 3} x2={TOTAL_W - 4}
                y1={yPx} y2={yPx}
                stroke={isThreshold ? "#EF4444" : "#E5E7EB"}
                strokeWidth={isThreshold ? 1.2 : 0.7}
                strokeDasharray={isThreshold ? "4 3" : undefined}
              />
              <text
                x={LEFT - 5} y={yPx + 3.5}
                textAnchor="end" fontSize={8}
                fill={isThreshold ? "#EF4444" : "#9CA3AF"}
                fontWeight={isThreshold ? "600" : "400"}
              >
                {y}
              </text>
            </g>
          );
        })}

        {/* Barra fantasma (zona aprobada) */}
        <rect
          x={LEFT} y={y4}
          width={TOTAL_W - LEFT - 4} height={yBar(4.0)}
          fill="#10B981" fillOpacity={0.04}
        />

        {/* Barras */}
        {items.map((item, i) => {
          const nota = Number(item.nota);
          const barH = yBar(nota);
          const x = LEFT + i * (BAR_W + GAP);
          const yTop = TOP_PAD + CHART_H - barH;
          const pass = nota >= 4.0;
          const color = pass ? "#10B981" : "#EF4444";

          const dateLabel = item.fechaRegistro
            ? new Date(item.fechaRegistro + "T12:00:00").toLocaleDateString("es-CL", {
                day: "2-digit", month: "short",
              })
            : "";

          return (
            <g key={item.fechaRegistro ?? i}>
              {/* Barra */}
              <rect
                x={x} y={yTop}
                width={BAR_W} height={Math.max(barH, 2)}
                rx={4}
                fill={color}
                fillOpacity={0.8}
              />
              {/* Valor encima */}
              <text
                x={x + BAR_W / 2} y={yTop - 4}
                textAnchor="middle" fontSize={8.5}
                fontWeight="700" fill={color}
              >
                {nota.toFixed(1)}
              </text>
              {/* Fecha debajo */}
              <text
                x={x + BAR_W / 2} y={TOP_PAD + CHART_H + 13}
                textAnchor="middle" fontSize={7.5}
                fill="#9CA3AF"
              >
                {dateLabel}
              </text>
            </g>
          );
        })}
      </svg>

      <p className="mt-1 text-right text-[10px] text-text-muted dark:text-gray-500">
        Línea roja = umbral 4.0
      </p>
    </div>
  );
}
