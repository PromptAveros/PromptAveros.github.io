import type { MetadataRoute } from "next";
import { prompts } from "@/lib/content";
import { canonicalUrl } from "@/lib/site";

export const dynamic = "force-static";

const slugify = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const base = ["", "/prompts/", "/categories/", "/styles/", "/latest/", "/trending/", "/about/", "/contact/", "/privacy/", "/terms/"];
  const detail = prompts.filter((prompt) => prompt.robotsIndex !== false).map((prompt) => `/prompts/${prompt.slug}/`);
  const categories = Array.from(new Set(prompts.map((prompt) => `/categories/${prompt.categorySlug}/`)));
  const styles = Array.from(new Set(prompts.flatMap((prompt) => prompt.styles.map((style) => `/styles/${slugify(style)}/`))));
  return [...base, ...detail, ...categories, ...styles].map((path) => ({ url: canonicalUrl(path), lastModified: new Date() }));
}
