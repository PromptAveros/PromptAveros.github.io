import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Media Guidance", robots: { index: false, follow: false } };

export default function AdminMediaPage() {
  return <main className="container admin-shell">
    <div className="admin-bar"><div><span className="eyebrow">Content management</span><h1>Media</h1></div><Link className="button-secondary" href="/admin/">Dashboard</Link></div>
    <section className="admin-panel">
      <h2>Use an image URL</h2>
      <p>Image uploads are not configured. Add a publicly accessible HTTPS image URL and descriptive alt text when creating or editing a prompt.</p>
      <p>Use a host where you have permission to publish the image. The site does not proxy, store, or transform uploaded files.</p>
      <Link className="button-primary" href="/admin/prompts/">Manage prompt images</Link>
    </section>
  </main>;
}
