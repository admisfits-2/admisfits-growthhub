import { supabase } from '@/integrations/supabase/client';
import { getGoogleSheetsMetricsService } from './googleSheetsMetricsService';
import { GoogleOAuthService } from './googleOAuthService';

interface AutoSyncJob {
  id: string;
  project_id: string;
  type: 'single' | 'multi';
  interval_minutes: number;
  last_run?: Date;
  next_run: Date;
  is_active: boolean;
}

export class AutoSyncService {
  private static instance: AutoSyncService;
  private syncJobs = new Map<string, AutoSyncJob>();
  private timers = new Map<string, NodeJS.Timeout>();
  private isRunning = false;

  private constructor() {}

  static getInstance(): AutoSyncService {
    if (!AutoSyncService.instance) {
      AutoSyncService.instance = new AutoSyncService();
    }
    return AutoSyncService.instance;
  }

  /**
   * Start the auto-sync service
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    this.isRunning = true;
    console.log('Auto-sync service started');
    
    // Load existing sync jobs from database
    await this.loadSyncJobs();
    
    // Schedule sync jobs
    this.scheduleAllJobs();
  }

  /**
   * Stop the auto-sync service
   */
  stop(): void {
    this.isRunning = false;
    
    // Clear all timers
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
    
    console.log('Auto-sync service stopped');
  }

