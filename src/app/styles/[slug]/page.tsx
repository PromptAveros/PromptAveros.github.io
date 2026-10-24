import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PromptCard } from "@/components/prompt-card";
import { prompts } from "@/lib/content";
import { canonicalUrl } from "@/lib/site";

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const styles = Array.from(new Set(prompts.flatMap((prompt) => prompt.styles)));
export function generateStaticParams() { return styles.map((style) => ({ slug: slugify(style) })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const style = styles.find((item) => slugify(item) === slug);
  return style ? { title: `${style} Prompts`, description: `Explore image prompt ideas in the ${style.toLowerCase()} style.`, alternates: { canonical: canonicalUrl(`/styles/${slug}/`) } } : { title: "Style not found" };
}
export default async function StylePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const style = styles.find((item) => slugify(item) === slug);
  const items = prompts.filter((prompt) => prompt.styles.some((item) => slugify(item) === slug));
  if (!style || !items.length) notFound();
  return <main className="page-main container"><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/styles/">Styles</Link><span>/</span><span>{style}</span></nav><header className="page-heading"><span className="eyebrow">Browse style</span><h1>{style} prompts</h1><p>Creative directions and useful starting points in the {style.toLowerCase()} visual style.</p></header><div className="prompt-grid">{items.map((prompt) => <PromptCard key={prompt.id} prompt={prompt} />)}</div></main>;
}
