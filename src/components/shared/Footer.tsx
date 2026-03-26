export function Footer() {
  return (
    <footer className="border-t border-gray-200/80 bg-white/90 px-6 py-4 text-center text-xs text-text-secondary dark:border-gray-800 dark:bg-gray-950/90 dark:text-gray-500">
      <span>
        OTEC Impulsate © {new Date().getFullYear()} — Creado por{" "}
        <a
          href="https://www.instagram.com/netlinks.cl/"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          NETLINKS
        </a>
      </span>
    </footer>
  );
}
