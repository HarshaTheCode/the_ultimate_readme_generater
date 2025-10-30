/**
 * React hooks for authentication
 * Provides session management, loading states, and auth utilities
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { authAPI, APIError } from '@/lib/api-client';

export interface User {
  id: string;
  githubId: number;
  username: string;
  email?: string;
  avatar_url: string;
}

export interface Session {
  user: User;
  expires: string;
}

export interface UseAuthReturn {
  session: Session | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  checkAuth: () => Promise<void>;
  signOut: () => Promise<void>;
}

/**
 * Hook for authentication state management
 */
export function useAuth(): UseAuthReturn {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await authAPI.getSession();
      
      if (result.user) {
        setSession({
          user: result.user,
          expires: result.expires,
        });
      } else {
        setSession(null);
      }
    } catch (err) {
      const errorMessage = err instanceof APIError 
        ? err.message 
        : 'Failed to check authentication';
      setError(errorMessage);
      setSession(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      setError(null);
      await authAPI.signOut();
      setSession(null);
      router.push('/');
    } catch (err) {
      const errorMessage = err instanceof APIError 
        ? err.message 
        : 'Failed to sign out';
      setError(errorMessage);
    }
  }, [router]);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    session,
    isLoading,
    error,
    isAuthenticated: !!session,
    checkAuth,
    signOut,
  };
}

/**
 * Hook for protected routes - redirects to home if not authenticated
 */
export function useRequireAuth() {
  const { session, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect if not loading and no session
    if (!isLoading && !session) {
      router.push('/');
    }
  }, [session, isLoading, router]);

  return {
    session,
    isLoading,
    isAuthenticated: !!session,
  };
}

/**
 * Hook for optimistic updates with error rollback
 */
export function useOptimisticUpdate<T>(initialData: T) {
  const [data, setData] = useState<T>(initialData);
  const [isOptimistic, setIsOptimistic] = useState(false);

  const updateOptimistically = useCallback(
    async (
      optimisticUpdate: (current: T) => T,
      asyncOperation: () => Promise<T>
    ) => {
      const previousData = data;
      
      try {
        // Apply optimistic update
        setData(optimisticUpdate(data));
        setIsOptimistic(true);

        // Perform async operation
        const result = await asyncOperation();
        
        // Update with real result
        setData(result);
      } catch (error) {
        // Rollback on error
        setData(previousData);
        throw error;
      } finally {
        setIsOptimistic(false);
      }
    },
    [data]
  );

  return {
    data,
    isOptimistic,
    updateOptimistically,
    setData,
  };
}