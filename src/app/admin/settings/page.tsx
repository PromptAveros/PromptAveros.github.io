import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Site Settings", robots: { index: false, follow: false } };

export default function AdminSettingsPage() {
  return <main className="container admin-shell">
    <div className="admin-bar"><div><span className="eyebrow">Configuration</span><h1>Site settings</h1></div><Link className="button-secondary" href="/admin/">Dashboard</Link></div>
    <section className="admin-panel">
      <h2>Deployment-managed settings</h2>
      <p>Site origin, API origin, Supabase project credentials, and administrator credentials are configured in GitHub Actions and the Cloudflare Worker. They are not editable from this public static site.</p>
      <p>Set the production site origin to <code>https://promptaveros.github.io</code> and the base path to <code>ROOT</code> when configuring an organization Pages repository.</p>
      <Link className="button-secondary" href="/admin/seo/">SEO &amp; publishing</Link>
    </section>
  </main>;
}
