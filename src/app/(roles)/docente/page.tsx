import Link from "next/link";

const NAV_ITEMS = [
  {
    href: "/docente/asignaturas",
    label: "Mis Asignaturas",
    description: "Gestiona tus cursos, clases y materiales.",
    iconPath: "M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
    gradient: "grad-blue",
  },
] as const;

export const metadata = {
  title: "Dashboard",
};

export default function DocenteDashboardPage() {
  return (
    <section className="space-y-5">
      <div className="rounded-2xl bg-gradient-to-r from-primary to-primary-dark p-5 shadow-lg shadow-primary/15 sm:p-6">
        <h1 className="text-xl font-bold uppercase text-white sm:text-2xl">Panel Docente</h1>
        <p className="mt-1 text-sm text-white/80">
          Accede a tus asignaturas y gestiona tus clases desde aquí.
        </p>
      </div>

      {/* Navigation grid - vivoDuoc style */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-5 text-center shadow-sm transition-all hover:shadow-lg hover:shadow-primary/10 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-900 dark:hover:border-primary/40 sm:p-6"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.5" className="h-12 w-12 transition-transform duration-200 group-hover:scale-110 sm:h-14 sm:w-14">
              <path strokeLinecap="round" strokeLinejoin="round" stroke={`url(#${item.gradient})`} d={item.iconPath} />
            </svg>
            <div>
              <h2 className="text-sm font-bold text-text-primary dark:text-white sm:text-base">{item.label}</h2>
              <p className="mt-1 hidden text-xs text-text-secondary dark:text-gray-400 sm:block">{item.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
