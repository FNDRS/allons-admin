import type { ReactNode } from "react";

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render: (row: T) => ReactNode;
  align?: "left" | "right" | "center";
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyState?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyState = "Sin datos.",
}: Props<T>) {
  return (
    <div className="futuristic-panel overflow-hidden">
      <div className="grid border-b border-white/12 bg-white/[0.02] px-4 py-3 text-[10px] font-bold uppercase tracking-wide text-muted"
        style={{
          gridTemplateColumns: columns.map((c) => c.width ?? "1fr").join(" "),
        }}
      >
        {columns.map((c) => (
          <div
            key={c.key}
            className={
              c.align === "right"
                ? "text-right"
                : c.align === "center"
                ? "text-center"
                : ""
            }
          >
            {c.header}
          </div>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="px-4 py-10 text-center text-sm text-muted">
          {emptyState}
        </div>
      ) : (
        <div>
          {rows.map((row) => (
            <div
              key={rowKey(row)}
              className="grid items-center border-b border-white/8 px-4 py-3 text-sm last:border-b-0 hover:bg-white/[0.02]"
              style={{
                gridTemplateColumns: columns.map((c) => c.width ?? "1fr").join(" "),
              }}
            >
              {columns.map((c) => (
                <div
                  key={c.key}
                  className={
                    c.align === "right"
                      ? "text-right"
                      : c.align === "center"
                      ? "text-center"
                      : ""
                  }
                >
                  {c.render(row)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
