import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProjects } from '@/hooks/useProjects';

export default function SupabaseTest() {
  const { user } = useAuth();
  const { projects, isLoadingProjects, projectsError } = useProjects();
  const [testResult, setTestResult] = useState<string>('');

  const testSupabaseConnection = async () => {
    try {
      const { data, error } = await supabase.from('projects').select('count').limit(1);
      if (error) {
        setTestResult(`Error: ${error.message}`);
      } else {
        setTestResult('✅ Supabase connection successful!');
      }
    } catch (err: any) {
      setTestResult(`Error: ${err.message}`);
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Supabase Connection Test</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p><strong>User:</strong> {user ? user.email : 'Not authenticated'}</p>
          <p><strong>Projects loaded:</strong> {projects?.length || 0}</p>
          <p><strong>Loading:</strong> {isLoadingProjects ? 'Yes' : 'No'}</p>
          {projectsError && <p><strong>Error:</strong> {projectsError.message}</p>}
        </div>
        
        <Button onClick={testSupabaseConnection}>
          Test Supabase Connection
        </Button>
        
        {testResult && (
          <div className="p-2 bg-gray-100 rounded">
            <p>{testResult}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
} 