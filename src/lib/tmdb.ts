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

// TMDB lists genres by relevance: the first known one is the movie's category.
export function primaryCategory(genreIds: number[]): string | null {
    for (const id of genreIds) {
        if (CATEGORY_NAMES[id]) return CATEGORY_NAMES[id];
    }
    return null;
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
