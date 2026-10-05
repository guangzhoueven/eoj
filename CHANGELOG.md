# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Permission Groups system** — `permission_groups` + `user_permission_groups` tables (migration `0056`), 6 pre-seeded system groups, full CRUD API (`/api/v1/permission-groups`), admin UI at `/admin/permission-groups`, group-based permissions merged into `authMiddleware` and `optionalAuthMiddleware`.
- **User theme customization** — `applyUserTheme({accent, radius, font})` in `frontend/src/utils/theme.ts`; new "外观主题" settings card with live preview; user settings keys `theme_accent`, `theme_radius`, `theme_font` stored in `user_settings`.
- **`validateUrl()` validator** — blocks `javascript:` / `vbscript:` schemes on user-supplied URLs (avatar, signature links, etc.). Applied to `PUT /api/v1/users/profile`.
- **README feature & tech-stack sections** — filled previously empty stub sections with full feature inventory and 14-row tech-stack table.
- **`AGENTS.md`** — operating guide for AI assistants working on this repository.

### Changed
- **Theme rename** — `luogu` → `classic`, `hydro` → `flat` across all source, configs, and docs to remove trademark/AGPL references. Site-level `<html data-theme-style>` accepts only `default` / `classic` / `flat`.
- **De-AI-ification pass** — removed generic `#8b5cf6` / `#6366f1` gradients, button sheen pseudo-elements, hero glow effects; flattened progress bars and chart fills; tightened transitions 0.4s → 0.22s.
- **Admin UI refresh** — `Admin.css` +453 lines: dashboard headers, stat bars, form sections, log panels, tag tree select, SPJ code editor hints. `AdminCreateProblem` refactored into 4 sectioned cards. Other admin pages get themed page headers.
- **`--primary` CSS variable** — now explicitly aliased to `var(--accent)` in all 7 theme blocks (was undefined, silently falling back to indigo).
- **Route `/users/:username` → `/users/:id`** — migrated across 20 files to use numeric user id (consistent with internal schema).
- **README deployment section** — documents SSR mode + `[[send_email]]` binding + previously missing `[vars]` (e.g. `DEFAULT_FROM_EMAIL`).

### Fixed
- **Backend lint errors (31 → 0)** — removed unused imports/vars, fixed `prefer-const`, populated empty catch blocks with comments.
- **`avatar_url` XSS vector** — `PUT /profile` now rejects dangerous URL schemes via `validateUrl()`.
- **`/api/v1/__sitemap` announcements entry** — was pushing `/announcements` once per row (duplicate URLs); now pushes once.

### Removed
- Dead code: unused `sanitizeFilename` in `routes/uploads.ts`, unused `SeedTestcase` / `SeedProblem` interfaces in `seed.ts`, unused `VALID_SCORING_TYPES` / `cellStyle` / `isEnded` in `routes/contests.ts`, unused `cached` cache lookup in `routes/settings.ts`.

## [1.0.0] — Initial Stable

First tagged stable release. The codebase had reached feature completeness for:

- Problem management + async judging (7 languages)
- Contests (ACM/OI/IOI) with virtual participation and freeze windows
- Teams with sub-groups, problem sets, contests, announcements, discussions
- User blogs, solutions, discussions, training plans, problem lists
- Permission system (`user` / `admin` / `super_admin` + 5 scoped permission keys)
- SSR + CSR dual-mode rendering with graceful degradation
- i18n (zh / en, ~1695 keys each)
- Cloudflare-native deployment (Workers + D1 + R2 + KV + Email Routing)

[Unreleased]: https://github.com/wanwusangzhigit/eoj/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/wanwusangzhigit/eoj/releases/tag/v1.0.0
