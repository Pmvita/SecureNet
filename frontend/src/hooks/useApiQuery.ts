import { useState, useCallback, useEffect } from 'react';
import type { ApiError } from '../types';

interface QueryOptions<T> {
  queryFn: () => Promise<T>;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: ApiError) => void;
  refetchInterval?: number;
  refetchOnWindowFocus?: boolean;
  retry?: number | boolean;
  retryDelay?: number;
}

interface QueryResult<T> {
  data: T | null;
  error: ApiError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  refetch: () => Promise<void>;
  reset: () => void;
}

export function useApiQuery<T>({
  queryFn,
  enabled = true,
  onSuccess,
  onError,
  refetchInterval,
  refetchOnWindowFocus = false,
  retry = 1,
  retryDelay = 1000,
}: QueryOptions<T>): QueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);

  const executeQuery = useCallback(async () => {
    if (!enabled) return;

    // Check if data is still fresh (within 30 seconds)
    const now = Date.now();
    if (now - lastFetchTime < 30000) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setIsError(false);
    setIsSuccess(false);

    try {
      const result = await queryFn();
      setData(result);
      setIsSuccess(true);
      setLastFetchTime(now);
      onSuccess?.(result);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setIsError(true);
      onError?.(apiError);

      // Handle retry logic
      if (retry !== false && retryCount < (typeof retry === 'number' ? retry : 1)) {
        setRetryCount(prev => prev + 1);
        setTimeout(() => {
          executeQuery();
        }, retryDelay);
      }
    } finally {
      setIsLoading(false);
    }
  }, [queryFn, enabled, onSuccess, onError, retry, retryCount, retryDelay, lastFetchTime]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setIsError(false);
    setIsSuccess(false);
    setRetryCount(0);
  }, []);

  // Initial fetch
  useEffect(() => {
    if (enabled) {
      executeQuery();
    }
  }, [enabled, executeQuery]);

  // Refetch interval
  useEffect(() => {
    if (!refetchInterval || !enabled) return;

    const intervalId = setInterval(() => {
      executeQuery();
    }, refetchInterval);

    return () => clearInterval(intervalId);
  }, [refetchInterval, enabled, executeQuery]);

  // Window focus refetch
  useEffect(() => {
    if (!refetchOnWindowFocus || !enabled) return;

    const handleFocus = () => {
      executeQuery();
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [refetchOnWindowFocus, enabled, executeQuery]);

  return {
    data,
    error,
    isLoading,
    isError,
    isSuccess,
    refetch: executeQuery,
    reset,
  };
}

// Example usage:
/*
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useApiQuery({
    queryFn: () => userApi.getProfile(),
    enabled: !!userId,
    refetchInterval: 30000, // Refetch every 30 seconds
    onSuccess: (data) => {
      console.log('Profile loaded:', data);
    },
    onError: (error) => {
      console.error('Failed to load profile:', error);
    },
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  if (!data) return null;

  return (
    <div>
      <h1>{data.name}</h1>
      <p>{data.email}</p>
    </div>
  );
}
*/ 