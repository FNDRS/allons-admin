"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type PasswordInputProps = {
  id?: string;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
};

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput(
    {
      id: idProp,
      autoComplete = "current-password",
      placeholder,
      className = "",
      defaultValue,
    },
    ref,
  ) {
    const generatedId = useId();
    const id = idProp ?? generatedId;
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={`h-11 pr-11 text-base ${visible ? "" : "password-input-mask"} ${className}`}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 h-full w-10 text-white/40 hover:text-white/80"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? (
            <EyeOff aria-hidden size={18} strokeWidth={1.75} />
          ) : (
            <Eye aria-hidden size={18} strokeWidth={1.75} />
          )}
        </Button>
      </div>
    );
  },
);
