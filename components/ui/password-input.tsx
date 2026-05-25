"use client";

import { Eye, EyeOff } from "lucide-react";
import { forwardRef, useId, useState } from "react";

type PasswordInputProps = {
  id?: string;
  autoComplete?: string;
  placeholder?: string;
  className?: string;
  defaultValue?: string;
};

const fieldClassName =
  "w-full rounded-lg border border-white/15 bg-white/[0.04] px-3.5 py-2.5 pr-11 text-base text-white placeholder:text-white/30 transition-colors focus:border-white/40 focus:outline-none focus:ring-2 focus:ring-white/10";

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
        <input
          ref={ref}
          id={id}
          type={visible ? "text" : "password"}
          autoComplete={autoComplete}
          autoCorrect="off"
          autoCapitalize="none"
          spellCheck={false}
          placeholder={placeholder}
          defaultValue={defaultValue}
          className={`${fieldClassName} ${visible ? "" : "password-input-mask"} ${className}`}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 flex items-center rounded-r-lg px-3 text-white/40 transition-colors hover:text-white/80 focus-visible:text-white focus-visible:outline-none"
          aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
          aria-pressed={visible}
          aria-controls={id}
        >
          {visible ? (
            <EyeOff aria-hidden size={18} strokeWidth={1.75} />
          ) : (
            <Eye aria-hidden size={18} strokeWidth={1.75} />
          )}
        </button>
      </div>
    );
  },
);
