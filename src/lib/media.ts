// The kinds of thing the list can hold. A leaf module so both lib/supabase.ts
// (the column's type) and lib/tmdb.ts (TMDB's discriminator) can import it
// without either depending on the other.
export type MediaType = 'movie' | 'tv'

export const MEDIA_TYPE_LABEL: Record<MediaType, string> = {
  movie: 'Film',
  tv: 'Série',
}

export const MEDIA_TYPE_ICON: Record<MediaType, string> = {
  movie: '🎬',
  tv: '📺',
}

export const MEDIA_TYPE_PLURAL: Record<MediaType, string> = {
  movie: 'Films',
  tv: 'Séries',
}

// For prose: "Impossible d'ajouter cette série", "introuvable pour ce film".
export const MEDIA_NOUN: Record<MediaType, string> = {
  movie: 'ce film',
  tv: 'cette série',
}

// Empty-list wording, kept here with the rest of the French vocabulary so
// gender and number agreement stay in one place.
export const MEDIA_EMPTY_TO_WATCH: Record<MediaType, string> = {
  movie: 'Aucun film dans la liste. Ajoutes-en un !',
  tv: 'Aucune série dans la liste. Ajoutes-en une !',
}

export const MEDIA_EMPTY_SEEN: Record<MediaType, string> = {
  movie: 'Aucun film vu pour le moment.',
  tv: 'Aucune série vue pour le moment.',
}

// TMDB does not translate a series' `status`, even with language=fr-FR — it
// always comes back in English. Unknown values map to null so the caller drops
// the segment rather than leaking English into the UI.
const TV_STATUS_FR: Record<string, string> = {
  'Returning Series': 'En cours',
  Ended: 'Terminée',
  Canceled: 'Annulée',
  Cancelled: 'Annulée',
  'In Production': 'En production',
  Planned: 'Prévue',
  Pilot: 'Pilote',
}

export function frenchTvStatus(status: string | null | undefined): string | null {
  if (!status) return null
  return TV_STATUS_FR[status] ?? null
}
