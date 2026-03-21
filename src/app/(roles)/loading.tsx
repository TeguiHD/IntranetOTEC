import { Loader2 } from "lucide-react";

export default function RolesLoading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-text-secondary dark:text-gray-400">Cargando...</p>
      </div>
    </div>
  );
}
