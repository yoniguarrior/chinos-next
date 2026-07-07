export function getIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "";
}

export function getBrowserInfo(req: Request): string {
  return req.headers.get("user-agent") || "XX";
}
