import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getPerformanceMonitor } from '@/lib/performance-monitor';

export async function GET(request: NextRequest) {
  try {
    // Check authentication (optional for performance monitoring)
    const session = await getSession();
    
    // Only allow authenticated users to view performance data
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const monitor = getPerformanceMonitor();
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider');

    if (provider) {
      // Get metrics for specific provider
      const metrics = monitor.getProviderMetrics(provider);
      if (!metrics) {
        return NextResponse.json(
          { error: 'Provider not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({
        provider: metrics,
        shouldAvoid: monitor.shouldAvoidProvider(provider),
        successRate: monitor.getSuccessRate(provider)
      });
    } else {
      // Get all performance data
      const summary = monitor.getSummary();
      const allMetrics = monitor.getAllMetrics();
      const recentEvents = monitor.getRecentEvents(20);
      const bestProvider = monitor.getBestProvider();

      return NextResponse.json({
        summary,
        providers: allMetrics.map(metrics => ({
          ...metrics,
          successRate: monitor.getSuccessRate(metrics.provider),
          shouldAvoid: monitor.shouldAvoidProvider(metrics.provider)
        })),
        bestProvider,
        recentEvents
      });
    }
  } catch (error: any) {
    console.error('Performance API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const monitor = getPerformanceMonitor();
    const url = new URL(request.url);
    const provider = url.searchParams.get('provider');

    if (provider) {
      // Reset metrics for specific provider
      monitor.resetProviderMetrics(provider);
      return NextResponse.json({ 
        message: `Metrics reset for provider: ${provider}` 
      });
    } else {
      // Clear all metrics
      monitor.clearAllMetrics();
      return NextResponse.json({ 
        message: 'All performance metrics cleared' 
      });
    }
  } catch (error: any) {
    console.error('Performance API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}