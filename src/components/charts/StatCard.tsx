/**
 * Metric stat card with icon, value, label and optional trend.
 */
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string | number;
  sublabel?: string;
  Icon?: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  trend?: { value: string; positive: boolean };
};

export function StatCard({ label, value, sublabel, Icon, iconColor, iconBg, trend }: Props) {
  return (
    <div className="rounded-xl border border-gray-200/80 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-secondary dark:text-gray-400">{label}</p>
          <p className="mt-1 text-2xl font-bold text-text-primary dark:text-white">{value}</p>
          {sublabel && (
            <p className="mt-0.5 text-[10px] text-text-muted dark:text-gray-500">{sublabel}</p>
          )}
          {trend && (
            <p className={`mt-1 text-[11px] font-semibold ${trend.positive ? "text-emerald-600 dark:text-emerald-400" : "text-red-500 dark:text-red-400"}`}>
              {trend.positive ? "↑" : "↓"} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <span className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconBg ?? "bg-primary/10"}`}>
            <Icon className={`h-5 w-5 ${iconColor ?? "text-primary"}`} />
          </span>
        )}
      </div>
    </div>
  );
}
