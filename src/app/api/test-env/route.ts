import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    nodeEnv: process.env.NODE_ENV,
    hasGeminiKey: !!process.env.GEMINI_API_KEY,
    hasOpenRouterKey: !!process.env.OPENROUTER_API_KEY,
    hasMongoUri: !!process.env.MONGODB_URI,
    hasGithubClientId: !!process.env.GITHUB_CLIENT_ID,
    geminiKeyLength: process.env.GEMINI_API_KEY?.length || 0,
    openRouterKeyLength: process.env.OPENROUTER_API_KEY?.length || 0,
  });
}