import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "SEO and Publishing", robots: { index: false, follow: false } };

export default function AdminSeoPage() {
  return <main className="container admin-shell">
    <div className="admin-bar"><div><span className="eyebrow">Publishing</span><h1>SEO &amp; publishing</h1></div><Link className="button-secondary" href="/admin/">Dashboard</Link></div>
    <section className="admin-panel">
      <h2>Prompt metadata</h2>
      <p>Edit SEO title, meta description, canonical URL, social sharing metadata, indexing preference, FAQs, tags, and verified generator names in each prompt.</p>
      <Link className="button-primary" href="/admin/prompts/">Manage prompts</Link>
    </section>
    <section className="admin-panel admin-info-panel">
      <h2>Static publication workflow</h2>
      <p>Publishing changes trigger the configured GitHub Actions workflow to rebuild the static site. A queued workflow is not proof that deployment succeeded; check the run in GitHub Actions.</p>
      <p>The production sitemap and robots file are generated during the build from the configured site origin and published content.</p>
    </section>
  </main>;
}
