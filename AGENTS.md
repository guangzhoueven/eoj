# AGENTS.md

Operating guide for AI assistants (Claude Code, opencode, Cursor, etc.) working on this repository.

## Repository Layout

```
eoj/
├── frontend/                # React 19 + Vite SPA (also SSR via entry-server.tsx)
│   ├── src/
│   │   ├── pages/           # One .tsx per route (lazy-loaded in App.tsx)
│   │   ├── pages/admin/     # Admin sub-pages (28 files, gated by <RequirePermission>)
│   │   ├── components/      # Reusable UI (24 files)
│   │   ├── api/client.ts    # Single Hono-aligned fetch wrapper; all API methods live here
│   │   ├── i18n/            # zh.ts (1813 lines) + en.ts (1793 lines); keys MUST stay 1:1
│   │   ├── styles/          # global.css + components.css (theme via [data-theme-style] + [data-theme])
│   │   ├── utils/theme.ts   # applyThemeAccent / applyUserTheme / applyCustomCss
│   │   ├── ssr/             # hydrate.ts + useSSRPage() hook
│   │   └── App.tsx          # All routes (lazy imports + <Route> elements)
│   └── config.yaml          # Site-level config consumed at build time
├── backend/                 # Hono on Cloudflare Workers
│   ├── src/
│   │   ├── routes/          # 36 route modules — every export default MUST be mounted in index.ts
│   │   ├── middleware/      # auth, audit, rateLimit, captcha
│   │   ├── utils/           # validator, helpers, rating, captcha, github-testcases/spj, plagiarism
│   │   ├── types.ts         # Shared Hono bindings, Env (D1/R2/KV), JwtPayload
│   │   ├── loaders.ts       # SSR data loaders (run on worker during SSR)
│   │   ├── ssr.ts           # Loads entry-server.js from frontend build output
│   │   └── index.ts         # Hono app composition + onError + sitemap + SSR fallback
│   ├── migrations/          # D1 SQL migrations (numbered: 0001_xxx.sql ... 0056_xxx.sql)
│   ├── public/              # Build target — populated by frontend's `npm run build:site`
│   ├── ssr/                 # Build target — populated by frontend's build:ssr
│   ├── seed.ts              # `/__seed` endpoint data
│   └── wrangler.toml        # Cloudflare Workers config (D1 binding, R2, KV, env vars)
├── judge-repo/              # Standalone GitHub Actions workflow + nsjail runner (deployed separately)
├── README.md                # User-facing deployment guide
└── CONTRIBUTING.md          # Branch policy, dev setup, worktree workflow
```

## Critical Conventions

### Naming & Files
- **Never** introduce `luogu` / `hydro` / `洛谷` / `HydroOJ` references — renamed to `classic` / `flat` for trademark/AGPL hygiene. Use only `default` / `classic` / `flat`.
- **Never** use route path `/users/:username` — was migrated to `/users/:id`. Always use the numeric id form.
- Theme presets live in `frontend/src/utils/theme.ts` — `ACCENT_PRESETS`, `RADIUS_PRESET_LIST`, `FONT_PRESET_LIST`. Site-level theme is `frontend/config.yaml: site.theme` (one of `default` / `classic` / `flat`).
- Theme CSS variables: `<html data-theme-style="default|classic|flat" data-theme="dark|light">`. Both attributes are orthogonal.
- `--primary` CSS var is intentionally aliased to `var(--accent)` in every theme block — don't define it independently.

### Permissions Model
- Roles: `user` < `admin` < `super_admin`. Super admin is **always** `users.id = 1` with `role = 'super_admin'` — never editable via API.
- Permissions array (JSON in `users.permissions`): `contest_admin` / `problem_admin` / `list_admin` / `ticket_admin` / `upload_admin`.
- Effective permissions = personal ∪ group memberships (`permission_groups` + `user_permission_groups` tables).
- Frontend gating: `<RequirePermission permission="problem_admin">…</RequirePermission>`.
- Backend gating: import `authMiddleware`, `adminMiddleware`, `superAdminMiddleware`, or `requirePermission('xxx')` from `middleware/auth.ts`.

### API Patterns
- Every backend route file: `const foo = new Hono<AppType>(); … export default foo;`.
- Every route must be mounted in `index.ts` via `api.route('/path', foo)`. New routes require an explicit mount edit.
- Error shape: `c.json({ success: false, error: { message, code } }, 400)`. Success: `c.json({ success: true, data })`.
- Body validation: ad-hoc today (no zod yet). For user-supplied URLs use `validateUrl()` from `utils/validator.ts` to block `javascript:` / `vbscript:` schemes.
- All SQL must use parameter binding (`.bind(...)` / `.first()` / `.all()`). Never interpolate user data into SQL strings. Dynamic `ORDER BY` columns must come from a hardcoded whitelist map.

