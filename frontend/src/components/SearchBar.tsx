import { useState, FormEvent } from 'react';
import { Search } from 'lucide-react';

interface Props {
  onSearch: (query: string) => void;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, isLoading }: Props) {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 w-full max-w-2xl">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search for a movie..."
        className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 
                   focus:border-primary focus:outline-none text-white placeholder-gray-500"
      />
      <button
        type="submit"
        disabled={!query.trim() || isLoading}
        className="px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg border border-gray-700
                   disabled:opacity-50 disabled:cursor-not-allowed
                   flex items-center gap-2 transition-colors"
      >
        <Search size={20} />
        <span className="hidden sm:inline">Search</span>
      </button>
    </form>
  );
}
