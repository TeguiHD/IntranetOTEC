/**
 * Pure SVG donut chart — no external dependencies.
 * Renders segments proportionally with optional center label.
 */

type Segment = {
  label: string;
  value: number;
  color: string; // Tailwind fill class like "fill-emerald-500"
  strokeColor?: string; // fallback hex for stroke
};

type Props = {
  segments: Segment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
};

const FALLBACK_COLORS: Record<string, string> = {
  "fill-emerald-500": "#10B981",
  "fill-amber-500": "#F59E0B",
  "fill-violet-500": "#8B5CF6",
  "fill-blue-500": "#3B82F6",
  "fill-rose-500": "#F43F5E",
  "fill-cyan-500": "#06B6D4",
  "fill-indigo-500": "#6366F1",
  "fill-pink-500": "#EC4899",
  "fill-primary": "#6366F1",
  "fill-gray-300": "#D1D5DB",
};

export function DonutChart({
  segments,
  size = 140,
  strokeWidth = 20,
  centerLabel,
  centerValue,
}: Props) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulatedOffset = 0;

  const effectiveSegments = total === 0
    ? [{ label: "Vacío", value: 1, color: "fill-gray-300" }]
    : segments.filter((s) => s.value > 0);

  const effectiveTotal = total === 0 ? 1 : total;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {effectiveSegments.map((seg) => {
          const pct = seg.value / effectiveTotal;
          const dashLength = circumference * pct;
          const dashGap = circumference - dashLength;
          const offset = accumulatedOffset;
          accumulatedOffset += dashLength;

          const strokeHex = seg.strokeColor ?? FALLBACK_COLORS[seg.color] ?? "#6366F1";

          return (
            <circle
              key={seg.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={strokeHex}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dashLength} ${dashGap}`}
              strokeDashoffset={-offset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          );
        })}
      </svg>
      {(centerLabel || centerValue) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue && (
            <span className="text-xl font-bold text-text-primary dark:text-white">
              {centerValue}
            </span>
          )}
          {centerLabel && (
            <span className="text-[10px] font-medium text-text-muted dark:text-gray-500">
              {centerLabel}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
