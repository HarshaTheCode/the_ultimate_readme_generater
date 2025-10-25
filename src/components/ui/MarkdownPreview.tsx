'use client';

import React, { useMemo } from 'react';
import { marked } from 'marked';
import { cn } from '@/lib/utils';

interface MarkdownPreviewProps {
  content: string;
  className?: string;
}

const MarkdownPreview: React.FC<MarkdownPreviewProps> = ({ content, className }) => {
  const htmlContent = useMemo(() => {
    // Configure marked options
    marked.setOptions({
      breaks: true,
      gfm: true,
    });

    try {
      return marked(content);
    } catch (error) {
      console.error('Markdown parsing error:', error);
      return '<p>Error parsing markdown content</p>';
    }
  }, [content]);

  return (
    <div
      className={cn(
        'prose prose-sm max-w-none',
        // Custom styles for better markdown rendering
        '[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h1]:mb-4',
        '[&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-gray-900 [&_h2]:mb-3 [&_h2]:mt-6',
        '[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_h3]:mb-2 [&_h3]:mt-4',
        '[&_p]:text-gray-700 [&_p]:leading-relaxed [&_p]:mb-4',
        '[&_a]:text-blue-600 [&_a]:no-underline hover:[&_a]:underline',
        '[&_strong]:text-gray-900 [&_strong]:font-semibold',
        '[&_code]:text-pink-600 [&_code]:bg-gray-100 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono',
        '[&_pre]:bg-gray-900 [&_pre]:text-gray-100 [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-4',
        '[&_pre_code]:text-gray-100 [&_pre_code]:bg-transparent [&_pre_code]:p-0',
        '[&_blockquote]:border-l-4 [&_blockquote]:border-gray-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_blockquote]:mb-4',
        '[&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-4',
        '[&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-4',
        '[&_li]:text-gray-700 [&_li]:mb-1',
        '[&_table]:border-collapse [&_table]:border [&_table]:border-gray-300 [&_table]:mb-4',
        '[&_th]:border [&_th]:border-gray-300 [&_th]:bg-gray-50 [&_th]:p-2 [&_th]:text-left [&_th]:font-semibold',
        '[&_td]:border [&_td]:border-gray-300 [&_td]:p-2',
        '[&_img]:rounded-lg [&_img]:shadow-sm [&_img]:mb-4',
        '[&_hr]:border-gray-300 [&_hr]:my-6',
        className
      )}
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
};

export { MarkdownPreview };