import React from 'react';
import { cn } from '@/lib/utils';
import { Repository } from '@/types';

interface RepositoryCardProps {
  repository: Repository;
  onClick?: (repository: Repository) => void;
  className?: string;
}

const RepositoryCard: React.FC<RepositoryCardProps> = ({
  repository,
  onClick,
  className
}) => {
  const handleClick = () => {
    onClick?.(repository);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getLanguageColor = (language: string | null) => {
    const colors: Record<string, string> = {
      JavaScript: 'bg-yellow-400',
      TypeScript: 'bg-blue-400',
      Python: 'bg-green-400',
      Java: 'bg-red-400',
      'C++': 'bg-pink-400',
      'C#': 'bg-purple-400',
      Go: 'bg-cyan-400',
      Rust: 'bg-orange-400',
      PHP: 'bg-indigo-400',
      Ruby: 'bg-red-500',
      Swift: 'bg-orange-500',
      Kotlin: 'bg-purple-500',
    };
    return colors[language || ''] || 'bg-gray-400';
  };

  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer hover:border-gray-300',
        className
      )}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">
              {repository.name}
            </h3>
            {repository.private && (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                Private
              </span>
            )}
          </div>
          
          {repository.description && (
            <p className="text-gray-600 text-sm mb-3 line-clamp-2">
              {repository.description}
            </p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            {repository.language && (
              <div className="flex items-center gap-1">
                <div
                  className={cn(
                    'w-3 h-3 rounded-full',
                    getLanguageColor(repository.language)
                  )}
                />
                <span>{repository.language}</span>
              </div>
            )}
            
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              <span>{repository.stargazers_count}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 017 7v2a1 1 0 11-2 0v-2a5 5 0 00-5-5H5.414l2.293 2.293a1 1 0 11-1.414 1.414L2.586 7l3.707-3.707a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>{repository.forks_count}</span>
            </div>
            
            {repository.open_issues_count > 0 && (
              <div className="flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>{repository.open_issues_count}</span>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <p className="text-xs text-gray-500">
          Updated {formatDate(repository.updated_at)}
        </p>
      </div>
    </div>
  );
};

export { RepositoryCard };