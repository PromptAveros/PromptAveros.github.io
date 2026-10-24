# PromptAvero

PromptAvero is a static-first AI image prompt library. The public site is exported by Next.js and can be hosted on GitHub Pages. A separately deployed Cloudflare Worker provides the private prompt-management API and connects to Neon PostgreSQL.

**This repository is source code, not a deployed service.** No Neon project, Cloudflare Worker, GitHub Pages site, administrator, or publishing credential has been configured or verified here. A fresh local build clearly labels and uses the demonstration records in `src/data/prompts.demo.json`.

## Included

- Responsive home, prompt library, search, category, style, latest, editorial selection, detail, about, contact, privacy, terms, sitemap, robots, and 404 pages.
- Static prompt detail pages with individual metadata and structured data.
- Search/filtering by title, description, category, and style. The browser receives lightweight prompt summaries; full prompt text is fetched only when copying and is present on the corresponding detail page.
- Light/dark theme, keyboard-accessible mobile navigation, clipboard feedback and fallback.
- Neon schema and migration, idempotent demonstration seed, and database-to-static content export.
- Cloudflare Worker API with server-verified admin login, PBKDF2 password verification, HTTP-only signed session cookie, CSRF token and origin checks, login throttling, Zod validation, protected prompt and taxonomy CRUD, dashboard statistics, and a restricted GitHub Actions publishing trigger/status endpoint.
- GitHub Actions CI, Pages deployment, and manual database migration workflows.

The admin includes prompt, category, style, and tag management, plus media, SEO, and deployment-settings guidance pages. Prompt editing includes FAQs, tags, verified generator names, and SEO/social metadata. Media upload, scheduled publishing, and in-dashboard editing of deployment secrets/settings are not implemented. The privacy, terms, and contact pages are starter text and need review before public launch. The API and database workflows have not been connected to external accounts in this workspace.

## Local preview

Requirements: Node.js 24 and npm.

```powershell
npm ci
npm run dev
```

With no database configured, `npm run dev` and `npm run build` show demonstration content. The export script creates local, ignored files under `public/prompt-content/` for the copy action. Do not treat this content as a production library.

Run quality checks:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

## Neon setup and content

1. Create a Neon PostgreSQL project.
2. Put its **pooled** connection string in `DATABASE_URL`; optionally set the direct/unpooled connection as `DIRECT_URL` for migrations.
3. Copy `.env.example` to `.env.local` and set local values. `.env.local` is ignored by Git.
4. Apply the versioned SQL migration and optionally add the marked demo records:

   ```powershell
   npm run db:migrate
   npm run db:seed
   ```

   The migration command is safe to re-run; the seed inserts demonstration prompts only when their slugs do not exist. It does not overwrite administrator-edited records.
5. Build with `DATABASE_URL` set. The exporter reads only `published` prompts, writes compact published content to `src/data/prompts.generated.json`, labels its source, and creates public prompt-text files for copy actions. Drafts and administrative fields are not exported. The generated `public/prompt-content/` directory is ignored by Git and recreated on each export.

The local exporter uses `DATABASE_URL`; the migration command prefers `DIRECT_URL`. Keep both server-side. The frontend receives only content intentionally published for the public site.

## Backend and administrator

The Worker lives in `backend/` and uses Neon directly through the serverless parameterized SQL client. It does not run on GitHub Pages.

1. Create a Cloudflare account and authenticate the Wrangler CLI (`npx wrangler login`).
2. Set the Worker variables/secrets. Use a stable HTTPS frontend origin in `PUBLIC_ORIGIN`. Put `DATABASE_URL`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH`, and `SESSION_SECRET` in the Worker secret store. Do not put them in `NEXT_PUBLIC_*` variables.
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

The API rejects other browser origins, verifies the session and CSRF token on every mutation, and checks authorization independently of the static `/admin/` page. There is no public signup. The configured single administrator is held in Worker environment variables; `admin_users` is present in the schema for future account management but is not used for login.

## GitHub Pages and publishing

1. Create and push to the `PromptAveros/PromptAveros.github.io` organization repository, then enable GitHub Pages with **GitHub Actions** as the source. The default production origin and base path are `https://promptaveros.github.io` and `ROOT`.
2. Configure the `production` environment secrets and repository variables:
   - Secret `DATABASE_URL`: Neon pooled connection string used only by the trusted deployment build.
   - Secret `GITHUB_TOKEN` belongs in the Worker secret store, **not** the Pages workflow.
   - Variable `PUBLIC_SITE_URL`: HTTPS origin only; defaults to `https://promptaveros.github.io`.
   - Variable `PUBLIC_API_URL`: deployed Worker API origin.
   - Variable `NEXT_PUBLIC_BASE_PATH`: `ROOT` for `PromptAveros.github.io`; set `/<repository>` only for a project Pages URL.
3. Add `DATABASE_URL` as a secret to the GitHub `production` environment for the manual `Apply database migrations` workflow. Review and run that workflow to apply migrations; it is separate from public deployment.
4. Push to `main`, or dispatch `Build and deploy static site`. That workflow fetches published Neon content at build time, runs lint/type/test checks, creates the static export, and publishes `out/` to Pages.
5. For Search Console/Bing, verify the configured production domain and submit its generated `sitemap.xml`. On a project Pages path, configure the production site URL and base path consistently.

When an admin saves, publishes, unpublishes, or deletes a prompt, the API commits the database change and then requests the fixed, allow-listed `deploy-pages.yml` workflow on the configured branch. The dashboard distinguishes a failed trigger from a queued run and can retry. It can read the latest workflow run when GitHub credentials have Actions read access. A queued trigger is not represented as a completed deployment; check the linked workflow to verify success.

## Environment variable map

See `.env.example` for placeholder-only values. `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_BASE_PATH`, and `NEXT_PUBLIC_API_URL` are intentionally public build configuration. `DATABASE_URL`, `DIRECT_URL`, `ADMIN_PASSWORD_HASH`, `SESSION_SECRET`, and `GITHUB_TOKEN` must remain server-side. Never expose a Neon URL, admin hash, session secret, or GitHub token to browser code or a GitHub Pages artifact.

## Validation and deployment limits

`npm run lint`, `npm run typecheck`, `npm test`, and a static `npm run build` validate the local source. They do not verify a real Neon database, deployed Worker, cross-site cookie behavior, GitHub token scope, Pages URL, or live deployment. Those require the manual external account setup above. Without `DATABASE_URL`, the Pages workflow publishes the clearly marked demonstration library; add the `DATABASE_URL` secret to the `github-pages` environment to export published database content instead.

The current demo images use Unsplash image URLs and are not claims of prompt-generated results. Check licensing, attribution requirements, image stability, the legal templates, accessibility, and the production domain before launch. The sitemap intentionally omits `/admin`, search queries, and non-indexable prompt detail pages.
