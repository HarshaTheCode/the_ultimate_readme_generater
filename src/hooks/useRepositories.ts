/**
 * React hooks for repository data fetching
 * Provides loading states, error handling, and data management
 */

import { useState, useEffect, useCallback } from 'react';
import { repositoryAPI, APIError } from '@/lib/api-client';
import { Repository } from '@/types';

export interface UseRepositoriesOptions {
  page?: number;
  per_page?: number;
  sort?: 'created' | 'updated' | 'pushed' | 'full_name';
  direction?: 'asc' | 'desc';
  search?: string;
  autoFetch?: boolean;
}

export interface UseRepositoriesReturn {
  repositories: Repository[];
  isLoading: boolean;
  error: string | null;
  hasNextPage: boolean;
  totalCount: number;
  refetch: () => Promise<void>;
  fetchMore: () => Promise<void>;
}

/**
 * Hook for fetching user repositories with search and pagination
 */
export function useRepositories(options: UseRepositoriesOptions = {}): UseRepositoriesReturn {
  const {
    page = 1,
    per_page = 30,
    sort = 'updated',
    direction = 'desc',
    search,
    autoFetch = true,
  } = options;

  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(page);

  const fetchRepositories = useCallback(async (pageNum = 1, append = false) => {
    try {
      setIsLoading(true);
      setError(null);

      const result = await repositoryAPI.getRepositories({
        page: pageNum,
        per_page,
        sort,
        direction,
        search,
      });

      if (append) {
        setRepositories(prev => [...prev, ...result.repositories]);
      } else {
        setRepositories(result.repositories);
      }

      setHasNextPage(result.hasNextPage);
      setTotalCount(result.totalCount);
      setCurrentPage(pageNum);
    } catch (err) {
      const errorMessage = err instanceof APIError 
        ? err.message 
        : 'Failed to fetch repositories';
      setError(errorMessage);
      
      if (!append) {
        setRepositories([]);
      }
    } finally {
      setIsLoading(false);
    }
  }, [per_page, sort, direction, search]);

  const refetch = useCallback(() => {
    return fetchRepositories(1, false);
  }, [fetchRepositories]);

  const fetchMore = useCallback(() => {
    if (hasNextPage && !isLoading) {
      return fetchRepositories(currentPage + 1, true);
    }
    return Promise.resolve();
  }, [fetchRepositories, hasNextPage, isLoading, currentPage]);

  // Auto-fetch on mount and when search/sort options change
  useEffect(() => {
    if (autoFetch) {
      fetchRepositories(1, false);
    }
  }, [fetchRepositories, autoFetch]);

  return {
    repositories,
    isLoading,
    error,
    hasNextPage,
    totalCount,
    refetch,
    fetchMore,
  };
}

/**
 * Hook for fetching a single repository
 */
export function useRepository(owner: string, repo: string) {
  const [repository, setRepository] = useState<Repository | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRepository = useCallback(async () => {
    if (!owner || !repo) return;

    try {
      setIsLoading(true);
      setError(null);

      const result = await repositoryAPI.getRepository(owner, repo);
      setRepository(result);
    } catch (err) {
      const errorMessage = err instanceof APIError 
        ? err.message 
        : 'Failed to fetch repository';
      setError(errorMessage);
      setRepository(null);
    } finally {
      setIsLoading(false);
    }
  }, [owner, repo]);

  useEffect(() => {
    fetchRepository();
  }, [fetchRepository]);

  return {
    repository,
    isLoading,
    error,
    refetch: fetchRepository,
  };
}

/**
 * Hook for client-side repository filtering
 */
export function useRepositoryFilter(repositories: Repository[], searchQuery: string) {
  const [filteredRepositories, setFilteredRepositories] = useState<Repository[]>(repositories);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredRepositories(repositories);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = repositories.filter(repo =>
        repo.name.toLowerCase().includes(query) ||
        (repo.description && repo.description.toLowerCase().includes(query)) ||
        (repo.language && repo.language.toLowerCase().includes(query)) ||
        repo.topics.some(topic => topic.toLowerCase().includes(query))
      );
      setFilteredRepositories(filtered);
    }
  }, [repositories, searchQuery]);

  return filteredRepositories;
}