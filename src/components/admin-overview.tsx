"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { adminRequest, getAdminSession } from "@/lib/admin-client";

type Overview = { prompts: { total: number; published: number; drafts: number; archived: number; featured: number }; categories: { total: number }; styles: { total: number } };

export function AdminOverview() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void getAdminSession().then((session) => {
      sessionStorage.setItem("promptavero-csrf", session.csrfToken);
      return adminRequest<Overview>("/api/admin/overview", session);
    }).then((result) => { if (active) setData(result); }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : "Administrator sign-in required.");
    });
    return () => { active = false; };
  }, []);

  const stats = data ? [
    ["Total prompts", data.prompts.total],
    ["Published", data.prompts.published],
    ["Drafts", data.prompts.drafts],
    ["Archived", data.prompts.archived],
    ["Featured", data.prompts.featured],
    ["Categories", data.categories.total],
    ["Styles", data.styles.total],
  ] : [];

  return <main className="container admin-shell">
    <div className="admin-bar"><div><span className="eyebrow">Private workspace</span><h1>Dashboard overview</h1><p>Live database counts; no sample statistics.</p></div><Link className="button-primary" href="/admin/prompts/new/">Add prompt</Link></div>
    {error && <p className="form-error" role="alert">{error} <Link href="/admin/login/">Sign in</Link></p>}
    {!data && !error && <p aria-live="polite">Loading protected statistics…</p>}
    {data && <div className="stats-grid">{stats.map(([label, value]) => <div className="stat-card" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>}
    <section className="admin-panel admin-shortcuts"><h2>Manage your library</h2><div className="admin-actions"><Link className="button-secondary" href="/admin/prompts/">Prompts</Link><Link className="button-secondary" href="/admin/categories/">Categories</Link><Link className="button-secondary" href="/admin/styles/">Styles</Link><Link className="button-secondary" href="/admin/tags/">Tags</Link><Link className="button-secondary" href="/admin/media/">Media guidance</Link><Link className="button-secondary" href="/admin/seo/">SEO & publishing</Link><Link className="button-secondary" href="/admin/settings/">Site settings</Link></div></section>
  </main>;
}
