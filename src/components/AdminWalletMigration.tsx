import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Users, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AdminWalletMigration = () => {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [usersWithoutWallets, setUsersWithoutWallets] = useState<number | null>(null);

  const checkUsersWithoutWallets = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .is('celo_wallet_address', null);

      if (error) throw error;
      
      setUsersWithoutWallets(count || 0);
      
      if (count === 0) {
        toast.success('All users already have wallets!');
      }
    } catch (error: any) {
      console.error('Error checking users:', error);
      toast.error(error.message);
    }
  };

  const runMigration = async () => {
    setMigrating(true);
    setResult(null);

    try {
      toast.info('Starting wallet migration...', {
        description: 'This may take a few moments'
      });

      const { data, error } = await supabase.functions.invoke('migrate-existing-users', {
        body: {}
      });

      if (error) throw error;

      setResult(data);

      if (data.success) {
        toast.success('Migration completed!', {
          description: `✅ ${data.migrated} users migrated successfully`
        });
      } else {
        toast.error('Migration completed with errors', {
          description: data.message
        });
      }

      // Refresh the count
      await checkUsersWithoutWallets();
    } catch (error: any) {
      console.error('Migration error:', error);
      toast.error('Migration failed', {
        description: error.message
      });
    } finally {
      setMigrating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          User Wallet Migration
        </CardTitle>
        <CardDescription>
          Create permanent Celo wallets for existing users without wallet addresses
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This will create permanent Celo wallet addresses for all users who don't have one yet.
            Each user will be notified about their new wallet address.
          </AlertDescription>
        </Alert>

        <div className="flex gap-2">
          <Button
            onClick={checkUsersWithoutWallets}
            variant="outline"
            disabled={migrating}
          >
            <Users className="mr-2 h-4 w-4" />
            Check Users Without Wallets
          </Button>

          <Button
            onClick={runMigration}
            disabled={migrating || usersWithoutWallets === 0}
          >
            {migrating ? 'Migrating...' : 'Run Migration'}
          </Button>
        </div>

        {usersWithoutWallets !== null && (
          <div className="p-4 border rounded-lg bg-muted">
            <p className="text-sm font-medium">
              Users without wallets: <span className="text-lg font-bold">{usersWithoutWallets}</span>
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Migration Results</span>
            </div>
            
            <div className="p-4 border rounded-lg space-y-2">
              <p className="text-sm">
                <strong>Total Users:</strong> {result.total}
              </p>
              <p className="text-sm text-green-600">
                <strong>Successfully Migrated:</strong> {result.migrated}
              </p>
              {result.failedUsers && result.failedUsers.length > 0 && (
                <p className="text-sm text-red-600">
                  <strong>Failed:</strong> {result.failedUsers.length}
                </p>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                {result.message}
              </p>
            </div>

            {result.failedUsers && result.failedUsers.length > 0 && (
              <details className="p-4 border rounded-lg bg-red-50">
                <summary className="cursor-pointer font-medium text-red-600">
                  View Failed Users
                </summary>
                <ul className="mt-2 space-y-1">
                  {result.failedUsers.map((fail: any) => (
                    <li key={fail.userId} className="text-sm">
                      <strong>{fail.userId}:</strong> {fail.error}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
        )}

        <div className="pt-4 border-t space-y-2">
          <h4 className="font-medium text-sm">What this does:</h4>
          <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
            <li>Creates a permanent Celo wallet for each user</li>
            <li>Encrypts and stores the private key securely</li>
            <li>Saves the wallet address to user's profile</li>
            <li>Sends a notification with wallet address to each user</li>
            <li>Enables deposits to work for all users</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};