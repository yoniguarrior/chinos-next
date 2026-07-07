"use client";

/**
 * Simple modal overlay (port of Nuxt BaseModal + teleport). Rendered in
 * place; the fixed overlay covers the viewport so no portal is needed.
 */
export function BaseModal({ children }: { children: React.ReactNode }) {
  return (
    <div className="modal-overlay">
      <div className="modal-window">{children}</div>
    </div>
  );
}
