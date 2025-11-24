// GHL Optimization Service
// Handles caching, rate limiting, and performance optimizations for GHL API calls

import { createGHLClient } from './ghlApiClientV2';
import { GHLIntegrationService } from './ghlIntegrationService';
import { 
  GHLIntegration, 
  GHLDashboardMetrics,
  GHLApiParams
} from '@/types/ghlIntegration';
import { formatGHLDate } from './ghlApiClientV2';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface DateRangeParams {
  startDate: Date;
  endDate: Date;
  locationId: string;
}

export class GHLOptimizationService {
  private static cache = new Map<string, CacheEntry<any>>();
  private static readonly CACHE_DURATION = 15 * 60 * 1000; // 15 minutes
  private static readonly MAX_CACHE_SIZE = 100;
  private static readonly RATE_LIMIT_DELAY = 100; // 100ms between requests

  /**
   * Get cached data or fetch from API with intelligent caching
   */
  private static async getCachedOrFetch<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>,
    cacheDuration: number = this.CACHE_DURATION
  ): Promise<T> {
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() < cached.expiresAt) {
      return cached.data;
    }

    // Fetch fresh data
    const data = await fetchFn();
    
    // Store in cache
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + cacheDuration
    });

    // Clean cache if too large
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      this.cleanCache();
    }

    return data;
  }

  /**
   * Clean expired cache entries
   */
  private static cleanCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now >= entry.expiresAt) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.cache.delete(key));

    // If still too large, remove oldest entries
    if (this.cache.size > this.MAX_CACHE_SIZE) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.2));
      toRemove.forEach(([key]) => this.cache.delete(key));
    }
  }

  /**
   * Create optimized cache key
   */
  private static createCacheKey(
    operation: string, 
    params: DateRangeParams & { [key: string]: any }
  ): string {
    const paramStr = Object.entries(params)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');
    
    return `ghl:${operation}:${paramStr}`;
  }

  /**
   * Rate-limited API call wrapper
   */
  private static async rateLimitedCall<T>(fn: () => Promise<T>): Promise<T> {
    // Add small delay to respect rate limits
    await new Promise(resolve => setTimeout(resolve, this.RATE_LIMIT_DELAY));
    return await fn();
  }

  /**
   * Optimized appointment fetching with intelligent date chunking
   */
  static async getOptimizedAppointments(
    config: GHLIntegration,
    startDate: Date,
    endDate: Date
  ) {
    const client = createGHLClient(config.api_key);
    const cacheKey = this.createCacheKey('appointments', {
      startDate: formatGHLDate(startDate),
      endDate: formatGHLDate(endDate),
      locationId: config.location_id
    });

    return this.getCachedOrFetch(cacheKey, async () => {
      await GHLIntegrationService.incrementApiUsage(config.id);
      
      return this.rateLimitedCall(() => 
        client.getAppointments({
          locationId: config.location_id,
          startDate: formatGHLDate(startDate),
          endDate: formatGHLDate(endDate)
        })
      );
    });
  }

  /**
   * Optimized opportunities fetching
   */
  static async getOptimizedOpportunities(
    config: GHLIntegration,
    startDate: Date,
    endDate: Date
  ) {
    const client = createGHLClient(config.api_key);
    const cacheKey = this.createCacheKey('opportunities', {
      startDate: formatGHLDate(startDate),
      endDate: formatGHLDate(endDate),
      locationId: config.location_id
    });

    return this.getCachedOrFetch(cacheKey, async () => {
      await GHLIntegrationService.incrementApiUsage(config.id);
      
      return this.rateLimitedCall(() => 
        client.getOpportunities({
          locationId: config.location_id,
          startDate: formatGHLDate(startDate),
          endDate: formatGHLDate(endDate)
        })
      );
    });
  }

  /**
   * Optimized invoice fetching
   */
  static async getOptimizedInvoices(
    config: GHLIntegration,
    startDate: Date,
    endDate: Date
  ) {
    const client = createGHLClient(config.api_key);
    const cacheKey = this.createCacheKey('invoices', {
      startDate: formatGHLDate(startDate),
      endDate: formatGHLDate(endDate),
      locationId: config.location_id
    });

    return this.getCachedOrFetch(cacheKey, async () => {
      await GHLIntegrationService.incrementApiUsage(config.id);
      
      return this.rateLimitedCall(() => 
        client.getInvoices({
          locationId: config.location_id,
          startDate: formatGHLDate(startDate),
          endDate: formatGHLDate(endDate),
          status: 'paid'
        })
      );
    });
  }

  /**
   * Batch fetch all GHL data with parallel requests and caching
   */
  static async getOptimizedDashboardMetrics(
    config: GHLIntegration,
    startDate: Date,
    endDate: Date
  ): Promise<GHLDashboardMetrics> {
    const cacheKey = this.createCacheKey('dashboard_metrics', {
      startDate: formatGHLDate(startDate),
      endDate: formatGHLDate(endDate),
      locationId: config.location_id
    });

    return this.getCachedOrFetch(cacheKey, async () => {
      // Fetch all data in parallel for better performance
      const [appointments, opportunities, invoices] = await Promise.all([
        this.getOptimizedAppointments(config, startDate, endDate),
        this.getOptimizedOpportunities(config, startDate, endDate),
        this.getOptimizedInvoices(config, startDate, endDate)
      ]);

      // Process metrics
      return this.processMetrics(appointments, opportunities, invoices);
    }, this.CACHE_DURATION);
  }

  /**
   * Process raw GHL data into dashboard metrics
   */
  private static processMetrics(
    appointments: any[],
    opportunities: any[],
    invoices: any[]
  ): GHLDashboardMetrics {
    // Process appointments
    const appointmentMetrics = {
      total: appointments.length,
      scheduled: appointments.filter(a => ['scheduled', 'confirmed'].includes(a.appointmentStatus)).length,
      completed: appointments.filter(a => a.appointmentStatus === 'completed').length,
      no_show: appointments.filter(a => a.appointmentStatus === 'no_show').length,
      cancelled: appointments.filter(a => a.appointmentStatus === 'cancelled').length,
    };

    // Process opportunities
    const opportunityMetrics = {
      total: opportunities.length,
      won: opportunities.filter(o => o.status === 'won').length,
      lost: opportunities.filter(o => ['lost', 'abandoned'].includes(o.status)).length,
      open: opportunities.filter(o => o.status === 'open').length,
      total_value: opportunities.reduce((sum, o) => sum + (o.monetaryValue || 0), 0),
      won_value: opportunities
        .filter(o => o.status === 'won')
        .reduce((sum, o) => sum + (o.monetaryValue || 0), 0),
    };

    // Process revenue
    const revenueMetrics = {
      opportunities: opportunityMetrics.won_value,
      invoices: invoices
        .filter(i => i.status === 'paid')
        .reduce((sum, i) => sum + (i.amountPaid || 0), 0),
      total: 0
    };
    revenueMetrics.total = revenueMetrics.opportunities + revenueMetrics.invoices;

    return {
      appointments: appointmentMetrics,
      opportunities: opportunityMetrics,
      revenue: revenueMetrics,
      contacts: {
        total: 0, // Can be fetched separately if needed
        new_this_period: 0
      }
    };
  }

  /**
   * Smart date chunking for large date ranges
   */
  static async getMetricsWithDateChunking(
    config: GHLIntegration,
    startDate: Date,
    endDate: Date,
    maxChunkSizeDays: number = 30
  ): Promise<GHLDashboardMetrics> {
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= maxChunkSizeDays) {
      // Small range, fetch directly
      return this.getOptimizedDashboardMetrics(config, startDate, endDate);
    }

    // Large range, chunk it
    const chunks: { start: Date; end: Date }[] = [];
    let currentStart = new Date(startDate);
    
    while (currentStart < endDate) {
      const currentEnd = new Date(currentStart);
      currentEnd.setDate(currentEnd.getDate() + maxChunkSizeDays - 1);
      
      if (currentEnd > endDate) {
        currentEnd.setTime(endDate.getTime());
      }
      
      chunks.push({
        start: new Date(currentStart),
        end: new Date(currentEnd)
      });
      
      currentStart.setDate(currentEnd.getDate() + 1);
    }

    // Fetch chunks in parallel (with rate limiting)
    const chunkResults = await Promise.all(
      chunks.map(async (chunk, index) => {
        // Add staggered delay for rate limiting
        await new Promise(resolve => setTimeout(resolve, index * this.RATE_LIMIT_DELAY));
        return this.getOptimizedDashboardMetrics(config, chunk.start, chunk.end);
      })
    );

    // Merge results
    return this.mergeMetrics(chunkResults);
  }

  /**
   * Merge multiple metric results
   */
  private static mergeMetrics(metricsArray: GHLDashboardMetrics[]): GHLDashboardMetrics {
    return metricsArray.reduce((merged, current) => ({
      appointments: {
        total: merged.appointments.total + current.appointments.total,
        scheduled: merged.appointments.scheduled + current.appointments.scheduled,
        completed: merged.appointments.completed + current.appointments.completed,
        no_show: merged.appointments.no_show + current.appointments.no_show,
        cancelled: merged.appointments.cancelled + current.appointments.cancelled,
      },
      opportunities: {
        total: merged.opportunities.total + current.opportunities.total,
        won: merged.opportunities.won + current.opportunities.won,
        lost: merged.opportunities.lost + current.opportunities.lost,
        open: merged.opportunities.open + current.opportunities.open,
        total_value: merged.opportunities.total_value + current.opportunities.total_value,
        won_value: merged.opportunities.won_value + current.opportunities.won_value,
      },
      revenue: {
        opportunities: merged.revenue.opportunities + current.revenue.opportunities,
        invoices: merged.revenue.invoices + current.revenue.invoices,
        total: merged.revenue.total + current.revenue.total,
      },
      contacts: {
        total: Math.max(merged.contacts.total, current.contacts.total), // Take max for total
        new_this_period: merged.contacts.new_this_period + current.contacts.new_this_period,
      }
    }), {
      appointments: { total: 0, scheduled: 0, completed: 0, no_show: 0, cancelled: 0 },
      opportunities: { total: 0, won: 0, lost: 0, open: 0, total_value: 0, won_value: 0 },
      revenue: { opportunities: 0, invoices: 0, total: 0 },
      contacts: { total: 0, new_this_period: 0 }
    });
  }

  /**
   * Clear all caches (useful for testing or forcing refresh)
   */
  static clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  static getCacheStats() {
    const now = Date.now();
    const entries = Array.from(this.cache.values());
    
    return {
      totalEntries: entries.length,
      expiredEntries: entries.filter(entry => now >= entry.expiresAt).length,
      validEntries: entries.filter(entry => now < entry.expiresAt).length,
      oldestEntry: entries.length > 0 ? Math.min(...entries.map(e => e.timestamp)) : null,
      newestEntry: entries.length > 0 ? Math.max(...entries.map(e => e.timestamp)) : null,
    };
  }

  /**
   * Preload data for common date ranges
   */
  static async preloadCommonRanges(config: GHLIntegrationConfig): Promise<void> {
    const now = new Date();
    const commonRanges = [
      { start: new Date(now.getTime() - 24 * 60 * 60 * 1000), end: now }, // Last 24 hours
      { start: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000), end: now }, // Last 7 days
      { start: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), end: now }, // Last 30 days
    ];

    // Preload in background (don't await)
    commonRanges.forEach((range, index) => {
      setTimeout(() => {
        this.getOptimizedDashboardMetrics(config, range.start, range.end).catch(() => {
          // Ignore preload errors
        });
      }, index * 1000); // Stagger requests
    });
  }
}