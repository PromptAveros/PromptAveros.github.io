import { createClient } from "@supabase/supabase-js";
import { Hono } from "hono";
import { z } from "zod";

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  PUBLIC_ORIGIN: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD_HASH: string;
  SESSION_SECRET: string;
  GITHUB_TOKEN?: string;
  GITHUB_REPOSITORY?: string;
  GITHUB_WORKFLOW_ID?: string;
  GITHUB_REF?: string;
};

type SessionPayload = { sid: string; email: string; exp: number; csrf: string };
type TaxonomyKind = "categories" | "styles" | "tags";
type PromptInput = z.infer<typeof promptSchema>;

const app = new Hono<{ Bindings: Bindings }>();
const encoder = new TextEncoder();
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const promptSchema = z.object({
  title: z.string().trim().min(3).max(160),
  slug: z.string().regex(slugPattern).max(180),
  description: z.string().trim().min(10).max(320),
  prompt_text: z.string().trim().min(10).max(12000),
  image_url: z.string().trim().url().max(2048).refine((value) => new URL(value).protocol === "https:", "Image URL must use HTTPS.").or(z.literal("")).optional(),
  image_alt: z.string().trim().max(240).optional().default(""),
  category: z.string().trim().min(2).max(80),
  styles: z.array(z.string().trim().min(1).max(48)).max(12).optional().default([]),
  aspect_ratio: z.string().trim().max(32).optional().default(""),
  tips: z.string().trim().max(2000).optional().default(""),
  generators: z.array(z.string().trim().min(1).max(64)).max(12).optional().default([]),
  featured: z.boolean().optional().default(false),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  seo_title: z.string().trim().max(180).optional().default(""),
  meta_description: z.string().trim().max(320).optional().default(""),
  canonical_url: z.string().trim().url().max(2048).refine((value) => new URL(value).protocol === "https:", "Canonical URL must use HTTPS.").or(z.literal("")).optional().default(""),
  og_title: z.string().trim().max(180).optional().default(""),
  og_description: z.string().trim().max(320).optional().default(""),
  og_image_url: z.string().trim().url().max(2048).refine((value) => new URL(value).protocol === "https:", "Social image URL must use HTTPS.").or(z.literal("")).optional().default(""),
  robots_index: z.boolean().optional().default(true),
  tags: z.array(z.string().trim().min(1).max(48)).max(24).optional().default([]),
  faqs: z.array(z.object({ question: z.string().trim().min(5).max(240), answer: z.string().trim().min(5).max(2000) })).max(12).optional().default([]),
}).refine((input) => new Set(input.styles).size === input.styles.length, { message: "Styles must be unique." })
  .refine((input) => new Set(input.tags).size === input.tags.length, { message: "Tags must be unique." })
  .refine((input) => new Set(input.generators).size === input.generators.length, { message: "Generators must be unique." })
  .refine((input) => slugify(input.category).length > 0, { message: "Category name must include a letter or number." });

const taxonomySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(slugPattern).max(100),
  description: z.string().trim().max(1000).optional().default(""),
  image_url: z.string().trim().url().max(2048).refine((value) => new URL(value).protocol === "https:", "Image URL must use HTTPS.").or(z.literal("")).optional().default(""),
  seo_title: z.string().trim().max(180).optional().default(""),
  meta_description: z.string().trim().max(320).optional().default(""),
  sort_order: z.number().int().min(0).max(10000).optional().default(0),
});

app.use("*", async (c, next) => {
  const contentLength = Number(c.req.header("Content-Length") ?? 0);
  if (["POST", "PUT", "PATCH"].includes(c.req.method) && contentLength > 65536) return c.json({ error: "Request body is too large." }, 413);
  const origin = c.req.header("Origin");
  if (origin && origin !== c.env.PUBLIC_ORIGIN) return c.json({ error: "Origin not allowed." }, 403);
  if (c.req.method === "OPTIONS") {
    c.header("Access-Control-Allow-Origin", c.env.PUBLIC_ORIGIN);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type,X-CSRF-Token");
    c.header("Access-Control-Max-Age", "600");
    return c.body(null, 204);
  }
  await next();
  if (origin) {
    c.header("Access-Control-Allow-Origin", c.env.PUBLIC_ORIGIN);
    c.header("Access-Control-Allow-Credentials", "true");
    c.header("Vary", "Origin");
  }
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
});

