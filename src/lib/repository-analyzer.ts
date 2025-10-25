import { GitHubClient, GitHubRepository, GitHubFile, GitHubContributor } from './github-client';

export interface PackageManager {
  type: 'npm' | 'yarn' | 'pnpm' | 'pip' | 'poetry' | 'go' | 'maven' | 'gradle' | 'cargo' | 'composer' | 'gem' | 'nuget';
  configFile: string;
  installCommand: string;
  runCommand?: string;
}

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
  contributors: GitHubContributor[];
  languages: Record<string, number>;
  badges: Badge[];
  repository: GitHubRepository;
  hasReadme: boolean;
  existingReadme?: string;
}

export interface Badge {
  label: string;
  message: string;
  color: string;
  url: string;
  altText: string;
}

export interface DependencyFile {
  filename: string;
  content: any;
  packageManager: PackageManager;
}

export class RepositoryAnalyzer {
  private githubClient: GitHubClient;

  constructor(githubClient: GitHubClient) {
    this.githubClient = githubClient;
  }

  /**
   * Analyze a repository and extract all metadata
   */
  async analyzeRepository(owner: string, repo: string): Promise<RepositoryMetadata> {
    // Get basic repository information
    const repository = await this.githubClient.getRepository(owner, repo);

    // Analyze in parallel for better performance
    const [
      dependencyInfo,
      licenseInfo,
      contributors,
      languages,
      existingReadme
    ] = await Promise.allSettled([
      this.analyzeDependencies(owner, repo, repository.default_branch),
      this.analyzeLicense(owner, repo, repository.default_branch),
      this.githubClient.getRepositoryContributors(owner, repo, { per_page: 10 }),
      this.githubClient.getRepositoryLanguages(owner, repo),
      this.getExistingReadme(owner, repo, repository.default_branch)
    ]);

    // Extract results, handling failures gracefully
    const deps = dependencyInfo.status === 'fulfilled' ? dependencyInfo.value : {
      packageManager: null,
      dependencies: [],
      devDependencies: [],
      scripts: {}
    };

    const license = licenseInfo.status === 'fulfilled' ? licenseInfo.value : repository.license;
    const contribs = contributors.status === 'fulfilled' ? contributors.value : [];
    const langs = languages.status === 'fulfilled' ? languages.value : {};
    const readme = existingReadme.status === 'fulfilled' ? existingReadme.value : null;

    // Generate badges
    const badges = this.generateBadges(repository, license, langs);

    return {
      name: repository.name,
      description: repository.description,
      language: repository.language,
      topics: repository.topics,
      license,
      packageManager: deps.packageManager,
      dependencies: deps.dependencies,
      devDependencies: deps.devDependencies,
      scripts: deps.scripts,
      contributors: contribs,
      languages: langs,
      badges,
      repository,
      hasReadme: readme !== null,
      existingReadme: readme || undefined,
    };
  }

  /**
   * Analyze repository dependencies and package manager
   */
  private async analyzeDependencies(owner: string, repo: string, branch: string): Promise<{
    packageManager: PackageManager | null;
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
  }> {
    const packageManagers: PackageManager[] = [
      { type: 'npm', configFile: 'package.json', installCommand: 'npm install', runCommand: 'npm run' },
      { type: 'yarn', configFile: 'package.json', installCommand: 'yarn install', runCommand: 'yarn' },
      { type: 'pnpm', configFile: 'package.json', installCommand: 'pnpm install', runCommand: 'pnpm' },
      { type: 'pip', configFile: 'requirements.txt', installCommand: 'pip install -r requirements.txt' },
      { type: 'poetry', configFile: 'pyproject.toml', installCommand: 'poetry install' },
      { type: 'go', configFile: 'go.mod', installCommand: 'go mod download' },
      { type: 'maven', configFile: 'pom.xml', installCommand: 'mvn install' },
      { type: 'gradle', configFile: 'build.gradle', installCommand: 'gradle build' },
      { type: 'cargo', configFile: 'Cargo.toml', installCommand: 'cargo build' },
      { type: 'composer', configFile: 'composer.json', installCommand: 'composer install' },
      { type: 'gem', configFile: 'Gemfile', installCommand: 'bundle install' },
      { type: 'nuget', configFile: 'packages.config', installCommand: 'nuget restore' },
    ];

    // Check for package manager files
    for (const pm of packageManagers) {
      const file = await this.githubClient.getFileContent(owner, repo, pm.configFile, branch);
      if (file) {
        const dependencyInfo = await this.parseDependencyFile(file, pm);
        return {
          packageManager: pm,
          ...dependencyInfo
        };
      }
    }

    // Check for additional common files
    const additionalFiles = [
      'yarn.lock', 'package-lock.json', 'pnpm-lock.yaml',
      'Pipfile', 'setup.py', 'go.sum', 'Cargo.lock'
    ];

    for (const filename of additionalFiles) {
      const file = await this.githubClient.getFileContent(owner, repo, filename, branch);
      if (file) {
        const detectedPM = this.detectPackageManagerFromLockFile(filename);
        if (detectedPM) {
          return {
            packageManager: detectedPM,
            dependencies: [],
            devDependencies: [],
            scripts: {}
          };
        }
      }
    }

    return {
      packageManager: null,
      dependencies: [],
      devDependencies: [],
      scripts: {}
    };
  }

