

import { RepositoryMetadata } from './repository-analyzer';
import { getPerformanceMonitor, measurePerformance } from './performance-monitor';
import { ENV_CONFIG } from './env-config';

export interface AIProvider {
  name: string;
  generate(prompt: string): Promise<string>;
  isAvailable(): boolean;
}

export interface GenerationOptions {
  includeInstallation?: boolean;
  includeUsage?: boolean;
  includeContributing?: boolean;
  includeLicense?: boolean;
  includeBadges?: boolean;
  tone?: 'professional' | 'casual' | 'technical';
}

export interface GenerationResult {
  markdown: string;
  provider: string;
  generatedAt: Date;
  tokensUsed?: number;
}

export class OpenRouterProvider implements AIProvider {
  name = 'OpenRouter';
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error('OpenRouter API key is required');
    }
    this.apiKey = apiKey;
  }

  async generate(prompt: string): Promise<string> {
    return measurePerformance(this.name, async () => {
      console.log('OpenRouter: Making API request...');
      console.log('OpenRouter: API Key length:', this.apiKey.length);
      console.log('OpenRouter: API Key prefix:', this.apiKey.substring(0, 10) + '...');

      const requestBody = {
        model: 'mistralai/mistral-7b-instruct:free', // Use a valid free model
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.7
      };

      console.log('OpenRouter: Request body:', JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': process.env.NEXTAUTH_URL || 'http://localhost:3000',
          'X-Title': 'ReadMeGen MVP',
          'User-Agent': 'ReadMeGen-MVP/1.0.0'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('OpenRouter: Response status:', response.status);
      console.log('OpenRouter: Response headers:', Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.log('OpenRouter: Error response text:', errorText);

        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }

        if (response.status === 429) {
          throw new Error('RATE_LIMIT_EXCEEDED');
        }
        throw new Error(`OpenRouter API error: ${response.status} - ${errorData.error?.message || errorText || 'Unknown error'}`);
      }

      const data = await response.json();
      console.log('OpenRouter: Success response:', data);

      return data.choices[0]?.message?.content || '';
    });
  }

  isAvailable(): boolean {
    return !!(ENV_CONFIG.OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY);
  }
}

export class AIReadmeGenerator {
  private providers: AIProvider[] = [];
  private currentProviderIndex = 0;

  constructor() {
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Read keys directly from process.env to avoid module caching issues
    const geminiKey = process.env.GEMINI_API_KEY;
    const openRouterKey = process.env.OPENROUTER_API_KEY;

    // Initialize OpenRouter as the primary and only provider
    if (openRouterKey) {
      try {
        const openRouterProvider = new OpenRouterProvider(openRouterKey);
        if (openRouterProvider.isAvailable()) {
          this.providers.push(openRouterProvider);
        }
      } catch (error) {
        console.error('Failed to initialize OpenRouter provider:', error);
      }
    }

    if (this.providers.length === 0) {
      console.error('No AI providers were initialized. Check server logs for details.');
    }
  }

  /**
   * Generate README with automatic failover between providers
   */
  async generateReadme(
    metadata: RepositoryMetadata,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    if (this.providers.length === 0) {
      throw new Error('No AI providers configured. Please set OPENROUTER_API_KEY in your .env.local file.');
    }

    const prompt = this.buildPrompt(metadata, options);
    const monitor = getPerformanceMonitor();

    // Start with Gemini (index 0) as it's more reliable
    this.currentProviderIndex = 0;

    // Try to use the best performing provider first (if available)
    const bestProvider = monitor.getBestProvider();
    if (bestProvider) {
      const providerIndex = this.providers.findIndex(p => p.name === bestProvider);
      if (providerIndex !== -1) {
        this.currentProviderIndex = providerIndex;
      }
    }

    for (let attempt = 0; attempt < this.providers.length; attempt++) {
      const provider = this.providers[this.currentProviderIndex];

      // Skip providers that should be avoided due to recent failures
      if (monitor.shouldAvoidProvider(provider.name)) {
        console.log(`Skipping ${provider.name} due to recent failures`);
        this.switchToNextProvider();
        continue;
      }

      try {
        console.log(`Attempting README generation with ${provider.name}...`);
        const markdown = await provider.generate(prompt);

        return {
          markdown: this.postProcessMarkdown(markdown),
          provider: provider.name,
          generatedAt: new Date()
        };
      } catch (error: any) {
        console.warn(`${provider.name} failed:`, error.message);

        if (error.message === 'RATE_LIMIT_EXCEEDED') {
          console.log(`${provider.name} rate limit exceeded, switching to next provider...`);
          this.switchToNextProvider();
        } else {
          console.error(`${provider.name} error:`, error);
          this.switchToNextProvider();
        }

        // If this was the last provider, throw the error
        if (attempt === this.providers.length - 1) {
          throw new Error(`All AI providers failed. Last error: ${error.message}`);
        }
      }
    }

    throw new Error('No available AI providers');
  }

  /**
   * Switch to the next available provider
   */
  private switchToNextProvider(): void {
    this.currentProviderIndex = (this.currentProviderIndex + 1) % this.providers.length;
  }

