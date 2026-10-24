"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { adminRequest, getAdminSession, logout, type Session } from "@/lib/admin-client";

type AdminPrompt = { id: string; title: string; slug: string; status: "draft" | "published" | "archived"; updated_at: string };
type PublishingStatus = { state: string; url?: string; updatedAt?: string; error?: string; message?: string };

export function AdminPrompts() {
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<AdminPrompt[]>([]);
  const [error, setError] = useState("");
  const [publishing, setPublishing] = useState<PublishingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  async function load() {
    setLoading(true);
    setError("");
    try {
      const authenticated = await getAdminSession();
      setSession(authenticated);
      sessionStorage.setItem("promptavero-csrf", authenticated.csrfToken);
      const data = await adminRequest<{ prompts: AdminPrompt[] }>("/api/admin/prompts", authenticated);
      setItems(data.prompts);
      try {
        setPublishing(await adminRequest<PublishingStatus>("/api/admin/publishing", authenticated));
      } catch (cause) {
        setPublishing({ state: "unknown", error: cause instanceof Error ? cause.message : "Publishing status is unavailable." });
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to load prompts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { queueMicrotask(() => void load()); }, []);

  async function remove(prompt: AdminPrompt) {
    if (!session || !window.confirm(`Delete “${prompt.title}”? This cannot be undone.`)) return;
    setError("");
    try {
      const result = await adminRequest<{ deployment: string; error?: string }>(`/api/admin/prompts/${encodeURIComponent(prompt.id)}`, session, { method: "DELETE", body: "{}" });
      await load();
      if (result.error) setError(`Prompt deleted, but publishing failed: ${result.error}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Delete failed.");
    }

  }

  async function retryPublishing() {
    if (!session) return;
    setError("");
    try {
      const result = await adminRequest<{ deployment: string; error?: string }>("/api/admin/publish", session, { method: "POST", body: "{}" });
      setPublishing({ state: result.deployment, error: result.error });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not retry publishing.");
    }
  }

  async function signOut() {
    if (!session) return;
    try {
      await logout(session);
      router.push("/admin/login/");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not end the administrator session.");
    }
  }

  return <div className="container admin-shell">
    <div className="admin-bar"><div><span className="eyebrow">Private workspace</span><h1>Prompt management</h1></div><div className="admin-actions"><Link className="button-primary" href="/admin/prompts/new/">Add prompt</Link>{session && <><button className="button-secondary" onClick={() => void retryPublishing()} type="button">Retry static publish</button><button className="button-secondary" onClick={() => void signOut()} type="button">Log out</button></>}</div></div>
    <p className="notice">Changes are saved to the backend. Static publishing is reported separately and requires a configured GitHub Actions workflow.</p>
    {session && publishing && <p className="notice" aria-live="polite">Latest workflow state: <strong>{publishing.state}</strong>{publishing.error ? ` — ${publishing.error}` : ""}{publishing.url && <> · <a href={publishing.url} target="_blank" rel="noreferrer">View workflow</a></>}</p>}
    {error && <p className="form-error" role="alert">{error} {!session && <Link href="/admin/login/">Sign in</Link>}</p>}
    {loading ? <p aria-live="polite">Loading protected prompt records…</p> : session && <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Prompt</th><th>Status</th><th>Updated</th><th>Actions</th></tr></thead><tbody>{items.map((item) => <tr key={item.id}><td><strong>{item.title}</strong><br /><small>/{item.slug}/</small></td><td><span className="status-pill" data-status={item.status}>{item.status}</span></td><td>{new Date(item.updated_at).toLocaleDateString()}</td><td><div className="admin-actions"><button className="button-secondary" type="button" onClick={() => router.push(`/admin/prompts/edit/?id=${encodeURIComponent(item.id)}`)}>Edit</button><button className="button-secondary" type="button" onClick={() => void remove(item)}>Delete</button></div></td></tr>)}</tbody></table>{items.length === 0 && <p className="empty-state">No prompts yet. Add a prompt to start your library.</p>}</div>}
  </div>;
}
