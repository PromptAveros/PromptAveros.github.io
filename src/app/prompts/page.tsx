import type { Metadata } from "next";
import { PromptBrowser } from "@/components/prompt-browser";
import { categories, prompts, styles, toPromptSummary } from "@/lib/content";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = {
  title: "Explore AI Image Prompts",
  description: "Search and explore a curated library of creative image prompts by category and style.",
  alternates: { canonical: canonicalUrl("/prompts/") },
};

export default function PromptsPage() {
  return <main className="page-main container">
    <header className="page-heading"><span className="eyebrow">The prompt library</span><h1>Explore prompts</h1><p>Search ideas, refine by category or style, and find a useful starting point for your next image.</p></header>
    <PromptBrowser prompts={prompts.map(toPromptSummary)} categoryOptions={categories} styleOptions={styles} />
  </main>;
}
