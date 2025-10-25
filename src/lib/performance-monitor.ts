export interface PerformanceMetrics {
  provider: string;
  requestCount: number;
  successCount: number;
  failureCount: number;
  averageResponseTime: number;
  lastFailure?: Date;
  rateLimitHits: number;
}

export interface PerformanceEvent {
  provider: string;
  success: boolean;
  responseTime: number;
  error?: string;
  timestamp: Date;
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private recentEvents: PerformanceEvent[] = [];
  private maxEvents = 100; // Keep last 100 events

  /**
   * Record a performance event
   */
  recordEvent(event: PerformanceEvent): void {
    const { provider, success, responseTime, error } = event;
    
    // Update metrics
    const current = this.metrics.get(provider) || {
      provider,
      requestCount: 0,
      successCount: 0,
      failureCount: 0,
      averageResponseTime: 0,
      rateLimitHits: 0
    };

    current.requestCount++;
    
    if (success) {
      current.successCount++;
      // Update average response time
      current.averageResponseTime = 
        (current.averageResponseTime * (current.successCount - 1) + responseTime) / current.successCount;
    } else {
      current.failureCount++;
      current.lastFailure = event.timestamp;
      
      // Check if it's a rate limit error
      if (error?.includes('rate limit') || error?.includes('quota')) {
        current.rateLimitHits++;
      }
    }

    this.metrics.set(provider, current);

    // Add to recent events
    this.recentEvents.push(event);
    if (this.recentEvents.length > this.maxEvents) {
      this.recentEvents.shift();
    }

    // Log performance data
    console.log(`Performance: ${provider} - ${success ? 'SUCCESS' : 'FAILURE'} - ${responseTime}ms`);
  }

  /**
   * Get metrics for a specific provider
   */
  getProviderMetrics(provider: string): PerformanceMetrics | undefined {
    return this.metrics.get(provider);
  }

  /**
   * Get all provider metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  /**
   * Get success rate for a provider
   */
  getSuccessRate(provider: string): number {
    const metrics = this.metrics.get(provider);
    if (!metrics || metrics.requestCount === 0) return 0;
    
    return metrics.successCount / metrics.requestCount;
  }

  /**
   * Check if a provider should be avoided due to recent failures
   */
  shouldAvoidProvider(provider: string): boolean {
    const metrics = this.metrics.get(provider);
    if (!metrics) return false;

    // Avoid if success rate is below 50% and we have at least 5 requests
    if (metrics.requestCount >= 5 && this.getSuccessRate(provider) < 0.5) {
      return true;
    }

    // Avoid if there was a rate limit hit in the last 5 minutes
    if (metrics.rateLimitHits > 0 && metrics.lastFailure) {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      if (metrics.lastFailure > fiveMinutesAgo) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the best performing provider
   */
  getBestProvider(): string | null {
    const providers = Array.from(this.metrics.values())
      .filter(m => !this.shouldAvoidProvider(m.provider))
      .sort((a, b) => {
        // Sort by success rate first, then by average response time
        const successRateA = this.getSuccessRate(a.provider);
        const successRateB = this.getSuccessRate(b.provider);
        
        if (successRateA !== successRateB) {
          return successRateB - successRateA; // Higher success rate first
        }
        
        return a.averageResponseTime - b.averageResponseTime; // Lower response time first
      });

    return providers.length > 0 ? providers[0].provider : null;
  }

  /**
   * Get recent events for debugging
   */
  getRecentEvents(limit: number = 10): PerformanceEvent[] {
    return this.recentEvents.slice(-limit);
  }

  /**
   * Reset metrics for a provider
   */
  resetProviderMetrics(provider: string): void {
    this.metrics.delete(provider);
    this.recentEvents = this.recentEvents.filter(e => e.provider !== provider);
  }

  /**
   * Clear all metrics
   */
  clearAllMetrics(): void {
    this.metrics.clear();
    this.recentEvents = [];
  }

  /**
   * Get performance summary
   */
  getSummary(): {
    totalRequests: number;
    totalSuccesses: number;
    totalFailures: number;
    overallSuccessRate: number;
    providerCount: number;
  } {
    const allMetrics = Array.from(this.metrics.values());
    
    const totalRequests = allMetrics.reduce((sum, m) => sum + m.requestCount, 0);
    const totalSuccesses = allMetrics.reduce((sum, m) => sum + m.successCount, 0);
    const totalFailures = allMetrics.reduce((sum, m) => sum + m.failureCount, 0);
    
    return {
      totalRequests,
      totalSuccesses,
      totalFailures,
      overallSuccessRate: totalRequests > 0 ? totalSuccesses / totalRequests : 0,
      providerCount: this.metrics.size
    };
  }
}

// Global performance monitor instance
let globalMonitor: PerformanceMonitor | null = null;

/**
 * Get the global performance monitor instance
 */
export function getPerformanceMonitor(): PerformanceMonitor {
  if (!globalMonitor) {
    globalMonitor = new PerformanceMonitor();
  }
  return globalMonitor;
}

/**
 * Helper function to measure and record performance
 */
export async function measurePerformance<T>(
  provider: string,
  operation: () => Promise<T>
): Promise<T> {
  const monitor = getPerformanceMonitor();
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const responseTime = Date.now() - startTime;
    
    monitor.recordEvent({
      provider,
      success: true,
      responseTime,
      timestamp: new Date()
    });
    
    return result;
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    monitor.recordEvent({
      provider,
      success: false,
      responseTime,
      error: error.message,
      timestamp: new Date()
    });
    
    throw error;
  }
}