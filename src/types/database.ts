import { ObjectId } from 'mongodb';

// User interface for MongoDB documents
export interface User {
  _id?: ObjectId;
  githubId: number;
  username: string;
  email?: string;
  avatar_url: string;
  accessToken: string; // encrypted
  createdAt: Date;
  lastLoginAt: Date;
}

// README Cache interface for MongoDB documents
export interface ReadmeCache {
  _id?: ObjectId;
  userId: ObjectId;
  repositoryId: number;
  repositoryFullName: string;
  markdown: string;
  metadata: RepositoryMetadata;
  generatedAt: Date;
  expiresAt: Date; // TTL index
}

// Package Manager interface
export interface PackageManager {
  type: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry' | 'go' | 'maven' | 'gradle' | 'cargo' | 'composer' | 'gem' | 'nuget';
  configFile: string;
  installCommand: string;
  runCommand?: string;
}

// Repository metadata interface
export interface RepositoryMetadata {
  name: string;
  description: string | null;
  language: string | null;
  topics: string[];
  license: {
    name: string;
    key: string;
    content?: string;
  } | null;
  packageManager: PackageManager | null;
  dependencies: string[];
  devDependencies: string[];
  scripts: Record<string, string>;
  contributors: Contributor[];
  languages: Record<string, number>;
  badges: Badge[];
  repository: any; // GitHubRepository type
  hasReadme: boolean;
  existingReadme?: string;
}

export interface Contributor {
  login: string;
  avatar_url: string;
  contributions: number;
}

export interface Badge {
  label: string;
  message: string;
  color: string;
  url: string;
  altText: string;
}

// Database collection names
export const COLLECTIONS = {
  USERS: 'users',
  README_CACHE: 'readme_cache',
} as const;