import { useEffect, useState } from 'react'
import type { Movie } from './lib/supabase'
import { findTmdbId, getMovieDetails, posterUrl, profileUrl } from './lib/tmdb'
import type { TmdbMovieDetails } from './lib/tmdb'

const CAST_LIMIT = 10

export default function MovieDetail({
  movie,
  onBack,
}: {
  movie: Movie
  onBack: () => void
}) {
  const [details, setDetails] = useState<TmdbMovieDetails | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const tmdbId = movie.tmdb_id ?? (await findTmdbId(movie.title, movie.year))
        if (!tmdbId) {
          if (!cancelled) setFailed(true)
          return
        }
        const data = await getMovieDetails(tmdbId)
        if (!cancelled) setDetails(data)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [movie])

  const poster = details?.poster_path
    ? posterUrl(details.poster_path, 500)
    : movie.thumbnail_url

  const cast = details?.credits.cast.slice(0, CAST_LIMIT) ?? []

  return (
    <div className="app detail">
      <button className="back-button" onClick={onBack}>
        ← Retour à la liste
      </button>

      <div className="detail-header">
        {poster ? (
          <img className="detail-poster" src={poster} alt="" />
        ) : (
          <div className="detail-poster poster-placeholder">🎬</div>
        )}
        <div>
          <h1>
            {movie.title}
            {movie.year && <span className="movie-year"> ({movie.year})</span>}
          </h1>
          {details && details.genres.length > 0 && (
            <p className="detail-genres">
              {details.genres.map((g) => g.name).join(' · ')}
            </p>
          )}
          <p className="movie-meta">
            ajouté par {movie.added_by}
            {movie.seen && ' · vu ✓'}
          </p>
        </div>
      </div>

      {failed && (
        <p className="empty-state">
          Fiche TMDB introuvable pour ce film — seules les infos locales sont
          affichées.
        </p>
      )}
      {!failed && !details && <p className="empty-state">Chargement de la fiche…</p>}

      {details && (
        <>
          <section>
            <h2>Synopsis</h2>
            <p className="detail-overview">
              {details.overview || 'Pas de synopsis disponible en français.'}
            </p>
          </section>

          {cast.length > 0 && (
            <section>
              <h2>Acteurs</h2>
              <ul className="cast-list">
                {cast.map((member) => (
                  <li key={member.id} className="cast-card">
                    {member.profile_path ? (
                      <img
                        className="cast-photo"
                        src={profileUrl(member.profile_path)}
                        alt=""
                      />
                    ) : (
                      <div className="cast-photo poster-placeholder">👤</div>
                    )}
                    <span className="cast-name">{member.name}</span>
                    <span className="cast-role">{member.character}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
