'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MarkdownEditor: React.FC<MarkdownEditorProps> = ({
  value,
  onChange,
  placeholder = 'Enter your markdown content...',
  className,
  disabled = false,
}) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className={cn('relative', className)}>
      <textarea
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={cn(
          'w-full h-full min-h-[400px] p-4 border border-gray-300 rounded-lg',
          'font-mono text-sm leading-relaxed',
          'resize-none outline-none',
          'focus:ring-2 focus:ring-blue-500 focus:border-blue-500',
          'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
          'placeholder:text-gray-400',
          'scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100'
        )}
        spellCheck={false}
      />
      
      {/* Character count */}
      <div className="absolute bottom-2 right-2 text-xs text-gray-400 bg-white px-2 py-1 rounded">
        {value.length} characters
      </div>
    </div>
  );
};

export { MarkdownEditor };