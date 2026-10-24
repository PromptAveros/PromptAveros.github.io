export const apiUrl = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/$/, "");

export type Session = { email: string; csrfToken: string };

export async function getAdminSession(): Promise<Session> {
  if (!apiUrl) throw new Error("The admin API is not configured. Set NEXT_PUBLIC_API_URL and rebuild the site.");
  const response = await fetch(`${apiUrl}/api/auth/session`, { credentials: "include" });
  if (!response.ok) throw new Error("Please sign in to continue.");
  return response.json() as Promise<Session>;
}

export async function adminRequest<T>(path: string, session: Session, init: RequestInit = {}): Promise<T> {
  if (!apiUrl) throw new Error("The admin API is not configured. Set NEXT_PUBLIC_API_URL and rebuild the site.");
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      "X-CSRF-Token": session.csrfToken,
      ...init.headers,
    },
  });
  const result = await response.json().catch(() => ({})) as { error?: string } & T;
  if (!response.ok) throw new Error(result.error ?? `Request failed (${response.status}).`);
  return result;
}

export async function login(email: string, password: string) {
  if (!apiUrl) throw new Error("The admin API is not configured. Set NEXT_PUBLIC_API_URL and rebuild the site.");
  const response = await fetch(`${apiUrl}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const result = await response.json() as { error?: string; csrfToken?: string };
  if (!response.ok || !result.csrfToken) throw new Error(result.error ?? "Sign-in failed.");
  return result.csrfToken;
}

export async function logout(session: Session) {
  await adminRequest("/api/auth/logout", session, { method: "POST", body: "{}" });
}
