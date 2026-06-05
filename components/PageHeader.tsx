export default function PageHeader({
  kicker,
  title,
  subtitle,
  actions,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker && (
          <div className="label mb-1.5 text-[var(--brand)]" style={{ color: "var(--brand)" }}>
            {kicker}
          </div>
        )}
        <h1 className="text-[32px] font-bold leading-[1.05] tracking-tight text-[var(--ink)] md:text-[38px]">
          {title}
        </h1>
        {subtitle && <p className="mt-2 max-w-2xl text-[15px] text-[var(--muted)]">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  );
}
