interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: Props) {
  return (
    <header className="mb-6 flex shrink-0 flex-col gap-4 border-b border-white/12 pr-4 pb-5 sm:mb-8 sm:flex-row sm:items-end sm:justify-between sm:pb-6 md:pr-8">
      <div className="min-w-0">
        {eyebrow ? <div className="eyebrow mb-2">{eyebrow}</div> : null}
        <h1 className="text-xl font-bold uppercase tracking-tight sm:text-2xl">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-xl wrap-break-word text-sm text-muted">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}
