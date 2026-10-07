import type { MediaType } from './media'
import { frenchTvStatus } from './media'

const apiKey = import.meta.env.VITE_TMDB_API_KEY

// TMDB's raw shapes are deliberately private: films carry title/release_date,
// series carry name/first_air_date, and every consumer would otherwise have to
// narrow between the two. Everything below normalises before it leaves here.
type RawSearchItem = {
  id: number
  media_type?: string
  title?: string
  name?: string
  release_date?: string | null
  first_air_date?: string | null
  poster_path: string | null
  genre_ids?: number[]
}

type RawDetails = {
  id: number
  title?: string
  name?: string
  overview: string
  poster_path: string | null
  release_date?: string | null
  first_air_date?: string | null
  genres: { id: number; name: string }[]
  credits: { cast: TmdbCastMember[] }
  'watch/providers': {
    results: Record<
      string,
      {
        flatrate?: TmdbWatchProvider[]
        rent?: TmdbWatchProvider[]
        buy?: TmdbWatchProvider[]
      }
    >
  }
  // tv only
  number_of_seasons?: number
  number_of_episodes?: number
  status?: string
}

export type TmdbCastMember = {
  id: number
  name: string
  character: string
  profile_path: string | null
}

export type TmdbWatchProvider = {
  provider_id: number
  provider_name: string
  logo_path: string
}

// Where a title can be watched in France, split by what it costs. TMDB lists
// the same platform under several ids (Prime Video has four), so a platform
// that appears in both lists is reported as included only.
export type WatchOffers = {
  // Watchable at no extra cost — a subscription you already have.
  flatrate: TmdbWatchProvider[]
  // Needs a rental or a purchase on top.
  paid: TmdbWatchProvider[]
}

// A search hit, normalised. `id` is a TMDB id, unique only WITHIN its
// mediaType — TMDB numbers films and series in separate namespaces that
// overlap, so never compare or key on it without the mediaType alongside.
export type MediaSearchResult = {
  id: number
  mediaType: MediaType
  title: string
  year: number | null
  posterPath: string | null
  genreIds: number[]
}

export type MediaDetails = {
  id: number
  mediaType: MediaType
  title: string
  overview: string
  posterPath: string | null
  year: number | null
  genres: { id: number; name: string }[]
  cast: TmdbCastMember[]
  // Already filtered to France and deduplicated by platform.
  providers: WatchOffers
  // Series only; null for films.
  seasonCount: number | null
  episodeCount: number | null
  // Already translated; null when TMDB reports a status we don't know.
  status: string | null
}

// Genre ids with their French labels, covering BOTH of TMDB's genre lists —
// films and series use different id sets that partially overlap.
//
// Four series ids are deliberately aliased onto the film label that means the
// same thing (10759→Action, 10762→Familial, 10765→Science-Fiction,
// 10768→Guerre), so the category vocabulary and colours are identical across
// the films and series lists rather than gaining near-duplicate labels like
// "Action" vs "Action & Aventure". Where two ids share a label, categoryColor
// below resolves to the lower id. These labels are also already persisted in
// the `category` column, so changing them would strand existing rows.
//
// We supply our own French rather than TMDB's because TMDB returns several of
// its series genres untranslated ("Kids", "News", "Reality", "Soap", "Talk").
export const CATEGORY_NAMES: Record<number, string> = {
  28: 'Action',
  12: 'Aventure',
  16: 'Animation',
  35: 'Comédie',
  80: 'Crime',
  99: 'Documentaire',
  18: 'Drame',
  10751: 'Familial',
  14: 'Fantastique',
  36: 'Histoire',
  27: 'Horreur',
  10402: 'Musique',
  9648: 'Mystère',
  10749: 'Romance',
  878: 'Science-Fiction',
  10770: 'Téléfilm',
  53: 'Thriller',
  10752: 'Guerre',
  37: 'Western',
  // Series genres.
  10759: 'Action', // Action & Adventure
  10762: 'Familial', // Kids
  10765: 'Science-Fiction', // Sci-Fi & Fantasy
  10768: 'Guerre', // War & Politics
  10763: 'Actualités', // News
  10764: 'Télé-réalité', // Reality
  10766: 'Feuilleton', // Soap
  10767: 'Talk-show', // Talk
}