app.get("/api/health", async (c) => {
  try {
    const { error } = await supabase(c.env).from("prompts").select("id", { head: true, count: "exact" });
    if (error) throw error;
    return c.json({ status: "ok" });
  } catch (error) {
    console.error("Health database check failed", error);
    return c.json({ status: "unavailable", error: "Database check failed." }, 503);
  }
});

app.post("/api/auth/login", async (c) => {
  const parsed = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(1024) }).safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "Enter a valid email and password." }, 400);
  if (!c.env.ADMIN_EMAIL || !c.env.ADMIN_PASSWORD_HASH || !c.env.SESSION_SECRET || c.env.SESSION_SECRET.length < 32) {
    return c.json({ error: "Administrator authentication is not configured." }, 503);
  }
  try {
    const client = supabase(c.env);
    const visitor = await hash(`${c.req.header("CF-Connecting-IP") ?? "unknown"}:${c.env.SESSION_SECRET}`);
    const attempts = await rpc<number>(client, "record_login_attempt", { p_visitor_hash: visitor });
    if (attempts > 8) return c.json({ error: "Too many sign-in attempts. Try again in 15 minutes." }, 429);
    const emailMatches = parsed.data.email.toLowerCase() === c.env.ADMIN_EMAIL.toLowerCase();
    const passwordMatches = await verifyPassword(parsed.data.password, c.env.ADMIN_PASSWORD_HASH);
    if (!emailMatches || !passwordMatches) return c.json({ error: "Email or password is incorrect." }, 401);

    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 60 * 12;
    const session: SessionPayload = { sid: randomToken(), email: c.env.ADMIN_EMAIL, exp: expiresAt, csrf: randomToken() };
    await rpc(client, "create_admin_session", { p_session_id: session.sid, p_email: session.email, p_expires_at: new Date(expiresAt * 1000).toISOString() });
    const cookie = await signSession(session, c.env.SESSION_SECRET);
    return c.json({ csrfToken: session.csrf, expiresAt: session.exp }, 200, {
      "Set-Cookie": `pa_session=${cookie}; Path=/; Max-Age=43200; HttpOnly; Secure; SameSite=None`,
      "Cache-Control": "no-store",
    });
  } catch (error) {
    console.error("Administrator sign-in failed", error);
    return c.json({ error: "Sign-in service is unavailable." }, 503);
  }
});

app.get("/api/auth/session", async (c) => {
  const session = await authenticatedSession(c);
  if (!session) return c.json({ error: "Sign in to continue." }, 401, { "Cache-Control": "no-store" });
  return c.json({ email: session.email, csrfToken: session.csrf, expiresAt: session.exp }, 200, { "Cache-Control": "no-store" });
});

