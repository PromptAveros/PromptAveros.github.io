"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { PromptSummary } from "@/lib/content";
import { PromptCard } from "@/components/prompt-card";

export function PromptBrowser({ prompts, categoryOptions, styleOptions, initialQuery = "" }: {
  prompts: PromptSummary[];
  categoryOptions: string[];
  styleOptions: string[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState("");
  const [style, setStyle] = useState("");
  const [sort, setSort] = useState("newest");
  const [visibleCount, setVisibleCount] = useState(9);
  const filtered = useMemo(() => prompts
    .filter((prompt) => !category || prompt.category === category)
    .filter((prompt) => !style || prompt.styles.includes(style))
    .filter((prompt) => !query || `${prompt.title} ${prompt.description} ${prompt.category} ${prompt.styles.join(" ")}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sort === "oldest" ? a.publishedAt.localeCompare(b.publishedAt) : sort === "featured" ? Number(b.featured) - Number(a.featured) : b.publishedAt.localeCompare(a.publishedAt)), [prompts, category, style, query, sort]);

  return <>
    <div className="toolbar" role="search">
      <label className="search-field"><Search aria-hidden="true" /><span className="sr-only">Search prompts</span><input value={query} onChange={(event) => { setQuery(event.target.value); setVisibleCount(9); }} placeholder="Search ideas, moods, or subjects…" /></label>
      <select className="filter-select" aria-label="Filter by category" value={category} onChange={(event) => { setCategory(event.target.value); setVisibleCount(9); }}>
        <option value="">All categories</option>{categoryOptions.map((item) => <option key={item}>{item}</option>)}
      </select>
      <select className="filter-select" aria-label="Filter by style" value={style} onChange={(event) => { setStyle(event.target.value); setVisibleCount(9); }}>
        <option value="">All styles</option>{styleOptions.map((item) => <option key={item}>{item}</option>)}
      </select>
      <select className="filter-select" aria-label="Sort prompts" value={sort} onChange={(event) => { setSort(event.target.value); setVisibleCount(9); }}>
        <option value="newest">Newest</option><option value="oldest">Oldest</option><option value="featured">Featured</option>
      </select>
      {(query || category || style) && <button className="button-secondary" type="button" onClick={() => { setQuery(""); setCategory(""); setStyle(""); setVisibleCount(9); }}>Clear filters</button>}
    </div>
    {filtered.length > 0
      ? <><div className="prompt-grid">{filtered.slice(0, visibleCount).map((prompt) => <PromptCard key={prompt.id} prompt={prompt} />)}</div>{filtered.length > visibleCount && <div className="load-more"><button className="button-secondary" type="button" onClick={() => setVisibleCount((count) => count + 9)}>Show more prompts <span>({filtered.length - visibleCount} remaining)</span></button></div>}</>
      : <div className="empty-state"><strong>No prompts found.</strong><br />Try another search or clear your filters.</div>}
  </>;
}
