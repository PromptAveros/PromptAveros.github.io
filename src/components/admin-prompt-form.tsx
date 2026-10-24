"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminRequest, getAdminSession, type Session } from "@/lib/admin-client";

type Values = { title: string; slug: string; description: string; prompt_text: string; image_url: string; image_alt: string; category: string; styles: string; aspect_ratio: string; tips: string; generators: string; tags: string; faqs: string; seo_title: string; meta_description: string; canonical_url: string; og_title: string; og_description: string; og_image_url: string; robots_index: boolean; featured: boolean; status: "draft" | "published" | "archived" };
const empty: Values = { title: "", slug: "", description: "", prompt_text: "", image_url: "", image_alt: "", category: "", styles: "", aspect_ratio: "", tips: "", generators: "", tags: "", faqs: "", seo_title: "", meta_description: "", canonical_url: "", og_title: "", og_description: "", og_image_url: "", robots_index: true, featured: false, status: "draft" };

export function AdminPromptForm({ editing = false }: { editing?: boolean }) {
  const [session, setSession] = useState<Session | null>(null);
  const [values, setValues] = useState<Values>(empty);
  const [slugManual, setSlugManual] = useState(false);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    let active = true;
    const promptId = new URLSearchParams(window.location.search).get("id");
    getAdminSession().then((authenticated) => {
      if (!active) return;
      setSession(authenticated);
      sessionStorage.setItem("promptavero-csrf", authenticated.csrfToken);
      if (editing) {
        if (!promptId) throw new Error("Prompt ID is missing from the edit link.");
        return adminRequest<{ prompt: Partial<Values> & { faqs?: Array<{ question: string; answer: string }> } }>(`/api/admin/prompts/${encodeURIComponent(promptId)}`, authenticated).then(({ prompt }) => {
          if (active) {
            setValues({
              ...empty,
              ...prompt,
              styles: Array.isArray(prompt.styles) ? prompt.styles.join(", ") : "",
              tags: Array.isArray(prompt.tags) ? prompt.tags.join(", ") : "",
              generators: Array.isArray(prompt.generators) ? prompt.generators.join(", ") : "",
              faqs: prompt.faqs?.map((faq) => `${faq.question} | ${faq.answer}`).join("\n") ?? "",
              featured: Boolean(prompt.featured),
              robots_index: prompt.robots_index !== false,
            } as Values);
            setLoaded(true);
          }
        });
      }
      setLoaded(true);
    }).catch((cause: unknown) => setMessage(cause instanceof Error ? cause.message : "Sign in to continue."));
    return () => { active = false; };
  }, [editing]);

  function update<K extends keyof Values>(key: K, value: Values[K]) {
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  function slugify(value: string) { return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, ""); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!session) return;
    setMessage("");
    setBusy(true);
    const promptId = new URLSearchParams(window.location.search).get("id");
    const payload = {
      ...values,
      styles: splitList(values.styles),
      tags: splitList(values.tags),
      generators: splitList(values.generators),
      faqs: values.faqs.split("\n").map((line) => {
        const [question, ...answer] = line.split("|");
        return { question: question?.trim() ?? "", answer: answer.join("|").trim() };
      }).filter((faq) => faq.question && faq.answer),
    };
    try {
      const result = editing
        ? await adminRequest<{ deployment: string; error?: string }>(`/api/admin/prompts/${encodeURIComponent(promptId ?? "")}`, session, { method: "PUT", body: JSON.stringify(payload) })
        : await adminRequest<{ deployment: string; error?: string }>("/api/admin/prompts", session, { method: "POST", body: JSON.stringify(payload) });
      setMessage(result.error ? `Saved, but the static rebuild could not be triggered: ${result.error}` : `Saved. Static publishing state: ${result.deployment}.`);
      if (!editing) window.setTimeout(() => router.push("/admin/prompts/"), 1100);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Could not save the prompt.");
    } finally {
      setBusy(false);
    }
  }

  return <main className="container admin-shell"><div className="admin-bar"><div><span className="eyebrow">Private workspace</span><h1>{editing ? "Edit prompt" : "Add a prompt"}</h1></div><Link className="button-secondary" href="/admin/prompts/">Back to prompts</Link></div>
    <form className="admin-panel form-stack" onSubmit={submit}>
      <div className="form-field"><label htmlFor="title">Title *</label><input id="title" required maxLength={160} value={values.title} onChange={(event) => { update("title", event.target.value); if (!slugManual) update("slug", slugify(event.target.value)); }} /></div>
      <div className="form-field"><label htmlFor="slug">Slug *</label><input id="slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" value={values.slug} onChange={(event) => { setSlugManual(true); update("slug", event.target.value); }} /><small>Lowercase letters, numbers, and hyphens.</small></div>
      <div className="form-field"><label htmlFor="description">Short description *</label><textarea id="description" required maxLength={320} value={values.description} onChange={(event) => update("description", event.target.value)} /></div>
      <div className="form-field"><label htmlFor="prompt_text">Full prompt *</label><textarea id="prompt_text" required minLength={10} value={values.prompt_text} onChange={(event) => update("prompt_text", event.target.value)} /></div>
      <div className="form-field"><label htmlFor="image_url">Preview image URL</label><input id="image_url" type="url" value={values.image_url} onChange={(event) => update("image_url", event.target.value)} /></div>
      <div className="form-field"><label htmlFor="image_alt">Image alternative text</label><input id="image_alt" value={values.image_alt} maxLength={240} onChange={(event) => update("image_alt", event.target.value)} /></div>
      <div className="form-field"><label htmlFor="category">Category *</label><input id="category" required value={values.category} onChange={(event) => update("category", event.target.value)} placeholder="AI Portraits" /></div>
      <div className="form-field"><label htmlFor="styles">Styles</label><input id="styles" value={values.styles} onChange={(event) => update("styles", event.target.value)} placeholder="Cinematic, Photorealistic" /><small>Separate styles with commas.</small></div>
      <div className="form-field"><label htmlFor="aspect_ratio">Suggested aspect ratio</label><input id="aspect_ratio" value={values.aspect_ratio} onChange={(event) => update("aspect_ratio", event.target.value)} placeholder="4:5" /></div>
      <div className="form-field"><label htmlFor="tips">Customization guidance</label><textarea id="tips" value={values.tips} onChange={(event) => update("tips", event.target.value)} /></div>
      <div className="form-field"><label htmlFor="generators">Verified compatible generators</label><input id="generators" value={values.generators} onChange={(event) => update("generators", event.target.value)} placeholder="Only list generators this prompt was checked with" /><small>Only name a generator after compatibility has been verified.</small></div>
      <div className="form-field"><label htmlFor="tags">Tags</label><input id="tags" value={values.tags} onChange={(event) => update("tags", event.target.value)} placeholder="portrait, natural light" /><small>Separate with commas.</small></div>
      <div className="form-field"><label htmlFor="faqs">Useful FAQs</label><textarea id="faqs" value={values.faqs} onChange={(event) => update("faqs", event.target.value)} placeholder={"How can I change the mood? | Adjust the light and palette.\nUse one question and answer per line, separated by |."} /></div>
      <h2>Search and sharing</h2>
      <div className="form-field"><label htmlFor="seo_title">SEO title</label><input id="seo_title" maxLength={180} value={values.seo_title} onChange={(event) => update("seo_title", event.target.value)} /></div>
      <div className="form-field"><label htmlFor="meta_description">Meta description</label><textarea id="meta_description" maxLength={320} value={values.meta_description} onChange={(event) => update("meta_description", event.target.value)} /></div>
      <div className="form-field"><label htmlFor="canonical_url">Canonical URL override</label><input id="canonical_url" type="url" placeholder="Optional HTTPS URL" value={values.canonical_url} onChange={(event) => update("canonical_url", event.target.value)} /></div>
      <div className="form-field"><label htmlFor="og_title">Social sharing title</label><input id="og_title" maxLength={180} value={values.og_title} onChange={(event) => update("og_title", event.target.value)} /></div>
      <div className="form-field"><label htmlFor="og_description">Social sharing description</label><textarea id="og_description" maxLength={320} value={values.og_description} onChange={(event) => update("og_description", event.target.value)} /></div>
      <div className="form-field"><label htmlFor="og_image_url">Social preview image URL</label><input id="og_image_url" type="url" value={values.og_image_url} onChange={(event) => update("og_image_url", event.target.value)} /></div>
      <label><input type="checkbox" checked={values.robots_index} onChange={(event) => update("robots_index", event.target.checked)} /> Allow search engines to index this page</label>
      <div className="form-field"><label htmlFor="status">Publishing status</label><select id="status" value={values.status} onChange={(event) => update("status", event.target.value as Values["status"])}><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
      <label><input type="checkbox" checked={values.featured} onChange={(event) => update("featured", event.target.checked)} /> Featured selection</label>
      {message && <p role="status" className={message.includes("could not") || message.includes("failed") || message.includes("missing") ? "form-error" : "notice"}>{message}</p>}
      {!loaded && !message && <p aria-live="polite">Checking administrator session and prompt data…</p>}
      <button className="button-primary" type="submit" disabled={!session || !loaded || busy}>{busy ? "Saving…" : "Save prompt"}</button>
    </form>
  </main>;
}

function splitList(value: string) {
  return Array.from(new Set(value.split(",").map((item) => item.trim()).filter(Boolean)));
}
