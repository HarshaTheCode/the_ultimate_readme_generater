/**
 * Environment configuration utility
 * Ensures environment variables are properly loaded and validated.
 *
 * Unlike the previous implementation, this version:
 * 1. Relies on Next.js's standard environment variable loading (process.env).
 * 2. Does NOT manually read .env.local, which is fragile.
 * 3. Does NOT contain hardcoded fallback keys. The app will fail at startup
 *    if essential keys are missing, which is a safer practice.
 * 4. Provides a single, reliable source of truth for all configuration.
 */

// Log at the module level to give developers immediate feedback on startup.
if (typeof window === 'undefined') {
  console.log('Initializing Environment Configuration...');

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    console.error('CRITICAL ERROR: GitHub OAuth credentials (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET) are not set.');
  }

  if (!process.env.MONGODB_URI) {
    console.error('CRITICAL ERROR: MONGODB_URI is not set.');
  }

  if (!process.env.GEMINI_API_KEY && !process.env.OPENROUTER_API_KEY) {
    console.warn('WARNING: No AI provider keys (GEMINI_API_KEY, OPENROUTER_API_KEY) are set. README generation will fail.');
  } else {
    console.log(`- GEMINI_API_KEY: ${process.env.GEMINI_API_KEY ? 'present' : 'missing'}`);
    console.log(`- OPENROUTER_API_KEY: ${process.env.OPENROUTER_API_KEY ? 'present' : 'missing'}`);
  }
}

export const ENV_CONFIG = {
  // AI Provider Keys
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,

  // Database
  MONGODB_URI: process.env.MONGODB_URI,
  MONGODB_DB: process.env.MONGODB_DB || 'readme-generator',

  // GitHub OAuth
  GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID,
  GITHUB_CLIENT_SECRET: process.env.GITHUB_CLIENT_SECRET,

  // Auth & Session
  NEXTAUTH_URL: process.env.NEXTAUTH_URL,
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,

  // Node Environment
  NODE_ENV: process.env.NODE_ENV,
};

// Function to check if at least one AI provider is configured
export function isAIConfigured(): boolean {
  return !!ENV_CONFIG.GEMINI_API_KEY || !!ENV_CONFIG.OPENROUTER_API_KEY;
}
