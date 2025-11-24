import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { GoogleOAuthService } from '@/lib/services/googleOAuthService';
import { useToast } from '@/hooks/use-toast';

export default function GoogleOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contains projectId
    const error = searchParams.get('error');

    if (error) {
      toast({
        title: 'Authorization Failed',
        description: error === 'access_denied' 
          ? 'You cancelled the authorization process' 
          : 'An error occurred during authorization',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    if (!code) {
      toast({
        title: 'Invalid Callback',
        description: 'No authorization code received',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    if (!state) {
      toast({
        title: 'Invalid State',
        description: 'Project ID not found in callback',
        variant: 'destructive',
      });
      navigate('/');
      return;
    }

    try {
      // Exchange code for tokens
      const tokenData = await GoogleOAuthService.exchangeCodeForToken(code);
      
      // Get user profile
      const profile = await GoogleOAuthService.getUserProfile(tokenData.access_token);
      
      // Save connection to database
      await GoogleOAuthService.saveConnection(
        state, // projectId
        tokenData.access_token,
        tokenData.refresh_token,
        tokenData.expires_at,
        profile.email
      );

      toast({
        title: 'Connected Successfully',
        description: `Connected to Google Sheets as ${profile.name}`,
      });

      // Redirect back to project settings
      navigate(`/project/${state}?tab=settings&subtab=google-sheets`);
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to Google',
        variant: 'destructive',
      });
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Connecting to Google Sheets...</p>
      </div>
    </div>
  );
}