/**
 * Likert scale distribution visualization.
 * Shows vertical bars per scale value with counts and color gradient.
 */

type Props = {
  /** Map from scale value (e.g. "1","2"..."7") to count */
  distribution: { valor: string; count: number }[];
  /** Scale range (e.g. min=1, max=7) */
  scaleMin?: number;
  scaleMax?: number;
  labelMin?: string;
  labelMax?: string;
  average?: number | null;
  totalResponses?: number;
};

const BAR_COLORS = [
  "bg-red-400 dark:bg-red-500",
  "bg-orange-400 dark:bg-orange-500",
  "bg-amber-400 dark:bg-amber-500",
  "bg-yellow-400 dark:bg-yellow-500",
  "bg-lime-400 dark:bg-lime-500",
  "bg-emerald-400 dark:bg-emerald-500",
  "bg-green-500 dark:bg-green-400",
];

export function LikertDistribution({
  distribution,
  scaleMin = 1,
  scaleMax = 7,
  labelMin,
  labelMax,
  average,
  totalResponses,
}: Props) {
  const range = scaleMax - scaleMin + 1;
  const countMap = new Map(distribution.map((d) => [d.valor, d.count]));
  const maxCount = Math.max(...Array.from(countMap.values()), 1);

  const bars = Array.from({ length: range }, (_, i) => {
    const value = String(scaleMin + i);
    const count = countMap.get(value) ?? 0;
    return { value, count };
  });

  return (
    <div className="space-y-3">
      {/* Average + total */}
      {(average !== null && average !== undefined) && (
        <div className="flex items-center gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-primary">{average.toFixed(1)}</span>
            <span className="text-xs text-text-muted dark:text-gray-500">/ {scaleMax}</span>
          </div>
          {totalResponses !== undefined && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-text-secondary dark:bg-gray-800 dark:text-gray-400">
              {totalResponses} respuesta{totalResponses !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      )}

      {/* Bars */}
      <div className="flex items-end gap-1.5" style={{ height: 80 }}>
        {bars.map((bar, idx) => {
          const heightPct = maxCount > 0 ? (bar.count / maxCount) * 100 : 0;
          const colorIdx = Math.min(idx, BAR_COLORS.length - 1);

          return (
            <div key={bar.value} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] tabular-nums font-semibold text-text-secondary dark:text-gray-400">
                {bar.count > 0 ? bar.count : ""}
              </span>
              <div className="flex w-full items-end justify-center" style={{ height: 56 }}>
                <div
                  className={`w-full max-w-[2rem] rounded-t-md transition-all duration-500 ease-out ${BAR_COLORS[colorIdx]}`}
                  style={{ height: `${Math.max(heightPct, bar.count > 0 ? 8 : 2)}%`, minHeight: bar.count > 0 ? 4 : 1 }}
                />
              </div>
              <span className="text-[11px] font-semibold text-text-primary dark:text-gray-300">
                {bar.value}
              </span>
            </div>
          );
        })}
      </div>

      {/* Labels */}
      {(labelMin || labelMax) && (
        <div className="flex justify-between text-[10px] text-text-muted dark:text-gray-500">
          <span>{labelMin}</span>
          <span>{labelMax}</span>
        </div>
      )}
    </div>
  );
}
