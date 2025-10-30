'use client';

import React from 'react'; // Removed useState, useEffect
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '../ui/Button';
import { useAuthContext } from '@/context/AuthContext'; // Added import

const Header: React.FC = () => {
  const { session, isLoading, signOut } = useAuthContext(); // Use useAuthContext
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut(); // Use signOut from context
    router.push('/');
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center">
            <Link href="/" className="flex items-center">
              <div className="shrink-0">
                <h1 className="text-xl font-bold text-gray-900">
                  ReadMeGen
                </h1>
              </div>
            </Link>
            
            {/* Navigation Links */}
            {session && (
              <nav className="hidden md:ml-8 md:flex md:space-x-8">
                <Link
                  href="/repositories"
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Repositories
                </Link>
              </nav>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {isLoading ? (
              <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
            ) : session ? (
              <div className="flex items-center space-x-3">
                {/* User Avatar and Info */}
                <div className="flex items-center space-x-2">
                  {session.user?.avatar_url && (
                    <Image // Replaced img with Image
                      className="h-8 w-8 rounded-full"
                      src={session.user.avatar_url}
                      alt={session.user.username || 'User avatar'}
                      width={32} // Added width
                      height={32} // Added height
                    />
                  )}
                  <span className="hidden sm:block text-sm font-medium text-gray-700">
                    {session.user?.username}
                  </span>
                </div>
                
                {/* Sign Out Button */}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSignOut}
                >
                  Sign Out
                </Button>
              </div>
            ) : (
              <Link href="/">
                <Button variant="primary" size="sm">
                  Sign In
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {session && (
        <div className="md:hidden border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              href="/repositories"
              className="text-gray-500 hover:text-gray-900 block px-3 py-2 rounded-md text-base font-medium transition-colors"
            >
              Repositories
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};

export { Header };