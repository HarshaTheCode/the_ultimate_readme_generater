import { NextRequest, NextResponse } from 'next/server';
import { ENV_CONFIG } from '@/lib/env-config';
import { getEnvVar } from '@/lib/temp-env';

export async function GET(request: NextRequest) {
  try {
    console.log('=== DEBUG ENV ENDPOINT ===');
    
    // Check all environment variable sources
    const debugInfo = {
      processEnv: {
        GEMINI_API_KEY: process.env.GEMINI_API_KEY ? `present (${process.env.GEMINI_API_KEY.length} chars)` : 'missing',
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY ? `present (${process.env.OPENROUTER_API_KEY.length} chars)` : 'missing',
        NODE_ENV: process.env.NODE_ENV,
      },
      envConfig: {
        GEMINI_API_KEY: ENV_CONFIG.GEMINI_API_KEY ? `present (${ENV_CONFIG.GEMINI_API_KEY.length} chars)` : 'missing',
        OPENROUTER_API_KEY: ENV_CONFIG.OPENROUTER_API_KEY ? `present (${ENV_CONFIG.OPENROUTER_API_KEY.length} chars)` : 'missing',
        NODE_ENV: ENV_CONFIG.NODE_ENV,
      },
      tempEnv: {
        GEMINI_API_KEY: getEnvVar('GEMINI_API_KEY') ? `present (${getEnvVar('GEMINI_API_KEY')!.length} chars)` : 'missing',
        OPENROUTER_API_KEY: getEnvVar('OPENROUTER_API_KEY') ? `present (${getEnvVar('OPENROUTER_API_KEY')!.length} chars)` : 'missing',
      },
      finalKeys: {
        geminiKey: ENV_CONFIG.GEMINI_API_KEY || process.env.GEMINI_API_KEY || getEnvVar('GEMINI_API_KEY'),
        openRouterKey: ENV_CONFIG.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || getEnvVar('OPENROUTER_API_KEY'),
      }
    };

    // Log to console for server-side debugging
    console.log('Environment Debug Info:', JSON.stringify(debugInfo, null, 2));

    // Test AI provider initialization
    let providerTest = 'Not tested';
    try {
      const { createAIReadmeGenerator } = await import('@/lib/ai-readme-generator');
      const generator = createAIReadmeGenerator();
      providerTest = `Success: ${generator.getAvailableProviders().join(', ')}`;
    } catch (error: any) {
      providerTest = `Failed: ${error.message}`;
    }

    return NextResponse.json({
      ...debugInfo,
      providerInitialization: providerTest,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Debug endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Debug endpoint failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}