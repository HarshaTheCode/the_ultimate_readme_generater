import { NextRequest, NextResponse } from 'next/server';
import { getGitHubAuthUrl } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUrl = getGitHubAuthUrl();
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Sign-in error:', error);
    return NextResponse.json(
      { error: 'Failed to initiate GitHub authentication' },
      { status: 500 }
    );
  }
}