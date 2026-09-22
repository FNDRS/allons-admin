"use client";

import { Clock } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

function parseHm(value: string): { hour: string; minute: string } {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return { hour: "00", minute: "00" };
  return {
    hour: String(Number(match[1])).padStart(2, "0"),
    minute: match[2],
  };
}

function TimePicker({
  name,
  value,
  defaultValue = "",
  onChange,
  required,
  placeholder = "Elige una hora",
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
  const { hour, minute } = useMemo(() => parseHm(current || "00:00"), [current]);

  const setNext = (next: string) => {
    if (value === undefined) setUncontrolled(next);
    onChange?.(next);
  };

  const setPart = (part: "hour" | "minute", nextValue: string) => {
    const next =
      part === "hour" ? `${nextValue}:${minute}` : `${hour}:${nextValue}`;
    setNext(next);
  };

  return (
    <div className={cn("w-full", className)}>
      {name ? (
        <input
          key={current}
          type="hidden"
          name={name}
          defaultValue={current}
          required={required}
        />
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
            <Clock className="size-3.5 text-white/40" />
            {current || placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2">
          <div className="grid grid-cols-2 gap-2">
            <TimeColumn
              label="Hora"
              items={HOURS}
              selected={hour}
              onSelect={(next) => setPart("hour", next)}
            />
            <TimeColumn
              label="Min"
              items={MINUTES}
              selected={minute}
              onSelect={(next) => setPart("minute", next)}
            />
          </div>
          <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="normal-case tracking-normal"
              onClick={() => {
                const now = new Date();
                setNext(
                  `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
                );
                setOpen(false);
              }}
            >
              Ahora
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="normal-case tracking-normal"
              onClick={() => setOpen(false)}
            >
              Listo
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function TimeColumn({
  label,
  items,
  selected,
  onSelect,
}: {
  label: string;
  items: string[];
  selected: string;
  onSelect: (value: string) => void;
}) {
  const selectedRef = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    selectedRef.current?.scrollIntoView({ block: "center", inline: "nearest" });
  }, [selected]);

  return (
    <div>
      <p className="mb-1 text-center text-[10px] font-medium uppercase tracking-wide text-white/40">
        {label}
      </p>
      <div className="h-44 overflow-y-auto rounded-md border border-white/10 bg-white/3 p-1">
        {items.map((item) => (
          <Button
            key={item}
            ref={item === selected ? selectedRef : undefined}
            type="button"
            variant={item === selected ? "default" : "ghost"}
            className="h-8 w-full font-normal"
            onClick={() => onSelect(item)}
          >
            {item}
          </Button>
        ))}
      </div>
    </div>
  );
}

export { TimePicker };
