"use client";

import { useState, forwardRef } from "react";
import { Eye, EyeOff } from "lucide-react";

type PasswordInputProps = Omit<React.ComponentProps<"input">, "type">;

/** Text input with a show/hide password toggle (pattern repeated across the auth forms). */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <input
          ref={ref}
          type={visible ? "text" : "password"}
          className={className}
          {...props}
        />
        <button
          type="button"
          className="icon-btn absolute top-1/2 right-2 -translate-y-1/2"
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          {visible ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
        </button>
      </div>
    );
  },
);
