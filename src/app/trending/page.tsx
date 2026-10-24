import type { Metadata } from "next";
import { PromptCard } from "@/components/prompt-card";
import { prompts, toPromptSummary } from "@/lib/content";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Editor's Picks", description: "Explore an editorial selection of image prompts. Selection is not based on live usage statistics.", alternates: { canonical: canonicalUrl("/trending/") } };
export default function TrendingPage() {
  const selected = prompts.filter((prompt) => prompt.featured);
  return <main className="page-main container"><header className="page-heading"><span className="eyebrow">Editorial selection</span><h1>Trending inspiration</h1><p>This is an editorial selection, not a popularity ranking. We do not yet have enough verified usage data to report real-time trends.</p></header><div className="prompt-grid">{selected.map((prompt) => <PromptCard key={prompt.id} prompt={toPromptSummary(prompt)} />)}</div></main>;
}
