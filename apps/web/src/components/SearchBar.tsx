import { FormEvent, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';

interface Props {
  onSearch: (query: string) => void;
  value?: string;
  isLoading?: boolean;
}

export function SearchBar({ onSearch, value = '', isLoading = false }: Props) {
  const [query, setQuery] = useState(value);

  useEffect(() => {
    setQuery(value);
  }, [value]);

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedQuery = query.trim();
    if (trimmedQuery) {
      onSearch(trimmedQuery);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="search-form" role="search">
      <Search size={20} aria-hidden="true" />
      <input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search for a movie"
        aria-label="Search for a movie"
      />
      <button
        type="submit"
        disabled={!query.trim() || isLoading}
        aria-label="Search"
      >
        {isLoading ? <Loader2 className="spin" size={18} /> : <span>Search</span>}
      </button>
    </form>
  );
}
