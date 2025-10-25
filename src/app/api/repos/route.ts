import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { GitHubClient, GitHubAPIError } from '@/lib/github-client';

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const per_page = Math.min(parseInt(searchParams.get('per_page') || '30'), 100); // Limit to 100
    const sort = searchParams.get('sort') as 'created' | 'updated' | 'pushed' | 'full_name' || 'updated';
    const direction = searchParams.get('direction') as 'asc' | 'desc' || 'desc';
    const search = searchParams.get('search');

    // Create GitHub client
    const githubClient = await GitHubClient.fromSession();

    let result;
    if (search && search.trim()) {
      // Search repositories
      result = await githubClient.searchUserRepositories(search.trim(), {
        page,
        per_page,
      });
    } else {
      // Get all repositories
      result = await githubClient.getUserRepositories({
        page,
        per_page,
        sort,
        direction,
        type: 'owner', // Only show owned repositories
      });
    }

    return NextResponse.json(result.repositories, {
      status: 200,
      headers: {
        'X-Total-Count': result.totalCount?.toString() || result.repositories.length.toString(),
        'X-Has-Next-Page': result.hasNextPage.toString(),
      },
    });

  } catch (error) {
    console.error('Repository listing error:', error);

    if (error instanceof GitHubAPIError) {
      if (error.statusCode === 401) {
        return NextResponse.json(
          { error: 'GitHub authentication expired. Please sign in again.' },
          { status: 401 }
        );
      }

      if (error.statusCode === 403) {
        return NextResponse.json(
          { error: 'GitHub API rate limit exceeded. Please try again later.' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode || 500 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to fetch repositories' },
      { status: 500 }
    );
  }
}