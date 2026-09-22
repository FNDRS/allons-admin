export function DashboardPage({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
  );
}

export function DashboardScroll({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className={`pr-4 md:pr-8 ${className}`.trim()}>{children}</div>
    </div>
  );
}

export function DashboardList({
  header,
  children,
}: {
  header: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="futuristic-panel mr-4 flex min-h-0 flex-1 flex-col overflow-hidden md:mr-8">
      {header}
      <div className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto">{children}</div>
    </div>
  );
}
