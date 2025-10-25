import { NextResponse } from 'next/server';

export async function GET() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    return NextResponse.json({ error: 'No OpenRouter API key found' }, { status: 400 });
  }

  try {
    console.log('Testing OpenRouter API key...');
    console.log('API Key length:', apiKey.length);
    console.log('API Key prefix:', apiKey.substring(0, 15) + '...');

    // Test with a simple request
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
        'X-Title': 'ReadMeGen MVP Test'
      }
    });

    console.log('OpenRouter models response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.log('OpenRouter models error:', errorText);
      
      return NextResponse.json({
        success: false,
        status: response.status,
        error: errorText,
        keyLength: apiKey.length,
        keyPrefix: apiKey.substring(0, 15) + '...'
      });
    }

    const data = await response.json();
    console.log('OpenRouter models success, found', data.data?.length || 0, 'models');

    return NextResponse.json({
      success: true,
      status: response.status,
      modelsCount: data.data?.length || 0,
      keyLength: apiKey.length,
      keyPrefix: apiKey.substring(0, 15) + '...',
      sampleModels: data.data?.slice(0, 5).map((m: any) => m.id) || []
    });

  } catch (error) {
    console.error('OpenRouter test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      keyLength: apiKey.length,
      keyPrefix: apiKey.substring(0, 15) + '...'
    });
  }
}