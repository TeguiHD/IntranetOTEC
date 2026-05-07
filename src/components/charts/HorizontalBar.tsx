/**
 * Pure CSS horizontal bar chart — no external dependencies.
 * Renders a list of labeled values as proportional bars.
 */

type BarItem = {
  label: string;
  value: number;
  color?: string;
};

type Props = {
  items: BarItem[];
  /** Show value as raw count or as percentage of total. Default: "count" */
  mode?: "count" | "percent";
  /** Max value for the bar width (auto-detected from items if omitted) */
  max?: number;
};

const DEFAULT_COLORS = [
  "bg-primary",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-violet-500",
  "bg-rose-500",
  "bg-cyan-500",
  "bg-indigo-500",
  "bg-pink-500",
  "bg-teal-500",
  "bg-orange-500",
];

export function HorizontalBar({ items, mode = "count", max }: Props) {
  const total = items.reduce((s, i) => s + i.value, 0);
  const effectiveMax = max ?? Math.max(...items.map((i) => i.value), 1);

  return (
    <div className="space-y-2.5">
      {items.map((item, idx) => {
        const pct = effectiveMax > 0 ? (item.value / effectiveMax) * 100 : 0;
        const display = mode === "percent" && total > 0
          ? `${Math.round((item.value / total) * 100)}%`
          : String(item.value);

        return (
          <div key={item.label} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-primary dark:text-gray-200">{item.label}</span>
              <span className="tabular-nums font-semibold text-text-secondary dark:text-gray-400">
                {display}
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className={`h-full rounded-full transition-[background-color,border-color,color,box-shadow,opacity,transform] duration-500 ease-out ${item.color ?? DEFAULT_COLORS[idx % DEFAULT_COLORS.length]}`}
                style={{ width: `${Math.min(pct, 100)}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
