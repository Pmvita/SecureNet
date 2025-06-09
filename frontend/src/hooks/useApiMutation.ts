import { useState, useCallback } from 'react';
import type { ApiError } from '../types';

interface MutationOptions<TData, TVariables> {
  mutationFn: (variables: TVariables) => Promise<TData>;
  onSuccess?: (data: TData, variables: TVariables) => void | Promise<void>;
  onError?: (error: ApiError, variables: TVariables) => void | Promise<void>;
  onSettled?: (data: TData | null, error: ApiError | null, variables: TVariables) => void | Promise<void>;
}

interface MutationResult<TData, TVariables> {
  data: TData | null;
  error: ApiError | null;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
  mutate: (variables: TVariables) => Promise<void>;
  mutateAsync: (variables: TVariables) => Promise<TData>;
  reset: () => void;
}

export function useApiMutation<TData, TVariables>({
  mutationFn,
  onSuccess,
  onError,
  onSettled,
}: MutationOptions<TData, TVariables>): MutationResult<TData, TVariables> {
  const [data, setData] = useState<TData | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const executeMutation = useCallback(async (variables: TVariables): Promise<TData> => {
    setIsLoading(true);
    setError(null);
    setIsError(false);
    setIsSuccess(false);

    try {
      const result = await mutationFn(variables);
      setData(result);
      setIsSuccess(true);
      await onSuccess?.(result, variables);
      return result;
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError);
      setIsError(true);
      await onError?.(apiError, variables);
      throw apiError;
    } finally {
      setIsLoading(false);
      await onSettled?.(data, error, variables);
    }
  }, [mutationFn, onSuccess, onError, onSettled, data, error]);

  const mutate = useCallback(async (variables: TVariables) => {
    try {
      await executeMutation(variables);
    } catch {
      // Error is handled in executeMutation
    }
  }, [executeMutation]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setIsLoading(false);
    setIsError(false);
    setIsSuccess(false);
  }, []);

  return {
    data,
    error,
    isLoading,
    isError,
    isSuccess,
    mutate,
    mutateAsync: executeMutation,
    reset,
  };
}

// Example usage:
/*
function UpdateProfile() {
  const { mutate, isLoading, error, isSuccess } = useApiMutation({
    mutationFn: (variables: { name: string; email: string }) =>
      userApi.updateProfile(variables),
    onSuccess: (data, variables) => {
      console.log('Profile updated:', data);
      // Optionally invalidate queries or update cache
    },
    onError: (error, variables) => {
      console.error('Failed to update profile:', error);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutate({
      name: 'John Doe',
      email: 'john@example.com',
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      {isLoading && <div>Updating...</div>}
      {error && <div>Error: {error.message}</div>}
      {isSuccess && <div>Profile updated successfully!</div>}
      <button type="submit" disabled={isLoading}>
        Update Profile
      </button>
    </form>
  );
}
*/ 