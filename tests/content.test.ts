import test from "node:test";
import assert from "node:assert/strict";
import demoPrompts from "../src/data/prompts.demo.json";

test("demonstration prompts have unique slugs and complete display data", () => {
  const slugs = demoPrompts.map((prompt) => prompt.slug);
  assert.equal(new Set(slugs).size, slugs.length, "prompt slugs should be unique");
  for (const prompt of demoPrompts) {
    assert.match(prompt.slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(prompt.title.trim());
    assert.ok(prompt.description.trim());
    assert.ok(prompt.promptText.trim().length >= 10);
    assert.ok(prompt.imageAlt.trim());
    assert.ok(prompt.categorySlug.trim());
    assert.ok(prompt.styles.length > 0);
  }
});

test("demonstration categories have stable slugs", () => {
  const categories = new Map(demoPrompts.map((prompt) => [prompt.category, prompt.categorySlug]));
  assert.equal(categories.size, new Set(demoPrompts.map((prompt) => prompt.category)).size);
  for (const slug of categories.values()) assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
});
