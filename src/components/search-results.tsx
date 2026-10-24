"use client";

import { useEffect, useState } from "react";
import { PromptBrowser } from "@/components/prompt-browser";
import { toPromptSummary, type Prompt } from "@/lib/content";

export function SearchResults({ prompts, categories, styles }: { prompts: Prompt[]; categories: string[]; styles: string[] }) {
  const [query, setQuery] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    requestAnimationFrame(() => setQuery(params.get("q") ?? ""));
  }, []);
  return <><p className="notice">Results for <strong>{query || "all prompts"}</strong>. Search matches titles, descriptions, categories, and styles.</p><PromptBrowser key={query} prompts={prompts.map(toPromptSummary)} categoryOptions={categories} styleOptions={styles} initialQuery={query} /></>;
}
