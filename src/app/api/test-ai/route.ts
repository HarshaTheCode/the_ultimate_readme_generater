import { NextRequest, NextResponse } from 'next/server';
import { ENV_CONFIG } from '@/lib/env-config';
import { getEnvVar } from '@/lib/temp-env';

export async function GET(request: NextRequest) {
  try {
    console.log('=== AI PROVIDER TEST ===');
    
    // Get API keys with fallbacks
    const openRouterKey = ENV_CONFIG.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || getEnvVar('OPENROUTER_API_KEY');

    const results: any = {
      openRouterKey: openRouterKey ? `present (${openRouterKey.length} chars)` : 'missing',
      tests: {}
    };

    // Test OpenRouter API
    if (openRouterKey && openRouterKey.trim()) {
      try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
            'X-Title': 'ReadMeGen MVP Test',
          },
          body: JSON.stringify({
            model: 'meta-llama/llama-3.1-8b-instruct:free',
            messages: [{ role: 'user', content: 'Say "Hello from OpenRouter!" in exactly those words.' }],
            max_tokens: 50
          })
        });

        if (response.ok) {
          const data = await response.json();
          const text = data.choices[0]?.message?.content || 'No content';
          results.tests.openrouter = {
            status: 'success',
            response: text.substring(0, 100) + (text.length > 100 ? '...' : '')
          };
        } else {
          const errorText = await response.text();
          results.tests.openrouter = {
            status: 'failed',
            error: `HTTP ${response.status}: ${errorText}`
          };
        }
      } catch (error: any) {
        results.tests.openrouter = {
          status: 'failed',
          error: error.message
        };
      }
    } else {
      results.tests.openrouter = {
        status: 'skipped',
        reason: 'No API key available'
      };
    }

    console.log('AI Test Results:', JSON.stringify(results, null, 2));

    return NextResponse.json({
      ...results,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('AI test endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'AI test endpoint failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}