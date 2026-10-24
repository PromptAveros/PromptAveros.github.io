import { createClient } from "@supabase/supabase-js";
import { loadEnvConfig } from "@next/env";
import demoPrompts from "../src/data/prompts.demo.json";

async function main() {
  loadEnvConfig(process.cwd());
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding demo records.");
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  for (const prompt of demoPrompts) {
    const { data: category, error: categoryError } = await supabase.from("categories")
      .upsert({ name: prompt.category, slug: prompt.categorySlug, description: `Demonstration category: ${prompt.category}.` }, { onConflict: "slug" })
      .select("id")
      .single();
    if (categoryError) throw categoryError;
    const { data: saved, error: promptError } = await supabase.from("prompts").upsert({
      title: prompt.title,
      slug: prompt.slug,
      description: prompt.description,
      prompt_text: prompt.promptText,
      image_url: prompt.imageUrl,
      image_alt: prompt.imageAlt,
      category_id: category.id,
      styles: prompt.styles,
      aspect_ratio: prompt.aspectRatio,
      customization_tips: prompt.tips,
      featured: prompt.featured,
      status: "published",
      is_demo: true,
      published_at: `${prompt.publishedAt}T00:00:00.000Z`,
    }, { onConflict: "slug", ignoreDuplicates: true }).select("id").maybeSingle();
    if (promptError) throw promptError;
    if (saved) console.info(`Seeded demonstration prompt: ${prompt.slug}`);
    for (const style of prompt.styles) {
      const styleSlug = style.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      const { data: row, error: styleError } = await supabase.from("styles").upsert({ name: style, slug: styleSlug }, { onConflict: "slug" }).select("id").single();
      if (styleError) throw styleError;
      const { data: target, error: targetError } = await supabase.from("prompts").select("id").eq("slug", prompt.slug).single();
      if (targetError) throw targetError;
      const { error: relationError } = await supabase.from("prompt_styles").upsert({ prompt_id: target.id, style_id: row.id });
      if (relationError) throw relationError;
    }
  }
}
void main().then(() => console.info("Demo seed complete. Each inserted prompt is marked as demonstration content.")).catch((error: unknown) => {
  console.error("Demo seed failed", error);
  process.exitCode = 1;
});
