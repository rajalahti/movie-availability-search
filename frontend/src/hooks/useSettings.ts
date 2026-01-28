import { useState, useEffect } from 'react';
import { PROVIDERS, ProviderName } from '../services/movieApi';

const STORAGE_KEY = 'movieSearch.selectedProviders';

export function useSettings() {
  const [defaultProviders, setDefaultProviders] = useState<ProviderName[]>([...PROVIDERS]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load settings from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as string[];
        // Validate that saved providers still exist in PROVIDERS
        const validProviders = parsed.filter((p): p is ProviderName =>
          PROVIDERS.includes(p as ProviderName)
        );
        if (validProviders.length > 0) {
          setDefaultProviders(validProviders);
        }
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
    setIsLoaded(true);
  }, []);

  // Save current selection as default
  const saveAsDefault = (providers: ProviderName[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(providers));
      setDefaultProviders(providers);
      return true;
    } catch (e) {
      console.error('Failed to save settings:', e);
      return false;
    }
  };

  // Reset to all providers
  const resetToDefaults = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setDefaultProviders([...PROVIDERS]);
      return true;
    } catch (e) {
      console.error('Failed to reset settings:', e);
      return false;
    }
  };

  return {
    defaultProviders,
    isLoaded,
    saveAsDefault,
    resetToDefaults,
  };
}