// A distinct colour per genre, used to frame cards with the colours of their
// themes. Aliased series ids reuse their film counterpart's colour so the
// shared pill looks the same whatever it holds.
//
// genreThemes needs an id to be present in BOTH this record and
// CATEGORY_NAMES: an id in only one silently disappears from the UI.
export const CATEGORY_COLORS: Record<number, string> = {
  28: '#e04b4b', // Action
  12: '#e08a3c', // Aventure
  16: '#d94f9c', // Animation
  35: '#e6b800', // Comédie
  80: '#7a5c99', // Crime
  99: '#3f9e8a', // Documentaire
  18: '#5b7fd0', // Drame
  10751: '#5fb85f', // Familial
  14: '#9b59b6', // Fantastique
  36: '#a0785a', // Histoire
  27: '#b02a2a', // Horreur
  10402: '#d94fd9', // Musique
  9648: '#5f76a0', // Mystère
  10749: '#e0679c', // Romance
  878: '#2fa8c4', // Science-Fiction
  10770: '#8a8f99', // Téléfilm
  53: '#c0563a', // Thriller
  10752: '#6b7a52', // Guerre
  37: '#b8863b', // Western
  // Series genres: the four aliases reuse their film colour.
  10759: '#e04b4b', // Action
  10762: '#5fb85f', // Familial
  10765: '#2fa8c4', // Science-Fiction
  10768: '#6b7a52', // Guerre
  10763: '#3c6e8f', // Actualités
  10764: '#d9556e', // Télé-réalité
  10766: '#a2557f', // Feuilleton
  10767: '#8a6fd0', // Talk-show
}

const DEFAULT_CATEGORY_COLOR = '#8a8f99'

// The named, coloured themes of a title, in TMDB's relevance order and
// deduplicated by name — used to label each card so its border colours are
// legible. An id missing from either record above is skipped.
export function genreThemes(genreIds: number[]): { name: string; color: string }[] {
  const themes: { name: string; color: string }[] = []
  for (const id of genreIds) {
    const name = CATEGORY_NAMES[id]
    const color = CATEGORY_COLORS[id]
    if (name && color && !themes.some((t) => t.name === name)) {
      themes.push({ name, color })
    }
  }
  return themes
}

// Fallback for rows whose genre ids aren't known yet: colour a single-genre
// border from the stored French category label. Several ids can share a label
// (the series aliases above); JS iterates integer-like keys in ascending
// numeric order, so the lower — i.e. the film — id wins, deterministically.
export function categoryColor(category: string | null): string {
  if (category) {
    for (const [id, name] of Object.entries(CATEGORY_NAMES)) {
      if (name === category) return CATEGORY_COLORS[Number(id)] ?? DEFAULT_CATEGORY_COLOR
    }
  }
  return DEFAULT_CATEGORY_COLOR
}

// TMDB lists genres by relevance: the first known one is the title's category.
export function primaryCategory(genreIds: number[]): string | null {
  for (const id of genreIds) {
    if (CATEGORY_NAMES[id]) return CATEGORY_NAMES[id]
  }
  return null
}

function requireApiKey(): string {
  if (!apiKey) {
    throw new Error('VITE_TMDB_API_KEY is not set (see .env.local).')
  }
  return apiKey
}

function parseYear(date: string | null | undefined): number | null {
  const year = Number(date?.slice(0, 4))
  return Number.isFinite(year) && year > 0 ? year : null
}

function endpoint(mediaType: MediaType): string {
  return mediaType === 'tv' ? 'tv' : 'movie'
}

async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`TMDB responded with status ${response.status}`)
  }
  return await response.json()
}

// A raw search item → our normalised shape. `fallbackType` is for the
// single-type endpoints, which don't echo media_type back.
function toSearchResult(
  raw: RawSearchItem,
  fallbackType?: MediaType
): MediaSearchResult | null {
  const rawType = raw.media_type ?? fallbackType
  // Anything that isn't a film or a series (notably `person`) is dropped.
  if (rawType !== 'movie' && rawType !== 'tv') return null
  const mediaType: MediaType = rawType
  return {
    id: raw.id,
    mediaType,
    title: (mediaType === 'tv' ? raw.name : raw.title) ?? '',
    year: parseYear(mediaType === 'tv' ? raw.first_air_date : raw.release_date),
    posterPath: raw.poster_path,
    genreIds: raw.genre_ids ?? [],
  }
}

// Films and series in one ranked list. TMDB's ordering is the relevance
// ranking we want, so it is preserved as-is.
export async function searchMedia(query: string): Promise<MediaSearchResult[]> {
  const url = new URL('https://api.themoviedb.org/3/search/multi')
  url.searchParams.set('api_key', requireApiKey())
  url.searchParams.set('query', query)
  url.searchParams.set('language', 'fr-FR')
  url.searchParams.set('include_adult', 'false')

  const body = (await fetchJson(url)) as { results: RawSearchItem[] }
  return body.results
    .map((raw) => toSearchResult(raw))
    .filter((result): result is MediaSearchResult => result !== null)
}

// Search one kind only. Needed by the title-based fallbacks, where the multi
// endpoint's single page might contain no match of the required type at all.
export async function searchMediaByType(
  query: string,
  mediaType: MediaType
): Promise<MediaSearchResult[]> {
  const url = new URL(`https://api.themoviedb.org/3/search/${endpoint(mediaType)}`)
  url.searchParams.set('api_key', requireApiKey())
  url.searchParams.set('query', query)
  url.searchParams.set('language', 'fr-FR')
  url.searchParams.set('include_adult', 'false')

  const body = (await fetchJson(url)) as { results: RawSearchItem[] }
  return body.results
    .map((raw) => toSearchResult(raw, mediaType))
    .filter((result): result is MediaSearchResult => result !== null)
}

