const apiKey = import.meta.env.VITE_TMDB_API_KEY;

export type TmdbMovie = {
    id: number;
    title: string;
    release_date: string | null;
    poster_path: string | null;
    genre_ids: number[];
};

export type TmdbCastMember = {
    id: number;
    name: string;
    character: string;
    profile_path: string | null;
};

export type TmdbWatchProvider = {
    provider_id: number;
    provider_name: string;
    logo_path: string;
};

export type TmdbMovieDetails = {
    id: number;
    title: string;
    overview: string;
    poster_path: string | null;
    release_date: string | null;
    genres: { id: number; name: string }[];
    credits: { cast: TmdbCastMember[] };
    'watch/providers': {
        results: Record<
            string,
            {
                flatrate?: TmdbWatchProvider[];
                rent?: TmdbWatchProvider[];
                buy?: TmdbWatchProvider[];
            }
        >;
    };
};

// Official TMDB movie genre ids with their French labels.
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
};

// A distinct colour per genre, used to frame movie cards with the colours of
// their themes (a movie with several genres gets a multi-colour border).
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
};

const DEFAULT_CATEGORY_COLOR = '#8a8f99';

// The colours to frame a movie with, one per known genre, in TMDB's relevance
// order and deduplicated. Always returns at least one colour.
export function genreColors(genreIds: number[]): string[] {
    const colors: string[] = [];
    for (const id of genreIds) {
        const color = CATEGORY_COLORS[id];
        if (color && !colors.includes(color)) colors.push(color);
    }
    return colors.length > 0 ? colors : [DEFAULT_CATEGORY_COLOR];
}

// The named, coloured themes of a movie, in TMDB's relevance order and
// deduplicated — used to label each card so its border colours are legible.
export function genreThemes(genreIds: number[]): { name: string; color: string }[] {
    const themes: { name: string; color: string }[] = [];
    for (const id of genreIds) {
        const name = CATEGORY_NAMES[id];
        const color = CATEGORY_COLORS[id];
        if (name && color && !themes.some((t) => t.name === name)) {
            themes.push({ name, color });
        }
    }
    return themes;
}

// Fallback for movies whose genre ids aren't known yet: colour a single-genre
// border from the stored French category label.
export function categoryColor(category: string | null): string {
    if (category) {
        for (const [id, name] of Object.entries(CATEGORY_NAMES)) {
            if (name === category) return CATEGORY_COLORS[Number(id)] ?? DEFAULT_CATEGORY_COLOR;
        }
    }
    return DEFAULT_CATEGORY_COLOR;
}

// TMDB lists genres by relevance: the first known one is the movie's category.
export function primaryCategory(genreIds: number[]): string | null {
    for (const id of genreIds) {
        if (CATEGORY_NAMES[id]) return CATEGORY_NAMES[id];
    }
    return null;
}

// Lightweight lookup of a movie's genre ids (used to backfill the theme border
// for rows added on another device or before genre ids were cached).
export async function getMovieGenreIds(tmdbId: number): Promise<number[]> {
    if (!apiKey) {
        throw new Error('VITE_TMDB_API_KEY is not set (see .env.local).');
    }
    const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
    url.searchParams.set('api_key', apiKey);

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`TMDB responded with status ${response.status}`);
    }
    const body = await response.json();
    return (body.genres as { id: number }[]).map((g) => g.id);
}

export async function searchMovies(query: string): Promise<TmdbMovie[]> {
    if (!apiKey) {
        throw new Error('VITE_TMDB_API_KEY is not set (see .env.local).');
    }
    const url = new URL('https://api.themoviedb.org/3/search/movie');
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('query', query);
    url.searchParams.set('language', 'fr-FR');
    url.searchParams.set('include_adult', 'false');

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`TMDB responded with status ${response.status}`);
    }
    const body = await response.json();
    return body.results as TmdbMovie[];
}

export async function getMovieDetails(tmdbId: number): Promise<TmdbMovieDetails> {
    if (!apiKey) {
        throw new Error('VITE_TMDB_API_KEY is not set (see .env.local).');
    }
    const url = new URL(`https://api.themoviedb.org/3/movie/${tmdbId}`);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('language', 'fr-FR');
    url.searchParams.set('append_to_response', 'credits,watch/providers');

    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`TMDB responded with status ${response.status}`);
    }
    return (await response.json()) as TmdbMovieDetails;
}

// Fallback for rows saved before tmdb_id existed: find the id by title/year.
export async function findTmdbId(
    title: string,
    year: number | null
): Promise<number | null> {
    const results = await searchMovies(title);
    if (year) {
        const match = results.find((m) => releaseYear(m) === year);
        if (match) return match.id;
    }
    return results[0]?.id ?? null;
}

// Platforms where the movie is watchable in France: streaming first,
// completed with rental/purchase platforms (deduplicated). Restricted to
// the platforms listed in PROVIDER_URLS.
export function frenchWatchProviders(
    details: TmdbMovieDetails
): TmdbWatchProvider[] {
    const fr = details['watch/providers']?.results?.FR;
    if (!fr) return [];
    const seen = new Set<string>();
    const providers: TmdbWatchProvider[] = [];
    for (const provider of [
        ...(fr.flatrate ?? []),
        ...(fr.rent ?? []),
        ...(fr.buy ?? []),
    ]) {
        const url = PROVIDER_URLS[provider.provider_id];
        // Dedupe by url so e.g. Canal+ and Canal VOD show a single logo.
        if (url && !seen.has(url)) {
            seen.add(url);
            providers.push(provider);
        }
    }
    return providers;
}

export function providerLogoUrl(logoPath: string): string {
    return `https://image.tmdb.org/t/p/w92${logoPath}`;
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
};

export function providerUrl(provider: TmdbWatchProvider): string {
    return PROVIDER_URLS[provider.provider_id];
}

export function posterUrl(posterPath: string, width: 92 | 200 | 500 = 200): string {
    return `https://image.tmdb.org/t/p/w${width}${posterPath}`;
}

export function profileUrl(profilePath: string): string {
    return `https://image.tmdb.org/t/p/w185${profilePath}`;
}

export function releaseYear(movie: TmdbMovie): number | null {
    const year = Number(movie.release_date?.slice(0, 4));
    return Number.isFinite(year) && year > 0 ? year : null;
}
