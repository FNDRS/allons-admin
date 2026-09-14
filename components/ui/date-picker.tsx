"use client";

import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function parseYmd(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function toYmd(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function DatePicker({
  name,
  value,
  defaultValue = "",
  onChange,
  required,
  placeholder = "Elige una fecha",
  className,
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [uncontrolled, setUncontrolled] = useState(defaultValue);
  const current = value !== undefined ? value : uncontrolled;
  const selected = current ? parseYmd(current) : undefined;

  const setNext = (next: string) => {
    if (value === undefined) setUncontrolled(next);
    onChange?.(next);
  };

  return (
    <div className={cn("w-full", className)}>
      {name ? (
        <input type="hidden" name={name} value={current} required={required} />
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-9 w-full justify-start font-normal",
              !current && "text-white/30",
            )}
          >
            <CalendarIcon className="size-3.5 text-white/40" />
            {selected
              ? format(selected, "d MMM yyyy", { locale: es })
              : placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent>
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(date) => {
              if (!date) return;
              setNext(toYmd(date));
              setOpen(false);
            }}
            defaultMonth={selected}
          />
          <div className="flex items-center justify-between border-t border-white/10 px-3 py-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="normal-case tracking-normal"
              onClick={() => {
                setNext("");
                setOpen(false);
              }}
            >
              Borrar
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="normal-case tracking-normal"
              onClick={() => {
                setNext(toYmd(new Date()));
                setOpen(false);
              }}
            >
              Hoy
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export { DatePicker };
