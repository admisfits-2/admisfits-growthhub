import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

type Project = Database['public']['Tables']['projects']['Row'];
type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export class ProjectService {
  // Get all projects
  static async getProjects(): Promise<{ data: Project[] | null; error: any }> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('created_at', { ascending: false });
    
    return { data, error };
  }

  // Get project by ID
  static async getProjectById(id: string): Promise<{ data: Project | null; error: any }> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('id', id)
      .single();
    
    return { data, error };
  }

  // Create new project
  static async createProject(project: Omit<ProjectInsert, 'created_by'>): Promise<{ data: Project | null; error: any }> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return { data: null, error: { message: 'User not authenticated' } };
    }

    const { data, error } = await supabase
      .from('projects')
      .insert({
        ...project,
        created_by: user.id,
        status: 'active'
      })
      .select()
      .single();
    
    return { data, error };
  }

  // Update project
  static async updateProject(id: string, updates: ProjectUpdate): Promise<{ data: Project | null; error: any }> {
    const { data, error } = await supabase
      .from('projects')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  }

  // Delete project (soft delete by setting status to archived)
  static async archiveProject(id: string): Promise<{ data: Project | null; error: any }> {
    const { data, error } = await supabase
      .from('projects')
      .update({
        status: 'archived',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    return { data, error };
  }

  // Get projects by status
  static async getProjectsByStatus(status: 'active' | 'inactive' | 'archived'): Promise<{ data: Project[] | null; error: any }> {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });
    
    return { data, error };
  }
} 