  /**
   * Parse dependency file content
   */
  private async parseDependencyFile(file: GitHubFile, packageManager: PackageManager): Promise<{
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
  }> {
    try {
      const content = Buffer.from(file.content, file.encoding as BufferEncoding).toString('utf-8');

      switch (packageManager.type) {
        case 'npm':
        case 'yarn':
        case 'pnpm':
          return this.parsePackageJson(content);
        case 'pip':
          return this.parseRequirementsTxt(content);
        case 'poetry':
          return this.parsePyprojectToml(content);
        case 'go':
          return this.parseGoMod(content);
        case 'maven':
          return this.parsePomXml(content);
        case 'gradle':
          return this.parseBuildGradle(content);
        case 'cargo':
          return this.parseCargoToml(content);
        case 'composer':
          return this.parseComposerJson(content);
        case 'gem':
          return this.parseGemfile(content);
        default:
          return { dependencies: [], devDependencies: [], scripts: {} };
      }
    } catch (error) {
      console.error(`Error parsing ${packageManager.configFile}:`, error);
      return { dependencies: [], devDependencies: [], scripts: {} };
    }
  }

  /**
   * Parse package.json file
   */
  private parsePackageJson(content: string): {
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
  } {
    try {
      const pkg = JSON.parse(content);
      return {
        dependencies: Object.keys(pkg.dependencies || {}),
        devDependencies: Object.keys(pkg.devDependencies || {}),
        scripts: pkg.scripts || {}
      };
    } catch {
      return { dependencies: [], devDependencies: [], scripts: {} };
    }
  }

  /**
   * Parse requirements.txt file
   */
  private parseRequirementsTxt(content: string): {
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
  } {
    const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    const dependencies = lines.map(line => {
      // Extract package name from requirement line (e.g., "django>=3.0" -> "django")
      const match = line.match(/^([a-zA-Z0-9_-]+)/);
      return match ? match[1] : line.trim();
    }).filter(Boolean);

    return { dependencies, devDependencies: [], scripts: {} };
  }

  /**
   * Parse pyproject.toml file
   */
  private parsePyprojectToml(content: string): {
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
  } {
    // Simple TOML parsing for dependencies
    const dependencies: string[] = [];
    const devDependencies: string[] = [];
    
    const lines = content.split('\n');
    let inDependencies = false;
    let inDevDependencies = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === '[tool.poetry.dependencies]') {
        inDependencies = true;
        inDevDependencies = false;
        continue;
      }
      
      if (trimmed === '[tool.poetry.dev-dependencies]' || trimmed === '[tool.poetry.group.dev.dependencies]') {
        inDependencies = false;
        inDevDependencies = true;
        continue;
      }
      
      if (trimmed.startsWith('[')) {
        inDependencies = false;
        inDevDependencies = false;
        continue;
      }
      
