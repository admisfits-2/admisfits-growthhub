import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

const TestGHLPage = () => {
  const { user } = useAuth();
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const testQuery = async () => {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      // Test if table exists and we can query it
      const { data, error: queryError } = await supabase
        .from('ghl_integrations')
        .select('*');

      if (queryError) {
        setError(`Query Error: ${queryError.message}`);
        console.error('Query error:', queryError);
      } else {
        setResult({ query: 'SELECT * FROM ghl_integrations', data });
      }
    } catch (err) {
      setError(`Unexpected error: ${err}`);
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  const testInsert = async () => {
    if (!user) {
      setError('User not authenticated');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const testData = {
        project_id: '00000000-0000-0000-0000-000000000000', // Use a test UUID
        user_id: user.id,
        api_key: 'test-api-key',
        location_id: 'test-location-id',
        location_name: 'Test Location',
        is_active: true,
        auto_sync_enabled: true,
        sync_frequency_minutes: 60,
        last_sync_status: 'pending',
        daily_api_calls: 0,
        last_reset_date: new Date().toISOString().split('T')[0]
      };

      const { data, error: insertError } = await supabase
        .from('ghl_integrations')
        .insert(testData)
        .select()
        .single();

      if (insertError) {
        setError(`Insert Error: ${insertError.message}`);
        console.error('Insert error:', insertError);
      } else {
        setResult({ operation: 'INSERT', data });
        
        // Clean up test data
        if (data) {
          await supabase
            .from('ghl_integrations')
            .delete()
            .eq('id', data.id);
        }
      }
    } catch (err) {
      setError(`Unexpected error: ${err}`);
      console.error('Unexpected error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <h1 className="text-2xl font-bold mb-6">GHL Integration Database Test</h1>
      
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>User Info</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm bg-gray-100 p-2 rounded">
              {user ? JSON.stringify({ id: user.id, email: user.email }, null, 2) : 'Not authenticated'}
            </pre>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Database Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-4">
              <Button onClick={testQuery} disabled={loading}>
                Test Query
              </Button>
              <Button onClick={testInsert} disabled={loading || !user}>
                Test Insert
              </Button>
            </div>

            {error && (
              <Alert className="mt-4">
                <AlertDescription className="text-red-600">
                  {error}
                </AlertDescription>
              </Alert>
            )}

            {result && (
              <div className="mt-4">
                <h3 className="font-semibold mb-2">Result:</h3>
                <pre className="text-sm bg-gray-100 p-4 rounded overflow-auto">
                  {JSON.stringify(result, null, 2)}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default TestGHLPage;