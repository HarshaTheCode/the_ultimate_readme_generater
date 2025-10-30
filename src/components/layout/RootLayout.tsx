import React from 'react';
import { Header } from './Header';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '@/context/AuthContext'; // Added import

interface RootLayoutProps {
  children: React.ReactNode;
}

const RootLayout: React.FC<RootLayoutProps> = ({ children }) => {
  return (
    <AuthProvider> {/* Added AuthProvider */}
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow">
          {children}
        </main>
        <Toaster position="bottom-right" />
      </div>
    </AuthProvider> // Closed AuthProvider
  );
};

export {RootLayout}