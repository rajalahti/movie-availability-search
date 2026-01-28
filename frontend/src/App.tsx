import { useState, useEffect } from 'react';
import { Amplify } from 'aws-amplify';
import { signOut, signInWithRedirect, getCurrentUser, fetchUserAttributes } from 'aws-amplify/auth';
import { Hub } from 'aws-amplify/utils';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Loader2, Save, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

import { awsConfig } from './aws-config';
import { Header } from './components/Header';
import { SearchBar } from './components/SearchBar';
import { MovieCard } from './components/MovieCard';
import { WatchlistView } from './components/WatchlistView';
import { useMovieSearch, useSimilarMovies } from './hooks/useMovieSearch';
import { useWatchlist } from './hooks/useWatchlist';
import { useSettings } from './hooks/useSettings';
import { PROVIDERS, ProviderName } from './services/movieApi';

// Configure Amplify
Amplify.configure(awsConfig);

const queryClient = new QueryClient();

function MovieSearchApp() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showWatchlist, setShowWatchlist] = useState(false);
  const [showProviders, setShowProviders] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState<string>();
  const [authLoading, setAuthLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string>();

  // Settings hook for persistent provider preferences
  const { defaultProviders, isLoaded: settingsLoaded, saveAsDefault, resetToDefaults } = useSettings();
  const [selectedProviders, setSelectedProviders] = useState<ProviderName[]>([...PROVIDERS]);

  // Update selected providers when settings are loaded
  useEffect(() => {
    if (settingsLoaded) {
      setSelectedProviders(defaultProviders);
    }
  }, [settingsLoaded, defaultProviders]);

  const { data, isLoading, error } = useMovieSearch(searchQuery, selectedProviders);

  // Toggle a single provider
  function toggleProvider(provider: ProviderName) {
    setSelectedProviders(prev =>
      prev.includes(provider)
        ? prev.filter(p => p !== provider)
        : [...prev, provider]
    );
  }

  // Select/deselect all providers
  function toggleAllProviders() {
    setSelectedProviders(prev =>
      prev.length === PROVIDERS.length ? [] : [...PROVIDERS]
    );
  }

  // Save current selection as default
  function handleSaveAsDefault() {
    if (saveAsDefault(selectedProviders)) {
      setSaveMessage('✓ Saved as default');
      setTimeout(() => setSaveMessage(undefined), 2000);
    }
  }

  // Reset to all providers
  function handleReset() {
    if (resetToDefaults()) {
      setSelectedProviders([...PROVIDERS]);
      setSaveMessage('✓ Reset to all providers');
      setTimeout(() => setSaveMessage(undefined), 2000);
    }
  }
  const { data: similar } = useSimilarMovies(searchQuery);
  const { items: watchlistItems, isLoading: watchlistLoading, addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();

  // Check auth state on mount and handle OAuth callback
  useEffect(() => {
    // Listen for auth events
    const unsubscribe = Hub.listen('auth', ({ payload }) => {
      console.log('Auth event:', payload.event);
      if (payload.event === 'signedIn' || payload.event === 'signInWithRedirect') {
        checkAuth();
      } else if (payload.event === 'signedOut') {
        setIsAuthenticated(false);
        setUserEmail(undefined);
      } else if (payload.event === 'signInWithRedirect_failure') {
        console.error('Sign in redirect failed:', payload.data);
        setAuthLoading(false);
      }
    });

    // Check current auth state
    checkAuth();

    // Clean up URL params after OAuth redirect
    if (window.location.search.includes('code=')) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => unsubscribe();
  }, []);

  async function checkAuth() {
    try {
      console.log('checkAuth: Getting current user...');
      const user = await getCurrentUser();
      console.log('checkAuth: Got user:', user.username);
      
      try {
        const attributes = await fetchUserAttributes();
        console.log('checkAuth: Got attributes:', attributes.email);
        setUserEmail(attributes.email);
      } catch (attrErr) {
        console.warn('checkAuth: Could not get attributes:', attrErr);
        // Still set authenticated even without attributes
        setUserEmail(user.username);
      }
      
      setIsAuthenticated(true);
    } catch (err) {
      console.log('checkAuth: Not authenticated:', err);
      setIsAuthenticated(false);
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignIn() {
    try {
      // Use Amplify's built-in OAuth redirect
      await signInWithRedirect();
    } catch (error) {
      console.error('Sign in error:', error);
    }
  }

  async function handleSignOut() {
    try {
      await signOut();
      setShowWatchlist(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  }

  function handleSearch(query: string) {
    setSearchQuery(query);
    setShowWatchlist(false);
  }

  function createMovieId(title: string, year: number): string {
    return `${title.toLowerCase().replace(/\s+/g, '-')}-${year}`;
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={48} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <Header
        isAuthenticated={isAuthenticated}
        userEmail={userEmail}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        onWatchlistClick={() => setShowWatchlist(!showWatchlist)}
        showWatchlist={showWatchlist}
      />

      <main className="max-w-6xl mx-auto px-4 py-8">
        {showWatchlist && isAuthenticated ? (
          <WatchlistView
            items={watchlistItems}
            isLoading={watchlistLoading}
            onRemove={removeFromWatchlist}
            onSearchMovie={handleSearch}
          />
        ) : (
          <>
            {/* Hero */}
            <div className="text-center mb-8">
              <h2 className="text-3xl sm:text-4xl font-bold text-primary mb-4">
                Find Movies Across Streaming Services
              </h2>
              <p className="text-gray-400 mb-6">
                Search once, find where to watch in multiple countries
              </p>
              <div className="flex justify-center">
                <SearchBar onSearch={handleSearch} isLoading={isLoading} />
              </div>

              {/* Provider Selection */}
              <div className="mt-4 max-w-2xl mx-auto">
                <button
                  onClick={() => setShowProviders(!showProviders)}
                  className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mx-auto"
                >
                  <span>Streaming services ({selectedProviders.length}/{PROVIDERS.length})</span>
                  {showProviders ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                
                {showProviders && (
                  <div className="mt-3 p-4 bg-gray-800 rounded-lg">
                    {/* Provider checkboxes */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {PROVIDERS.map(provider => (
                        <label
                          key={provider}
                          className={`flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors
                            ${selectedProviders.includes(provider)
                              ? 'bg-primary/20 text-primary border border-primary/50'
                              : 'bg-gray-700 text-gray-400 border border-gray-600 hover:border-gray-500'
                            }`}
                        >
                          <input
                            type="checkbox"
                            checked={selectedProviders.includes(provider)}
                            onChange={() => toggleProvider(provider)}
                            className="sr-only"
                          />
                          <span className="text-sm">{provider}</span>
                        </label>
                      ))}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-gray-700">
                      <button
                        onClick={toggleAllProviders}
                        className="text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        {selectedProviders.length === PROVIDERS.length ? 'Deselect all' : 'Select all'}
                      </button>
                      
                      <div className="flex-1" />
                      
                      <button
                        onClick={handleReset}
                        className="flex items-center gap-1 px-3 py-1 text-sm text-gray-400 hover:text-white transition-colors"
                      >
                        <RotateCcw size={14} />
                        Reset
                      </button>
                      
                      <button
                        onClick={handleSaveAsDefault}
                        className="flex items-center gap-1 px-3 py-1 bg-primary/20 text-primary rounded hover:bg-primary/30 transition-colors text-sm"
                      >
                        <Save size={14} />
                        Save as default
                      </button>
                      
                      {saveMessage && (
                        <span className="text-green-400 text-sm">{saveMessage}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Loading */}
            {isLoading && (
              <div className="flex justify-center py-12">
                <Loader2 className="animate-spin text-primary" size={48} />
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="text-center py-12">
                <p className="text-red-500">Error loading results. Please try again.</p>
              </div>
            )}

            {/* Results */}
            {data?.results && data.results.length > 0 && (
              <div className="space-y-4 mb-12">
                <h3 className="text-xl font-semibold">
                  Movies Found ({data.results.length})
                </h3>
                {data.results.map((movie, i) => {
                  const movieId = createMovieId(movie.title, movie.year);
                  return (
                    <MovieCard
                      key={`${movie.title}-${movie.country}-${i}`}
                      movie={movie}
                      isInWatchlist={isInWatchlist(movieId)}
                      isAuthenticated={isAuthenticated}
                      onToggleWatchlist={() => {
                        if (isInWatchlist(movieId)) {
                          removeFromWatchlist(movieId);
                        } else {
                          addToWatchlist({
                            movieId,
                            title: movie.title,
                            year: movie.year,
                            poster: movie.poster,
                          });
                        }
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* No results */}
            {searchQuery && data?.results?.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-400">No movies found for "{searchQuery}"</p>
              </div>
            )}

            {/* Recommendations */}
            {similar?.recommendations && similar.recommendations.length > 0 && (
              <div className="mt-12">
                <h3 className="text-xl font-semibold mb-4">★ Recommended Movies</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {similar.recommendations.slice(0, 9).map((movie) => (
                    <div
                      key={movie.title}
                      className="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="font-bold">{movie.title}</h4>
                          <p className="text-gray-400 text-sm">{movie.year}</p>
                        </div>
                      </div>
                      <p className="text-gray-300 text-sm line-clamp-2 mb-3">
                        {movie.description}
                      </p>
                      <button
                        onClick={() => handleSearch(movie.title)}
                        className="w-full py-2 bg-primary hover:bg-red-700 rounded text-sm transition-colors"
                      >
                        🔍 Search Availability
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!searchQuery && (
              <div className="text-center py-12">
                <p className="text-gray-500">Search for a movie to see results</p>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 mt-12">
        <div className="max-w-6xl mx-auto px-4 text-center text-gray-500 text-sm">
          <p>Movie Availability Search v2 • Built with React + AWS</p>
        </div>
      </footer>
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
