"use client";

type PieSlice = {
  label: string;
  value: number;
  color: string;
};

type PieChartProps = {
  slices: PieSlice[];
  size?: number;
  title?: string;
};

export function PieChart({ slices, size = 160, title }: PieChartProps) {
  const total = slices.reduce((sum, s) => sum + s.value, 0);

  if (total === 0) {
    return (
      <div className="flex flex-col items-center gap-2">
        {title ? (
          <p className="text-sm font-semibold text-text-primary dark:text-gray-100">{title}</p>
        ) : null}
        <div
          className="flex items-center justify-center rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600"
          style={{ width: size, height: size }}
        >
          <span className="text-xs text-text-secondary dark:text-gray-400">Sin datos</span>
        </div>
      </div>
    );
  }

  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 4;

  let startAngle = -90;
  const paths: JSX.Element[] = [];

  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];

    if (slice.value === 0) continue;

    const percentage = slice.value / total;
    const angle = percentage * 360;
    const endAngle = startAngle + angle;

    if (percentage >= 0.9999) {
      paths.push(
        <circle
          key={i}
          cx={cx}
          cy={cy}
          r={radius}
          fill={slice.color}
        />,
      );
    } else {
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;
      const x1 = cx + radius * Math.cos(startRad);
      const y1 = cy + radius * Math.sin(startRad);
      const x2 = cx + radius * Math.cos(endRad);
      const y2 = cy + radius * Math.sin(endRad);
      const largeArc = angle > 180 ? 1 : 0;

      paths.push(
        <path
          key={i}
          d={`M${cx},${cy} L${x1},${y1} A${radius},${radius} 0 ${largeArc},1 ${x2},${y2} Z`}
          fill={slice.color}
        />,
      );
    }

    startAngle = endAngle;
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {title ? (
        <p className="text-sm font-semibold text-text-primary dark:text-gray-100">{title}</p>
      ) : null}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-label={title ?? "Gráfico de asistencia"}
        role="img"
      >
        {paths}
      </svg>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1">
        {slices.map((slice) =>
          slice.value > 0 ? (
            <div key={slice.label} className="flex items-center gap-1.5 text-xs">
              <span
                className="inline-block h-3 w-3 rounded-sm"
                style={{ backgroundColor: slice.color }}
                aria-hidden
              />
              <span className="text-text-secondary dark:text-gray-300">
                {slice.label}: {slice.value} ({Math.round((slice.value / total) * 100)}%)
              </span>
            </div>
          ) : null,
        )}
      </div>
    </div>
  );
}