  /**
   * Load sync jobs from database
   */
  private async loadSyncJobs(): Promise<void> {
    try {
      // Load single-spreadsheet configs with auto-sync enabled
      const { data: singleConfigs } = await supabase
        .from('google_sheets_connections')
        .select('*')
        .eq('is_active', true)
        .neq('spreadsheet_id', 'multi-spreadsheet')
        .gt('sync_frequency_minutes', 0);

      if (singleConfigs) {
        singleConfigs.forEach(config => {
          const job: AutoSyncJob = {
            id: `single-${config.project_id}`,
            project_id: config.project_id,
            type: 'single',
            interval_minutes: config.sync_frequency_minutes,
            next_run: this.calculateNextRun(config.sync_frequency_minutes, config.last_sync_at),
            is_active: true,
          };
          this.syncJobs.set(job.id, job);
        });
      }

      // Load multi-spreadsheet configs with auto-sync enabled
      const { data: multiConfigs } = await supabase
        .from('google_sheets_connections')
        .select('*')
        .eq('spreadsheet_id', 'multi-spreadsheet')
        .eq('is_active', true);

      if (multiConfigs) {
        multiConfigs.forEach(config => {
          if (config.custom_metrics?._multi_spreadsheet_config) {
            try {
              const multiConfig = JSON.parse(config.custom_metrics._multi_spreadsheet_config);
              if (multiConfig.auto_sync_enabled && multiConfig.sync_frequency_minutes > 0) {
                const job: AutoSyncJob = {
                  id: `multi-${config.project_id}`,
                  project_id: config.project_id,
                  type: 'multi',
                  interval_minutes: multiConfig.sync_frequency_minutes,
                  next_run: this.calculateNextRun(multiConfig.sync_frequency_minutes, multiConfig.last_sync_at),
                  is_active: true,
                };
                this.syncJobs.set(job.id, job);
              }
            } catch (e) {
              console.error('Failed to parse multi-spreadsheet config:', e);
            }
          }
        });
      }

      console.log(`Loaded ${this.syncJobs.size} auto-sync jobs`);
    } catch (error) {
      console.error('Failed to load sync jobs:', error);
    }
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(intervalMinutes: number, lastSyncAt?: string): Date {
    const now = new Date();
    const lastSync = lastSyncAt ? new Date(lastSyncAt) : new Date(0);
    const intervalMs = intervalMinutes * 60 * 1000;
    
    const nextRun = new Date(lastSync.getTime() + intervalMs);
    
    // If next run is in the past, schedule for next interval from now
    if (nextRun <= now) {
      return new Date(now.getTime() + intervalMs);
    }
    
    return nextRun;
  }

  /**
   * Schedule all active sync jobs
   */
  private scheduleAllJobs(): void {
    this.syncJobs.forEach(job => {
      if (job.is_active) {
        this.scheduleJob(job);
      }
    });
  }

  /**
   * Schedule a single sync job
   */
  private scheduleJob(job: AutoSyncJob): void {
    // Clear existing timer if any
    const existingTimer = this.timers.get(job.id);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const now = new Date();
    const delay = Math.max(0, job.next_run.getTime() - now.getTime());

    const timer = setTimeout(async () => {
      await this.executeSyncJob(job);
    }, delay);

    this.timers.set(job.id, timer);
    
    console.log(`Scheduled sync job ${job.id} for ${job.next_run.toISOString()} (in ${Math.round(delay / 1000 / 60)} minutes)`);
  }

  /**
   * Execute a sync job
   */
  private async executeSyncJob(job: AutoSyncJob): Promise<void> {
    console.log(`Executing sync job ${job.id} for project ${job.project_id}`);
    
    try {
      // Get Google connection for this project
      const connection = await GoogleOAuthService.getConnection(job.project_id);
      if (!connection) {
        console.error(`No Google connection found for project ${job.project_id}`);
        return;
      }

      const service = getGoogleSheetsMetricsService(connection);

      if (job.type === 'single') {
        // Execute single spreadsheet sync
        const result = await service.syncProjectMetrics(job.project_id);
        console.log(`Single sync result for ${job.project_id}:`, result);
      } else if (job.type === 'multi') {
        // Execute multi-spreadsheet sync
        const multiConfig = await service.getMultiSpreadsheetConfig(job.project_id);
        if (multiConfig) {
          const result = await service.syncMultipleSpreadsheets(job.project_id, multiConfig);
          console.log(`Multi sync result for ${job.project_id}:`, result);
        }
      }

      // Update job timing
      job.last_run = new Date();
      job.next_run = new Date(Date.now() + job.interval_minutes * 60 * 1000);
      
      // Schedule next run
      this.scheduleJob(job);
      
    } catch (error) {
      console.error(`Sync job ${job.id} failed:`, error);
      
      // Reschedule with backoff (double the interval for failed jobs, max 24 hours)
      const backoffInterval = Math.min(job.interval_minutes * 2, 24 * 60);
      job.next_run = new Date(Date.now() + backoffInterval * 60 * 1000);
      this.scheduleJob(job);
    }
  }

  /**
   * Add or update a sync job
   */
  async addSyncJob(projectId: string, type: 'single' | 'multi', intervalMinutes: number): Promise<void> {
    const jobId = `${type}-${projectId}`;
    
    const job: AutoSyncJob = {
      id: jobId,
      project_id: projectId,
      type,
      interval_minutes: intervalMinutes,
      next_run: new Date(Date.now() + intervalMinutes * 60 * 1000),
      is_active: true,
    };

    this.syncJobs.set(jobId, job);
    
    if (this.isRunning) {
      this.scheduleJob(job);
    }
    
    console.log(`Added sync job ${jobId} with ${intervalMinutes} minute interval`);
  }

  /**
   * Remove a sync job
   */
  removeSyncJob(projectId: string, type: 'single' | 'multi'): void {
    const jobId = `${type}-${projectId}`;
    
    // Clear timer
    const timer = this.timers.get(jobId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(jobId);
    }
    
    // Remove job
    this.syncJobs.delete(jobId);
    
    console.log(`Removed sync job ${jobId}`);
  }

  /**
   * Update sync job interval
   */
  async updateSyncJob(projectId: string, type: 'single' | 'multi', intervalMinutes: number): Promise<void> {
    const jobId = `${type}-${projectId}`;
    const existingJob = this.syncJobs.get(jobId);
    
    if (existingJob) {
      existingJob.interval_minutes = intervalMinutes;
      existingJob.next_run = new Date(Date.now() + intervalMinutes * 60 * 1000);
      
      if (this.isRunning) {
        this.scheduleJob(existingJob);
      }
      
      console.log(`Updated sync job ${jobId} to ${intervalMinutes} minute interval`);
    } else {
      await this.addSyncJob(projectId, type, intervalMinutes);
    }
  }

  /**
   * Get sync job status
   */
  getSyncJobStatus(projectId: string, type: 'single' | 'multi'): AutoSyncJob | null {
    const jobId = `${type}-${projectId}`;
    return this.syncJobs.get(jobId) || null;
  }

  /**
   * Get all sync jobs
   */
  getAllSyncJobs(): AutoSyncJob[] {
    return Array.from(this.syncJobs.values());
  }
}

// Export singleton instance
export const autoSyncService = AutoSyncService.getInstance();