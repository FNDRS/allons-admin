"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, type ReactNode } from "react";

const EMPTY = "__empty__";

function toRadixValue(value: string) {
  return value === "" ? EMPTY : value;
}

function fromRadixValue(value: string) {
  return value === EMPTY ? "" : value;
}

function Select({
  name,
  defaultValue,
  value,
  onValueChange,
  required,
  disabled,
  placeholder,
  className,
  children,
}: {
  name?: string;
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  children: ReactNode;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultValue ?? "");
  const current = value !== undefined ? value : uncontrolled;

  const handleChange = (next: string) => {
    const parsed = fromRadixValue(next);
    if (value === undefined) setUncontrolled(parsed);
    onValueChange?.(parsed);
  };

  return (
    <div className={cn("relative", className)}>
      {name ? (
        <input type="hidden" name={name} value={current} required={required} />
      ) : null}
      <SelectPrimitive.Root
        value={toRadixValue(current)}
        onValueChange={handleChange}
        disabled={disabled}
      >
        <SelectPrimitive.Trigger
          className="flex h-9 w-full items-center justify-between gap-2 rounded-md border border-white/15 bg-white/4 px-3 text-sm text-white transition-colors outline-none hover:bg-white/6 focus-visible:border-white/40 focus-visible:ring-2 focus-visible:ring-white/10 disabled:cursor-not-allowed disabled:opacity-50 data-[placeholder]:text-white/30"
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon asChild>
            <ChevronDown className="size-3.5 shrink-0 text-white/40" aria-hidden />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            position="popper"
            sideOffset={6}
            className="z-50 min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-md border border-white/15 bg-[#0c0c0c] shadow-2xl"
          >
            <SelectPrimitive.Viewport className="p-1">
              {children}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    </div>
  );
}

function SelectItem({
  value,
  children,
  disabled,
  className,
}: {
  value: string;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <SelectPrimitive.Item
      value={toRadixValue(value)}
      disabled={disabled}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-sm py-2 pl-8 pr-3 text-sm text-white outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-40 data-[highlighted]:bg-white/10 data-[state=checked]:text-white",
        className,
      )}
    >
      <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex">
        <Check className="size-3.5 text-white" aria-hidden />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  );
}

export { Select, SelectItem };
