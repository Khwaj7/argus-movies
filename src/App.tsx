import { useEffect, useState } from 'react'
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
  onToggleSeen,
  onOpen,
}: {
  movie: Movie
  onToggleSeen: (movie: Movie) => void
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
        className={movie.seen ? 'seen-button is-seen' : 'seen-button'}
        onClick={() => onToggleSeen(movie)}
        title={movie.seen ? 'Remettre dans « À voir »' : 'Marquer comme vu'}
      >
        ✓
      </button>
    </li>
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

    const channel = supabase
      .channel('movies-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'movies' },
        (payload) => {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            upsertMovie(payload.new as Movie)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function toggleSeen(movie: Movie) {
    const nextSeen = !movie.seen
    upsertMovie({ ...movie, seen: nextSeen })

    const { error } = await supabase
      .from('movies')
      .update({ seen: nextSeen })
      .eq('id', movie.id)

    if (error) {
      upsertMovie(movie)
      setError(`Mise à jour impossible : ${error.message}`)
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
  const selectedMovie = movies.find((m) => m.id === selectedId)
  if (selectedMovie) {
    return (
      <MovieDetail movie={selectedMovie} onBack={() => setSelectedId(null)} />
    )
  }

  const visibleMovies = movies.filter((m) => (tab === 'seen' ? m.seen : !m.seen))
  const toWatchCount = movies.filter((m) => !m.seen).length
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
                  onToggleSeen={toggleSeen}
                  onOpen={(m) => setSelectedId(m.id)}
                />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  )
}

export default App
