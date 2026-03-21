const CURRENT_YEAR = new Date().getFullYear();
const APP_VERSION = "v1.0";

export function Footer() {
  return (
    <footer className="border-t border-gray-200/70 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-950/50">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-1 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-xs font-medium text-text-secondary dark:text-gray-400">
          OTEC &copy; {CURRENT_YEAR}
          <span className="mx-1.5 text-gray-300 dark:text-gray-700">&bull;</span>
          <span className="text-text-muted dark:text-gray-500">Intranet educativa segura</span>
        </p>
        <p className="text-xs text-text-muted dark:text-gray-600">{APP_VERSION}</p>
      </div>
    </footer>
  );
}
