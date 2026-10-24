# PromptAvero

PromptAvero is a static-first AI image prompt library. The public site is exported by Next.js and hosted on GitHub Pages. A separately deployed Cloudflare Worker provides the private prompt-management API and connects to Supabase.

**The public site is deployed at https://promptaveros.github.io.** Supabase and the Cloudflare Worker are not configured yet, so the site currently uses clearly labeled demonstration records from `src/data/prompts.demo.json`.

## Included

- Responsive home, prompt library, search, category, style, latest, editorial selection, detail, about, contact, privacy, terms, sitemap, robots, and 404 pages.
- Static prompt detail pages with individual metadata and structured data.
- Search/filtering by title, description, category, and style. The browser receives lightweight prompt summaries; full prompt text is fetched only when copying and is present on the corresponding detail page.
- Light/dark theme, keyboard-accessible mobile navigation, clipboard feedback and fallback.
- Supabase schema/RPC migration, idempotent demonstration seed, and database-to-static content export.
- Cloudflare Worker API with server-verified admin login, PBKDF2 password verification, HTTP-only signed session cookie, CSRF token and origin checks, login throttling, Zod validation, protected prompt and taxonomy CRUD, dashboard statistics, and a restricted GitHub Actions publishing trigger/status endpoint.
- GitHub Actions CI and Pages deployment workflows.

The admin includes prompt, category, style, and tag management, plus media, SEO, and deployment-settings guidance pages. Prompt editing includes FAQs, tags, verified generator names, and SEO/social metadata. Media upload, scheduled publishing, and in-dashboard editing of deployment secrets/settings are not implemented. The privacy, terms, and contact pages are starter text and need review before public launch. The API and database workflows have not been connected to external accounts in this workspace.

## Local preview

Requirements: Node.js 24 and npm.

```powershell
npm ci
npm run dev
```

With no Supabase project configured, `npm run dev` and `npm run build` show demonstration content. The export script creates local, ignored files under `public/prompt-content/` for the copy action. Do not treat this content as a production library.

Run quality checks:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Supabase setup and content

1. Create a Supabase project and copy its project URL and service-role key from **Project Settings → API**.
2. Copy `.env.example` to `.env.local` and set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. `.env.local` is ignored by Git. Keep the service-role key server-side; never add it to a `NEXT_PUBLIC_*` variable.
3. Open `supabase/migrations/20261024000000_promptavero.sql` in the Supabase SQL Editor and run the complete migration. It creates the schema, enables row-level security, restricts table/RPC access to `service_role`, and installs the transactional admin RPCs.
4. Optionally seed the clearly marked demo records:

   ```powershell
   npm run db:seed
   ```

   Existing prompt slugs are not overwritten. Remove demo content through the admin only after your own content is ready.
5. Build with both Supabase variables set. The exporter reads only published prompts and writes public content and copy-text files. Drafts and administrative fields are not exported. The generated `public/prompt-content/` directory is ignored by Git and recreated on each export.

## Backend and administrator

The Worker lives in `backend/` and uses the Supabase REST API with its service-role key. It does not run on GitHub Pages.

1. Create a Cloudflare account and authenticate the Wrangler CLI (`npx wrangler login`).
2. Set `SUPABASE_URL` and `PUBLIC_ORIGIN` as Worker variables. Store `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET` as Worker secrets. Do not put these secrets in `NEXT_PUBLIC_*` variables.
3. Generate a password hash locally (password entry is visible in the terminal prompt):

   ```powershell
   npm run admin:hash
   ```

   Use a unique password of at least 14 characters. Store only the resulting `pbkdf2$...` string in `ADMIN_PASSWORD_HASH`. Generate a cryptographically random `SESSION_SECRET` of at least 32 characters.
