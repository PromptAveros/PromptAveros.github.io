import type { Metadata } from "next";
import { PromptCard } from "@/components/prompt-card";
import { prompts, toPromptSummary } from "@/lib/content";
import { canonicalUrl } from "@/lib/site";

export const metadata: Metadata = { title: "Latest Prompts", description: "See the newest additions to the PromptAvero image prompt library.", alternates: { canonical: canonicalUrl("/latest/") } };
export default function LatestPage() {
  const sorted = [...prompts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
  return <main className="page-main container"><header className="page-heading"><span className="eyebrow">Recently added</span><h1>Latest prompts</h1><p>New creative directions, ordered by publication date.</p></header><div className="prompt-grid">{sorted.map((prompt) => <PromptCard key={prompt.id} prompt={toPromptSummary(prompt)} />)}</div></main>;
}
