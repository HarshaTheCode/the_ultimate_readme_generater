import { NextRequest, NextResponse } from 'next/server';
import { ENV_CONFIG } from '@/lib/env-config';
import { getEnvVar } from '@/lib/temp-env';

export async function GET(request: NextRequest) {
  try {
    console.log('=== AI PROVIDER TEST ===');
    
    // Get API keys with fallbacks
    const geminiKey = ENV_CONFIG.GEMINI_API_KEY || process.env.GEMINI_API_KEY || getEnvVar('GEMINI_API_KEY');
    const openRouterKey = ENV_CONFIG.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY || getEnvVar('OPENROUTER_API_KEY');

    const results: any = {
      geminiKey: geminiKey ? `present (${geminiKey.length} chars)` : 'missing',
      openRouterKey: openRouterKey ? `present (${openRouterKey.length} chars)` : 'missing',
      tests: {}
    };

    // Test Gemini API
    if (geminiKey && geminiKey.trim()) {
      try {
        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const client = new GoogleGenerativeAI(geminiKey);
        const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        const result = await model.generateContent('Say "Hello from Gemini!" in exactly those words.');
        const response = await result.response;
        const text = response.text();
        
        results.tests.gemini = {
          status: 'success',
          response: text.substring(0, 100) + (text.length > 100 ? '...' : '')
        };
      } catch (error: any) {
        results.tests.gemini = {
          status: 'failed',
          error: error.message
        };
      }
    } else {
      results.tests.gemini = {
        status: 'skipped',
        reason: 'No API key available'
      };
    }

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