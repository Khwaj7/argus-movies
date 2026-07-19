const apiKey = import.meta.env.VITE_TMDB_API_KEY;

export type TmdbMovie = {
    id: number;
    title: string;
    release_date: string | null;
    poster_path: string | null;
};

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

export function posterUrl(posterPath: string, width: 92 | 200 = 200): string {
    return `https://image.tmdb.org/t/p/w${width}${posterPath}`;
}

export function releaseYear(movie: TmdbMovie): number | null {
    const year = Number(movie.release_date?.slice(0, 4));
    return Number.isFinite(year) && year > 0 ? year : null;
}