      if ((inDependencies || inDevDependencies) && trimmed.includes('=')) {
        const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=/);
        if (match && match[1] !== 'python') {
          if (inDependencies) {
            dependencies.push(match[1]);
          } else {
            devDependencies.push(match[1]);
          }
        }
      }
    }

    return { dependencies, devDependencies, scripts: {} };
  }

  /**
   * Parse go.mod file
   */
  private parseGoMod(content: string): {
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
  } {
    const dependencies: string[] = [];
    const lines = content.split('\n');
    let inRequire = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === 'require (') {
        inRequire = true;
        continue;
      }
      
      if (inRequire && trimmed === ')') {
        inRequire = false;
        continue;
      }
      
      if (inRequire && trimmed) {
        const match = trimmed.match(/^([^\s]+)/);
        if (match) {
          dependencies.push(match[1]);
        }
      }
    }

    return { dependencies, devDependencies: [], scripts: {} };
  }

  /**
   * Parse pom.xml file (basic parsing)
   */
  private parsePomXml(content: string): {
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
  } {
    const dependencies: string[] = [];
    
    // Simple regex to extract artifactId from dependencies
    const dependencyMatches = content.match(/<artifactId>([^<]+)<\/artifactId>/g);
    if (dependencyMatches) {
      for (const match of dependencyMatches) {
        const artifactId = match.replace(/<\/?artifactId>/g, '');
        if (artifactId) {
          dependencies.push(artifactId);
        }
      }
    }

    return { dependencies, devDependencies: [], scripts: {} };
  }

  /**
   * Parse build.gradle file (basic parsing)
   */
  private parseBuildGradle(content: string): {
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
  } {
    const dependencies: string[] = [];
    
    // Extract dependencies from implementation, compile, api lines
    const dependencyRegex = /(?:implementation|compile|api|testImplementation)\s+['"]([^'"]+)['"]/g;
    let match;
    
    while ((match = dependencyRegex.exec(content)) !== null) {
      const dep = match[1];
      if (dep.includes(':')) {
        const parts = dep.split(':');
        if (parts.length >= 2) {
          dependencies.push(parts[1]); // Extract artifact name
        }
      }
    }

    return { dependencies, devDependencies: [], scripts: {} };
  }

  /**
   * Parse Cargo.toml file
   */
  private parseCargoToml(content: string): {
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
  } {
    const dependencies: string[] = [];
    const devDependencies: string[] = [];
    
    const lines = content.split('\n');
    let inDependencies = false;
    let inDevDependencies = false;

    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed === '[dependencies]') {
        inDependencies = true;
        inDevDependencies = false;
        continue;
      }
      
      if (trimmed === '[dev-dependencies]') {
        inDependencies = false;
        inDevDependencies = true;
        continue;
      }
      
      if (trimmed.startsWith('[')) {
        inDependencies = false;
        inDevDependencies = false;
        continue;
      }
      
      if ((inDependencies || inDevDependencies) && trimmed.includes('=')) {
        const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=/);
        if (match) {
          if (inDependencies) {
            dependencies.push(match[1]);
          } else {
            devDependencies.push(match[1]);
          }
        }
      }
    }

    return { dependencies, devDependencies, scripts: {} };
  }

  /**
   * Parse composer.json file
   */
  private parseComposerJson(content: string): {
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
  } {
    try {
      const composer = JSON.parse(content);
      return {
        dependencies: Object.keys(composer.require || {}),
        devDependencies: Object.keys(composer['require-dev'] || {}),
        scripts: composer.scripts || {}
      };
    } catch {
      return { dependencies: [], devDependencies: [], scripts: {} };
    }
  }

  /**
   * Parse Gemfile
   */
  private parseGemfile(content: string): {
    dependencies: string[];
    devDependencies: string[];
    scripts: Record<string, string>;
  } {
    const dependencies: string[] = [];
    const devDependencies: string[] = [];
    
    const lines = content.split('\n');
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('gem ')) {
        const match = trimmed.match(/gem\s+['"]([^'"]+)['"]/);
        if (match) {
          if (trimmed.includes('group:') && (trimmed.includes(':development') || trimmed.includes(':test'))) {
            devDependencies.push(match[1]);
          } else {
            dependencies.push(match[1]);
          }
        }
      }
    }

    return { dependencies, devDependencies, scripts: {} };
  }

  /**
   * Detect package manager from lock files
   */
  private detectPackageManagerFromLockFile(filename: string): PackageManager | null {
    const lockFileMap: Record<string, PackageManager> = {
      'yarn.lock': { type: 'yarn', configFile: 'package.json', installCommand: 'yarn install', runCommand: 'yarn' },
      'package-lock.json': { type: 'npm', configFile: 'package.json', installCommand: 'npm install', runCommand: 'npm run' },
      'pnpm-lock.yaml': { type: 'pnpm', configFile: 'package.json', installCommand: 'pnpm install', runCommand: 'pnpm' },
      'Pipfile': { type: 'pip', configFile: 'Pipfile', installCommand: 'pipenv install' },
      'go.sum': { type: 'go', configFile: 'go.mod', installCommand: 'go mod download' },
      'Cargo.lock': { type: 'cargo', configFile: 'Cargo.toml', installCommand: 'cargo build' },
    };

    return lockFileMap[filename] || null;
  }

  /**
   * Analyze repository license
   */
  private async analyzeLicense(owner: string, repo: string, branch: string): Promise<{
    name: string;
    key: string;
    content?: string;
  } | null> {
    // Try to get license file content
    const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'LICENCE', 'LICENCE.md', 'LICENCE.txt'];
    
    for (const filename of licenseFiles) {
      const file = await this.githubClient.getFileContent(owner, repo, filename, branch);
      if (file) {
        const content = Buffer.from(file.content, file.encoding as BufferEncoding).toString('utf-8');
        const licenseType = this.detectLicenseType(content);
        
        return {
          name: licenseType.name,
          key: licenseType.key,
          content: content.substring(0, 1000) // Limit content length
        };
      }
    }

    return null;
  }

  /**
   * Detect license type from content
   */
  private detectLicenseType(content: string): { name: string; key: string } {
    const licensePatterns = [
      { pattern: /MIT License/i, name: 'MIT License', key: 'mit' },
      { pattern: /Apache License.*Version 2\.0/i, name: 'Apache License 2.0', key: 'apache-2.0' },
      { pattern: /GNU GENERAL PUBLIC LICENSE.*Version 3/i, name: 'GNU General Public License v3.0', key: 'gpl-3.0' },
      { pattern: /GNU GENERAL PUBLIC LICENSE.*Version 2/i, name: 'GNU General Public License v2.0', key: 'gpl-2.0' },
      { pattern: /BSD 3-Clause/i, name: 'BSD 3-Clause License', key: 'bsd-3-clause' },
      { pattern: /BSD 2-Clause/i, name: 'BSD 2-Clause License', key: 'bsd-2-clause' },
      { pattern: /Mozilla Public License.*Version 2\.0/i, name: 'Mozilla Public License 2.0', key: 'mpl-2.0' },
      { pattern: /ISC License/i, name: 'ISC License', key: 'isc' },
    ];

    for (const { pattern, name, key } of licensePatterns) {
      if (pattern.test(content)) {
        return { name, key };
      }
    }

    return { name: 'Custom License', key: 'other' };
  }

  /**
   * Get existing README content
   */
  private async getExistingReadme(owner: string, repo: string, branch: string): Promise<string | null> {
    const readmeFiles = ['README.md', 'README.txt', 'README.rst', 'README', 'readme.md', 'readme.txt'];
    
    for (const filename of readmeFiles) {
      const file = await this.githubClient.getFileContent(owner, repo, filename, branch);
      if (file) {
        return Buffer.from(file.content, file.encoding as BufferEncoding).toString('utf-8');
      }
    }

    return null;
  }

  /**
   * Generate badges for the repository
   */
  private generateBadges(
    repository: GitHubRepository,
    license: { name: string; key: string } | null,
    languages: Record<string, number>
  ): Badge[] {
    const badges: Badge[] = [];

    // License badge
    if (license) {
      badges.push({
        label: 'License',
        message: license.name,
        color: 'blue',
        url: `https://img.shields.io/badge/License-${encodeURIComponent(license.name)}-blue.svg`,
        altText: `License: ${license.name}`
      });
    }

    // Language badge
    if (repository.language) {
      const languageColors: Record<string, string> = {
        'JavaScript': 'yellow',
        'TypeScript': 'blue',
        'Python': 'green',
        'Java': 'orange',
        'Go': 'cyan',
        'Rust': 'orange',
        'C++': 'blue',
        'C#': 'purple',
        'PHP': 'purple',
        'Ruby': 'red',
        'Swift': 'orange',
        'Kotlin': 'purple',
      };

      const color = languageColors[repository.language] || 'lightgrey';
      badges.push({
        label: 'Language',
        message: repository.language,
        color,
        url: `https://img.shields.io/badge/Language-${encodeURIComponent(repository.language)}-${color}.svg`,
        altText: `Language: ${repository.language}`
      });
    }

    // Stars badge
    if (repository.stargazers_count > 0) {
      badges.push({
        label: 'Stars',
        message: repository.stargazers_count.toString(),
        color: 'yellow',
        url: `https://img.shields.io/github/stars/${repository.full_name}.svg?style=social&label=Star`,
        altText: `GitHub stars: ${repository.stargazers_count}`
      });
    }

    // Forks badge
    if (repository.forks_count > 0) {
      badges.push({
        label: 'Forks',
        message: repository.forks_count.toString(),
        color: 'blue',
        url: `https://img.shields.io/github/forks/${repository.full_name}.svg?style=social&label=Fork`,
        altText: `GitHub forks: ${repository.forks_count}`
      });
    }

    // Issues badge
    badges.push({
      label: 'Issues',
      message: repository.open_issues_count.toString(),
      color: repository.open_issues_count > 0 ? 'red' : 'green',
      url: `https://img.shields.io/github/issues/${repository.full_name}.svg`,
      altText: `GitHub issues: ${repository.open_issues_count}`
    });

    return badges;
  }
}

/**
 * Create repository analyzer from GitHub client
 */
export async function createRepositoryAnalyzer(): Promise<RepositoryAnalyzer> {
  const { createGitHubClient } = await import('./github-client');
  const githubClient = await createGitHubClient();
  return new RepositoryAnalyzer(githubClient);
}