### i18n
- Two language files: `frontend/src/i18n/zh.ts` and `en.ts`. Total ~1695 leaf paths each — must stay 1:1 synchronized.
- When adding a key, add it to BOTH files in the same commit.
- Use the `t('dotted.path')` hook in components (`const { t } = useTranslation()`).
- Never hardcode user-facing Chinese strings in `.tsx` — wrap them in `t()`.

### SSR
- `frontend/src/ssr/hydrate.ts` exposes `useSSRPage<T>(name)` to consume SSR-injected data inside React.
- `backend/src/loaders.ts` exports one loader per page; the loader name must match the page's `useSSRPage(name)` argument.
- `backend/wrangler.toml` controls SSR vs CSR globally via `[assets]`: `not_found_handling = "none"` + `run_worker_first = true` ⇒ SSR. `not_found_handling = "single-page-application"` ⇒ CSR.
- Failure modes are graceful: any loader throwing → CSR fallback. Never `throw` inside a loader without catching.

### Database Migrations
- Files live in `backend/migrations/` named `NNNN_description.sql` (4-digit zero-padded).
- Highest existing migration: **0056**. Next migration: **0057**.
- Always forward-only; never edit an applied migration. Add a new one.
- Apply locally: `npm run db:migrate:local --prefix backend`. Apply to prod: `npm run db:migrate:remote --prefix backend`.
- After schema changes, update `backend/src/types.ts` row interfaces (`UserRow`, `SubmissionRow`, etc.) — there is no codegen.

### Build
- `frontend/`: `npm run build:site` is the canonical production build — produces `dist/` + `dist/server/` and copies both to `backend/public/` and `backend/ssr/`.
- `backend/`: `npx wrangler deploy` after frontend build.
- Type-check before commit: `npm run typecheck --prefix backend` AND `cd frontend && npx tsc -b --noEmit`.
- Lint before commit: `npm run lint --prefix backend` AND `npm run lint --prefix frontend`.

## Common Tasks

### Adding a new page (frontend)
1. Create `frontend/src/pages/MyPage.tsx` (and `.css` if needed).
2. Add `const MyPage = lazy(() => import('./pages/MyPage'))` to `App.tsx`.
3. Add `<Route path="/my-page" element={<MyPage />} />` in `<Routes>`.
4. If it needs SSR data: write a loader in `backend/src/loaders.ts` named `myPage` and call `useSSRPage('myPage')` in the page.
5. Add i18n keys to both `zh.ts` and `en.ts`.

### Adding a new admin sub-page
1. Create `frontend/src/pages/admin/MyAdmin.tsx`.
2. Wrap its route in `<RequirePermission permission="problem_admin">…</RequirePermission>` (or whichever scope applies).
3. Add a sidebar entry in `pages/admin/AdminLayout.tsx`.
4. Add a loader only if data is needed at SSR time.

### Adding a new backend route module
1. Create `backend/src/routes/myRoute.ts` with `const myRoute = new Hono<AppType>(); … export default myRoute;`.
2. Mount in `backend/src/index.ts`: `import myRoute from './routes/myRoute'; api.route('/my-route', myRoute);`.
3. Use `authMiddleware` / `adminMiddleware` / `requirePermission('xxx')` per route.
4. If it adds a new SSR page, add a loader in `loaders.ts`.

### Adding a new permission
1. Pick a stable string key (e.g. `blog_admin`).
2. Update valid permission list in any place that enumerates permissions (search for `contest_admin` to find them — middleware/auth.ts, frontend RequirePermission, AdminPermissionGroups UI, etc.).
3. Add UI label translations to both `zh.ts` and `en.ts`.

## Quality Gates (run before declaring done)

```bash
# Type safety
npm run typecheck --prefix backend
cd frontend && npx tsc -b --noEmit && cd ..

# Lint
npm run lint --prefix backend
npm run lint --prefix frontend

# Full production build (slow — only when changing build/runtime)
cd frontend && npm run build:site && cd ..
```

Frontend lint typically surfaces `@typescript-eslint/no-explicit-any` (currently ~719 hits, known debt — `any` is allowed project-wide in practice). New code should still prefer concrete types when cheap.

## Things NOT to Do

- Don't run `git commit` / `git push` / `gh pr create` unless explicitly asked.
- Don't write comments unless explaining non-obvious logic. Code should self-document.
- Don't introduce new dependencies without first confirming the codebase already uses something similar.
- Don't edit applied migrations — add a new one instead.
- Don't reference `process.env` in `backend/src/` — Workers use `c.env` (the `Env` binding).
- Don't `console.log` user-identifying data in production paths (audit middleware hashes IPs/device fingerprints — keep that pattern).
- Don't add `target="_blank"` without `rel="noopener noreferrer"`.
- Don't introduce user-controllable URLs (`<img src>`, `<a href>`, `window.location`) without `validateUrl()`.
