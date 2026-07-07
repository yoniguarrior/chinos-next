import { LOCALE_COOKIE, type Locale } from "@/i18n/config";

/** Persists the selected locale in the cookie read by `src/i18n/request.ts`. */
export function setLocaleCookie(locale: Locale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale};path=/;max-age=31536000;samesite=lax`;
}
