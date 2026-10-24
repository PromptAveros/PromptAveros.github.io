import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PromptCard } from "@/components/prompt-card";
import { prompts, toPromptSummary } from "@/lib/content";
import { canonicalUrl } from "@/lib/site";

const categories = Array.from(new Map(prompts.map((prompt) => [prompt.categorySlug, prompt.category])).entries());
export function generateStaticParams() { return categories.map(([slug]) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const category = categories.find(([categorySlug]) => categorySlug === slug)?.[1];
  return category ? { title: `${category} Prompts`, description: `Discover creative AI image prompt ideas for ${category.toLowerCase()}.`, alternates: { canonical: canonicalUrl(`/categories/${slug}/`) } } : { title: "Category not found" };
}

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const category = categories.find(([categorySlug]) => categorySlug === slug)?.[1];
  const items = prompts.filter((prompt) => prompt.categorySlug === slug);
  if (!category || !items.length) notFound();
  const jsonLd = { "@context": "https://schema.org", "@type": "CollectionPage", name: `${category} Prompts`, description: `Discover creative AI image prompt ideas for ${category.toLowerCase()}.`, mainEntity: { "@type": "ItemList", itemListElement: items.map((prompt, index) => ({ "@type": "ListItem", position: index + 1, url: canonicalUrl(`/prompts/${prompt.slug}/`) })) } };
  return <main className="page-main container"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} /><nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/categories/">Categories</Link><span>/</span><span>{category}</span></nav><header className="page-heading"><span className="eyebrow">Browse category</span><h1>{category}</h1><p>A collection of visual prompts to spark new directions in {category.toLowerCase()}.</p></header><div className="prompt-grid">{items.map((prompt) => <PromptCard key={prompt.id} prompt={toPromptSummary(prompt)} />)}</div></main>;
}
