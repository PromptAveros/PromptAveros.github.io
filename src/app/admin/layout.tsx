import Link from "next/link";

const links = [
  ["Overview", "/admin/"],
  ["Prompts", "/admin/prompts/"],
  ["Categories", "/admin/categories/"],
  ["Styles", "/admin/styles/"],
  ["Tags", "/admin/tags/"],
  ["Media", "/admin/media/"],
  ["SEO", "/admin/seo/"],
  ["Settings", "/admin/settings/"],
] as const;

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <>
    <nav className="container admin-navigation" aria-label="Admin navigation">
      {links.map(([label, href]) => <Link href={href} key={href}>{label}</Link>)}
      <Link href="/admin/login/">Sign in</Link>
    </nav>
    {children}
  </>;
}
