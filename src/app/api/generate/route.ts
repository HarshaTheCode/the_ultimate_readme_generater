

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getDatabase } from '@/lib/mongodb';
import { getReadmeCacheCollection, getUsersCollection } from '@/lib/database-schema';
import { createRepositoryAnalyzer } from '@/lib/repository-analyzer';
import { createAIReadmeGenerator, GenerationOptions } from '@/lib/ai-readme-generator';

export interface GenerateRequest {
  owner: string;
  repo: string;
  options?: GenerationOptions;
  forceRegenerate?: boolean;
}

export interface GenerateResponse {
  markdown: string;
  metadata: any;
  provider: string;
  cached: boolean;
  generatedAt: string;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: GenerateRequest = await request.json();
    const { owner, repo, options = {}, forceRegenerate = false } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo parameters are required' },
        { status: 400 }
      );
    }

    // Connect to database
    const db = await getDatabase();
    const usersCollection = getUsersCollection(db);
    const cacheCollection = getReadmeCacheCollection(db);

    // Get user from database
    const user = await usersCollection.findOne({ 
      githubId: session.user.githubId 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Check cache first (unless force regenerate is requested)
    if (!forceRegenerate) {
      const cached = await cacheCollection.findOne({
        userId: user._id,
        repositoryFullName: `${owner}/${repo}`,
        expiresAt: { $gt: new Date() }
      });

      if (cached) {
        console.log(`Returning cached README for ${owner}/${repo}`);
        return NextResponse.json({
          markdown: cached.markdown,
          metadata: cached.metadata,
          provider: 'Cache',
          cached: true,
          generatedAt: cached.generatedAt.toISOString()
        });
      }
    }

    // Create streaming response for real-time updates
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send initial status
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              status: 'analyzing', 
              message: 'Analyzing repository...' 
            })}\n\n`)
          );

          // Analyze repository
          const analyzer = await createRepositoryAnalyzer();
          const metadata = await analyzer.analyzeRepository(owner, repo);

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              status: 'generating', 
              message: 'Generating README with AI...' 
            })}\n\n`)
          );

          // Generate README with AI
          const aiGenerator = createAIReadmeGenerator();
          const result = await aiGenerator.generateReadme(metadata, options);

          // Cache the result
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30); // Cache for 30 days

          await cacheCollection.replaceOne(
            {
              userId: user._id,
              repositoryFullName: `${owner}/${repo}`
            },
            {
              userId: user._id,
              repositoryId: metadata.repository.id,
              repositoryFullName: `${owner}/${repo}`,
              markdown: result.markdown,
              metadata,
              generatedAt: result.generatedAt,
              expiresAt
            },
            { upsert: true }
          );

          // Send final result
          const response: GenerateResponse = {
            markdown: result.markdown,
            metadata,
            provider: result.provider,
            cached: false,
            generatedAt: result.generatedAt.toISOString()
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              status: 'complete', 
              result: response 
            })}\n\n`)
          );

          controller.close();
        } catch (error: any) {
          console.error('README generation error:', error);
          
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ 
              status: 'error', 
              error: error.message || 'Generation failed' 
            })}\n\n`)
          );
          
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (error: any) {
    console.error('API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

// Also provide a non-streaming endpoint for simpler clients
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body: GenerateRequest = await request.json();
    const { owner, repo, options = {}, forceRegenerate = false } = body;

    if (!owner || !repo) {
      return NextResponse.json(
        { error: 'Owner and repo parameters are required' },
        { status: 400 }
      );
    }

    // Connect to database
    const db = await getDatabase();
    const usersCollection = getUsersCollection(db);
    const cacheCollection = getReadmeCacheCollection(db);

    // Get user from database
    const user = await usersCollection.findOne({ 
      email: session.user.email 
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found in database' },
        { status: 404 }
      );
    }

    // Check cache first (unless force regenerate is requested)
    if (!forceRegenerate) {
      const cached = await cacheCollection.findOne({
        userId: user._id,
        repositoryFullName: `${owner}/${repo}`,
        expiresAt: { $gt: new Date() }
      });

      if (cached) {
        console.log(`Returning cached README for ${owner}/${repo}`);
        return NextResponse.json({
          markdown: cached.markdown,
          metadata: cached.metadata,
          provider: 'Cache',
          cached: true,
          generatedAt: cached.generatedAt.toISOString()
        });
      }
    }

    // Analyze repository
    const analyzer = await createRepositoryAnalyzer();
    const metadata = await analyzer.analyzeRepository(owner, repo);

    // Generate README with AI
    const aiGenerator = createAIReadmeGenerator();
    const result = await aiGenerator.generateReadme(metadata, options);

    // Cache the result
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30); // Cache for 30 days

    await cacheCollection.replaceOne(
      {
        userId: user._id,
        repositoryFullName: `${owner}/${repo}`
      },
      {
        userId: user._id,
        repositoryId: metadata.repository.id,
        repositoryFullName: `${owner}/${repo}`,
        markdown: result.markdown,
        metadata,
        generatedAt: result.generatedAt,
        expiresAt
      },
      { upsert: true }
    );

    // Return result
    const response: GenerateResponse = {
      markdown: result.markdown,
      metadata,
      provider: result.provider,
      cached: false,
      generatedAt: result.generatedAt.toISOString()
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('API error:', error);
    
    // Handle specific error types
    if (error.message?.includes('rate limit') || error.message?.includes('quota')) {
      return NextResponse.json(
        { 
          error: 'AI service rate limit exceeded. Please try again later.',
          retryAfter: 60
        },
        { status: 429 }
      );
    }

    if (error.message?.includes('Repository not found')) {
      return NextResponse.json(
        { error: 'Repository not found or not accessible' },
        { status: 404 }
      );
    }

    if (error.message?.includes('No available AI providers') || error.message?.includes('No AI providers')) {
      return NextResponse.json(
        { 
          error: 'Internal server error',
          details: 'No available AI providers'
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}