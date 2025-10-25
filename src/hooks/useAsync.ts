/**
 * Generic hook for handling async operations with loading states
 */

import { useState, useCallback } from 'react';

export interface AsyncState<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

export interface UseAsyncReturn<T, Args extends any[]> extends AsyncState<T> {
  execute: (...args: Args) => Promise<T | null>;
  reset: () => void;
}

/**
 * Hook for managing async operations with loading and error states
 */
export function useAsync<T, Args extends any[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  immediate = false
): UseAsyncReturn<T, Args> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: immediate,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      try {
        setState(prev => ({ ...prev, isLoading: true, error: null }));
        
        const result = await asyncFunction(...args);
        
        setState({
          data: result,
          isLoading: false,
          error: null,
        });
        
        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An error occurred';
        
        setState({
          data: null,
          isLoading: false,
          error: errorMessage,
        });
        
        return null;
      }
    },
    [asyncFunction]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}

/**
 * Hook for debounced async operations (useful for search)
 */
export function useDebouncedAsync<T, Args extends any[] = []>(
  asyncFunction: (...args: Args) => Promise<T>,
  delay = 300
): UseAsyncReturn<T, Args> {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    isLoading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args): Promise<T | null> => {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      return new Promise((resolve) => {
        const timeoutId = setTimeout(async () => {
          try {
            const result = await asyncFunction(...args);
            
            setState({
              data: result,
              isLoading: false,
              error: null,
            });
            
            resolve(result);
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An error occurred';
            
            setState({
              data: null,
              isLoading: false,
              error: errorMessage,
            });
            
            resolve(null);
          }
        }, delay);

        // Store timeout ID for potential cleanup
        (resolve as any).timeoutId = timeoutId;
      });
    },
    [asyncFunction, delay]
  );

  const reset = useCallback(() => {
    setState({
      data: null,
      isLoading: false,
      error: null,
    });
  }, []);

  return {
    ...state,
    execute,
    reset,
  };
}