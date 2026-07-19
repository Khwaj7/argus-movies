import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from './lib/supabase'
import type { Movie } from './lib/supabase'
import { posterUrl, primaryCategory, releaseYear, searchMovies } from './lib/tmdb'
import type { TmdbMovie } from './lib/tmdb'
import MovieDetail from './MovieDetail'
import './App.css'

type Tab = 'toWatch' | 'seen'

const USERNAME_STORAGE_KEY = 'argus-username'

function NamePrompt({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [name, setName] = useState('')

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <div className="name-prompt">
      <h1>👁️ Iris</h1>
      <p>Choisis ton prénom pour commencer :</p>
      <form onSubmit={handleSubmit}>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ton prénom"
          maxLength={40}
        />
        <button type="submit" disabled={!name.trim()}>
          C'est parti
        </button>
      </form>
    </div>
  )
}

function AddMovieForm({
  username,
  onAdded,
  onError,
}: {
  username: string
  onAdded: (movie: Movie) => void
  onError: (message: string) => void
}) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<TmdbMovie[]>([])
  const [searching, setSearching] = useState(false)
  const [addingId, setAddingId] = useState<number | null>(null)

  // Debounced TMDB search; the cancelled flag drops responses that land
  // after the query has changed.
  useEffect(() => {
    const trimmed = query.trim()
    if (trimmed.length < 2) {
      setResults([])
      setSearching(false)
      return
    }

    let cancelled = false
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const movies = await searchMovies(trimmed)
        if (!cancelled) setResults(movies.slice(0, 6))
      } catch (err) {
        if (!cancelled) {
          onError(`Recherche TMDB impossible : ${(err as Error).message}`)
        }
      } finally {
        if (!cancelled) setSearching(false)
      }
    }, 300)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query, onError])

  async function addMovie(tmdbMovie: TmdbMovie) {
    if (addingId !== null) return
    setAddingId(tmdbMovie.id)

    const { data, error } = await supabase
      .from('movies')
      .insert({
        title: tmdbMovie.title,
        year: releaseYear(tmdbMovie),
        thumbnail_url: tmdbMovie.poster_path
          ? posterUrl(tmdbMovie.poster_path)
          : null,
        category: primaryCategory(tmdbMovie.genre_ids),
        tmdb_id: tmdbMovie.id,
        added_by: username,
      })
      .select()
      .single()
    setAddingId(null)

    if (error) {
      onError(`Impossible d'ajouter le film : ${error.message}`)
      return
    }
    onAdded(data as Movie)
    setQuery('')
    setResults([])
  }

  return (
    <div className="add-form">
      <input
        className="add-title"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Chercher un film à ajouter…"
        maxLength={200}
      />
      {searching && <p className="search-status">Recherche…</p>}
      {!searching && query.trim().length >= 2 && results.length === 0 && (
        <p className="search-status">Aucun résultat.</p>
      )}
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((movie) => (
            <li key={movie.id}>
              <button
                className="search-result"
                disabled={addingId !== null}
                onClick={() => addMovie(movie)}
              >
                {movie.poster_path ? (
                  <img
                    className="result-poster"
                    src={posterUrl(movie.poster_path, 92)}
                    alt=""
                  />
                ) : (
                  <div className="result-poster poster-placeholder">🎬</div>
                )}
                <span className="result-title">
                  {movie.title}
                  {releaseYear(movie) && (
                    <span className="movie-year"> ({releaseYear(movie)})</span>
                  )}
                </span>
                <span className="result-add">
                  {addingId === movie.id ? '…' : '+ Ajouter'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function MovieCard({
  movie,
  seen,
  onSeen,
  onOpen,
}: {
  movie: Movie
  seen: boolean
  onSeen: (movie: Movie) => void
  onOpen: (movie: Movie) => void
}) {
  return (
    <li className="movie-card">
      <button className="movie-open" onClick={() => onOpen(movie)}>
        {movie.thumbnail_url ? (
          <img className="poster" src={movie.thumbnail_url} alt="" />
        ) : (
          <div className="poster poster-placeholder">🎬</div>
        )}
        <div className="movie-info">
          <span className="movie-title">
            {movie.title}
            {movie.year && <span className="movie-year"> ({movie.year})</span>}
          </span>
          <span className="movie-meta">ajouté par {movie.added_by}</span>
        </div>
      </button>
      <button
        className={seen ? 'seen-button is-seen' : 'seen-button'}
        onClick={() => onSeen(movie)}
        title="Choisir qui a vu ce film"
      >
        ✓
      </button>
    </li>
  )
}

function SeenPicker({
  movie,
  profiles,
  initial,
  onClose,
  onSave,
}: {
  movie: Movie
  profiles: string[]
  initial: string[]
  onClose: () => void
  onSave: (selected: string[]) => void
}) {
  const [selected, setSelected] = useState(() => new Set(initial))

  function toggle(name: string) {
    setSelected((current) => {
      const next = new Set(current)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Vu par…</h2>
        <p className="modal-subtitle">{movie.title}</p>
        <ul className="profile-options">
          {profiles.map((name) => (
            <li key={name}>
              <label className="profile-option">
                <input
                  type="checkbox"
                  checked={selected.has(name)}
                  onChange={() => toggle(name)}
                />
                {name}
              </label>
            </li>
          ))}
        </ul>
        <div className="modal-actions">
          <button className="modal-cancel" onClick={onClose}>
            Annuler
          </button>
          <button className="modal-save" onClick={() => onSave([...selected])}>
            Valider
          </button>
        </div>
      </div>
    </div>
  )
}

function App() {
  const [username, setUsername] = useState(
    () => localStorage.getItem(USERNAME_STORAGE_KEY) ?? ''
  )
  const [movies, setMovies] = useState<Movie[]>([])
  const [tab, setTab] = useState<Tab>('toWatch')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [profiles, setProfiles] = useState<string[]>([])
  // movie id -> names of the profiles that have seen it
  const [seenBy, setSeenBy] = useState<Record<string, string[]>>({})
  const [seenPickerId, setSeenPickerId] = useState<string | null>(null)
  const [notices, setNotices] = useState<{ id: number; text: string }[]>([])
  const noticeIdRef = useRef(0)
  // Mirror used by the realtime handlers (their closures are from the first render).
  const moviesRef = useRef<Movie[]>([])

  useEffect(() => {
    moviesRef.current = movies
  }, [movies])

  function sortedProfiles(names: Iterable<string>): string[] {
    return [...names].sort((a, b) => a.localeCompare(b, 'fr'))
  }

  function pushNotice(text: string) {
    const id = ++noticeIdRef.current
    setNotices((current) => [...current.slice(-3), { id, text }])
    setTimeout(() => {
      setNotices((current) => current.filter((n) => n.id !== id))
    }, 6000)
  }

  function dismissNotice(id: number) {
    setNotices((current) => current.filter((n) => n.id !== id))
  }

  // Insert or replace a movie in local state (dedupes realtime echoes of our own writes).
  function upsertMovie(movie: Movie) {
    setMovies((current) => {
      const exists = current.some((m) => m.id === movie.id)
      return exists
        ? current.map((m) => (m.id === movie.id ? movie : m))
        : [movie, ...current]
    })
  }

  useEffect(() => {
    supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(`Chargement impossible : ${error.message}`)
        else setMovies(data as Movie[])
        setLoading(false)
      })

    supabase
      .from('profiles')
      .select('name')
      .then(({ data, error }) => {
        if (error) setError(`Chargement des profils impossible : ${error.message}`)
        else setProfiles(sortedProfiles(data.map((p) => p.name as string)))
      })

    supabase
      .from('movie_seen')
      .select('movie_id, profile_name')
      .then(({ data, error }) => {
        if (error) {
          setError(`Chargement des vus impossible : ${error.message}`)
          return
        }
        const map: Record<string, string[]> = {}
        for (const row of data) {
          ;(map[row.movie_id as string] ??= []).push(row.profile_name as string)
        }
        setSeenBy(map)
      })

    const channel = supabase
      .channel('movies-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movies' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const movie = payload.new as Movie
            upsertMovie(movie)
            if (payload.eventType === 'INSERT') {
              pushNotice(`🎬 « ${movie.title} » ajouté à la liste par ${movie.added_by}`)
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'profiles' },
        (payload) => {
          const { name } = payload.new as { name: string }
          setProfiles((current) =>
            current.includes(name) ? current : sortedProfiles([...current, name])
          )
          pushNotice(`👋 ${name} a rejoint Iris`)
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'movie_seen' },
        (payload) => {
          const row = payload.new as { movie_id: string; profile_name: string }
          setSeenBy((current) => {
            const names = current[row.movie_id] ?? []
            if (names.includes(row.profile_name)) return current
            return { ...current, [row.movie_id]: [...names, row.profile_name] }
          })
          const title = moviesRef.current.find((m) => m.id === row.movie_id)?.title
          pushNotice(
            title
              ? `✓ ${row.profile_name} a vu « ${title} »`
              : `✓ ${row.profile_name} a vu un film`
          )
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'movie_seen' },
        (payload) => {
          const row = payload.old as { movie_id: string; profile_name: string }
          setSeenBy((current) => {
            const names = current[row.movie_id]
            if (!names?.includes(row.profile_name)) return current
            return {
              ...current,
              [row.movie_id]: names.filter((n) => n !== row.profile_name),
            }
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  // Register the current profile so it shows up in everyone's "seen by" picker.
  useEffect(() => {
    if (!username) return
    supabase
      .from('profiles')
      .upsert({ name: username }, { ignoreDuplicates: true })
      .then(({ error }) => {
        if (!error) {
          setProfiles((current) =>
            current.includes(username)
              ? current
              : sortedProfiles([...current, username])
          )
        }
      })
  }, [username])

  async function saveSeen(movie: Movie, selected: string[]) {
    setSeenPickerId(null)
    const before = seenBy[movie.id] ?? []
    const toAdd = selected.filter((name) => !before.includes(name))
    const toRemove = before.filter((name) => !selected.includes(name))
    if (toAdd.length === 0 && toRemove.length === 0) return

    // Optimistic update; rolled back if any write fails.
    const seen = selected.length > 0
    setSeenBy((current) => ({ ...current, [movie.id]: selected }))
    if (seen !== movie.seen) upsertMovie({ ...movie, seen })

    const results = await Promise.all([
      toAdd.length > 0
        ? supabase.from('movie_seen').upsert(
            toAdd.map((profile_name) => ({ movie_id: movie.id, profile_name })),
            { ignoreDuplicates: true }
          )
        : null,
      toRemove.length > 0
        ? supabase
            .from('movie_seen')
            .delete()
            .eq('movie_id', movie.id)
            .in('profile_name', toRemove)
        : null,
      seen !== movie.seen
        ? supabase.from('movies').update({ seen }).eq('id', movie.id)
        : null,
    ])

    const failed = results.find((result) => result?.error)
    if (failed) {
      setSeenBy((current) => ({ ...current, [movie.id]: before }))
      upsertMovie(movie)
      setError(`Mise à jour impossible : ${failed.error!.message}`)
    }
  }

  function chooseUsername(name: string) {
    localStorage.setItem(USERNAME_STORAGE_KEY, name)
    setUsername(name)
  }

  if (!username) {
    return <NamePrompt onSubmit={chooseUsername} />
  }

  // Reading the selected movie from the list keeps the detail page in sync
  // with realtime updates (e.g. someone marks it as seen).
  const noticeStack = notices.length > 0 && (
    <div className="notice-stack">
      {notices.map((notice) => (
        <div
          key={notice.id}
          className="notice"
          onClick={() => dismissNotice(notice.id)}
        >
          {notice.text}
        </div>
      ))}
    </div>
  )

  const selectedMovie = movies.find((m) => m.id === selectedId)
  if (selectedMovie) {
    return (
      <>
        {noticeStack}
        <MovieDetail
          movie={selectedMovie}
          seenBy={seenBy[selectedMovie.id] ?? []}
          onBack={() => setSelectedId(null)}
        />
      </>
    )
  }

  const pickerMovie = movies.find((m) => m.id === seenPickerId)

  // The tabs are personal: a movie is "seen" only if MY profile has seen it,
  // even when others already have.
  const seenByMe = (movie: Movie) => (seenBy[movie.id] ?? []).includes(username)
  const visibleMovies = movies.filter((m) => (tab === 'seen' ? seenByMe(m) : !seenByMe(m)))
  const toWatchCount = movies.filter((m) => !seenByMe(m)).length
  const seenCount = movies.length - toWatchCount

  // Group by category, alphabetical order, "Autre" always last.
  const categoryGroups = new Map<string, Movie[]>()
  for (const movie of visibleMovies) {
    const category = movie.category ?? 'Autre'
    const group = categoryGroups.get(category)
    if (group) group.push(movie)
    else categoryGroups.set(category, [movie])
  }
  const sortedCategories = [...categoryGroups.keys()].sort((a, b) => {
    if (a === 'Autre') return 1
    if (b === 'Autre') return -1
    return a.localeCompare(b, 'fr')
  })

  // Fall back to "all" if the picked category vanished from the current view
  // (tab switch, realtime update...).
  const activeCategory = categoryGroups.has(categoryFilter) ? categoryFilter : 'all'
  const displayedCategories =
    activeCategory === 'all' ? sortedCategories : [activeCategory]

  return (
    <div className="app">
      {noticeStack}
      <header>
        <h1>👁️ Iris</h1>
        <div className="header-controls">
          <nav className="seen-switch">
            <button
              className={tab === 'toWatch' ? 'switch-option active' : 'switch-option'}
              onClick={() => {
                setTab('toWatch')
                setCategoryFilter('all')
              }}
            >
              À voir ({toWatchCount})
            </button>
            <button
              className={tab === 'seen' ? 'switch-option active' : 'switch-option'}
              onClick={() => {
                setTab('seen')
                setCategoryFilter('all')
              }}
            >
              Vus ({seenCount})
            </button>
          </nav>
          <button
            className="username"
            onClick={() => setUsername('')}
            title="Changer de prénom"
          >
            {username}
          </button>
        </div>
      </header>

      {error && (
        <div className="error-banner" onClick={() => setError('')}>
          {error} <span className="error-dismiss">(cliquer pour fermer)</span>
        </div>
      )}

      <AddMovieForm username={username} onAdded={upsertMovie} onError={setError} />

      {visibleMovies.length > 0 && (
        <nav className="category-pills">
          <button
            className={activeCategory === 'all' ? 'pill active' : 'pill'}
            onClick={() => setCategoryFilter('all')}
          >
            Tous <span className="pill-count">{visibleMovies.length}</span>
          </button>
          {sortedCategories.map((category) => (
            <button
              key={category}
              className={activeCategory === category ? 'pill active' : 'pill'}
              onClick={() => setCategoryFilter(category)}
            >
              {category}{' '}
              <span className="pill-count">
                {categoryGroups.get(category)!.length}
              </span>
            </button>
          ))}
        </nav>
      )}

      {loading ? (
        <p className="empty-state">Chargement…</p>
      ) : visibleMovies.length === 0 ? (
        <p className="empty-state">
          {tab === 'toWatch'
            ? 'Aucun film dans la liste. Ajoutes-en un !'
            : 'Aucun film vu pour le moment.'}
        </p>
      ) : (
        displayedCategories.map((category) => (
          <section key={category} className="category-section">
            <h2 className="category-title">{category}</h2>
            <ul className="movie-list">
              {categoryGroups.get(category)!.map((movie) => (
                <MovieCard
                  key={movie.id}
                  movie={movie}
                  seen={seenByMe(movie)}
                  onSeen={(m) => setSeenPickerId(m.id)}
                  onOpen={(m) => setSelectedId(m.id)}
                />
              ))}
            </ul>
          </section>
        ))
      )}

      {pickerMovie && (
        <SeenPicker
          movie={pickerMovie}
          profiles={profiles}
          initial={seenBy[pickerMovie.id] ?? []}
          onClose={() => setSeenPickerId(null)}
          onSave={(selected) => saveSeen(pickerMovie, selected)}
        />
      )}
    </div>
  )
}

export default App
