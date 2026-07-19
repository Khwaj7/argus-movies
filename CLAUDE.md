# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm run dev` — start the Vite dev server with HMR
- `npm run build` — type-check (`tsc -b`) then produce a production build in `dist/`
- `npm run lint` — run Oxlint (config in `.oxlintrc.json`)
- `npm run preview` — serve the built `dist/` locally

There is no test suite or test runner configured.

## Environment

Requires a `.env.local` with three Vite-exposed variables (all client-side, prefixed `VITE_`):
- `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` — consumed in `src/lib/supabase.ts`; the module throws on import if either is missing.
- `VITE_TMDB_API_KEY` — consumed in `src/lib/tmdb.ts`; TMDB calls throw at call time if unset.

## Architecture

Iris is a small React 19 + TypeScript + Vite single-page app: a shared movie watchlist ("À voir" / "Vus") backed by Supabase, enriched with metadata from TMDB. There is no router and no backend of its own — the two `src/lib` modules are the only integration boundaries.

**Data model.** A single Supabase table `movies` (row shape = `Movie` type in `src/lib/supabase.ts`). Categories are stored as French genre labels; `tmdb_id` links a row back to TMDB and may be null on legacy rows.

**State & realtime.** `App` is the single source of truth: it loads all movies once, then subscribes to a Supabase `postgres_changes` channel and merges INSERT/UPDATE events via `upsertMovie`. Writes are optimistic — local state updates first, then the Supabase call; on error the previous value is restored (see `toggleSeen`). Because our own writes echo back over the realtime channel, `upsertMovie` dedupes by `id`.

**Navigation is state, not routes.** `App` conditionally renders one of three views from local state: `NamePrompt` (no username), `MovieDetail` (a `selectedId` is set), or the list. The detail view reads its movie out of the live `movies` array by id so realtime updates stay in sync.

**Identity.** No auth. A username is picked once via `NamePrompt` and persisted in `localStorage` under `argus-username`; it is stored on each row as `added_by`.

**TMDB layer (`src/lib/tmdb.ts`).** Wraps the TMDB v3 REST API, always requesting `language=fr-FR`. Key conventions:
- `primaryCategory` picks a movie's single category from `genre_ids` — TMDB returns genres by relevance, so the first known id wins. `CATEGORY_NAMES` maps genre ids to the French labels used throughout the UI.
- `getMovieDetails` uses `append_to_response=credits,watch/providers` to fetch cast and providers in one request.
- `findTmdbId` is a fallback that resolves a `tmdb_id` by title/year search for rows saved before `tmdb_id` was stored.
- Image/URL helpers (`posterUrl`, `providerLogoUrl`, `profileUrl`) build `image.tmdb.org` paths at fixed widths.

## Conventions

- **UI language is French** — all user-facing strings are in French. Match this when adding UI.
- Search inputs are debounced (300 ms) with a `cancelled` flag to drop stale/out-of-order responses; reuse this pattern (see `AddMovieForm`) for any new async-on-input feature.
- Most of the app lives in `src/App.tsx` (all list/search/card components) and `src/MovieDetail.tsx`. Prefer keeping integration logic in `src/lib`.
