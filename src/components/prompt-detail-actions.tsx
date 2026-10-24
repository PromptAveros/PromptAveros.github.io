"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

export function PromptDetailActions({ promptText }: { promptText: string }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [shareState, setShareState] = useState("");

  async function copy(text: string, mode: "prompt" | "share") {
    try {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.append(textarea);
        textarea.select();
        const copied = document.execCommand("copy");
        textarea.remove();
        if (!copied) throw new Error("Clipboard permission was denied.");
      }
      if (mode === "prompt") {
        setCopyState("copied");
        window.setTimeout(() => setCopyState("idle"), 2200);
      } else {
        setShareState("Link copied");
        window.setTimeout(() => setShareState(""), 2200);
      }
    } catch {
      if (mode === "prompt") setCopyState("error");
      else setShareState("Copy was blocked");
    }
  }

  return <div className="detail-actions">
    <button className="button-primary" type="button" onClick={() => copy(promptText, "prompt")}>
      {copyState === "copied" ? <Check size={16} /> : <Copy size={16} />}
      {copyState === "copied" ? "Copied!" : copyState === "error" ? "Select text above to copy" : "Copy prompt"}
    </button>
    <button className="button-secondary" type="button" onClick={() => copy(window.location.href, "share")}><Share2 size={16} /> {shareState || "Copy page link"}</button>
    <span className="sr-only" role="status" aria-live="polite">{copyState === "copied" ? "Prompt copied to clipboard." : copyState === "error" ? "Clipboard unavailable. Select the prompt text above." : shareState}</span>
  </div>;
}
