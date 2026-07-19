import {createClient} from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
    throw new Error(
        'Variables not correctly set.'
    );
}

export const supabase = createClient(url, anonKey);

export type Movie = {
    id: string;
    title: string;
    year: number | null;
    thumbnail_url: string | null;
    seen: boolean;
    added_by: string;
    created_at: string;
}