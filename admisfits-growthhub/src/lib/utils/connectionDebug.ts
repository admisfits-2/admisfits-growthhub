import { supabase } from '@/integrations/supabase/client';

export async function debugConnections(projectId: string) {
  console.group('🔍 Connection Debug for project:', projectId);
  
  try {
    // Check current user
    const { data: userData } = await supabase.auth.getUser();
    console.log('Current user:', {
      id: userData?.user?.id,
      email: userData?.user?.email,
      isAdmisfits: userData?.user?.email?.endsWith('@admisfits.com')
    });

    // Check localStorage for Google connections
    const localStorageKey = `google_connection_${projectId}`;
    const localConnection = localStorage.getItem(localStorageKey);
    console.log('LocalStorage Google connection:', localConnection ? JSON.parse(localConnection) : null);

    // Direct database queries
    console.group('📊 Database Queries:');
    
    // Meta connections - raw query
    const metaQuery = supabase
      .from('project_meta_connections')
      .select('*')
      .eq('project_id', projectId);
    
    console.log('Meta query:', metaQuery);
    const { data: metaData, error: metaError } = await metaQuery;
    
    if (metaError) {
      console.error('Meta query error:', metaError);
    } else {
      console.log('Meta connections found:', metaData?.length || 0);
      console.table(metaData?.map(c => ({
        id: c.id,
        user_id: c.user_id,
        ad_account: c.ad_account_name,
        is_active: c.is_active,
        created_at: c.created_at
      })));
    }

    // Check RLS policies
    const { data: rlsData } = await supabase.rpc('current_setting', { 
      setting_name: 'request.jwt.claims' 
    }).single();
    console.log('Current JWT claims:', rlsData);

    console.groupEnd();
  } catch (err) {
    console.error('Debug error:', err);
  }
  
  console.groupEnd();
}

export function clearLocalStorageConnections(projectId?: string) {
  if (projectId) {
    localStorage.removeItem(`google_connection_${projectId}`);
    console.log(`Cleared localStorage for project ${projectId}`);
  } else {
    // Clear all Google connections
    const keys = Object.keys(localStorage).filter(k => k.startsWith('google_connection_'));
    keys.forEach(key => {
      localStorage.removeItem(key);
      console.log(`Cleared ${key}`);
    });
  }
}