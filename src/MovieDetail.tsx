import { useEffect, useState } from 'react'
import type { Movie } from './lib/supabase'
import {
  findTmdbId,
  frenchWatchProviders,
  getMovieDetails,
  posterUrl,
  profileUrl,
  providerLogoUrl,
  providerUrl,
} from './lib/tmdb'
import type { TmdbMovieDetails } from './lib/tmdb'

const CAST_LIMIT = 10

const JELLYFIN_URL = 'https://45.87.251.42/zephyr/jellyfin/web/#/home'
const ZEPHYRSEERR_URL = 'http://45.87.251.42:7944'

function JellyfinLogo() {
  return (
    <svg className="provider-logo" viewBox="0 0 512 512" role="img">
      <defs>
        <linearGradient id="jellyfin-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#aa5cc3" />
          <stop offset="1" stopColor="#00a4dc" />
        </linearGradient>
      </defs>
      <rect width="512" height="512" rx="128" fill="#101010" />
      <g fill="url(#jellyfin-grad)">
        <path d="M190.56 329.07c8.63 17.3 122.4 17.12 130.93 0 8.52-17.1-47.9-119.78-65.46-119.8-17.57 0-74.1 102.5-65.47 119.8z" />
        <path d="M58.75 417.03c25.97 52.15 368.86 51.55 394.55 0S308.93 56.08 256.03 56.08c-52.92 0-223.25 308.8-197.28 360.95zm67.6-45.47c-17.14-34.4 95.3-238.13 130.2-238.13 34.93 0 146.98 203.35 130.03 237.37-16.94 34.03-243.1 35.16-260.24.76z" />
      </g>
    </svg>
  )
}

export default function MovieDetail({
  movie,
  seenBy,
  onBack,
}: {
  movie: Movie
  seenBy: string[]
  onBack: () => void
}) {
  const [details, setDetails] = useState<TmdbMovieDetails | null>(null)
  const [failed, setFailed] = useState(false)
  const [jellyfinOpen, setJellyfinOpen] = useState(false)

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
  const providers = details ? frenchWatchProviders(details) : []

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
            {seenBy.length > 0 && ` · vu par ${seenBy.join(', ')}`}
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

      <ul className="provider-list">
        <li className="provider-item" data-name="Zephyr">
          <button
            className="provider-button"
            onClick={() => setJellyfinOpen((open) => !open)}
          >
            <JellyfinLogo />
          </button>
          {jellyfinOpen && (
            <>
              <div
                className="provider-menu-backdrop"
                onClick={() => setJellyfinOpen(false)}
              />
              <div className="provider-menu">
                <a href={JELLYFIN_URL} target="_blank" rel="noreferrer">
                  ZephyrFin
                </a>
                <a href={ZEPHYRSEERR_URL} target="_blank" rel="noreferrer">
                  ZephyrSeerr
                </a>
              </div>
            </>
          )}
        </li>
        {providers.map((provider) => (
          <li
            key={provider.provider_id}
            className="provider-item"
            data-name={provider.provider_name}
          >
            <a href={providerUrl(provider)} target="_blank" rel="noreferrer">
              <img
                className="provider-logo"
                src={providerLogoUrl(provider.logo_path)}
                alt={provider.provider_name}
              />
            </a>
          </li>
        ))}
      </ul>

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
