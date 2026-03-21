import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50/50 px-6 py-12 text-center dark:border-gray-700 dark:bg-gray-900/40">
      {Icon && (
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
          <Icon className="h-7 w-7 text-gray-400 dark:text-gray-500" />
        </div>
      )}
      <div className="space-y-1">
        <p className="text-sm font-semibold text-text-primary dark:text-gray-200">{title}</p>
        {description && (
          <p className="max-w-xs text-xs text-text-secondary dark:text-gray-400">{description}</p>
        )}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}
