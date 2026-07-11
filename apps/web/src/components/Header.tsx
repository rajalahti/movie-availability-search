import { Film, Bookmark, LogOut, LogIn } from 'lucide-react';

interface Props {
  isAuthenticated: boolean;
  userEmail?: string;
  onSignIn: () => void;
  onSignOut: () => void;
  onWatchlistClick: () => void;
  showWatchlist: boolean;
}

export function Header({
  isAuthenticated,
  userEmail,
  onSignIn,
  onSignOut,
  onWatchlistClick,
  showWatchlist,
}: Props) {
  return (
    <header className="bg-gray-800 border-b border-gray-700">
      <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.location.reload()}>
          <Film className="text-primary" size={28} />
          <h1 className="text-xl font-bold hidden sm:block">Movie Search</h1>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <>
              <button
                onClick={onWatchlistClick}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors
                  ${showWatchlist ? 'bg-primary text-white' : 'hover:bg-gray-700'}`}
              >
                <Bookmark size={20} />
                <span className="hidden sm:inline">Watchlist</span>
              </button>
              
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-400 hidden md:block">
                  {userEmail}
                </span>
                <button
                  onClick={onSignOut}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-700 rounded-lg transition-colors"
                  title="Sign out"
                >
                  <LogOut size={20} />
                </button>
              </div>
            </>
          ) : (
            <button
              onClick={onSignIn}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-red-700 rounded-lg transition-colors"
            >
              <LogIn size={20} />
              <span>Sign In</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
