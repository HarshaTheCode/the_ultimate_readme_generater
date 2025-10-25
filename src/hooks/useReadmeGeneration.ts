/**
 * React hooks for README generation
 * Provides loading states, error handling, and generation management
 */

import { useState, useCallback } from 'react';
import { readmeAPI, APIError } from '@/lib/api-client';

export interface GeneratedReadme {
  markdown: string;
  metadata: {
    repository: {
      id: number;
      name: string;
      full_name: string;
      description: string | null;
      language: string | null;
      topics: string[];
      license: {
        name: string;
        content?: string;
      } | null;
    };
    packageManager: string | null;
    dependencies: string[];
    scripts: Record<string, string>;
    contributors: Array<{
      login: string;
      avatar_url: string;
      contributions: number;
    }>;
    badges: Array<{
      label: string;
      message: string;
      color: string;
      url: string;
    }>;
  };
  provider: string;
  cached: boolean;
  generatedAt: string;
}

export interface UseReadmeGenerationReturn {
  generatedReadme: GeneratedReadme | null;
  isGenerating: boolean;
  error: string | null;
  progress: number;
  generateReadme: (owner: string, repo: string) => Promise<void>;
  reset: () => void;
}

/**
 * Hook for README generation with progress tracking
 */
export function useReadmeGeneration(): UseReadmeGenerationReturn {
  const [generatedReadme, setGeneratedReadme] = useState<GeneratedReadme | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const generateReadme = useCallback(async (owner: string, repo: string) => {
    try {
      console.log('useReadmeGeneration: Starting generation for', owner, repo);
      setIsGenerating(true);
      setError(null);
      setProgress(0);
      setGeneratedReadme(null);

      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev;
          return prev + Math.random() * 20;
        });
      }, 200);

      console.log('useReadmeGeneration: Calling API...');
      const result = await readmeAPI.generateReadme(owner, repo);
      console.log('useReadmeGeneration: API response received', result);
      
      clearInterval(progressInterval);
      setProgress(100);
      setGeneratedReadme(result);
    } catch (err) {
      console.error('useReadmeGeneration: Error occurred', err);
      const errorMessage = err instanceof APIError 
        ? err.message 
        : 'Failed to generate README';
      setError(errorMessage);
      setGeneratedReadme(null);
    } finally {
      setIsGenerating(false);
      // Keep progress at 100% briefly before resetting
      setTimeout(() => setProgress(0), 1000);
    }
  }, []);

  const reset = useCallback(() => {
    setGeneratedReadme(null);
    setError(null);
    setProgress(0);
    setIsGenerating(false);
  }, []);

  return {
    generatedReadme,
    isGenerating,
    error,
    progress,
    generateReadme,
    reset,
  };
}

/**
 * Hook for README editing and preview
 */
export function useReadmeEditor(initialMarkdown = '') {
  const [markdown, setMarkdown] = useState(initialMarkdown);
  const [isDirty, setIsDirty] = useState(false);

  const updateMarkdown = useCallback((newMarkdown: string) => {
    setMarkdown(newMarkdown);
    setIsDirty(newMarkdown !== initialMarkdown);
  }, [initialMarkdown]);

  const reset = useCallback(() => {
    setMarkdown(initialMarkdown);
    setIsDirty(false);
  }, [initialMarkdown]);

  const downloadReadme = useCallback((filename?: string) => {
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename || 'README.md';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [markdown]);

  return {
    markdown,
    isDirty,
    updateMarkdown,
    reset,
    downloadReadme,
  };
}