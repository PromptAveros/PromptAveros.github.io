import { neon } from "@neondatabase/serverless";
import { loadEnvConfig } from "@next/env";
import demoPrompts from "../src/data/prompts.demo.json";

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.DATABASE_URL) throw new Error("Set DATABASE_URL before seeding demo records.");
  const sql = neon(process.env.DATABASE_URL);

  for (const prompt of demoPrompts) {
    const [category] = await sql`
    INSERT INTO categories (name, slug, description)
    VALUES (${prompt.category}, ${prompt.categorySlug}, ${`Demonstration category: ${prompt.category}.`})
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id
    `;
    const [saved] = await sql`
    INSERT INTO prompts (title, slug, description, prompt_text, image_url, image_alt, category_id,
      styles, aspect_ratio, customization_tips, featured, status, is_demo, published_at)
    VALUES (${prompt.title}, ${prompt.slug}, ${prompt.description}, ${prompt.promptText}, ${prompt.imageUrl},
      ${prompt.imageAlt}, ${category.id}, ${prompt.styles}, ${prompt.aspectRatio}, ${prompt.tips},
      ${prompt.featured}, 'published', true, ${prompt.publishedAt}::date)
    ON CONFLICT (slug) DO NOTHING
    RETURNING id::text
    `;
    if (saved) console.info(`Seeded demonstration prompt: ${prompt.slug}`);
    for (const style of prompt.styles) {
      const styleSlug = style.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const [row] = await sql`INSERT INTO styles (name, slug) VALUES (${style}, ${styleSlug}) ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name RETURNING id`;
      const [target] = await sql`SELECT id FROM prompts WHERE slug = ${prompt.slug}`;
      await sql`INSERT INTO prompt_styles (prompt_id, style_id) VALUES (${target.id}, ${row.id}) ON CONFLICT DO NOTHING`;
    }
  }
}
void main().then(() => console.info("Demo seed complete. Each inserted prompt is marked as demonstration content.")).catch((error: unknown) => {
  console.error("Demo seed failed", error);
  process.exitCode = 1;
});