  /**
   * Build the AI prompt for README generation
   */
  private buildPrompt(metadata: RepositoryMetadata, options: GenerationOptions): string {
    const {
      includeInstallation = true,
      includeUsage = true,
      includeContributing = true,
      includeLicense = true,
      includeBadges = true,
      tone = 'professional'
    } = options;

    let prompt = `Generate a comprehensive, well-structured README.md file for the following GitHub repository. Use a ${tone} tone and follow modern README best practices.

## Repository Information:
- **Name**: ${metadata.name}
- **Description**: ${metadata.description || 'No description provided'}
- **Primary Language**: ${metadata.language || 'Not specified'}
- **Topics/Tags**: ${metadata.topics.length > 0 ? metadata.topics.join(', ') : 'None'}

## Technical Details:`;

    // Package Manager and Dependencies
    if (metadata.packageManager) {
      prompt += `
- **Package Manager**: ${metadata.packageManager.type}
- **Install Command**: ${metadata.packageManager.installCommand}`;

      if (metadata.packageManager.runCommand) {
        prompt += `
- **Run Command**: ${metadata.packageManager.runCommand}`;
      }
    }

    if (metadata.dependencies.length > 0) {
      prompt += `
- **Key Dependencies**: ${metadata.dependencies.slice(0, 10).join(', ')}`;
    }

    if (metadata.scripts && Object.keys(metadata.scripts).length > 0) {
      prompt += `
- **Available Scripts**: ${Object.keys(metadata.scripts).join(', ')}`;
    }

    // License Information
    if (metadata.license) {
      prompt += `
- **License**: ${metadata.license.name}`;
    }

    // Repository Stats
    prompt += `
- **Stars**: ${metadata.repository.stargazers_count}
- **Forks**: ${metadata.repository.forks_count}
- **Open Issues**: ${metadata.repository.open_issues_count}`;

    // Languages
    if (Object.keys(metadata.languages).length > 0) {
      const languageList = Object.entries(metadata.languages)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([lang]) => lang)
        .join(', ');
      prompt += `
- **Languages Used**: ${languageList}`;
    }

    // Contributors
    if (metadata.contributors.length > 0) {
      prompt += `
- **Contributors**: ${metadata.contributors.length} contributors`;
    }

    // Existing README context
    if (metadata.hasReadme && metadata.existingReadme) {
      prompt += `

## Existing README (for reference):
\`\`\`
${metadata.existingReadme.substring(0, 1000)}${metadata.existingReadme.length > 1000 ? '...' : ''}
\`\`\``;
    }

    prompt += `

## Requirements:
Generate a complete README.md with the following sections:

1. **Title and Description**: Clear project title and compelling description
2. **Table of Contents**: For easy navigation (if README is long)`;

    if (includeBadges && metadata.badges.length > 0) {
      prompt += `
3. **Badges**: Include relevant badges for license, language, stars, etc.`;
    }

    if (includeInstallation) {
      prompt += `
4. **Installation**: Step-by-step installation instructions using the detected package manager`;
    }

    if (includeUsage) {
      prompt += `
5. **Usage**: Basic usage examples and code snippets`;
    }

    prompt += `
6. **Features**: Key features and capabilities
7. **API/Documentation**: If applicable, brief API overview`;

    if (includeContributing) {
      prompt += `
8. **Contributing**: Guidelines for contributors`;
    }

    if (includeLicense && metadata.license) {
      prompt += `
9. **License**: License information`;
    }

    prompt += `
10. **Acknowledgments**: Credits and acknowledgments if appropriate

## Style Guidelines:
- Use clear, concise language
- Include code examples where relevant
- Use proper markdown formatting
- Make it scannable with good use of headers and lists
- Include emojis sparingly for visual appeal (${tone === 'casual' ? 'more emojis okay' : 'minimal emojis'})
- Ensure all links are properly formatted
- Use code blocks with appropriate language syntax highlighting

## Important Notes:
- Do NOT include placeholder text like "Add description here" or "TODO"
- Make all content specific to this repository
- Ensure installation commands match the detected package manager
- If certain information is not available, gracefully omit those sections rather than using placeholders
- Focus on making the README immediately useful to developers who discover this project

Generate the complete README.md content now:`;

    return prompt;
  }

  /**
   * Post-process the generated markdown to ensure quality
   */
  private postProcessMarkdown(markdown: string): string {
    // Remove any potential AI provider artifacts
    let processed = markdown
      .replace(/^```markdown\n/, '')
      .replace(/\n```$/, '')
      .trim();

    // Ensure proper spacing between sections
    processed = processed.replace(/\n#{1,6}\s/g, '\n\n$&');

    // Remove excessive newlines
    processed = processed.replace(/\n{4,}/g, '\n\n\n');

    // Ensure the README starts with a title
    if (!processed.startsWith('#')) {
      processed = `# ${processed}`;
    }

    return processed;
  }

  /**
   * Get current provider information
   */
  getCurrentProvider(): string {
    return this.providers[this.currentProviderIndex]?.name || 'None';
  }

  /**
   * Get all available providers
   */
  getAvailableProviders(): string[] {
    return this.providers.map(p => p.name);
  }

  /**
   * Check if any providers are available
   */
  hasAvailableProviders(): boolean {
    return this.providers.length > 0;
  }
}

/**
 * Create AI README generator instance
 */
export function createAIReadmeGenerator(): AIReadmeGenerator {
  return new AIReadmeGenerator();
}