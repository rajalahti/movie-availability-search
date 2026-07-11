import { Bookmark, Film, LogOut } from 'lucide-react';
import { SearchBar } from './SearchBar';

interface Props {
  isAuthenticated: boolean;
  userEmail?: string;
  onSignIn: () => void;
  onSignOut: () => void;
  onWatchlistClick: () => void;
  showWatchlist: boolean;
  onSearch: (query: string) => void;
  searchQuery: string;
  isLoading: boolean;
}

export function Header({
  isAuthenticated,
  userEmail,
  onSignIn,
  onSignOut,
  onWatchlistClick,
  showWatchlist,
  onSearch,
  searchQuery,
  isLoading,
}: Props) {
  return (
    <header className="app-header">
      <div className="app-header__inner">
        <button
          type="button"
          className="brand-button"
          onClick={() => window.location.reload()}
          aria-label="Movie Availability home"
        >
          <Film size={28} aria-hidden="true" />
        </button>

        <SearchBar
          onSearch={onSearch}
          value={searchQuery}
          isLoading={isLoading}
        />

        {isAuthenticated ? (
          <div className="account-actions">
            <button
              type="button"
              onClick={onWatchlistClick}
              className={`icon-button ${showWatchlist ? 'icon-button--active' : ''}`}
              aria-label={showWatchlist ? 'Close watchlist' : 'Open watchlist'}
              aria-pressed={showWatchlist}
            >
              <Bookmark size={24} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={onSignOut}
              className="icon-button account-actions__sign-out"
              title={userEmail ? `Sign out ${userEmail}` : 'Sign out'}
              aria-label="Sign out"
            >
              <LogOut size={21} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            className="icon-button"
            aria-label="Sign in to open watchlist"
            title="Sign in to open watchlist"
          >
            <Bookmark size={24} aria-hidden="true" />
          </button>
        )}
      </div>
    </header>
  );
}
