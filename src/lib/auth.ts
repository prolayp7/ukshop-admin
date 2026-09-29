export const ACCESS_TOKEN_COOKIE = "ukshop_admin_access";
export const REFRESH_TOKEN_COOKIE = "ukshop_admin_refresh";

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

export function getAdminApiUrl(path: string) {
  const baseUrl = process.env.UKSHOP_API_URL ?? "http://localhost:3000/api/v1";
  return `${baseUrl.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export function getApiOrigin() {
  return new URL(process.env.UKSHOP_API_URL ?? "http://localhost:3000/api/v1").origin;
}
