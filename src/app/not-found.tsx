import Link from "next/link";

export default function NotFound() {
  return <main className="page-main container"><div className="empty-state"><span className="eyebrow">404 · Not found</span><h1>This prompt seems to have wandered off.</h1><p>The page may have moved or the link may be out of date.</p><Link className="button-primary" href="/prompts/">Explore prompts</Link></div></main>;
}
