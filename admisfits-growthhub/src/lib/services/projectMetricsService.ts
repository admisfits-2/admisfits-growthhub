import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type ProjectMetric = Database['public']['Tables']['project_metrics']['Row'];
type ProjectMetricInsert = Database['public']['Tables']['project_metrics']['Insert'];
type ProjectMetricUpdate = Database['public']['Tables']['project_metrics']['Update'];

export interface CustomMetric {
  id: string;
  name: string;
  value: string;
  change: string;
  trend: 'up' | 'down' | 'neutral';
  icon: any;
  type: 'revenue' | 'spend' | 'leads' | 'roi' | 'custom';
  formula?: string;
}

export class ProjectMetricsService {
  // Get metrics for a specific project
  static async getProjectMetrics(projectId: string): Promise<{ data: ProjectMetric[] | null; error: any }> {
    const { data, error } = await supabase
      .from('project_metrics')
      .select('*')
      .eq('project_id', projectId)
      .order('date', { ascending: false });
    
    return { data, error };
  }

  // Get metrics for a specific date range
  static async getProjectMetricsByDateRange(
    projectId: string, 
    startDate: string, 
    endDate: string
  ): Promise<{ data: ProjectMetric[] | null; error: any }> {
    const { data, error } = await supabase
      .from('project_metrics')
      .select('*')
      .eq('project_id', projectId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });
    
    return { data, error };
  }

  // Add a new metric entry
  static async addMetricEntry(metric: Omit<ProjectMetricInsert, 'id'>): Promise<{ data: ProjectMetric | null; error: any }> {
    const { data, error } = await supabase
      .from('project_metrics')
      .insert(metric)
      .select()
      .single();
    
    return { data, error };
  }

  // Update a metric entry
  static async updateMetricEntry(id: string, updates: ProjectMetricUpdate): Promise<{ data: ProjectMetric | null; error: any }> {
    const { data, error } = await supabase
      .from('project_metrics')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  }

  // Calculate project summary metrics
  static calculateProjectSummary(metrics: ProjectMetric[]) {
    if (!metrics.length) {
      return {
        totalRevenue: 0,
        totalSpend: 0,
        totalLeads: 0,
        averageROI: 0,
        totalSales: 0,
        averageCostPerLead: 0,
      };
    }

    const totalRevenue = metrics.reduce((sum, m) => sum + (m.cash_collected_post_refund || 0), 0);
    const totalSpend = metrics.reduce((sum, m) => sum + (m.ad_spend || 0), 0);
    const totalLeads = metrics.reduce((sum, m) => sum + (m.qualified_leads || 0), 0);
    const totalSales = metrics.reduce((sum, m) => sum + (m.total_sales || 0), 0);

    const averageROI = totalSpend > 0 ? ((totalRevenue - totalSpend) / totalSpend) * 100 : 0;
    const averageCostPerLead = totalLeads > 0 ? totalSpend / totalLeads : 0;

    return {
      totalRevenue,
      totalSpend,
      totalLeads,
      averageROI,
      totalSales,
      averageCostPerLead,
    };
  }

  // Get default metrics configuration
  static getDefaultMetrics(): CustomMetric[] {
    return [
      {
        id: 'revenue',
        name: 'Revenue',
        value: '$0',
        change: '0%',
        trend: 'neutral',
        icon: 'DollarSign',
        type: 'revenue',
      },
      {
        id: 'spend',
        name: 'Ad Spend',
        value: '$0',
        change: '0%',
        trend: 'neutral',
        icon: 'TrendingUp',
        type: 'spend',
      },
      {
        id: 'roi',
        name: 'ROI',
        value: '0%',
        change: '0%',
        trend: 'neutral',
        icon: 'Target',
        type: 'roi',
      },
      {
        id: 'leads',
        name: 'Leads',
        value: '0',
        change: '0%',
        trend: 'neutral',
        icon: 'Users',
        type: 'leads',
      },
    ];
  }

  // Save custom metrics configuration
  static async saveCustomMetrics(projectId: string, metrics: CustomMetric[]): Promise<{ error: any }> {
    // This would typically save to a project_settings table
    // For now, we'll use localStorage as a temporary solution
    try {
      localStorage.setItem(`project_${projectId}_metrics`, JSON.stringify(metrics));
      return { error: null };
    } catch (error) {
      return { error };
    }
  }

  // Load custom metrics configuration
  static async loadCustomMetrics(projectId: string): Promise<{ data: CustomMetric[] | null; error: any }> {
    try {
      const saved = localStorage.getItem(`project_${projectId}_metrics`);
      if (saved) {
        return { data: JSON.parse(saved), error: null };
      }
      return { data: this.getDefaultMetrics(), error: null };
    } catch (error) {
      return { data: this.getDefaultMetrics(), error };
    }
  }
} 