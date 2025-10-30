'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SearchInput } from '@/components/ui/SearchInput';
import { RepositoryCard } from '@/components/ui/RepositoryCard';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { RepositoryCardSkeleton } from '@/components/ui/RepositoryCardSkeleton'; // Added import
import { useAuthContext } from '@/context/AuthContext'; // New import
import { useRepositories, useRepositoryFilter } from '@/hooks'; // Removed useRequireAuth
import { Repository } from '@/types';

export default function RepositoriesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  // Use authentication hook for protected route
  const { session, isLoading: authLoading } = useAuthContext(); // Changed to useAuthContext

  // Use repositories hook for data fetching
  const {
    repositories,
    isLoading: reposLoading,
    error,
    refetch,
  } = useRepositories({
    autoFetch: !!session, // Only fetch when authenticated
  });

  // Use client-side filtering
  const filteredRepositories = useRepositoryFilter(repositories, searchQuery);

  const isLoading = authLoading || reposLoading;

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleRepositoryClick = (repository: Repository) => {
    // Navigate to README generation page
    router.push(`/generate/${repository.full_name}`);
  };

  const handleRetry = () => {
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Loading your repositories...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Something went wrong</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <Button onClick={handleRetry} variant="primary">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Your Repositories</h1>
              <p className="text-gray-600 mt-1">
                Select a repository to generate a professional README
              </p>
            </div>
            {session && (
              <div className="flex items-center gap-3">
                <Image // Replaced img with Image
                  src={session.user.avatar_url}
                  alt={session.user.username}
                  width={40} // Added width
                  height={40} // Added height
                  className="w-10 h-10 rounded-full"
                />
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">{session.user.username}</p>
                  <p className="text-xs text-gray-500">{repositories.length} repositories</p>
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="max-w-md">
            <SearchInput
              placeholder="Search repositories..."
              onSearch={handleSearch}
              className="w-full"
            />
          </div>
        </div>

        {/* Repository List */}
        {filteredRepositories.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery ? (
              <div>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories found</h3>
                <p className="text-gray-600">
                  No repositories match your search for "{searchQuery}". Try a different search term.
                </p>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No repositories found</h3>
                <p className="text-gray-600">
                  You don't have any accessible repositories yet. Create a repository on GitHub to get started.
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRepositories.map((repository) => (
              <RepositoryCard
                key={repository.id}
                repository={repository}
                onClick={handleRepositoryClick}
                className="h-full"
              />
            ))}
          </div>
        )}

        {/* Results Summary */}
        {repositories.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-500">
            {searchQuery ? (
              <p>
                Showing {filteredRepositories.length} of {repositories.length} repositories
                {searchQuery && ` matching "${searchQuery}"`}
              </p>
            ) : (
              <p>Showing all {repositories.length} repositories</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}




