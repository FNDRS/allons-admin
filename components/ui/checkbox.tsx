"use client";

import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

function Checkbox({
  className,
  checked,
  defaultChecked,
  onCheckedChange,
  name,
  required,
  disabled,
}: {
  className?: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  name?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [uncontrolled, setUncontrolled] = useState(defaultChecked ?? false);
  const current = checked !== undefined ? checked : uncontrolled;

  return (
    <>
      {name ? (
        <input type="hidden" name={name} value={current ? "on" : ""} required={required && !current ? true : undefined} />
      ) : null}
      <CheckboxPrimitive.Root
        data-slot="checkbox"
        checked={current}
        disabled={disabled}
        onCheckedChange={(next) => {
          const value = next === true;
          if (checked === undefined) setUncontrolled(value);
          onCheckedChange?.(value);
        }}
        className={cn(
          "flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-white/30 bg-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-white data-[state=checked]:bg-white",
          className,
        )}
      >
        <CheckboxPrimitive.Indicator className="flex items-center justify-center text-black">
          <Check className="size-3" strokeWidth={3} />
        </CheckboxPrimitive.Indicator>
      </CheckboxPrimitive.Root>
    </>
  );
}

export { Checkbox };
