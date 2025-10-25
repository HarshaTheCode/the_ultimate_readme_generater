'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { MarkdownPreview } from '@/components/ui/MarkdownPreview';
import { MarkdownEditor } from '@/components/ui/MarkdownEditor';
import { useRequireAuth, useReadmeGeneration, useReadmeEditor } from '@/hooks';

export default function GeneratePage() {
  const [activeTab, setActiveTab] = useState<'preview' | 'edit'>('preview');
  const router = useRouter();
  const params = useParams();

  // Use authentication hook for protected route
  const { session, isLoading: authLoading } = useRequireAuth();

  // Use README generation hook
  const {
    generatedReadme,
    isGenerating,
    error: generationError,
    progress,
    generateReadme,
    reset,
  } = useReadmeGeneration();

  // Use README editor hook
  const {
    markdown: editedMarkdown,
    isDirty,
    updateMarkdown,
    downloadReadme,
  } = useReadmeEditor(generatedReadme?.markdown || '');

  // Extract owner and repo from params
  const repoPath = Array.isArray(params.repo) ? params.repo.join('/') : params.repo;
  const [owner, repoName] = repoPath?.split('/') || [];

  // Auto-generate README when authenticated and params are available
  useEffect(() => {
    if (session && owner && repoName && !generatedReadme && !isGenerating) {
      console.log('Starting README generation for:', owner, repoName);
      generateReadme(owner, repoName);
    }
  }, [session, owner, repoName, generatedReadme, isGenerating, generateReadme]);

  // Update editor when generated README changes
  useEffect(() => {
    if (generatedReadme?.markdown) {
      updateMarkdown(generatedReadme.markdown);
    }
  }, [generatedReadme?.markdown, updateMarkdown]);

  const handleDownload = () => {
    if (generatedReadme?.metadata?.repository?.name) {
      downloadReadme(`${generatedReadme.metadata.repository.name}-README.md`);
    } else {
      downloadReadme();
    }
  };

  const handleRetry = () => {
    if (owner && repoName) {
      reset();
      generateReadme(owner, repoName);
    }
  };

  const handleBackToRepos = () => {
    router.push('/repositories');
  };

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Show error for invalid repository path
  if (!owner || !repoName) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Invalid Repository Path</h2>
          <p className="text-gray-600 mb-6">The repository path is not valid.</p>
          <Button onClick={handleBackToRepos} variant="primary">
            Back to Repositories
          </Button>
        </div>
      </div>
    );
  }

  // Show generation loading
  if (isGenerating) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <LoadingSpinner size="lg" />
          <h2 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
            Generating README
          </h2>
          <p className="text-gray-600 mb-4">
            Analyzing your repository and generating a professional README...
          </p>
          <div className="text-sm text-gray-500 mb-4">
            Repository: <span className="font-mono">{owner}/{repoName}</span>
          </div>
          {progress > 0 && (
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show error state
  if (generationError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Generation Failed</h2>
          <p className="text-gray-600 mb-4">{generationError}</p>
          <div className="text-xs text-gray-500 mb-6 p-3 bg-gray-100 rounded">
            <strong>Debug Info:</strong><br />
            Repository: {owner}/{repoName}<br />
            Session: {session ? 'Authenticated' : 'Not authenticated'}<br />
            Auth Loading: {authLoading ? 'Yes' : 'No'}
          </div>
          <div className="flex gap-3 justify-center">
            <Button onClick={handleRetry} variant="primary">
              Try Again
            </Button>
            <Button onClick={handleBackToRepos} variant="outline">
              Back to Repositories
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show success state with README
  if (generatedReadme) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <button
                  onClick={handleBackToRepos}
                  className="flex items-center text-blue-600 hover:text-blue-700 mb-2 transition-colors"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Back to Repositories
                </button>
                <h1 className="text-3xl font-bold text-gray-900">{generatedReadme.metadata.repository.name}</h1>
                <p className="text-gray-600 mt-1">
                  {generatedReadme.metadata.repository.description || 'No description available'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleDownload}
                  variant="primary"
                  className="flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Download README.md</span>
                  {isDirty && <span className="text-xs">(edited)</span>}
                </Button>
              </div>
            </div>

            {/* Repository Info */}
            <div className="flex items-center gap-4 text-sm text-gray-500 mb-6">
              {generatedReadme.metadata.repository.language && (
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>{generatedReadme.metadata.repository.language}</span>
                </div>
              )}
              <div>
                Generated {new Date(generatedReadme.generatedAt).toLocaleString()}
                {generatedReadme.cached && ' (from cache)'}
              </div>
              {isDirty && (
                <div className="text-orange-600 font-medium">
                  • Edited
                </div>
              )}
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('preview')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'preview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Preview
                </button>
                <button
                  onClick={() => setActiveTab('edit')}
                  className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'edit'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                >
                  Edit
                </button>
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 min-h-[600px]">
            {activeTab === 'preview' ? (
              <div className="p-6">
                <MarkdownPreview content={editedMarkdown} />
              </div>
            ) : (
              <div className="p-6 h-full">
                <MarkdownEditor
                  value={editedMarkdown}
                  onChange={updateMarkdown}
                  placeholder="Edit your README content here..."
                  className="h-full min-h-[500px]"
                />
              </div>
            )}
          </div>

          {/* Footer Info */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>
              Make any edits you need, then download your README.md file.
              The preview updates in real-time as you edit.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Fallback state - show debug info
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center max-w-md mx-auto p-6">
        <LoadingSpinner size="lg" />
        <h2 className="text-xl font-semibold text-gray-900 mt-4 mb-2">
          Waiting...
        </h2>
        <div className="text-xs text-gray-500 p-3 bg-gray-100 rounded">
          <strong>Debug Info:</strong><br />
          Repository: {owner}/{repoName}<br />
          Session: {session ? 'Authenticated' : 'Not authenticated'}<br />
          Auth Loading: {authLoading ? 'Yes' : 'No'}<br />
          Is Generating: {isGenerating ? 'Yes' : 'No'}<br />
          Has Generated README: {generatedReadme ? 'Yes' : 'No'}<br />
          Error: {generationError || 'None'}
        </div>
        <div className="mt-4">
          <Button onClick={handleBackToRepos} variant="outline">
            Back to Repositories
          </Button>
        </div>
      </div>
    </div>
  );
}