import { useCallback, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';

/** Reload on every navigation focus; ignore results from a blurred screen. */
export function useFocusQuery<T>(query: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const generation = useRef(0);
  const load = useCallback(() => {
    const request = ++generation.current;
    setLoading(true);
    setError(false);
    query().then((result) => {
      if (request === generation.current) { setData(result); setLoading(false); }
    }, (cause) => {
      console.error('Unable to load local events', cause);
      if (request === generation.current) { setError(true); setLoading(false); }
    });
  }, [query]);
  useFocusEffect(useCallback(() => {
    load();
    return () => { generation.current += 1; };
  }, [load]));
  return { data, loading, error, retry: load };
}
