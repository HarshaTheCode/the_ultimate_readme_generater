import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import { User } from '@/types/database';
import { getUsersCollection } from './database-schema';
import { getDatabase } from './mongodb';

const JWT_SECRET = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'your-secret-key'
);

export interface SessionUser {
  id: string;
  githubId: number;
  username: string;
  email?: string;
  avatar_url: string;
}

export interface Session {
  user: SessionUser;
  expires: string;
}

// Create JWT token for user session
export async function createSession(user: User): Promise<string> {
  const payload = {
    user: {
      id: user._id?.toString(),
      githubId: user.githubId,
      username: user.username,
      email: user.email,
      avatar_url: user.avatar_url,
    },
    expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };

  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);

  return token;
}

// Verify JWT token and return session
export async function verifySession(token: string): Promise<Session | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    // Validate payload structure
    if (
      payload &&
      typeof payload === 'object' &&
      'user' in payload &&
      'expires' in payload
    ) {
      return payload as unknown as Session;
    }
    
    return null;
  } catch (error) {
    console.error('Session verification failed:', error);
    return null;
  }
}

// Get current session from cookies
export async function getSession(): Promise<Session | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('session-token')?.value;

  if (!token) {
    return null;
  }

  return verifySession(token);
}

// Set session cookie
export async function setSessionCookie(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set('session-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    path: '/',
  });
}

// Clear session cookie
export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete('session-token');
}

// Create or update user in database
export async function createOrUpdateUser(githubUser: any, accessToken: string): Promise<User> {
  const db = await getDatabase();
  const usersCollection = getUsersCollection(db);

  const now = new Date();
  const userData: Partial<User> = {
    githubId: githubUser.id,
    username: githubUser.login,
    email: githubUser.email,
    avatar_url: githubUser.avatar_url,
    accessToken: accessToken, // In production, this should be encrypted
    lastLoginAt: now,
  };

  // Try to update existing user or create new one
  const result = await usersCollection.findOneAndUpdate(
    { githubId: githubUser.id },
    {
      $set: userData,
      $setOnInsert: { createdAt: now },
    },
    {
      upsert: true,
      returnDocument: 'after',
    }
  );

  if (!result) {
    throw new Error('Failed to create or update user');
  }

  return result;
}

// Get GitHub OAuth URL
export function getGitHubAuthUrl(): string {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error('GITHUB_CLIENT_ID environment variable is not set');
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/api/auth/callback/github`,
    scope: 'repo:read user:email',
    state: generateRandomState(),
  });

  return `https://github.com/login/oauth/authorize?${params.toString()}`;
}

// Exchange GitHub code for access token
export async function exchangeGitHubCode(code: string): Promise<{ access_token: string; user: any }> {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error('GitHub OAuth credentials are not configured');
  }

  // Exchange code for access token
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
    }),
  });

  const tokenData = await tokenResponse.json();

  if (tokenData.error) {
    throw new Error(`GitHub OAuth error: ${tokenData.error_description}`);
  }

  // Get user information
  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      'Authorization': `Bearer ${tokenData.access_token}`,
      'Accept': 'application/vnd.github.v3+json',
    },
  });

  const userData = await userResponse.json();

  if (!userResponse.ok) {
    throw new Error(`GitHub API error: ${userData.message}`);
  }

  return {
    access_token: tokenData.access_token,
    user: userData,
  };
}

// Generate random state for OAuth security
function generateRandomState(): string {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}