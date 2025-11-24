import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function TestConnections({ projectId }: { projectId: string }) {
  const [user, setUser] = useState<any>(null);
  const [metaConnections, setMetaConnections] = useState<any[]>([]);
  const [googleConnections, setGoogleConnections] = useState<any[]>([]);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    checkConnections();
  }, [projectId]);

  const checkConnections = async () => {
    try {
      // Get current user
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      setUser(userData.user);

      // Check Meta connections directly
      const { data: metaData, error: metaError } = await supabase
        .from('project_meta_connections')
        .select('*')
        .eq('project_id', projectId);
      
      if (metaError) {
        console.error('Meta query error:', metaError);
        setError(`Meta error: ${metaError.message}`);
      } else {
        setMetaConnections(metaData || []);
      }

      // Check Google Sheets connections if table exists
      const { data: googleData, error: googleError } = await supabase
        .from('google_sheets_connections')
        .select('*')
        .eq('project_id', projectId);
      
      if (googleError) {
        console.error('Google query error:', googleError);
        // Table might not exist, which is ok
      } else {
        setGoogleConnections(googleData || []);
      }

    } catch (err) {
      console.error('Connection check error:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Debug Connection Visibility</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <h3 className="font-semibold">Current User:</h3>
          <pre className="text-xs bg-muted p-2 rounded">
            {JSON.stringify({
              id: user?.id,
              email: user?.email,
              isAdmisfits: user?.email?.endsWith('@admisfits.com')
            }, null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-semibold">Meta Connections ({metaConnections.length}):</h3>
          <pre className="text-xs bg-muted p-2 rounded max-h-40 overflow-auto">
            {JSON.stringify(metaConnections.map(c => ({
              id: c.id,
              user_id: c.user_id,
              ad_account: c.ad_account_name,
              is_active: c.is_active
            })), null, 2)}
          </pre>
        </div>

        <div>
          <h3 className="font-semibold">Google Sheets Connections ({googleConnections.length}):</h3>
          <pre className="text-xs bg-muted p-2 rounded max-h-40 overflow-auto">
            {JSON.stringify(googleConnections.map(c => ({
              id: c.id,
              created_by: c.created_by,
              is_active: c.is_active
            })), null, 2)}
          </pre>
        </div>

        {error && (
          <div className="text-red-500 text-sm">
            Error: {error}
          </div>
        )}

        <Button onClick={checkConnections} size="sm">
          Refresh Debug Info
        </Button>
      </CardContent>
    </Card>
  );
}