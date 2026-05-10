interface Props {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function PageHeader({ eyebrow, title, description, action }: Props) {
  return (
    <header className="mb-8 flex items-end justify-between gap-4 border-b border-white/12 pb-6">
      <div>
        {eyebrow ? <div className="eyebrow mb-2">{eyebrow}</div> : null}
        <h1 className="text-2xl font-bold uppercase tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-xl text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </header>
  );
}
