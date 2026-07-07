/**
 * Server runtime configuration resolved from environment variables.
 * Values are read lazily (functions) so they reflect the runtime environment
 * on the VPS/Plesk even if they were not present at build time.
 */

function env(key: string, fallback = ""): string {
  return process.env[key] ?? fallback;
}

export const serverConfig = {
  jwtTokenSecret: () => env("JWT_TOKEN_SECRET"),
  jwtTokenExpiration: () => env("JWT_TOKEN_EXPIRATION", "900s"),
  jwtRefreshSecret: () => env("JWT_REFRESH_SECRET"),
  jwtRefreshExpiration: () => env("JWT_REFRESH_EXPIRATION", "86400s"),
  jwtWsSecret: () => env("JWT_WS_SECRET"),
  jwtWsExpiration: () => env("JWT_WS_EXPIRATION", "1800s"),

  cookieSecret: () => env("COOKIE_SECRET"),
  cookieDomain: () => env("COOKIE_DOMAIN"),
  cookieDomainProd: () => env("COOKIE_DOMAIN_PROD"),

  hoursToVerifyEmail: () => env("HOURS_TO_VERIFY_EMAIL", "4"),
  hoursToVerifyReset: () => env("HOURS_TO_VERIFY_RESET", "1"),
  minutesToVerifyReset: () => env("MINUTES_TO_VERIFY_RESET", "15"),
  hoursToBlock: () => env("HOURS_TO_BLOCK", "6"),
  loginAttemptsToBlock: () => env("LOGIN_ATTEMPTS_TO_BLOCK", "5"),

  smtpHost: () => env("SMTP_HOST"),
  smtpPort: () => env("SMTP_PORT", "587"),
  smtpSecure: () => env("SMTP_SECURE", "false"),
  smtpAuthUser: () => env("SMTP_AUTH_USER"),
  smtpAuthPass: () => env("SMTP_AUTH_PASS"),
  mailerDefaultFrom: () => env("MAILER_DEFAULT_FROM"),

  emailVerifySubject: () => env("EMAIL_VERIFY_SUBJECT", "Email verification"),
  emailVerifyTemplate: () => env("EMAIL_VERIFY_TEMPLATE", "verify-email.hbs"),
  emailVerifyLink: () => env("EMAIL_VERIFY_LINK", "/verify-email"),
  emailForgotSubject: () => env("EMAIL_FORGOT_SUBJECT", "Forgotten password"),
  emailForgotTemplate: () => env("EMAIL_FORGOT_TEMPLATE", "forgot-pass.hbs"),
  emailForgotLink: () => env("EMAIL_FORGOT_LINK", "/verify-forgot-pass"),

  appHost: () =>
    env("NEXT_PUBLIC_APP_HOST") || env("APP_HOST") || "http://localhost:5000",
  mongodbUri: () => env("MONGODB_URI"),
};
