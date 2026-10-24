import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { PromptCard } from "@/components/prompt-card";
import { PreviewImage } from "@/components/preview-image";
import { SearchBox } from "@/components/search-box";
import { categories, prompts, styles, toPromptSummary } from "@/lib/content";
import type { Metadata } from "next";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: canonicalUrl("/") },
};

const categoryImages: Record<string, string> = {
  "AI Portraits": "photo-1534528741775-53994a69daeb",
  "Cinematic Photography": "photo-1519608487953-e999c86e7455",
  "Fantasy Art": "photo-1470252649378-9c29740c9fa8",
  "Product Photography": "photo-1547514701-42782101795e",
  "Architecture & Interiors": "photo-1616486338812-3dadae4b4ace",
  "3D Art & Renderings": "photo-1534081333815-ae5019106622",
  "Nature & Landscapes": "photo-1500382017468-9049fed747ef",
  "Anime & Illustration": "photo-1519682337058-a94d519337bc",
};

export default function Home() {
  const featured = prompts.filter((prompt) => prompt.featured).slice(0, 3);
  const latest = [...prompts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, 3);
  return <main>
    <section className="hero">
      <div className="container hero-grid">
        <div>
          <span className="eyebrow"><span className="eyebrow-dot" /> A library for your next big idea</span>
          <h1>Find the perfect <span>AI image prompt.</span></h1>
          <p className="hero-copy">Explore creative prompts, discover inspiring styles, and turn your ideas into extraordinary AI-generated images.</p>
          <SearchBox hero />
          <div className="hero-links"><Link className="text-link" href="/prompts/">Explore prompts <ArrowRight size={14} /></Link><Link className="text-link" href="/categories/">Browse categories <ArrowUpRight size={14} /></Link></div>
        </div>
        <div className="hero-art" aria-label="A collection of creative image inspirations">
          <div className="hero-art-main"><PreviewImage src="https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=88" alt="Sunlit mountain landscape beneath a wide open sky" priority width={1000} height={1200} /></div>
          <div className="hero-art-float one"><PreviewImage src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=650&q=85" alt="Expressive portrait in natural light" width={500} height={500} /></div>
          <div className="hero-art-float two"><PreviewImage src="https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=650&q=85" alt="Bright citrus still life" width={500} height={500} /></div>
          <div className="art-note">Make the idea yours<span>Start with a prompt, then explore.</span></div>
        </div>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <div className="section-heading"><div><span className="eyebrow">Start exploring</span><h2>Find your kind of inspiration</h2><p>Browse ideas by the image you have in mind.</p></div><Link className="link-arrow" href="/categories/">All categories <ArrowRight size={15} /></Link></div>
        <div className="category-grid">{categories.slice(0, 8).map((name) => <Link className="category-card" key={name} href={`/categories/${prompts.find((item) => item.category === name)?.categorySlug}/`}><PreviewImage src={`https://images.unsplash.com/${categoryImages[name] ?? "photo-1500530855697-b586d89ba3ee"}?auto=format&fit=crop&w=650&q=80`} alt="" width={650} height={430} /><strong>{name}</strong></Link>)}</div>
      </div>
    </section>

    <section className="section section-muted">
      <div className="container">
        <div className="section-heading"><div><span className="eyebrow">Thoughtfully selected</span><h2>Featured prompts</h2><p>A few starting points worth spending time with.</p></div><Link className="link-arrow" href="/prompts/">Explore all prompts <ArrowRight size={15} /></Link></div>
        <div className="prompt-grid">{featured.map((prompt) => <PromptCard key={prompt.id} prompt={toPromptSummary(prompt)} />)}</div>
      </div>
    </section>

    <section className="section">
      <div className="container">
        <div className="section-heading"><div><span className="eyebrow">Freshly added</span><h2>Latest ideas</h2><p>New creative directions, ready for your own interpretation.</p></div><Link className="link-arrow" href="/latest/">See the latest <ArrowRight size={15} /></Link></div>
        <div className="prompt-grid">{latest.map((prompt) => <PromptCard key={prompt.id} prompt={toPromptSummary(prompt)} />)}</div>
      </div>
    </section>

    <section className="section section-muted">
      <div className="container">
        <div className="section-heading"><div><span className="eyebrow">Explore a mood</span><h2>Browse by style</h2><p>Choose a visual language to guide your next creation.</p></div><Link className="link-arrow" href="/styles/">All styles <ArrowRight size={15} /></Link></div>
        <div className="style-list">{styles.map((style) => <Link className="style-chip" key={style} href={`/styles/${style.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}/`}>{style}</Link>)}</div>
      </div>
    </section>

    <section className="section"><div className="container"><div className="cta-panel"><div><h2>Your next visual idea starts here.</h2><p>Browse a growing collection and make every prompt your own.</p></div><Link className="button-light" href="/prompts/">Explore prompts <ArrowRight size={16} /></Link></div></div></section>
  </main>;
}
