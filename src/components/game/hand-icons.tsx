import type { SVGProps } from "react";

/**
 * Solid hand glyphs (Font Awesome Free 6, CC BY 4.0).
 * Design v4: open hand while still choosing / after reveal; closed fist once
 * coins are hidden (and during betting / before reveal).
 */

/** Closed fist (fa6-solid:hand-back-fist). */
export function FistIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 448 512"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M144 0c-26.5 0-48 21.5-48 48v128c0 8.8-7.2 16-16 16s-16-7.2-16-16v-26.7l-9 7.5C40.4 169 32 187 32 206v38c0 38 16.9 74 46.1 98.3L128 384v96c0 17.7 14.3 32 32 32h160c17.7 0 32-14.3 32-32V374.7c46.9-19 80-65 80-118.7V144c0-26.5-21.5-48-48-48c-12.4 0-23.6 4.7-32.1 12.3C350 83.5 329.3 64 304 64c-12.4 0-23.6 4.7-32.1 12.3C270 51.5 249.3 32 224 32c-12.4 0-23.6 4.7-32.1 12.3C190 19.5 169.3 0 144 0" />
    </svg>
  );
}

/** Open hand (fa6-solid:hand). */
export function OpenHandIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 512 512"
      fill="currentColor"
      aria-hidden="true"
      {...props}
    >
      <path d="M288 32c0-17.7-14.3-32-32-32s-32 14.3-32 32v208c0 8.8-7.2 16-16 16s-16-7.2-16-16V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v272c0 1.5 0 3.1.1 4.6L67.6 283c-16-15.2-41.3-14.6-56.6 1.4s-14.6 41.3 1.4 56.6l112.4 107c43.1 41.1 100.4 64 160 64H304c97.2 0 176-78.8 176-176V128c0-17.7-14.3-32-32-32s-32 14.3-32 32v112c0 8.8-7.2 16-16 16s-16-7.2-16-16V64c0-17.7-14.3-32-32-32s-32 14.3-32 32v176c0 8.8-7.2 16-16 16s-16-7.2-16-16z" />
    </svg>
  );
}
