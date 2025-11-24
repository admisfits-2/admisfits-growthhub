import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { MetaOAuthService } from '@/lib/services/metaOAuthService';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function MetaOAuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [isProcessing, setIsProcessing] = useState(true);
  const [adAccounts, setAdAccounts] = useState<any[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string>('');
  const [accessToken, setAccessToken] = useState<string>('');
  const [tokenExpiry, setTokenExpiry] = useState<number | undefined>();

  useEffect(() => {
    handleCallback();
  }, []);

  const handleCallback = async () => {
    const code = searchParams.get('code');
    const state = searchParams.get('state'); // Contains projectId
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');

    if (error) {
      toast({
        title: 'Authorization Failed',
        description: errorDescription || 'User cancelled or an error occurred',
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

    try {
      // Exchange code for token
      const tokenData = await MetaOAuthService.exchangeCodeForToken(code);
      
      // Get long-lived token
      const longLivedToken = await MetaOAuthService.getLongLivedToken(tokenData.access_token);
      setAccessToken(longLivedToken.access_token);
      setTokenExpiry(longLivedToken.expires_at);
      
      // Get user's ad accounts
      const accounts = await MetaOAuthService.getAdAccounts(longLivedToken.access_token);
      
      if (accounts.length === 0) {
        toast({
          title: 'No Ad Accounts Found',
          description: 'No advertising accounts found for this user',
          variant: 'destructive',
        });
        navigate('/');
        return;
      }

      setAdAccounts(accounts);
      setIsProcessing(false);
      
      // If only one account, auto-select it
      if (accounts.length === 1) {
        setSelectedAccount(accounts[0].id);
      }
    } catch (error) {
      console.error('OAuth callback error:', error);
      toast({
        title: 'Connection Failed',
        description: error instanceof Error ? error.message : 'Failed to connect to Meta',
        variant: 'destructive',
      });
      navigate('/');
    }
  };

  const handleSaveConnection = async () => {
    if (!selectedAccount) {
      toast({
        title: 'Select an Account',
        description: 'Please select an ad account to connect',
        variant: 'destructive',
      });
      return;
    }

    const projectId = searchParams.get('state');
    if (!projectId) {
      toast({
        title: 'Invalid State',
        description: 'Project ID not found',
        variant: 'destructive',
      });
      return;
    }

    try {
      setIsProcessing(true);
      
      const selectedAccountData = adAccounts.find(acc => acc.id === selectedAccount);
      if (!selectedAccountData) return;

      await MetaOAuthService.saveConnection(
        projectId,
        selectedAccountData.id,
        selectedAccountData.name,
        accessToken,
        tokenExpiry
      );

      toast({
        title: 'Connected Successfully',
        description: `Connected to ${selectedAccountData.name}`,
      });

      // Redirect back to project page
      navigate(`/project/${projectId}?tab=settings`);
    } catch (error) {
      console.error('Failed to save connection:', error);
      toast({
        title: 'Connection Failed',
        description: 'Failed to save Meta connection',
        variant: 'destructive',
      });
    }
  };

  if (isProcessing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Connecting to Meta Ads...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Select Ad Account</CardTitle>
          <CardDescription>
            Choose which Meta ad account to connect to your project
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedAccount} onValueChange={setSelectedAccount}>
            <SelectTrigger>
              <SelectValue placeholder="Select an ad account" />
            </SelectTrigger>
            <SelectContent>
              {adAccounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{account.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {account.account_id} • {account.currency}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate('/')}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveConnection}
              disabled={!selectedAccount}
              className="flex-1"
            >
              Connect Account
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}