export async function getMediaDetails(
  mediaType: MediaType,
  tmdbId: number
): Promise<MediaDetails> {
  const url = new URL(
    `https://api.themoviedb.org/3/${endpoint(mediaType)}/${tmdbId}`
  )
  url.searchParams.set('api_key', requireApiKey())
  url.searchParams.set('language', 'fr-FR')
  url.searchParams.set('append_to_response', 'credits,watch/providers')

  const raw = (await fetchJson(url)) as RawDetails
  const isTv = mediaType === 'tv'
  return {
    id: raw.id,
    mediaType,
    title: (isTv ? raw.name : raw.title) ?? '',
    overview: raw.overview,
    posterPath: raw.poster_path,
    year: parseYear(isTv ? raw.first_air_date : raw.release_date),
    genres: raw.genres,
    cast: raw.credits?.cast ?? [],
    providers: frenchWatchProviders(raw),
    seasonCount: isTv ? raw.number_of_seasons ?? null : null,
    episodeCount: isTv ? raw.number_of_episodes ?? null : null,
    status: isTv ? frenchTvStatus(raw.status) : null,
  }
}

// Lightweight lookup of a title's genre ids (used to backfill the theme border
// for rows added on another device or before genre ids were cached). The
// endpoint MUST match the media type: film and series ids overlap, so asking
// /movie/{id} for a series id can return an unrelated film.
export async function getMediaGenreIds(
  mediaType: MediaType,
  tmdbId: number
): Promise<number[]> {
  const url = new URL(
    `https://api.themoviedb.org/3/${endpoint(mediaType)}/${tmdbId}`
  )
  url.searchParams.set('api_key', requireApiKey())

  const body = (await fetchJson(url)) as { genres: { id: number }[] }
  return body.genres.map((g) => g.id)
}

// Fallback for rows saved before tmdb_id existed: find the id by title/year.
// The result is only meaningful paired with the mediaType it was searched under.
export async function findTmdbId(
  mediaType: MediaType,
  title: string,
  year: number | null
): Promise<number | null> {
  const results = await searchMediaByType(title, mediaType)
  if (year) {
    const match = results.find((r) => r.year === year)
    if (match) return match.id
  }
  return results[0]?.id ?? null
}

// Platforms where the title is watchable in France, restricted to those listed
// in PROVIDER_URLS and split by cost. TMDB's `rent` and `buy` lists are in
// practice identical, so they are merged into one "paid" group.
function frenchWatchProviders(details: RawDetails): WatchOffers {
  const fr = details['watch/providers']?.results?.FR
  if (!fr) return { flatrate: [], paid: [] }

  const seen = new Set<string>()
  // Dedupe by url so e.g. Canal+ and Canal VOD show a single logo. Because
  // flatrate is collected first, a platform offering a title both on
  // subscription and for rent (Prime Video, routinely) counts as included.
  function pick(list: TmdbWatchProvider[] | undefined): TmdbWatchProvider[] {
    const picked: TmdbWatchProvider[] = []
    for (const provider of list ?? []) {
      const url = PROVIDER_URLS[provider.provider_id]
      if (url && !seen.has(url)) {
        seen.add(url)
        picked.push(provider)
      }
    }
    return picked
  }

  const flatrate = pick(fr.flatrate)
  const paid = [...pick(fr.rent), ...pick(fr.buy)]
  return { flatrate, paid }
}

export function providerLogoUrl(logoPath: string): string {
  return `https://image.tmdb.org/t/p/w92${logoPath}`
}

// The only platforms we display, with their homepages by TMDB provider id.
// These are universal links: on mobile they open the platform's app when
// installed, otherwise the website.
const PROVIDER_URLS: Record<number, string> = {
  8: 'https://www.netflix.com', // Netflix
  1796: 'https://www.netflix.com', // Netflix Standard with Ads
  119: 'https://www.primevideo.com', // Amazon Prime Video
  9: 'https://www.primevideo.com', // Amazon Prime Video (alt id)
  10: 'https://www.primevideo.com', // Amazon Video
  2100: 'https://www.primevideo.com', // Amazon Prime Video with Ads
  381: 'https://www.canalplus.com', // Canal+
  58: 'https://www.canalplus.com', // Canal VOD
  192: 'https://www.youtube.com', // YouTube
  188: 'https://www.youtube.com', // YouTube Premium
  337: 'https://www.disneyplus.com', // Disney+
}

export function providerUrl(provider: TmdbWatchProvider): string {
  return PROVIDER_URLS[provider.provider_id]
}

export function posterUrl(posterPath: string, width: 92 | 200 | 500 = 200): string {
  return `https://image.tmdb.org/t/p/w${width}${posterPath}`
}

export function profileUrl(profilePath: string): string {
  return `https://image.tmdb.org/t/p/w185${profilePath}`
}
