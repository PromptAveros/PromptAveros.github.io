import { writeFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import demoPrompts from "../src/data/prompts.demo.json";

const generatedFile = new URL("../src/data/prompts.generated.json", import.meta.url);
const sourceFile = new URL("../src/data/content-source.json", import.meta.url);
const promptTextDirectory = new URL("../public/prompt-content/", import.meta.url);

async function writePromptTextFiles(rows: Array<{ slug: string; promptText: string }>) {
  const { mkdir, readdir, unlink } = await import("node:fs/promises");
  await mkdir(promptTextDirectory, { recursive: true });
  for (const name of await readdir(promptTextDirectory)) {
    if (/^[a-z0-9-]+\.json$/.test(name)) await unlink(new URL(name, promptTextDirectory));
  }
  await Promise.all(rows.map(({ slug, promptText }) => writeFile(new URL(`${slug}.json`, promptTextDirectory), JSON.stringify({ promptText }))));
}

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    if (process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Set both SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
    await writeFile(sourceFile, JSON.stringify({ source: "demo" }, null, 2));
    await writeFile(generatedFile, "[]");
    await writePromptTextFiles(demoPrompts);
    console.warn("Supabase is not configured. Exporting the clearly labeled demonstration library.");
  } else {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (siteUrl && (new URL(siteUrl).protocol !== "https:" || new URL(siteUrl).pathname !== "/" || new URL(siteUrl).search || new URL(siteUrl).hash)) {
      throw new Error("Set NEXT_PUBLIC_SITE_URL to the production HTTPS origin without a path.");
    }
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const { data: rows, error } = await supabase.from("prompts")
      .select("id,title,slug,description,prompt_text,image_url,image_alt,styles,featured,is_demo,aspect_ratio,customization_tips,seo_title,meta_description,robots_index,published_at,created_at,category:categories(name,slug)")
      .eq("status", "published")
      .order("published_at", { ascending: false, nullsFirst: false })
      .order("id", { ascending: true });
    if (error) throw error;
    const publicPrompts = (rows ?? []).map((row) => {
      const category = Array.isArray(row.category) ? row.category[0] : row.category;
      return {
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    description: String(row.description),
    promptText: String(row.prompt_text),
    imageUrl: safeImageUrl(row.image_url),
    imageAlt: String(row.image_alt ?? ""),
    category: String(category?.name ?? "Uncategorized"),
    categorySlug: String(category?.slug ?? "uncategorized"),
    styles: Array.isArray(row.styles) ? row.styles.map(String) : [],
    featured: Boolean(row.featured),
    isDemo: Boolean(row.is_demo),
    robotsIndex: Boolean(row.robots_index),
    aspectRatio: String(row.aspect_ratio ?? "4:3"),
    tips: String(row.customization_tips ?? ""),
    seoTitle: row.seo_title == null ? null : String(row.seo_title),
    metaDescription: row.meta_description == null ? null : String(row.meta_description),
    publishedAt: String(row.published_at ?? row.created_at).slice(0, 10),
      };
    });
    await writeFile(generatedFile, JSON.stringify(publicPrompts, null, 2));
    const hasPublishedPrompts = publicPrompts.length > 0;
    await writeFile(sourceFile, JSON.stringify({ source: hasPublishedPrompts ? "database" : "demo" }, null, 2));
    await writePromptTextFiles(hasPublishedPrompts
      ? publicPrompts.map((prompt) => ({ slug: String(prompt.slug), promptText: String(prompt.promptText) }))
      : demoPrompts);
    if (hasPublishedPrompts) {
      console.info(`Exported ${publicPrompts.length} published prompt(s) from Supabase.`);
    } else {
      console.warn("Supabase has no published prompts. Exporting the clearly labeled demonstration library.");
    }
  }
}

function safeImageUrl(value: unknown) {
  if (typeof value !== "string" || !value) return "/prompt-placeholder.svg";
  try {
    return new URL(value).protocol === "https:" ? value : "/prompt-placeholder.svg";
  } catch {
    return "/prompt-placeholder.svg";
  }
}

void main().catch((error: unknown) => {
  console.error("Content export failed", error);
  process.exitCode = 1;
});
