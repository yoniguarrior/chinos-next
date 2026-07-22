"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Full-viewport modal overlay. Portaled to `#modal-container` (or `document.body`)
 * so ancestors with overflow/transform (e.g. the room layout) cannot clip it or
 * shrink its containing block to half the screen.
 */
export function BaseModal({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const target =
    document.getElementById("modal-container") ?? document.body;

  return createPortal(
    <div className="modal-overlay" role="presentation">
      <div className="modal-window" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>,
    target,
  );
}
