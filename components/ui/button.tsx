"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-white text-black hover:bg-white/90",
        secondary: "bg-white/10 text-white hover:bg-white/15",
        outline:
          "border border-white/20 bg-transparent text-white/80 hover:bg-white/5 hover:text-white",
        ghost: "text-muted hover:bg-white/5 hover:text-white",
        destructive:
          "border border-danger/40 bg-transparent text-danger hover:bg-danger/10",
        success:
          "border border-success/40 bg-transparent text-success hover:bg-success/10",
        brand: "bg-[#F67010] text-white hover:bg-[#e06510]",
        link: "text-muted underline-offset-4 hover:text-white hover:underline",
        info: "border border-[#3A86FF]/40 bg-transparent text-[#3A86FF] hover:bg-[#3A86FF]/10",
      },
      size: {
        default: "h-9 px-4",
        sm: "h-8 px-2.5 text-[10px] font-bold uppercase tracking-wide",
        lg: "h-11 px-6 text-xs font-bold uppercase tracking-wide",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
