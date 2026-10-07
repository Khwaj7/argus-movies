import { useEffect, useState } from 'react'
import type { Media } from './lib/supabase'
import { MEDIA_NOUN, MEDIA_TYPE_ICON } from './lib/media'
import MediaBadge from './MediaBadge'
import {
  findTmdbId,
  genreThemes,
  getMediaDetails,
  posterUrl,
  profileUrl,
  providerLogoUrl,
  providerUrl,
} from './lib/tmdb'
import type { MediaDetails, TmdbWatchProvider } from './lib/tmdb'

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

function ProviderItem({ provider }: { provider: TmdbWatchProvider }) {
  return (
    <li className="provider-item" data-name={provider.provider_name}>
      <a href={providerUrl(provider)} target="_blank" rel="noreferrer">
        <img
          className="provider-logo"
          src={providerLogoUrl(provider.logo_path)}
          alt={provider.provider_name}
        />
      </a>
    </li>
  )
}

// Seasons, episodes and status, for series only. Any segment TMDB doesn't
// give us is dropped; if none survive, there is no line at all.
function seriesLine(details: MediaDetails): string | null {
  const parts = [
    details.seasonCount
      ? `${details.seasonCount.toLocaleString('fr-FR')} saison${
          details.seasonCount > 1 ? 's' : ''
        }`
      : null,
    details.episodeCount
      ? `${details.episodeCount.toLocaleString('fr-FR')} épisode${
          details.episodeCount > 1 ? 's' : ''
        }`
      : null,
    details.status,
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}

export default function MediaDetail({
  item,
  seenBy,
  onBack,
}: {
  item: Media
  seenBy: string[]
  onBack: () => void
}) {
  const [details, setDetails] = useState<MediaDetails | null>(null)
  const [failed, setFailed] = useState(false)
  const [jellyfinOpen, setJellyfinOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    // Reset so switching titles never shows the previous one's fiche.
    setDetails(null)
    setFailed(false)

    async function load() {
      try {
        const tmdbId =
          item.tmdb_id ?? (await findTmdbId(item.media_type, item.title, item.year))
        if (!tmdbId) {
          if (!cancelled) setFailed(true)
          return
        }
        const data = await getMediaDetails(item.media_type, tmdbId)
        if (!cancelled) setDetails(data)
      } catch {
        if (!cancelled) setFailed(true)
      }
    }

    load()
    return () => {
      cancelled = true
    }
    // Narrow deps: the row object identity changes on every realtime upsert
    // (e.g. someone marks it seen), which would otherwise refetch the fiche.
  }, [item.id, item.tmdb_id, item.media_type, item.title, item.year])

  const poster = details?.posterPath
    ? posterUrl(details.posterPath, 500)
    : item.thumbnail_url

  const cast = details?.cast.slice(0, CAST_LIMIT) ?? []
  const offers = details?.providers ?? { flatrate: [], paid: [] }
  const seasons = details ? seriesLine(details) : null

  return (
    <div className="app detail">
      <button className="back-button" onClick={onBack}>
        ← Retour à la liste
      </button>

      <div className="detail-header">
        {poster ? (
          <img className="detail-poster" src={poster} alt="" />
        ) : (
          <div className="detail-poster poster-placeholder">
            {MEDIA_TYPE_ICON[item.media_type]}
          </div>
        )}
        <div>
          <h1>
            {item.title}
            {item.year && <span className="media-year"> ({item.year})</span>}
          </h1>
          <span className="media-themes detail-themes">
            <MediaBadge mediaType={item.media_type} />
            {details?.genres &&
              genreThemes(details.genres.map((g) => g.id)).map((theme) => (
                <span
                  key={theme.name}
                  className="media-theme"
                  style={{ color: theme.color, borderColor: theme.color }}
                >
                  {theme.name}
                </span>
              ))}
          </span>
          {seasons && <p className="media-meta">{seasons}</p>}
          <p className="media-meta">
            ajouté par {item.added_by}
            {seenBy.length > 0 && ` · vu par ${seenBy.join(', ')}`}
          </p>
        </div>
      </div>

      {failed && (
        <p className="empty-state">
          Fiche TMDB introuvable pour {MEDIA_NOUN[item.media_type]} — seules les
          infos locales sont affichées.
        </p>
      )}
      {!failed && !details && <p className="empty-state">Chargement de la fiche…</p>}

      <div className="provider-groups">
        <div className="provider-group">
          <span className="provider-group-label">Regarder directement</span>
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
            {offers.flatrate.map((provider) => (
              <ProviderItem key={provider.provider_id} provider={provider} />
            ))}
          </ul>
        </div>

        {offers.paid.length > 0 && (
          <div className="provider-group">
            <span className="provider-group-label">Location ou achat</span>
            <ul className="provider-list">
              {offers.paid.map((provider) => (
                <ProviderItem key={provider.provider_id} provider={provider} />
              ))}
            </ul>
          </div>
        )}
      </div>

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
