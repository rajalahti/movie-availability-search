import { useEffect, useState } from 'react';
import { Amplify } from 'aws-amplify';
import { fetchUserAttributes, getCurrentUser, signInWithRedirect, signOut } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

import { awsConfig } from './aws-config';
import { Header } from './components/Header';
import { MovieResults } from './components/MovieResults';
import { RecommendationList } from './components/RecommendationList';
import { WatchlistView } from './components/WatchlistView';
import { useMovieSearch, useSimilarMovies } from './hooks/useMovieSearch';
import { useWatchlist } from './hooks/useWatchlist';
import { MovieAvailabilityGroup, PROVIDERS, ProviderName } from './services/movieApi';

Amplify.configure(awsConfig);

const queryClient = new QueryClient();

function MovieSearchApp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProviders] = useState<ProviderName[]>([...PROVIDERS]);
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [selectedMovieId, setSelectedMovieId] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>();
  const [authLoading, setAuthLoading] = useState(true);

  const { data, isLoading, error } = useMovieSearch(searchQuery, selectedProviders);
  const selectedMovie =
    data?.movies.find((movie) => movie.id === selectedMovieId) ?? data?.movies[0];
  const similarQuery = selectedMovie
    ? `${selectedMovie.title} (${selectedMovie.year})`
    : '';
  const { data: similar, isLoading: similarLoading } = useSimilarMovies(similarQuery);
  const {
    items: watchlistItems,
    isLoading: watchlistLoading,
    addToWatchlist,
    removeFromWatchlist,
    isInWatchlist,
  } = useWatchlist();

  useEffect(() => {
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn' || payload.event === 'signInWithRedirect') {
        void checkAuth();
      } else if (payload.event === 'signedOut') {
        setIsAuthenticated(false);
        setUserEmail(undefined);
      } else if (payload.event === 'signInWithRedirect_failure') {
        setAuthLoading(false);
      }
    });

    void checkAuth();

    if (window.location.search.includes('code=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => unsubscribe();
  }, []);

  async function checkAuth() {
    try {
      const user = await getCurrentUser();
      try {
        const attributes = await fetchUserAttributes();
        setUserEmail(attributes.email);
      } catch {
        setUserEmail(user.username);
      }
      setIsAuthenticated(true);
    } catch {
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignIn() {
    await signInWithRedirect();
  }

  async function handleSignOut() {
    await signOut();
    setShowWatchlist(false);
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    setSelectedMovieId('');
    setShowWatchlist(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function createMovieId(title: string, year: number): string {
    return `${title.toLowerCase().replace(/\s+/g, '-')}-${year}`;
  }

  function handleToggleWatchlist(movie: MovieAvailabilityGroup) {
    const legacyMovieId = createMovieId(movie.title, movie.year);
    const storedMovieId = isInWatchlist(movie.id)
      ? movie.id
      : isInWatchlist(legacyMovieId)
        ? legacyMovieId
        : undefined;

    if (storedMovieId) {
      removeFromWatchlist(storedMovieId);
      return;
    }

    addToWatchlist({
      movieId: movie.id,
      title: movie.title,
      year: movie.year,
      poster: movie.poster,
    });
  }

  if (authLoading) {
    return (
      <div className="app-loading" aria-label="Loading application">
        <Loader2 className="spin" size={36} />
      </div>
    );
  }

  const movieGroups = data?.movies ?? [];

  return (
    <div className="app-shell">
      <Header
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onWatchlistClick={() => setShowWatchlist((value) => !value)}
        showWatchlist={showWatchlist}
        onSearch={handleSearch}
        searchQuery={searchQuery}
        isLoading={isLoading}
      />

      <main className="app-main">
        {showWatchlist && isAuthenticated ? (
          <WatchlistView
            items={watchlistItems}
            isLoading={watchlistLoading}
            onRemove={removeFromWatchlist}
            onSearchMovie={handleSearch}
          />
        ) : (
          <>
            {isLoading && (
              <div className="status-panel" role="status">
                <Loader2 className="spin" size={30} />
                <p>Checking streaming services across countries…</p>
              </div>
            )}

            {error && (
              <div className="status-panel status-panel--error" role="alert">
                <h2>We couldn’t load availability</h2>
                <p>Please check the connection and try the search again.</p>
              </div>
            )}

            {!isLoading && selectedMovie && (
              <MovieResults
                key={movieGroups.map((movie) => movie.id).join('|')}
                movies={movieGroups}
                selectedMovieId={selectedMovie.id}
                onSelectMovie={setSelectedMovieId}
                notAvailableIn={data?.notAvailableIn ?? []}
                isAuthenticated={isAuthenticated}
                isInWatchlist={
                  isInWatchlist(selectedMovie.id) ||
                  isInWatchlist(createMovieId(selectedMovie.title, selectedMovie.year))
                }
                onToggleWatchlist={() => handleToggleWatchlist(selectedMovie)}
              />
            )}

            {!isLoading && searchQuery && movieGroups.length === 0 && !error && (
              <div className="status-panel">
                <h2>No availability found</h2>
                <p>We couldn’t find “{searchQuery}” on the selected services.</p>
              </div>
            )}

            {!searchQuery && (
              <section className="empty-search" aria-labelledby="empty-search-title">
                <div className="empty-search__eyebrow">MOVIE AVAILABILITY</div>
                <h2 id="empty-search-title">Find it. See where it streams.</h2>
                <p>
                  Search once to compare availability across countries and services.
                </p>
              </section>
            )}

            {searchQuery && !isLoading && !error && (
              <RecommendationList
                movies={similar?.recommendations ?? []}
                isLoading={similarLoading}
                onSearchMovie={handleSearch}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MovieSearchApp />
    </QueryClientProvider>
  );
}
