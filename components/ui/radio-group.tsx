"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

const RadioGroupContext = createContext<{
  value: string;
  setValue: (value: string) => void;
} | null>(null);

function RadioGroup({
  name,
  required,
  defaultValue = "",
  value,
  onValueChange,
  className,
  children,
}: {
  name?: string;
  required?: boolean;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  className?: string;
  children: ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const current = value !== undefined ? value : uncontrolled;

  const setValue = (next: string) => {
    if (value === undefined) setUncontrolled(next);
    onValueChange?.(next);
  };

  return (
    <RadioGroupContext.Provider value={{ value: current, setValue }}>
      <div role="radiogroup" className={cn("space-y-2", className)}>
        {name ? (
          <input type="hidden" name={name} value={current} required={required} />
        ) : null}
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

function RadioItem({
  value,
  children,
  className,
}: {
  value: string;
  children: ReactNode;
  className?: string;
}) {
  const ctx = useContext(RadioGroupContext);
  if (!ctx) throw new Error("RadioItem must be used inside RadioGroup");
  const selected = ctx.value === value;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={() => ctx.setValue(value)}
      className={cn(
        "flex w-full items-center gap-3 border border-white/12 bg-white/[0.03] px-4 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.05]",
        className,
      )}
    >
      <span
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-full border border-white/30",
          selected && "border-white",
        )}
      >
        {selected ? <span className="size-2 rounded-full bg-white" /> : null}
      </span>
      {children}
    </button>
  );
}

export { RadioGroup, RadioItem };
