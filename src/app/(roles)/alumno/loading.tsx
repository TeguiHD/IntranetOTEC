export default function AlumnoLoading() {
  return (
    <section className="space-y-5">
      {/* Hero skeleton */}
      <div className="animate-pulse rounded-2xl bg-gradient-to-r from-primary/40 to-primary-dark/40 p-5 sm:p-6">
        <div className="h-7 w-40 rounded-lg bg-white/20" />
        <div className="mt-2 h-4 w-60 rounded-lg bg-white/15" />
      </div>

      {/* Quick stats — 4 cells */}
      <div className="grid animate-pulse grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-gray-100 bg-white p-4 text-center dark:border-gray-800 dark:bg-gray-900"
          >
            <div className="mx-auto h-8 w-10 rounded-md bg-gray-200 dark:bg-gray-700" />
            <div className="mx-auto mt-1.5 h-3 w-20 rounded-md bg-gray-100 dark:bg-gray-800" />
          </div>
        ))}
      </div>

      {/* Nav cards skeleton */}
      <div className="grid animate-pulse grid-cols-2 gap-4 sm:grid-cols-3">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200/80 bg-white p-5 dark:border-gray-800 dark:bg-gray-900 sm:p-6"
          >
            <div className="h-12 w-12 rounded-xl bg-gray-200 dark:bg-gray-700 sm:h-14 sm:w-14" />
            <div className="w-full space-y-2 text-center">
              <div className="mx-auto h-4 w-24 rounded-md bg-gray-200 dark:bg-gray-700" />
              <div className="mx-auto h-3 w-28 rounded-md bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming classes card skeleton */}
      <article className="animate-pulse rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="h-5 w-36 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="mt-2 h-4 w-56 rounded-lg bg-gray-100 dark:bg-gray-800" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-48 rounded-md bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-32 rounded-md bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="ml-3 space-y-1 text-right">
                <div className="h-4 w-12 rounded-md bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-8 rounded-md bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      </article>

      {/* Enrolled courses card skeleton */}
      <article className="animate-pulse rounded-2xl border border-gray-200/80 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:p-6">
        <div className="h-5 w-44 rounded-lg bg-gray-200 dark:bg-gray-700" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-800/50"
            >
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-40 rounded-md bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-24 rounded-md bg-gray-100 dark:bg-gray-800" />
              </div>
              <div className="ml-3 space-y-1 text-right">
                <div className="h-4 w-14 rounded-md bg-gray-200 dark:bg-gray-700" />
                <div className="h-3 w-10 rounded-md bg-gray-100 dark:bg-gray-800" />
              </div>
            </div>
          ))}
        </div>
      </article>
    </section>
  );
}
