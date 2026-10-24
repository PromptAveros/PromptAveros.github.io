"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { adminRequest, getAdminSession, type Session } from "@/lib/admin-client";

type Kind = "categories" | "styles" | "tags";
type Item = { id: string; name: string; slug: string; description: string; image_url: string; seo_title: string; meta_description: string; sort_order: number };
const empty: Omit<Item, "id"> = { name: "", slug: "", description: "", image_url: "", seo_title: "", meta_description: "", sort_order: 0 };
const labels: Record<Kind, string> = { categories: "categories", styles: "styles", tags: "tags" };

async function loadTaxonomy(kind: Kind, session: Session) {
  const result = await adminRequest<{ items: Item[] }>(`/api/admin/taxonomies/${kind}`, session);
  return result.items;
}

export function AdminTaxonomy({ kind }: { kind: Kind }) {
  const [session, setSession] = useState<Session | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [form, setForm] = useState<Omit<Item, "id">>(empty);
  const [editingId, setEditingId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    void getAdminSession().then(async (authenticated) => {
      if (!active) return;
      setSession(authenticated);
      sessionStorage.setItem("promptavero-csrf", authenticated.csrfToken);
      const loadedItems = await loadTaxonomy(kind, authenticated);
      if (active) setItems(loadedItems);
    }).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : "Administrator sign-in required."));
    return () => { active = false; };
  }, [kind]);

  function startEdit(item: Item) {
    setEditingId(item.id);
    setForm({ name: item.name, slug: item.slug, description: item.description ?? "", image_url: item.image_url ?? "", seo_title: item.seo_title ?? "", meta_description: item.meta_description ?? "", sort_order: item.sort_order ?? 0 });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setBusy(true);
    setError("");
    try {
      await adminRequest(`/api/admin/taxonomies/${kind}${editingId ? `/${encodeURIComponent(editingId)}` : ""}`, session, { method: editingId ? "PUT" : "POST", body: JSON.stringify(form) });
      setForm(empty);
      setEditingId("");
      setItems(await loadTaxonomy(kind, session));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not save ${labels[kind]}.`);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Item) {
    if (!session || !window.confirm(`Delete “${item.name}”? This cannot be undone.`)) return;
    setError("");
    try {
      await adminRequest(`/api/admin/taxonomies/${kind}/${encodeURIComponent(item.id)}`, session, { method: "DELETE", body: "{}" });
      setItems(await loadTaxonomy(kind, session));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : `Could not delete ${labels[kind]}.`);
    }
  }

  return <main className="container admin-shell">
    <div className="admin-bar"><div><span className="eyebrow">Content management</span><h1>Manage {labels[kind]}</h1></div><Link className="button-secondary" href="/admin/">Dashboard</Link></div>
    <div className="admin-taxonomy-layout">
      <section className="admin-panel">
        <h2>{editingId ? "Edit item" : `Add ${kind.slice(0, -1)}`}</h2>
        <form className="form-stack" onSubmit={submit}>
          <div className="form-field"><label htmlFor="taxonomy-name">Name *</label><input id="taxonomy-name" required maxLength={80} value={form.name} onChange={(event) => { const name = event.target.value; setForm((current) => ({ ...current, name, slug: editingId ? current.slug : slugify(name) })); }} /></div>
          <div className="form-field"><label htmlFor="taxonomy-slug">Slug *</label><input id="taxonomy-slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={100} value={form.slug} onChange={(event) => setForm((current) => ({ ...current, slug: event.target.value }))} /></div>
          {kind !== "tags" && <div className="form-field"><label htmlFor="taxonomy-description">Description</label><textarea id="taxonomy-description" maxLength={1000} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} /></div>}
          {kind === "categories" && <>
            <div className="form-field"><label htmlFor="taxonomy-image">Category image (HTTPS URL)</label><input id="taxonomy-image" type="url" value={form.image_url} onChange={(event) => setForm((current) => ({ ...current, image_url: event.target.value }))} /></div>
            <div className="form-field"><label htmlFor="taxonomy-seo">SEO title</label><input id="taxonomy-seo" maxLength={180} value={form.seo_title} onChange={(event) => setForm((current) => ({ ...current, seo_title: event.target.value }))} /></div>
            <div className="form-field"><label htmlFor="taxonomy-meta">Meta description</label><textarea id="taxonomy-meta" maxLength={320} value={form.meta_description} onChange={(event) => setForm((current) => ({ ...current, meta_description: event.target.value }))} /></div>
            <div className="form-field"><label htmlFor="taxonomy-order">Sort order</label><input id="taxonomy-order" type="number" min="0" max="10000" value={form.sort_order} onChange={(event) => setForm((current) => ({ ...current, sort_order: Number(event.target.value) }))} /></div>
          </>}
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="admin-actions"><button className="button-primary" disabled={!session || busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add item"}</button>{editingId && <button className="button-secondary" type="button" onClick={() => { setEditingId(""); setForm(empty); }}>Cancel</button>}</div>
        </form>
      </section>
      <section className="admin-panel"><h2>Existing {labels[kind]}</h2>{items.length ? <ul className="taxonomy-list">{items.map((item) => <li key={item.id}><div><strong>{item.name}</strong><small>/{item.slug}/</small></div><div className="admin-actions"><button className="button-secondary" type="button" onClick={() => startEdit(item)}>Edit</button><button className="button-secondary" type="button" onClick={() => void remove(item)}>Delete</button></div></li>)}</ul> : <p className="notice">No {labels[kind]} found.</p>}</section>
    </div>
  </main>;
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}
