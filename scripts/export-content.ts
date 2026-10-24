import { writeFile } from "node:fs/promises";
import { neon } from "@neondatabase/serverless";
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
  if (!process.env.DATABASE_URL) {
    if (process.env.REQUIRE_DATABASE === "true") throw new Error("DATABASE_URL is required for this production build.");
    await writeFile(sourceFile, JSON.stringify({ source: "demo" }, null, 2));
    await writeFile(generatedFile, "[]");
    await writePromptTextFiles(demoPrompts);
    console.warn("DATABASE_URL is not set. Exporting the clearly labeled demonstration library.");
  } else {
    if (process.env.REQUIRE_DATABASE === "true") {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
      if (!siteUrl || new URL(siteUrl).protocol !== "https:" || new URL(siteUrl).pathname !== "/" || new URL(siteUrl).search || new URL(siteUrl).hash) {
        throw new Error("Set NEXT_PUBLIC_SITE_URL to the production HTTPS origin without a path.");
      }
    }
    const sql = neon(process.env.DATABASE_URL);
    const rows = await sql`
    SELECT p.id::text, p.title, p.slug, p.description, p.prompt_text AS "promptText",
      p.image_url AS "imageUrl", p.image_alt AS "imageAlt", c.name AS category,
      c.slug AS "categorySlug", p.styles, p.featured, p.is_demo AS "isDemo",
      p.aspect_ratio AS "aspectRatio", p.customization_tips AS tips,
      p.seo_title AS "seoTitle", p.meta_description AS "metaDescription",
      p.robots_index AS "robotsIndex",
      to_char(COALESCE(p.published_at, p.created_at) AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS "publishedAt"
    FROM prompts p
    LEFT JOIN categories c ON c.id = p.category_id
    WHERE p.status = 'published'
    ORDER BY COALESCE(p.published_at, p.created_at) DESC, p.id
    `;
    const publicPrompts = rows.map((row) => ({
    id: String(row.id),
    title: String(row.title),
    slug: String(row.slug),
    description: String(row.description),
    promptText: String(row.promptText),
    imageUrl: safeImageUrl(row.imageUrl),
    imageAlt: String(row.imageAlt ?? ""),
    category: String(row.category ?? "Uncategorized"),
    categorySlug: String(row.categorySlug ?? "uncategorized"),
    styles: Array.isArray(row.styles) ? row.styles.map(String) : [],
    featured: Boolean(row.featured),
    isDemo: Boolean(row.isDemo),
    robotsIndex: Boolean(row.robotsIndex),
    aspectRatio: String(row.aspectRatio ?? "4:3"),
    tips: String(row.tips ?? ""),
    seoTitle: row.seoTitle == null ? null : String(row.seoTitle),
    metaDescription: row.metaDescription == null ? null : String(row.metaDescription),
    publishedAt: String(row.publishedAt),
    }));
    await writeFile(generatedFile, JSON.stringify(publicPrompts, null, 2));
    await writeFile(sourceFile, JSON.stringify({ source: "database" }, null, 2));
    await writePromptTextFiles(publicPrompts.map((prompt) => ({ slug: String(prompt.slug), promptText: String(prompt.promptText) })));
    console.info(`Exported ${publicPrompts.length} published prompt(s) from Neon.`);
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
