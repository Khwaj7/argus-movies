import {createClient} from "@supabase/supabase-js";
import type {MediaType} from "./media";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
    throw new Error(
        'Variables not correctly set.'
    );
}

export const supabase = createClient(url, anonKey);

// A row of the `media` table: a film or a series.
export type Media = {
    id: string;
    title: string;
    year: number | null;
    thumbnail_url: string | null;
    // Legacy denormalised flag: true once at least one profile has seen it.
    // NOT what drives the À voir / Vus split — that is per-profile, from the
    // `seen` table.
    seen: boolean;
    added_by: string;
    category: string | null;
    // Only unique paired with media_type: TMDB numbers films and series
    // separately and the ranges overlap.
    tmdb_id: number | null;
    media_type: MediaType;
    created_at: string;
}
