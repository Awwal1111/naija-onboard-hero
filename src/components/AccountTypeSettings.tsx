import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Building2, Code, User, Copy, RefreshCw, Eye, EyeOff, Loader2 } from 'lucide-react';

type AccountType = 'personal' | 'business' | 'developer';

interface AccountSettings {
  account_type: AccountType;
  api_key: string | null;
  business_name: string | null;
  business_registration_number: string | null;
  business_verified: boolean;
}

export const AccountTypeSettings = () => {
  const [settings, setSettings] = useState<AccountSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessRegNumber, setBusinessRegNumber] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [{ data: profileData, error: profileError }, { data: secretsData }] = await Promise.all([
        supabase.from('profiles').select('account_type, business_name, business_registration_number, business_verified').eq('user_id', user.id).single(),
        supabase.from('user_secrets').select('api_key').eq('user_id', user.id).single()
      ]);

      if (profileError) throw profileError;
      
      const combined = {
        account_type: (profileData as any)?.account_type || 'personal',
        api_key: secretsData?.api_key || null,
        business_name: (profileData as any)?.business_name || null,
        business_registration_number: (profileData as any)?.business_registration_number || null,
        business_verified: (profileData as any)?.business_verified || false,
      } as AccountSettings;
      setSettings(combined);
      setBusinessName(combined.business_name || '');
      setBusinessRegNumber(combined.business_registration_number || '');
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateAccountType = async (newType: AccountType) => {
    try {
      setUpdating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to change account type');
        return;
      }

      // Warn if switching away from developer with existing API key
      if (settings?.account_type === 'developer' && newType !== 'developer' && settings?.api_key) {
        if (!confirm('Switching from Developer will not delete your API key, but API access may be restricted. Continue?')) {
          setUpdating(false);
          return;
        }
      }

      const updateData: Record<string, unknown> = { account_type: newType };
      
      // Generate API key for developer accounts if they don't have one
      if (newType === 'developer' && !settings?.api_key) {
        console.log('Generating new API key for developer account...');
        const { data: keyData, error: keyError } = await supabase.rpc('generate_api_key');
        
        if (keyError) {
          console.error('Error generating API key:', keyError);
          throw new Error('Failed to generate API key');
        }
        
        if (!keyData) {
          throw new Error('API key generation returned empty result');
        }
        
        console.log('API key generated successfully:', keyData.substring(0, 10) + '...');
        updateData.api_key = keyData;
      }

      console.log('Updating profile with:', { account_type: newType, has_api_key: !!updateData.api_key });
      
      const { error } = await supabase
        .from('profiles')
        .update(updateData)
        .eq('user_id', user.id);

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }
      
      // Refetch to confirm the update was successful
      await fetchSettings();
      
      if (newType === 'developer') {
        toast.success('Developer account activated! Your API key is ready.');
      } else {
        toast.success(`Account changed to ${newType}!`);
      }
    } catch (error: any) {
      console.error('Error updating account type:', error);
      toast.error(error.message || 'Failed to update account type');
    } finally {
      setUpdating(false);
    }
  };

  const regenerateApiKey = async () => {
    // Confirm before regenerating
    if (!confirm('Are you sure you want to regenerate your API key?\n\nYour current key will stop working immediately. Any applications using it will need to be updated.')) {
      return;
    }
    
    try {
      setUpdating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Please log in to regenerate API key');
        return;
      }

      console.log('Regenerating API key...');
      const { data: keyData, error: keyError } = await supabase.rpc('generate_api_key');
      
      if (keyError) {
        console.error('Error generating API key:', keyError);
        throw new Error('Failed to generate new API key');
      }
      
      if (!keyData) {
        throw new Error('API key generation returned empty result');
      }
      
      console.log('New API key generated:', keyData.substring(0, 10) + '...');
      
      const { error } = await supabase
        .from('user_secrets')
        .upsert({ user_id: user.id, api_key: keyData }, { onConflict: 'user_id' });

      if (error) {
        console.error('Profile update error:', error);
        throw error;
      }
      
      await fetchSettings();
      toast.success('API key regenerated! Your old key is now invalid.');
    } catch (error: any) {
      console.error('Error regenerating API key:', error);
      toast.error(error.message || 'Failed to regenerate API key');
    } finally {
      setUpdating(false);
    }
  };

  const updateBusinessInfo = async () => {
    try {
      setUpdating(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: businessName,
          business_registration_number: businessRegNumber
        })
        .eq('user_id', user.id);

      if (error) throw error;
      
      await fetchSettings();
      toast.success('Business information saved!');
    } catch (error: any) {
      console.error('Error updating business info:', error);
      toast.error(error.message || 'Failed to save business information');
    } finally {
      setUpdating(false);
    }
  };

  const copyApiKey = () => {
    if (settings?.api_key) {
      navigator.clipboard.writeText(settings.api_key);
      toast.success('API key copied to clipboard');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const accountType = settings?.account_type || 'personal';

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Account Type
            <Badge variant={accountType === 'personal' ? 'secondary' : 'default'}>
              {accountType.charAt(0).toUpperCase() + accountType.slice(1)}
            </Badge>
          </CardTitle>
          <CardDescription>
            Upgrade your account to access business or developer features
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Personal Account */}
            <Card 
              className={`cursor-pointer transition-all ${accountType === 'personal' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
              onClick={() => updateAccountType('personal')}
            >
              <CardContent className="pt-6 text-center">
                <User className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <h3 className="font-semibold">Personal</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  For freelancers and individuals
                </p>
                <ul className="text-xs text-muted-foreground mt-3 space-y-1">
                  <li>• Full platform access</li>
                  <li>• Apply to jobs</li>
                  <li>• Become an expert</li>
                </ul>
              </CardContent>
            </Card>

            {/* Business Account */}
            <Card 
              className={`cursor-pointer transition-all ${accountType === 'business' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
              onClick={() => updateAccountType('business')}
            >
              <CardContent className="pt-6 text-center">
                <Building2 className="h-10 w-10 mx-auto mb-3 text-blue-500" />
                <h3 className="font-semibold">Business</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  For companies and agencies
                </p>
                <ul className="text-xs text-muted-foreground mt-3 space-y-1">
                  <li>• All Personal features</li>
                  <li>• Priority job posting</li>
                  <li>• Business verification badge</li>
                </ul>
              </CardContent>
            </Card>

            {/* Developer Account */}
            <Card 
              className={`cursor-pointer transition-all ${accountType === 'developer' ? 'border-primary ring-2 ring-primary/20' : 'hover:border-primary/50'}`}
              onClick={() => updateAccountType('developer')}
            >
              <CardContent className="pt-6 text-center">
                <Code className="h-10 w-10 mx-auto mb-3 text-green-500" />
                <h3 className="font-semibold">Developer</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  For API integrations
                </p>
                <ul className="text-xs text-muted-foreground mt-3 space-y-1">
                  <li>• All Personal features</li>
                  <li>• API access</li>
                  <li>• Webhook integrations</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Business Settings */}
      {accountType === 'business' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Business Information
            </CardTitle>
            <CardDescription>
              Provide your business details for verification
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name</Label>
              <Input
                id="businessName"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="Enter your business name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="regNumber">Registration Number (CAC)</Label>
              <Input
                id="regNumber"
                value={businessRegNumber}
                onChange={(e) => setBusinessRegNumber(e.target.value)}
                placeholder="e.g., RC 1234567"
              />
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={updateBusinessInfo} disabled={updating}>
                {updating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Save Business Info
              </Button>
              {settings?.business_verified && (
                <Badge variant="default" className="bg-green-500">Verified</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Developer Settings */}
      {accountType === 'developer' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Code className="h-5 w-5" />
              API Access
            </CardTitle>
            <CardDescription>
              Your API key for integrating with NaijaLancers
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    value={settings?.api_key || 'No API key generated'}
                    readOnly
                    className="pr-10 font-mono text-sm"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button variant="outline" size="icon" onClick={copyApiKey}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={regenerateApiKey} disabled={updating}>
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Keep your API key secret. Use it in the Authorization header: <code className="bg-muted px-1 rounded">Bearer YOUR_API_KEY</code>
              </p>
            </div>

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">Available API Endpoints</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• <code className="bg-muted px-1 rounded">GET /api/jobs</code> - Search jobs</li>
                <li>• <code className="bg-muted px-1 rounded">GET /api/experts</code> - Search experts</li>
                <li>• <code className="bg-muted px-1 rounded">POST /api/jobs</code> - Post a job</li>
                <li>• <code className="bg-muted px-1 rounded">GET /api/wallet</code> - Get wallet balance</li>
              </ul>
              <p className="text-xs text-muted-foreground mt-2">
                Full API documentation coming soon.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AccountTypeSettings;
