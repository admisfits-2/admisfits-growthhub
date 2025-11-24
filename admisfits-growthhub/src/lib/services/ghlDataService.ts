// GHL Data Fetching and Processing Service
// Handles fetching data from GHL API and processing it for dashboard metrics

import { createGHLClient, formatGHLDate, getDateRange } from './ghlApiClientV2';
import { GHLIntegrationService } from './ghlIntegrationService';
import { GHLOptimizationService } from './ghlOptimizationService';
import {
  GHLDashboardMetrics,
  GHLAppointment,
  GHLOpportunity,
  GHLInvoice,
  GHLIntegration,
  ProjectDailyMetricsWithGHL
} from '@/types/ghlIntegration';
import { supabase } from '@/integrations/supabase/client';

export class GHLDataService {
  /**
   * Fetch comprehensive GHL metrics for a date range with optimization
   */
  static async fetchGHLMetrics(
    config: GHLIntegration,
    startDate: Date,
    endDate: Date
  ): Promise<GHLDashboardMetrics> {
    try {
      // Use optimized service for better performance and caching
      const metrics = await GHLOptimizationService.getMetricsWithDateChunking(
        config,
        startDate,
        endDate
      );

      return metrics;

    } catch (error) {
      console.error('Error fetching GHL metrics:', error);
      
      // Update sync status to error
      await GHLIntegrationService.updateSyncStatus(
        config.id,
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw error;
    }
  }

  /**
   * Process appointment data into metrics
   */
  private static processAppointmentMetrics(appointments: GHLAppointment[]) {
    const metrics = {
      total: appointments.length,
      scheduled: 0,
      completed: 0,
      no_show: 0,
      cancelled: 0,
    };

    appointments.forEach(appointment => {
      switch (appointment.appointmentStatus) {
        case 'scheduled':
        case 'confirmed':
          metrics.scheduled++;
          break;
        case 'completed':
          metrics.completed++;
          break;
        case 'no_show':
          metrics.no_show++;
          break;
        case 'cancelled':
          metrics.cancelled++;
          break;
      }
    });

    return metrics;
  }

  /**
   * Process opportunity data into metrics
   */
  private static processOpportunityMetrics(opportunities: GHLOpportunity[]) {
    const metrics = {
      total: opportunities.length,
      won: 0,
      lost: 0,
      open: 0,
      total_value: 0,
      won_value: 0,
    };

    opportunities.forEach(opportunity => {
      metrics.total_value += opportunity.monetaryValue || 0;

      switch (opportunity.status) {
        case 'won':
          metrics.won++;
          metrics.won_value += opportunity.monetaryValue || 0;
          break;
        case 'lost':
        case 'abandoned':
          metrics.lost++;
          break;
        case 'open':
          metrics.open++;
          break;
      }
    });

    return metrics;
  }

  /**
   * Process revenue data from opportunities and invoices
   */
  private static processRevenueMetrics(
    opportunities: GHLOpportunity[],
    invoices: GHLInvoice[]
  ) {
    const opportunitiesRevenue = opportunities
      .filter(opp => opp.status === 'won')
      .reduce((sum, opp) => sum + (opp.monetaryValue || 0), 0);

    const invoicesRevenue = invoices
      .filter(invoice => invoice.status === 'paid')
      .reduce((sum, invoice) => sum + (invoice.amountPaid || 0), 0);

    return {
      opportunities: opportunitiesRevenue,
      invoices: invoicesRevenue,
      total: opportunitiesRevenue + invoicesRevenue,
    };
  }

  /**
   * Sync GHL data to project_daily_metrics table
   */
  static async syncGHLDataToMetrics(
    projectId: string,
    userId: string,
    config: GHLIntegration,
    date: Date
  ): Promise<void> {
    try {
      // Update sync status to in_progress
      await GHLIntegrationService.updateSyncStatus(config.project_id, 'in_progress');

      // Fetch data for the specific date
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const metrics = await this.fetchGHLMetrics(config, startDate, endDate);
      
      // Prepare data for insertion/update
      const metricsData: Partial<ProjectDailyMetricsWithGHL> = {
        project_id: projectId,
        user_id: userId,
        date: formatGHLDate(date),
        source: 'ghl',
        
        // GHL-specific metrics
        ghl_appointments_total: metrics.appointments.total,
        ghl_appointments_completed: metrics.appointments.completed,
        ghl_appointments_no_show: metrics.appointments.no_show,
        ghl_appointments_cancelled: metrics.appointments.cancelled,
        ghl_deals_total: metrics.opportunities.total,
        ghl_deals_won: metrics.opportunities.won,
        ghl_deals_lost: metrics.opportunities.lost,
        ghl_deals_value: metrics.opportunities.total_value,
        ghl_deals_won_value: metrics.opportunities.won_value,
        
        // Map to standard fields for compatibility
        revenue: metrics.revenue.total,
        conversions: metrics.opportunities.won,
        
        // Store raw data for debugging
        raw_data: {
          ghl_metrics: metrics,
          sync_timestamp: new Date().toISOString()
        }
      };

      // Insert or update metrics data
      const { error } = await supabase
        .from('project_daily_metrics')
        .upsert(metricsData, {
          onConflict: 'project_id,date,source'
        });

      if (error) {
        throw new Error(`Failed to sync metrics data: ${error.message}`);
      }

      // Update sync status to success
      await GHLIntegrationService.updateSyncStatus(config.project_id, 'success');

    } catch (error) {
      console.error('Error syncing GHL data to metrics:', error);
      
      // Update sync status to error
      await GHLIntegrationService.updateSyncStatus(
        config.id,
        'error',
        error instanceof Error ? error.message : 'Sync failed'
      );
      
      throw error;
    }
  }

  /**
   * Sync multiple days of GHL data
   */
  static async syncDateRange(
    projectId: string,
    userId: string,
    config: GHLIntegration,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    try {
      const dates = this.getDatesBetween(startDate, endDate);
      
      // Process dates in batches to avoid overwhelming the API
      const batchSize = 5;
      for (let i = 0; i < dates.length; i += batchSize) {
        const batch = dates.slice(i, i + batchSize);
        
        await Promise.all(
          batch.map(date => 
            this.syncGHLDataToMetrics(projectId, userId, config, date)
          )
        );
        
        // Add small delay between batches to be API-friendly
        if (i + batchSize < dates.length) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    } catch (error) {
      console.error('Error syncing date range:', error);
      throw error;
    }
  }

  /**
   * Get real-time GHL data for dashboard (without storing)
   */
  static async getRealTimeMetrics(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<GHLDashboardMetrics | null> {
    try {
      const config = await GHLIntegrationService.getIntegration(projectId);
      
      if (!config || !config.is_active) {
        return null;
      }

      return await this.fetchGHLMetrics(config, startDate, endDate);
    } catch (error) {
      console.error('Error fetching real-time GHL metrics:', error);
      return null;
    }
  }

  /**
   * Get stored GHL metrics from database
   */
  static async getStoredMetrics(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<ProjectDailyMetricsWithGHL[]> {
    try {
      const { data, error } = await supabase
        .from('project_daily_metrics')
        .select('*')
        .eq('project_id', projectId)
        .eq('source', 'ghl')
        .gte('date', formatGHLDate(startDate))
        .lte('date', formatGHLDate(endDate))
        .order('date', { ascending: true });

      if (error) {
        console.error('Error fetching stored GHL metrics:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error in getStoredMetrics:', error);
      return [];
    }
  }

  /**
   * Trigger manual sync for a project
   */
  static async triggerManualSync(
    projectId: string,
    userId: string,
    dateRange?: { startDate: Date; endDate: Date }
  ): Promise<void> {
    try {
      const config = await GHLIntegrationService.getIntegration(projectId);
      
      if (!config) {
        throw new Error('GHL integration not configured for this project');
      }

      if (!config.is_active) {
        throw new Error('GHL integration is disabled for this project');
      }

      const startDate = dateRange?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const endDate = dateRange?.endDate || new Date();

      await this.syncDateRange(projectId, userId, config, startDate, endDate);
    } catch (error) {
      console.error('Error in manual sync:', error);
      throw error;
    }
  }

  /**
   * Utility: Get array of dates between two dates
   */
  private static getDatesBetween(startDate: Date, endDate: Date): Date[] {
    const dates: Date[] = [];
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * Get GHL data summary for project dashboard
   */
  static async getProjectSummary(projectId: string): Promise<{
    isConfigured: boolean;
    lastSync?: string;
    totalAppointments?: number;
    totalRevenue?: number;
    error?: string;
  }> {
    try {
      const config = await GHLIntegrationService.getIntegration(projectId);
      
      if (!config) {
        return { isConfigured: false };
      }

      // Get recent metrics
      const endDate = new Date();
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
      
      const metrics = await this.getStoredMetrics(projectId, startDate, endDate);
      
      const totalAppointments = metrics.reduce(
        (sum, metric) => sum + (metric.ghl_appointments_total || 0), 0
      );
      
      const totalRevenue = metrics.reduce(
        (sum, metric) => sum + (metric.revenue || 0), 0
      );

      return {
        isConfigured: true,
        lastSync: config.last_sync_at,
        totalAppointments,
        totalRevenue,
        error: config.last_sync_status === 'error' ? config.last_sync_error : undefined
      };
    } catch (error) {
      console.error('Error getting project summary:', error);
      return {
        isConfigured: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}