app.post("/api/auth/logout", async (c) => {
  const session = await authenticatedSession(c);
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  if (!validMutation(c, session)) return c.json({ error: "Invalid request origin or CSRF token." }, 403);
  try {
    await rpc(supabase(c.env), "revoke_admin_session", { p_session_id: session.sid });
    return c.json({ ok: true }, 200, { "Set-Cookie": "pa_session=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=None", "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Administrator logout failed", error);
    return c.json({ error: "Could not end this session." }, 503);
  }
});

app.get("/api/admin/prompts", async (c) => {
  if (!await authenticatedSession(c)) return c.json({ error: "Sign in to continue." }, 401);
  try {
    const prompts = await rpc<unknown[]>(supabase(c.env), "get_admin_prompts");
    return c.json({ prompts }, 200, { "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Prompt listing failed", error);
    return c.json({ error: "Could not load prompt records." }, 503);
  }
});

app.get("/api/admin/overview", async (c) => {
  if (!await authenticatedSession(c)) return c.json({ error: "Sign in to continue." }, 401);
  try {
    return c.json(await rpc(supabase(c.env), "get_admin_overview"), 200, { "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Admin overview query failed", error);
    return c.json({ error: "Could not load dashboard statistics." }, 503);
  }
});

app.get("/api/admin/taxonomies/:kind", async (c) => {
  if (!await authenticatedSession(c)) return c.json({ error: "Sign in to continue." }, 401);
  const kind = parseTaxonomyKind(c.req.param("kind"));
  if (!kind) return c.json({ error: "Unknown content type." }, 404);
  try {
    const items = await rpc<unknown[]>(supabase(c.env), "list_admin_taxonomy", { p_kind: kind });
    return c.json({ items }, 200, { "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Taxonomy listing failed", error);
    return c.json({ error: "Could not load content taxonomy." }, 503);
  }
});

app.post("/api/admin/taxonomies/:kind", async (c) => {
  const session = await authenticatedSession(c);
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  if (!validMutation(c, session)) return c.json({ error: "Invalid request origin or CSRF token." }, 403);
  const kind = parseTaxonomyKind(c.req.param("kind"));
  if (!kind) return c.json({ error: "Unknown content type." }, 404);
  const parsed = taxonomySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid content data." }, 400);
  try {
    const id = await rpc<string>(supabase(c.env), "save_admin_taxonomy", { p_kind: kind, p_input: parsed.data });
    const deployment = await triggerPublish(c.env);
    return c.json({ saved: true, id, deployment: deployment.state, error: deployment.error }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) return c.json({ error: "That name or slug is already in use." }, 409);
    console.error("Taxonomy creation failed", error);
    return c.json({ error: "Content could not be saved." }, 503);
  }
});

app.put("/api/admin/taxonomies/:kind/:id", async (c) => {
  const session = await authenticatedSession(c);
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  if (!validMutation(c, session)) return c.json({ error: "Invalid request origin or CSRF token." }, 403);
  const kind = parseTaxonomyKind(c.req.param("kind"));
  if (!kind) return c.json({ error: "Unknown content type." }, 404);
  if (!isUuid(c.req.param("id"))) return c.json({ error: "Invalid record ID." }, 400);
  const parsed = taxonomySchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid content data." }, 400);
  try {
    const id = await rpcNullable<string>(supabase(c.env), "update_admin_taxonomy", {
      p_kind: kind, p_id: c.req.param("id"), p_input: parsed.data,
    });
    if (!id) return c.json({ error: "Content record not found." }, 404);
    const deployment = await triggerPublish(c.env);
    return c.json({ saved: true, deployment: deployment.state, error: deployment.error });
  } catch (error) {
    if (isUniqueViolation(error)) return c.json({ error: "That name or slug is already in use." }, 409);
    console.error("Taxonomy update failed", error);
    return c.json({ error: "Content could not be updated." }, 503);
  }
});

app.delete("/api/admin/taxonomies/:kind/:id", async (c) => {
  const session = await authenticatedSession(c);
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  if (!validMutation(c, session)) return c.json({ error: "Invalid request origin or CSRF token." }, 403);
  const kind = parseTaxonomyKind(c.req.param("kind"));
  if (!kind) return c.json({ error: "Unknown content type." }, 404);
  if (!isUuid(c.req.param("id"))) return c.json({ error: "Invalid record ID." }, 400);
  try {
    const deleted = await rpc<boolean>(supabase(c.env), "delete_admin_taxonomy", { p_kind: kind, p_id: c.req.param("id") });
    if (!deleted) return c.json({ error: "Content record not found." }, 404);
    const deployment = await triggerPublish(c.env);
    return c.json({ deleted: true, deployment: deployment.state, error: deployment.error });
  } catch (error) {
    console.error("Taxonomy deletion failed", error);
    return c.json({ error: "Content could not be deleted. Remove linked prompts or references first." }, 409);
  }
});

app.get("/api/admin/prompts/:id", async (c) => {
  if (!await authenticatedSession(c)) return c.json({ error: "Sign in to continue." }, 401);
  if (!isUuid(c.req.param("id"))) return c.json({ error: "Invalid prompt ID." }, 400);
  try {
    const prompt = await rpcNullable<Record<string, unknown>>(supabase(c.env), "get_admin_prompt", { p_id: c.req.param("id") });
    if (!prompt) return c.json({ error: "Prompt not found." }, 404);
    return c.json({ prompt }, 200, { "Cache-Control": "no-store" });
  } catch (error) {
    console.error("Prompt read failed", error);
    return c.json({ error: "Could not load this prompt." }, 503);
  }
});

app.post("/api/admin/prompts", async (c) => {
  const session = await authenticatedSession(c);
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  if (!validMutation(c, session)) return c.json({ error: "Invalid request origin or CSRF token." }, 403);
  const parsed = promptSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid prompt data." }, 400);
  try {
    const id = await savePrompt(c.env, parsed.data);
    const deployment = await triggerPublish(c.env);
    return c.json({ saved: true, id, deployment: deployment.state, error: deployment.error }, 201);
  } catch (error) {
    if (isUniqueViolation(error)) return c.json({ error: "That slug is already in use. Choose a unique slug." }, 409);
    console.error("Prompt creation failed", error);
    return c.json({ error: "Prompt could not be saved." }, 503);
  }
});

app.put("/api/admin/prompts/:id", async (c) => {
  const session = await authenticatedSession(c);
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  if (!validMutation(c, session)) return c.json({ error: "Invalid request origin or CSRF token." }, 403);
  if (!isUuid(c.req.param("id"))) return c.json({ error: "Invalid prompt ID." }, 400);
  const parsed = promptSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? "Invalid prompt data." }, 400);
  try {
    const id = await savePrompt(c.env, parsed.data, c.req.param("id"));
    if (!id) return c.json({ error: "Prompt not found." }, 404);
    const deployment = await triggerPublish(c.env);
    return c.json({ saved: true, deployment: deployment.state, error: deployment.error });
  } catch (error) {
    if (isUniqueViolation(error)) return c.json({ error: "That slug is already in use. Choose a unique slug." }, 409);
    console.error("Prompt update failed", error);
    return c.json({ error: "Prompt could not be updated." }, 503);
  }
});

app.delete("/api/admin/prompts/:id", async (c) => {
  const session = await authenticatedSession(c);
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  if (!validMutation(c, session)) return c.json({ error: "Invalid request origin or CSRF token." }, 403);
  if (!isUuid(c.req.param("id"))) return c.json({ error: "Invalid prompt ID." }, 400);
  try {
    const deleted = await rpc<boolean>(supabase(c.env), "delete_admin_prompt", { p_id: c.req.param("id") });
    if (!deleted) return c.json({ error: "Prompt not found." }, 404);
    const deployment = await triggerPublish(c.env);
    return c.json({ deleted: true, deployment: deployment.state, error: deployment.error });
  } catch (error) {
    console.error("Prompt deletion failed", error);
    return c.json({ error: "Prompt could not be deleted." }, 503);
  }
});

app.get("/api/admin/publishing", async (c) => {
  if (!await authenticatedSession(c)) return c.json({ error: "Sign in to continue." }, 401);
  const config = publishingConfig(c.env);
  if (!config) return c.json({ state: "not_configured", error: "GitHub publishing is not fully configured." });
  try {
    const response = await fetch(`https://api.github.com/repos/${config.repository}/actions/workflows/${encodeURIComponent(config.workflow)}/runs?branch=${encodeURIComponent(config.ref)}&per_page=1`, {
      headers: { Authorization: `Bearer ${c.env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "PromptAvero-Publisher" },
    });
    if (!response.ok) return c.json({ state: "unknown", error: `Could not read workflow status (${response.status}).` }, 503);
    const result = await response.json() as { workflow_runs?: Array<{ status: string; conclusion: string | null; html_url: string; updated_at: string }> };
    const run = result.workflow_runs?.[0];
    if (!run) return c.json({ state: "unknown", message: "No publishing run is available yet." });
    return c.json({ state: run.status === "completed" ? run.conclusion ?? "unknown" : run.status, url: run.html_url, updatedAt: run.updated_at });
  } catch (error) {
    console.error("Publishing status lookup failed", error);
    return c.json({ state: "unknown", error: "Could not contact GitHub Actions." }, 503);
  }
});

app.post("/api/admin/publish", async (c) => {
  const session = await authenticatedSession(c);
  if (!session) return c.json({ error: "Sign in to continue." }, 401);
  if (!validMutation(c, session)) return c.json({ error: "Invalid request origin or CSRF token." }, 403);
  const deployment = await triggerPublish(c.env);
  return c.json({ deployment: deployment.state, error: deployment.error });
});

app.notFound((c) => c.json({ error: "Endpoint not found." }, 404));
app.onError((error, c) => {
  console.error("Unhandled API error", error);
  return c.json({ error: "The API could not complete the request." }, 500);
});

async function savePrompt(env: Bindings, input: PromptInput, promptId?: string) {
  return rpcNullable<string>(supabase(env), "save_admin_prompt", { p_input: input, p_id: promptId ?? null });
}

function supabase(env: Bindings) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase URL and service-role key are required.");
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

async function rpc<T = unknown>(client: ReturnType<typeof supabase>, name: string, args?: Record<string, unknown>): Promise<T> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  if (data === null) throw new Error(`Supabase function ${name} returned no data.`);
  return data as T;
}

async function rpcNullable<T>(client: ReturnType<typeof supabase>, name: string, args?: Record<string, unknown>): Promise<T | null> {
  const { data, error } = await client.rpc(name, args);
  if (error) throw error;
  return data as T | null;
}

function parseTaxonomyKind(value: string): TaxonomyKind | null {
  return value === "categories" || value === "styles" || value === "tags" ? value : null;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function isUniqueViolation(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "23505";
}

function randomToken() {
  return base64Url(crypto.getRandomValues(new Uint8Array(32)));
}

function base64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}

function fromBase64Url(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const binary = atob(normalized + "=".repeat((4 - (normalized.length % 4)) % 4));
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function signSession(payload: SessionPayload, secret: string) {
  const body = base64Url(encoder.encode(JSON.stringify(payload)));
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `${body}.${base64Url(new Uint8Array(signature))}`;
}

async function readSession(cookieHeader: string | undefined, secret: string) {
  if (!cookieHeader || !secret || secret.length < 32) return null;
  const token = cookieHeader.split(";").map((item) => item.trim()).find((item) => item.startsWith("pa_session="))?.slice("pa_session=".length);
  if (!token) return null;
  const [body, encodedSignature] = token.split(".");
  if (!body || !encodedSignature) return null;
  try {
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, fromBase64Url(encodedSignature), encoder.encode(body));
    if (!valid) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(body))) as SessionPayload;
    if (payload.exp < Date.now() / 1000 || typeof payload.sid !== "string" || typeof payload.csrf !== "string" || typeof payload.email !== "string") return null;
    return payload;
  } catch {
    return null;
  }
}

function validMutation(c: { req: { header(name: string): string | undefined }; env: Bindings }, session: SessionPayload) {
  return c.req.header("Origin") === c.env.PUBLIC_ORIGIN && c.req.header("X-CSRF-Token") === session.csrf;
}

async function authenticatedSession(c: { req: { header(name: string): string | undefined }; env: Bindings }) {
  const session = await readSession(c.req.header("Cookie"), c.env.SESSION_SECRET);
  if (!session) return null;
  try {
    return await rpc<boolean>(supabase(c.env), "is_admin_session_active", { p_session_id: session.sid }) ? session : null;
  } catch (error) {
    console.error("Session verification failed", error);
    throw error;
  }
}

async function verifyPassword(password: string, stored: string) {
  const [scheme, iterationValue, saltHex, expectedHex] = stored.split("$");
  const iterations = Number(iterationValue);
  if (scheme !== "pbkdf2" || !Number.isInteger(iterations) || iterations < 100000 || iterations > 600000 || !saltHex || !expectedHex) return false;
  try {
    const passwordKey = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
    const actual = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt: hexToBytes(saltHex), iterations, hash: "SHA-256" }, passwordKey, 256));
    const expected = hexToBytes(expectedHex);
    if (actual.length !== expected.length) return false;
    let mismatch = 0;
    for (let index = 0; index < actual.length; index++) mismatch |= actual[index] ^ expected[index];
    return mismatch === 0;
  } catch {
    return false;
  }
}

function hexToBytes(value: string) {
  if (!/^(?:[0-9a-f]{2})+$/i.test(value)) throw new Error("Invalid hex value.");
  return Uint8Array.from(value.match(/.{2}/g) ?? [], (byte) => Number.parseInt(byte, 16));
}

async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function triggerPublish(env: Bindings): Promise<{ state: "queued" | "failed" | "not_configured"; error?: string }> {
  const config = publishingConfig(env);
  if (!env.GITHUB_TOKEN || !config) return { state: "not_configured", error: "GitHub publishing is not fully configured." };
  try {
    const response = await fetch(`https://api.github.com/repos/${config.repository}/actions/workflows/${encodeURIComponent(config.workflow)}/dispatches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.GITHUB_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "PromptAvero-Publisher" },
      body: JSON.stringify({ ref: config.ref }),
    });
    if (!response.ok) {
      console.error("Publishing workflow dispatch rejected", response.status);
      return { state: "failed", error: `GitHub rejected the publishing trigger (${response.status}).` };
    }
    return { state: "queued" };
  } catch (error) {
    console.error("Publishing workflow dispatch failed", error);
    return { state: "failed", error: "Could not contact GitHub Actions." };
  }
}

function publishingConfig(env: Bindings) {
  const repository = env.GITHUB_REPOSITORY ?? "";
  const workflow = env.GITHUB_WORKFLOW_ID ?? "";
  const ref = env.GITHUB_REF ?? "main";
  if (!env.GITHUB_TOKEN || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) || !/^(?:[A-Za-z0-9_.-]+\.ya?ml|\d+)$/.test(workflow) || !/^[A-Za-z0-9._/-]+$/.test(ref) || ref.includes("..")) return null;
  return { repository, workflow, ref };
}

export default app;
