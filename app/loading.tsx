export default function Loading() {
  return (
    <div className="mx-auto max-w-[1360px] px-5 py-8 md:px-8">
      <div className="mb-7 h-10 w-64 animate-pulse rounded-xl bg-[var(--line-soft)]" />
      <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="card h-24 animate-pulse" />
        ))}
      </div>
      <div className="mb-9 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="card h-36 animate-pulse" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card h-72 animate-pulse lg:col-span-2" />
        <div className="card h-72 animate-pulse" />
      </div>
    </div>
  );
}
