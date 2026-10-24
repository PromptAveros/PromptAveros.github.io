import type { Metadata } from "next";
import { SearchResults } from "@/components/search-results";
import { categories, prompts, styles } from "@/lib/content";

export const metadata: Metadata = { title: "Search Prompts", description: "Search the PromptAvero library for image prompt ideas.", robots: { index: false, follow: true } };
export default function SearchPage() {
  return <main className="page-main container"><header className="page-heading"><span className="eyebrow">Find your next idea</span><h1>Search prompts</h1><p>Search titles, descriptions, prompt text, categories, and styles.</p></header><SearchResults prompts={prompts} categories={categories} styles={styles} /></main>;
}
