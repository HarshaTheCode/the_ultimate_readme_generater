import React from 'react';
import { cn } from '@/lib/utils';

interface RepositoryCardSkeletonProps {
  className?: string;
}

const RepositoryCardSkeleton: React.FC<RepositoryCardSkeletonProps> = ({
  className
}) => {
  return (
    <div
      className={cn(
        'bg-white border border-gray-200 rounded-lg p-4 shadow-sm',
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-5 w-3/4 bg-gray-200 rounded animate-pulse" />
            <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
          </div>
          
          <div className="h-4 bg-gray-200 rounded w-full mb-2 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-5/6 mb-3 animate-pulse" />
          
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-gray-200 animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
            </div>
            
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
            </div>
            
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
            </div>
            
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-4 w-8 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
      
      <div className="mt-3 pt-3 border-t border-gray-100">
        <div className="h-4 w-1/3 bg-gray-200 rounded animate-pulse" />
      </div>
    </div>
  );
};

export { RepositoryCardSkeleton };