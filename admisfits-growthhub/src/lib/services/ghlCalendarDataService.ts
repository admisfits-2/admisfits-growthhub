// GHL Calendar Data Service
// Focused on fetching and processing calendar appointment data only

import { createGHLRealClient } from './ghlRealClient';
import { formatGHLDate } from './ghlSimpleClient';
import { shouldUseMockData } from '../config/ghlConfig';
import { GHLIntegrationService } from './ghlIntegrationService';
import {
  GHLDashboardMetrics,
  GHLAppointment,
  GHLIntegration,
  ProjectDailyMetricsWithGHL
} from '@/types/ghlIntegration';
import { supabase } from '@/integrations/supabase/client';

export class GHLCalendarDataService {
  /**
   * Fetch appointment metrics for selected calendars
   */
  static async fetchCalendarMetrics(
    config: GHLIntegration,
    startDate: Date,
    endDate: Date
  ): Promise<GHLDashboardMetrics> {
    try {
      if (!config.selected_calendar_ids?.length) {
        throw new Error('No calendars selected for syncing');
      }

      // Update sync status
      await GHLIntegrationService.updateSyncStatus(config.project_id, 'in_progress');

      // Fetch appointments for each selected calendar
      const allAppointments: GHLAppointment[] = [];
      const calendarBreakdown: GHLDashboardMetrics['calendarBreakdown'] = {};

      for (const calendarId of config.selected_calendar_ids) {
        try {
          const appointments = await this.fetchAppointmentsForCalendar(
            config,
            calendarId,
            startDate,
            endDate
          );

          allAppointments.push(...appointments);

          // Calculate metrics per calendar
          const calendarMetrics = this.processAppointmentMetrics(appointments);
          const calendarName = config.selected_calendar_names?.[
            config.selected_calendar_ids.indexOf(calendarId)
          ] || calendarId;

          calendarBreakdown[calendarId] = {
            calendarName,
            total: calendarMetrics.total,
            completed: calendarMetrics.completed,
            no_show: calendarMetrics.no_show,
            cancelled: calendarMetrics.cancelled,
            scheduled: calendarMetrics.scheduled
          };
        } catch (error) {
          console.error(`Error fetching appointments for calendar ${calendarId}:`, error);
        }
      }

      // Calculate overall metrics
      const overallMetrics = this.processAppointmentMetrics(allAppointments);
      
      // Calculate performance metrics
      const performance = {
        show_rate: overallMetrics.completed + overallMetrics.no_show > 0
          ? (overallMetrics.completed / (overallMetrics.completed + overallMetrics.no_show)) * 100
          : 0,
        completion_rate: overallMetrics.total > 0
          ? (overallMetrics.completed / overallMetrics.total) * 100
          : 0,
        cancellation_rate: overallMetrics.total > 0
          ? (overallMetrics.cancelled / overallMetrics.total) * 100
          : 0
      };

      // Update sync status to success
      await GHLIntegrationService.updateSyncStatus(config.project_id, 'success');

      return {
        appointments: overallMetrics,
        calendarBreakdown,
        performance
      };

    } catch (error) {
      console.error('Error fetching calendar metrics:', error);
      
      // Update sync status to error
      await GHLIntegrationService.updateSyncStatus(
        config.project_id,
        'error',
        error instanceof Error ? error.message : 'Unknown error'
      );
      
      throw error;
    }
  }

  /**
   * Fetch appointments for a specific calendar
   */
  private static async fetchAppointmentsForCalendar(
    config: GHLIntegration,
    calendarId: string,
    startDate: Date,
    endDate: Date
  ): Promise<GHLAppointment[]> {
    const client = createGHLRealClient(config.api_key, config.location_id, shouldUseMockData());
    
    return await client.getAppointments({
      calendarId,
      startDate: formatGHLDate(startDate),
      endDate: formatGHLDate(endDate)
    });
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
      pending: 0
    };

    appointments.forEach(appointment => {
      switch (appointment.appointmentStatus?.toLowerCase()) {
        case 'scheduled':
        case 'confirmed':
          metrics.scheduled++;
          break;
        case 'completed':
        case 'showed':
          metrics.completed++;
          break;
        case 'no_show':
        case 'noshow':
          metrics.no_show++;
          break;
        case 'cancelled':
        case 'canceled':
          metrics.cancelled++;
          break;
        case 'pending':
        default:
          metrics.pending++;
          break;
      }
    });

    return metrics;
  }

  /**
   * Sync calendar data to project_daily_metrics table
   */
  static async syncCalendarDataToMetrics(
    projectId: string,
    userId: string,
    config: GHLIntegration,
    date: Date
  ): Promise<void> {
    try {
      if (!config.selected_calendar_ids?.length) {
        throw new Error('No calendars selected for syncing');
      }

      // Update sync status to in_progress
      await GHLIntegrationService.updateSyncStatus(config.project_id, 'in_progress');

      // Fetch data for the specific date
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      const metrics = await this.fetchCalendarMetrics(config, startDate, endDate);
      
      // Prepare data for insertion/update
      const metricsData: Partial<ProjectDailyMetricsWithGHL> = {
        project_id: projectId,
        user_id: userId,
        date: formatGHLDate(date),
        source: 'ghl',
        
        // Map appointment metrics
        ghl_appointments_total: metrics.appointments.total,
        ghl_appointments_completed: metrics.appointments.completed,
        ghl_appointments_no_show: metrics.appointments.no_show,
        ghl_appointments_cancelled: metrics.appointments.cancelled,
        
        // Store calendar breakdown in raw_data
        raw_data: {
          calendar_metrics: metrics.calendarBreakdown,
          performance: metrics.performance,
          sync_timestamp: new Date().toISOString(),
          selected_calendar_ids: config.selected_calendar_ids
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
      console.error('Error syncing calendar data to metrics:', error);
      
      // Update sync status to error
      await GHLIntegrationService.updateSyncStatus(
        config.project_id,
        'error',
        error instanceof Error ? error.message : 'Sync failed'
      );
      
      throw error;
    }
  }

  /**
   * Trigger manual sync for calendar data
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

      if (!config.selected_calendar_ids?.length) {
        throw new Error('No calendars selected for syncing');
      }

      const startDate = dateRange?.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
      const endDate = dateRange?.endDate || new Date();

      // Sync each day in the range
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        await this.syncCalendarDataToMetrics(projectId, userId, config, new Date(currentDate));
        currentDate.setDate(currentDate.getDate() + 1);
      }
    } catch (error) {
      console.error('Error in manual sync:', error);
      throw error;
    }
  }

  /**
   * Get real-time calendar metrics for dashboard
   */
  static async getRealTimeMetrics(
    projectId: string,
    startDate: Date,
    endDate: Date
  ): Promise<GHLDashboardMetrics | null> {
    try {
      const config = await GHLIntegrationService.getIntegration(projectId);
      
      if (!config || !config.is_active || !config.selected_calendar_ids?.length) {
        return null;
      }

      return await this.fetchCalendarMetrics(config, startDate, endDate);
    } catch (error) {
      console.error('Error fetching real-time calendar metrics:', error);
      return null;
    }
  }
}