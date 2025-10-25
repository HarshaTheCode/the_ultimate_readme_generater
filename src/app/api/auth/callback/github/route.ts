import { NextRequest, NextResponse } from 'next/server';
import { exchangeGitHubCode, createOrUpdateUser, createSession, setSessionCookie } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // Handle OAuth errors
  if (error) {
    console.error('GitHub OAuth error:', error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('Authentication failed')}`, request.url)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('No authorization code received')}`, request.url)
    );
  }

  try {
    // Exchange code for access token and user data
    const { access_token, user } = await exchangeGitHubCode(code);

    // Create or update user in database
    const dbUser = await createOrUpdateUser(user, access_token);

    // Create session token
    const sessionToken = await createSession(dbUser);

    // Create response and set cookie
    const response = NextResponse.redirect(new URL('/repositories', request.url));
    
    // Set session cookie
    response.cookies.set('session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Authentication callback error:', error);
    return NextResponse.redirect(
      new URL(`/?error=${encodeURIComponent('Authentication failed')}`, request.url)
    );
  }
}