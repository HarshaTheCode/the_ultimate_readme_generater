import { Octokit } from '@octokit/rest';
import { getSession } from './auth';
import { getUsersCollection } from './database-schema';
import { getDatabase } from './mongodb';
import { Repository } from '@/types';

export type GitHubRepository = Repository;

export interface GitHubFile {
  name: string;
  path: string;
  content: string;
  encoding: string;
  size: number;
}

export interface GitHubContributor {
  login: string;
  avatar_url: string;
  contributions: number;
}

export class GitHubAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public rateLimitRemaining?: number,
    public rateLimitReset?: number
  ) {
    super(message);
    this.name = 'GitHubAPIError';
  }
}

export class GitHubClient {
  private octokit: Octokit;
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
    this.octokit = new Octokit({
      auth: accessToken,
      userAgent: 'ReadMeGen-MVP/1.0.0',
      request: {
        timeout: 10000, // 10 second timeout
      },
    });
  }

  /**
   * Create GitHub client from current session
   */
  static async fromSession(): Promise<GitHubClient> {
    const session = await getSession();
    if (!session) {
      throw new GitHubAPIError('No active session found', 401);
    }

    // Get user's access token from database
    const db = await getDatabase();
    const usersCollection = getUsersCollection(db);
    const user = await usersCollection.findOne({ githubId: session.user.githubId });

    if (!user || !user.accessToken) {
      throw new GitHubAPIError('User access token not found', 401);
    }

    return new GitHubClient(user.accessToken);
  }

  /**
   * Fetch user's repositories with pagination support
   */
  async getUserRepositories(options: {
    page?: number;
    per_page?: number;
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    type?: 'all' | 'owner' | 'member';
  } = {}): Promise<{
    repositories: GitHubRepository[];
    hasNextPage: boolean;
    totalCount?: number;
  }> {
    try {
      const {
        page = 1,
        per_page = 30,
        sort = 'updated',
        direction = 'desc',
        type = 'owner'
      } = options;

      const response = await this.octokit.repos.listForAuthenticatedUser({
        page,
        per_page,
        sort,
        direction,
        type,
      });

      this.checkRateLimit(response.headers);

      const repositories = response.data.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        open_issues_count: repo.open_issues_count,
        topics: repo.topics || [],
        license: repo.license ? {
          key: repo.license.key,
          name: repo.license.name,
        } : null,
        owner: {
          login: repo.owner?.login || 'unknown',
          avatar_url: repo.owner?.avatar_url || '',
        },
        created_at: repo.created_at || new Date().toISOString(),
        updated_at: repo.updated_at || new Date().toISOString(),
        pushed_at: repo.pushed_at || repo.updated_at || new Date().toISOString(),
        default_branch: repo.default_branch,
        private: repo.private || false,
      }));

      // Check if there's a next page by looking at Link header
      const linkHeader = response.headers.link;
      const hasNextPage = linkHeader ? linkHeader.includes('rel="next"') : false;

      return {
        repositories,
        hasNextPage,
      };
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  /**
   * Search repositories for the authenticated user
   */
  async searchUserRepositories(query: string, options: {
    page?: number;
    per_page?: number;
  } = {}): Promise<{
    repositories: GitHubRepository[];
    hasNextPage: boolean;
    totalCount: number;
  }> {
    try {
      const { page = 1, per_page = 30 } = options;
      
      // Get current user to build search query
      const user = await this.octokit.users.getAuthenticated();
      const searchQuery = `${query} user:${user.data.login}`;

      const response = await this.octokit.search.repos({
        q: searchQuery,
        page,
        per_page,
        sort: 'updated',
        order: 'desc',
      });

      this.checkRateLimit(response.headers);

      const repositories = response.data.items.map(repo => ({
        id: repo.id,
        name: repo.name,
        full_name: repo.full_name,
        description: repo.description,
        language: repo.language,
        stargazers_count: repo.stargazers_count,
        forks_count: repo.forks_count,
        open_issues_count: repo.open_issues_count,
        topics: repo.topics || [],
        license: repo.license ? {
          key: repo.license.key,
          name: repo.license.name,
        } : null,
        owner: {
          login: repo.owner?.login || 'unknown',
          avatar_url: repo.owner?.avatar_url || '',
        },
        created_at: repo.created_at || new Date().toISOString(),
        updated_at: repo.updated_at || new Date().toISOString(),
        pushed_at: repo.pushed_at || repo.updated_at || new Date().toISOString(),
        default_branch: repo.default_branch,
        private: repo.private || false,
      }));

      const totalCount = response.data.total_count;
      const hasNextPage = page * per_page < totalCount;

      return {
        repositories,
        hasNextPage,
        totalCount,
      };
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  /**
   * Get a specific repository
   */
  async getRepository(owner: string, repo: string): Promise<GitHubRepository> {
    try {
      const response = await this.octokit.repos.get({
        owner,
        repo,
      });

      this.checkRateLimit(response.headers);

      const repository = response.data;
      return {
        id: repository.id,
        name: repository.name,
        full_name: repository.full_name,
        description: repository.description,
        language: repository.language,
        stargazers_count: repository.stargazers_count,
        forks_count: repository.forks_count,
        open_issues_count: repository.open_issues_count,
        topics: repository.topics || [],
        license: repository.license ? {
          key: repository.license.key,
          name: repository.license.name,
        } : null,
        owner: {
          login: repository.owner?.login || 'unknown',
          avatar_url: repository.owner?.avatar_url || '',
        },
        created_at: repository.created_at || new Date().toISOString(),
        updated_at: repository.updated_at || new Date().toISOString(),
        pushed_at: repository.pushed_at || repository.updated_at || new Date().toISOString(),
        default_branch: repository.default_branch,
        private: repository.private || false,
      };
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  /**
   * Get file content from repository
   */
  async getFileContent(owner: string, repo: string, path: string, ref?: string): Promise<GitHubFile | null> {
    try {
      const response = await this.octokit.repos.getContent({
        owner,
        repo,
        path,
        ref,
      });

      this.checkRateLimit(response.headers);

      // Handle single file response
      if (!Array.isArray(response.data) && response.data.type === 'file') {
        const file = response.data;
        return {
          name: file.name,
          path: file.path,
          content: file.content,
          encoding: file.encoding as string,
          size: file.size,
        };
      }

      return null;
    } catch (error) {
      // Return null for 404 errors (file not found)
      if (error instanceof Error && 'status' in error && error.status === 404) {
        return null;
      }
      throw this.handleAPIError(error);
    }
  }

  /**
   * Get repository contributors
   */
  async getRepositoryContributors(owner: string, repo: string, options: {
    page?: number;
    per_page?: number;
  } = {}): Promise<GitHubContributor[]> {
    try {
      const { page = 1, per_page = 30 } = options;

      const response = await this.octokit.repos.listContributors({
        owner,
        repo,
        page,
        per_page,
      });

      this.checkRateLimit(response.headers);

      return response.data.map(contributor => ({
        login: contributor.login || 'unknown',
        avatar_url: contributor.avatar_url || '',
        contributions: contributor.contributions,
      }));
    } catch (error) {
      // Return empty array for 404 errors (contributors not accessible)
      if (error instanceof Error && 'status' in error && error.status === 404) {
        return [];
      }
      throw this.handleAPIError(error);
    }
  }

  /**
   * Get repository languages
   */
  async getRepositoryLanguages(owner: string, repo: string): Promise<Record<string, number>> {
    try {
      const response = await this.octokit.repos.listLanguages({
        owner,
        repo,
      });

      this.checkRateLimit(response.headers);

      return response.data;
    } catch (error) {
      // Return empty object for 404 errors
      if (error instanceof Error && 'status' in error && error.status === 404) {
        return {};
      }
      throw this.handleAPIError(error);
    }
  }

  /**
   * Check rate limit status and throw error if exceeded
   */
  private checkRateLimit(headers: any): void {
    const remaining = parseInt(headers['x-ratelimit-remaining'] || '0');
    const reset = parseInt(headers['x-ratelimit-reset'] || '0');

    if (remaining <= 5) { // Warn when close to limit
      console.warn(`GitHub API rate limit low: ${remaining} requests remaining`);
    }

    if (remaining === 0) {
      const resetDate = new Date(reset * 1000);
      throw new GitHubAPIError(
        `GitHub API rate limit exceeded. Resets at ${resetDate.toISOString()}`,
        429,
        remaining,
        reset
      );
    }
  }

  /**
   * Handle API errors and convert to GitHubAPIError
   */
  private handleAPIError(error: any): GitHubAPIError {
    if (error instanceof GitHubAPIError) {
      return error;
    }

    // Handle Octokit errors
    if (error.status) {
      const statusCode = error.status;
      let message = error.message || 'GitHub API error';

      switch (statusCode) {
        case 401:
          message = 'GitHub authentication failed. Please sign in again.';
          break;
        case 403:
          if (error.message?.includes('rate limit')) {
            message = 'GitHub API rate limit exceeded. Please try again later.';
          } else {
            message = 'Access forbidden. Check repository permissions.';
          }
          break;
        case 404:
          message = 'Repository or resource not found.';
          break;
        case 422:
          message = 'Invalid request parameters.';
          break;
        default:
          message = `GitHub API error: ${message}`;
      }

      return new GitHubAPIError(message, statusCode);
    }

    // Handle network errors
    if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return new GitHubAPIError('Network error: Unable to connect to GitHub API', 0);
    }

    // Handle timeout errors
    if (error.code === 'ETIMEDOUT') {
      return new GitHubAPIError('Request timeout: GitHub API took too long to respond', 0);
    }

    // Generic error
    return new GitHubAPIError(
      error.message || 'An unexpected error occurred while accessing GitHub API',
      0
    );
  }
}

/**
 * Utility function to create GitHub client from session
 */
export async function createGitHubClient(): Promise<GitHubClient> {
  return GitHubClient.fromSession();
}