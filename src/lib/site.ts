const rawBasePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const siteBasePath = rawBasePath === "ROOT" ? "" : rawBasePath.replace(/\/$/, "");
export const siteOrigin = process.env.NEXT_PUBLIC_SITE_URL ?? "https://promptaveros.github.io";

export function canonicalUrl(path: string) {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const origin = new URL(siteOrigin).origin;
  return new URL(`${siteBasePath}${cleanPath}`, `${origin}/`).toString();
}
