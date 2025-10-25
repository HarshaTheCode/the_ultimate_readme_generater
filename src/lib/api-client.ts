/**
 * API Client utilities for frontend-backend communication
 * Provides centralized error handling, loading states, and type-safe API calls
 */

export interface APIResponse<T = any> {
  data?: T;
  error?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  totalCount: number;
  hasNextPage: boolean;
  page: number;
}

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

/**
 * Base API client with error handling and response parsing
 */
class BaseAPIClient {
  private baseURL: string;

  constructor(baseURL = '/api') {
    this.baseURL = baseURL;
  }

  /**
   * Make HTTP request with error handling
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    try {
      console.log('API Client: Making request to', url, 'with options:', options);
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        ...options,
      });

      console.log('API Client: Response status:', response.status, response.statusText);

      // Handle non-JSON responses (like redirects)
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        console.log('API Client: Non-JSON response, content-type:', contentType);
        if (!response.ok) {
          throw new APIError(
            `HTTP ${response.status}: ${response.statusText}`,
            response.status
          );
        }
        return {} as T;
      }

      const data = await response.json();
      console.log('API Client: Response data:', data);

      if (!response.ok) {
        throw new APIError(
          data.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          data.code
        );
      }

      return data;
    } catch (error) {
      console.error('API Client: Request failed', error);
      
      if (error instanceof APIError) {
        throw error;
      }

      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new APIError('Network error: Unable to connect to server', 0);
      }

      // Handle other errors
      throw new APIError(
        error instanceof Error ? error.message : 'An unexpected error occurred',
        0
      );
    }
  }

  /**
   * GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = params 
      ? `${endpoint}?${new URLSearchParams(params).toString()}`
      : endpoint;
    
    return this.request<T>(url, { method: 'GET' });
  }

  /**
   * POST request
   */
  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * PUT request
   */
  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  /**
   * DELETE request
   */
  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// Create singleton instance
export const apiClient = new BaseAPIClient();

/**
 * Repository API client
 */
export const repositoryAPI = {
  /**
   * Get user repositories with optional search and pagination
   */
  async getRepositories(params?: {
    page?: number;
    per_page?: number;
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    search?: string;
  }) {
    const searchParams: Record<string, string> = {};
    
    if (params?.page) searchParams.page = params.page.toString();
    if (params?.per_page) searchParams.per_page = params.per_page.toString();
    if (params?.sort) searchParams.sort = params.sort;
    if (params?.direction) searchParams.direction = params.direction;
    if (params?.search) searchParams.search = params.search;

    const repositories = await apiClient.get<any[]>('/repos', searchParams);
    
    return {
      repositories,
      // Note: Pagination info would come from headers in a real implementation
      hasNextPage: false,
      totalCount: repositories.length,
    };
  },

  /**
   * Get a specific repository
   */
  async getRepository(owner: string, repo: string) {
    return apiClient.get<any>(`/repos/${owner}/${repo}`);
  },
};

/**
 * README generation API client
 */
export const readmeAPI = {
  /**
   * Generate README for a repository
   */
  async generateReadme(owner: string, repo: string, forceRegenerate = false) {
    return apiClient.put<{
      markdown: string;
      metadata: any;
      provider: string;
      cached: boolean;
      generatedAt: string;
    }>('/generate', { owner, repo, forceRegenerate });
  },
};

/**
 * Authentication API client
 */
export const authAPI = {
  /**
   * Get current session
   */
  async getSession() {
    return apiClient.get<{
      user?: {
        id: string;
        githubId: number;
        username: string;
        email?: string;
        avatar_url: string;
      };
      expires: string;
    }>('/auth/session');
  },

  /**
   * Sign out
   */
  async signOut() {
    return apiClient.post('/auth/signout');
  },
};