4. Configure publishing values in the Worker: `GITHUB_REPOSITORY`, `GITHUB_WORKFLOW_ID=deploy-pages.yml`, and `GITHUB_REF=main`. Create a fine-grained GitHub token limited to this repository with Actions write permission and metadata read access, then store it as `GITHUB_TOKEN`.
5. From the project root, deploy the Worker:

   ```powershell
   npm run api:deploy
   ```

   Set the site build variable `NEXT_PUBLIC_API_URL` to the Worker HTTPS origin. Set `PUBLIC_ORIGIN` to the browser-visible site origin (scheme and host only, no project path).
6. Use a custom domain where possible, e.g. `example.com` for Pages and `api.example.com` for the Worker. Although the API cookie is `Secure`, `HttpOnly`, and `SameSite=None`, browsers may block third-party cookies when the Pages origin and a `workers.dev` API are unrelated sites. Same-site custom domains are the recommended admin setup.

The API rejects other browser origins, verifies the session and CSRF token on every mutation, and checks authorization independently of the static `/admin/` page. There is no public signup. The configured single administrator is held in Worker environment variables; the `admin_users` table is reserved for future account management and is not used for login.

## GitHub Pages and publishing

1. Create and push to the `PromptAveros/PromptAveros.github.io` organization repository, then enable GitHub Pages with **GitHub Actions** as the source. The default production origin and base path are `https://promptaveros.github.io` and `ROOT`.
2. Configure the GitHub Actions environment named `github-pages` (the environment used by the deployment workflow) with:
   - Variable `SUPABASE_URL`: Supabase project URL.
   - Secret `SUPABASE_SERVICE_ROLE_KEY`: server-side service-role key used only by the trusted build to export published content.
   - Secret `SUPABASE_SERVICE_ROLE_KEY`: the Supabase service-role key, used only during the trusted build.
   - Secret `GITHUB_TOKEN` belongs in the Worker secret store, **not** the Pages workflow.
   - Variable `PUBLIC_SITE_URL`: HTTPS origin only; defaults to `https://promptaveros.github.io`.
   - Variable `PUBLIC_API_URL`: deployed Worker API origin.
   - Variable `NEXT_PUBLIC_BASE_PATH`: `ROOT` for `PromptAveros.github.io`; set `/<repository>` only for a project Pages URL.
3. Push to `main`, or dispatch `Build and deploy static site`. That workflow fetches published Supabase content when the Supabase URL and key are configured, runs lint/type/test checks, creates the static export, and publishes `out/` to Pages. Until configured, it publishes the clearly labeled demo library.
4. For Search Console/Bing, verify the configured production domain and submit its generated `sitemap.xml`. On a project Pages path, configure the production site URL and base path consistently.

When an admin saves, publishes, unpublishes, or deletes a prompt, the Supabase RPC commits the prompt and its relations atomically, then the API requests the fixed, allow-listed `deploy-pages.yml` workflow on the configured branch. The dashboard distinguishes a failed trigger from a queued run and can retry. It can read the latest workflow run when GitHub credentials have Actions read access. A queued trigger is not represented as a completed deployment; check the linked workflow to verify success.

## Environment variable map

See `.env.example` for placeholder-only values. `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_PATH`, and `NEXT_PUBLIC_API_URL` are intentionally public build configuration. `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, and `GITHUB_TOKEN` must remain server-side. Never expose a Supabase service-role key, admin hash, session secret, or GitHub token to browser code or a GitHub Pages artifact.

## Validation and deployment limits

`npm run lint`, `npm run typecheck`, `npm test`, and a static `npm run build` validate the local source. They do not verify a real Supabase project, deployed Worker, cross-site cookie behavior, GitHub token scope, or live deployment. Without Supabase credentials, the Pages workflow publishes the clearly marked demonstration library. Add `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the `github-pages` environment to export published Supabase content instead.

The current demo images use Unsplash image URLs and are not claims of prompt-generated results. Check licensing, attribution requirements, image stability, the legal templates, accessibility, and the production domain before launch. The sitemap intentionally omits `/admin`, search queries, and non-indexable prompt detail pages.
