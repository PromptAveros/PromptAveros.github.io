"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowUpRight, Check, Copy, Sparkles } from "lucide-react";
import type { PromptSummary } from "@/lib/content";
import { siteBasePath } from "@/lib/site";
import { PreviewImage } from "@/components/preview-image";

export function PromptCard({ prompt }: { prompt: PromptSummary }) {
  const [message, setMessage] = useState("");

  async function copyPrompt() {
    try {
      const response = await fetch(`${siteBasePath}/prompt-content/${encodeURIComponent(prompt.slug)}.json`);
      if (!response.ok) throw new Error("Prompt text could not be loaded.");
      const data = await response.json() as { promptText?: string };
      if (!data.promptText) throw new Error("Prompt text is unavailable.");
      try {
        await navigator.clipboard.writeText(data.promptText);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = data.promptText;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.append(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Clipboard permission was denied.");
      }
    } catch {
      setMessage("Could not copy. Open the prompt to select its text.");
      window.setTimeout(() => setMessage(""), 3500);
      return;
    }
    setMessage("Prompt copied to clipboard.");
    window.setTimeout(() => setMessage(""), 2500);
  }

  return (
    <article className="prompt-card">
      <Link className="prompt-image" href={`/prompts/${prompt.slug}/`} aria-label={`View ${prompt.title}`}>
        <PreviewImage src={prompt.imageUrl} alt={prompt.imageAlt} width={800} height={600} />
        {prompt.featured && <span className="featured-pill"><Sparkles size={12} /> Featured</span>}
      </Link>
      <div className="prompt-card-body">
        <div className="prompt-meta"><span>{prompt.category}</span><span>{prompt.styles[0]}</span></div>
        {prompt.isDemo && <span className="sample-label">Demonstration sample</span>}
        <Link className="prompt-title" href={`/prompts/${prompt.slug}/`}>{prompt.title}</Link>
        <p className="prompt-description">{prompt.description}</p>
        <div className="card-actions">
          <button className="button-copy" type="button" onClick={copyPrompt}>
            {message === "Prompt copied to clipboard." ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
            {message === "Prompt copied to clipboard." ? "Copied" : "Copy prompt"}
          </button>
          <Link className="card-view" href={`/prompts/${prompt.slug}/`}>Details <ArrowUpRight size={14} /></Link>
        </div>
        <span className="sr-only" role="status" aria-live="polite">{message}</span>
      </div>
    </article>
  );
}
