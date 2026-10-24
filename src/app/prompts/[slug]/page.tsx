import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PromptCard } from "@/components/prompt-card";
import { PromptDetailActions } from "@/components/prompt-detail-actions";
import { getPrompt, prompts, toPromptSummary } from "@/lib/content";
import { canonicalUrl } from "@/lib/site";
import { PreviewImage } from "@/components/preview-image";

export function generateStaticParams() {
  return prompts.map((prompt) => ({ slug: prompt.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const prompt = getPrompt(slug);
  if (!prompt) return { title: "Prompt not found" };
  return {
    title: prompt.seoTitle || prompt.title,
    description: prompt.metaDescription || prompt.description,
    alternates: { canonical: canonicalUrl(`/prompts/${prompt.slug}/`) },
    robots: prompt.robotsIndex === false ? { index: false, follow: true } : undefined,
    openGraph: { type: "article", title: prompt.title, description: prompt.description, images: [prompt.imageUrl] },
  };
}

export default async function PromptDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const prompt = getPrompt(slug);
  if (!prompt) notFound();
  const related = prompts.filter((item) => item.slug !== prompt.slug && (item.category === prompt.category || item.styles.some((style) => prompt.styles.includes(style)))).slice(0, 3);
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CreativeWork",
    name: prompt.title,
    description: prompt.description,
    image: prompt.imageUrl,
    datePublished: prompt.publishedAt,
    url: canonicalUrl(`/prompts/${prompt.slug}/`),
  };
  return <main className="page-main container">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    <nav className="breadcrumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><Link href="/prompts/">Prompts</Link><span>/</span><span>{prompt.title}</span></nav>
    <div className="detail-layout">
      <div><PreviewImage className="detail-image" src={prompt.imageUrl} alt={prompt.imageAlt} width={1200} height={900} /><div className="notice" style={{ marginTop: 13 }}>{prompt.isDemo ? "Demonstration sample: this content illustrates the site and should be replaced with original published material." : "Example imagery is provided as creative reference; generated results vary by tool and settings."}</div></div>
      <article className="detail-copy">
        <div className="prompt-meta"><Link href={`/categories/${prompt.categorySlug}/`}>{prompt.category}</Link>{prompt.styles.map((style) => <span key={style}>{style}</span>)}</div>
        <h1>{prompt.title}</h1><p>{prompt.description}</p>
        <div className="prompt-text" id="prompt-text">{prompt.promptText}</div>
        <PromptDetailActions promptText={prompt.promptText} />
        <div className="detail-facts"><div className="fact"><span>Suggested aspect ratio</span><strong>{prompt.aspectRatio}</strong></div><div className="fact"><span>Published</span><strong>{new Date(`${prompt.publishedAt}T00:00:00`).toLocaleDateString("en", { dateStyle: "medium" })}</strong></div></div>
        <h2>Make it your own</h2><p>{prompt.tips}</p>
        <p className="notice">This example is a creative starting point, not a claim of testing on a specific image generator. Adjust details to suit your tool and intent.</p>
      </article>
    </div>
    {related.length > 0 && <section className="section"><div className="section-heading"><div><span className="eyebrow">Keep exploring</span><h2>Related prompts</h2></div><Link className="link-arrow" href="/prompts/">View the library <ArrowLeft size={15} /></Link></div><div className="prompt-grid">{related.map((item) => <PromptCard key={item.id} prompt={toPromptSummary(item)} />)}</div></section>}
  </main>;
}
