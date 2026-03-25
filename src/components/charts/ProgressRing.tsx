/**
 * Circular progress ring — compact metric widget.
 */

type Props = {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string; // hex
  label?: string;
};

export function ProgressRing({
  value,
  max,
  size = 64,
  strokeWidth = 6,
  color = "#6366F1",
  label,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(value / max, 1) : 0;
  const dashOffset = circumference * (1 - pct);
  const center = size / 2;

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className="relative">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-100 dark:text-gray-800"
          />
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            className="transition-all duration-700 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-text-primary dark:text-white">
            {Math.round(pct * 100)}%
          </span>
        </div>
      </div>
      {label && (
        <span className="text-[10px] font-medium text-text-muted dark:text-gray-500">{label}</span>
      )}
    </div>
  );
}
