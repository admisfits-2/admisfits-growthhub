import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/integrations/supabase/types';

export type GoogleSheetsConnectionRow = Database['public']['Tables']['google_sheets_connections']['Row'];
export type GoogleSheetsConnectionInsert = Database['public']['Tables']['google_sheets_connections']['Insert'];
export type GoogleSheetsConnectionUpdate = Database['public']['Tables']['google_sheets_connections']['Update'];

export async function getConnectionsForProject(projectId: string) {
  const { data, error } = await supabase
    .from('google_sheets_connections')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: true });
  return { data, error };
}

export async function upsertConnectionForProject(input: GoogleSheetsConnectionInsert) {
  const { data, error } = await supabase
    .from('google_sheets_connections')
    .upsert(input)
    .select();
  return { data, error };
}

export async function deleteConnection(id: string) {
  const { error } = await supabase
    .from('google_sheets_connections')
    .delete()
    .eq('id', id);
  return { error };
} 