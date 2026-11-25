import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AlertCircle, CheckCircle2, Users, Wallet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

type MigrationResult = {
  success: boolean;
  message?: string;
  scanned?: number;
  createdCeloWallets?: number;
  existingCeloWalletsPreserved?: number;
  needsKeyRecovery?: number;
  internalWalletRowsCreated?: number;
  failed?: number;
  error?: string;
};

export const AdminWalletMigration = () => {
  const [migrating, setMigrating] = useState(false);
  const [result, setResult] = useState<MigrationResult | null>(null);
  const [usersWithoutWallets, setUsersWithoutWallets] = useState<number | null>(null);

  const checkUsersWithoutWallets = async () => {
    try {
      const { count, error } = await supabase
        .from('profiles')
        .select('user_id', { count: 'exact', head: true })
        .is('celo_wallet_address', null);

      if (error) throw error;
      setUsersWithoutWallets(count || 0);
      if (count === 0) toast.success('All profiles already have Celo addresses.');
    } catch (error: any) {
      console.error('Error checking users:', error);
      toast.error(error.message || 'Could not check wallet coverage');
    }
  };

  const runMigration = async () => {
    if (usersWithoutWallets === null || usersWithoutWallets === 0) return;
    setMigrating(true);
    setResult(null);

    try {
      toast.info('Starting secure Celo wallet reconciliation', {
        description: 'Existing addresses and encrypted keys will be preserved.'
      });

      const { data, error } = await supabase.functions.invoke('migrate-existing-users', { body: {} });
      if (error) throw error;

      const migration = data as MigrationResult;
      setResult(migration);

      if (migration.success && (migration.failed || 0) === 0 && (migration.needsKeyRecovery || 0) === 0) {
        toast.success('Celo wallet reconciliation completed', {
          description: `${migration.createdCeloWallets || 0} new wallets created.`
        });
      } else {
        toast.warning('Celo reconciliation needs attention', {
          description: `${migration.failed || 0} failed; ${migration.needsKeyRecovery || 0} need key recovery.`
        });
      }
      await checkUsersWithoutWallets();
    } catch (error: any) {
      console.error('Wallet migration error:', error);
      toast.error('Wallet migration could not run', {
        description: error.message || 'Check that you are signed in as a super admin.'
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
          Celo Wallet Reconciliation
        </CardTitle>
        <CardDescription>
          Create permanent Celo wallets for profiles that do not yet have an address.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            This creates and encrypts a new private key only when both the Celo address and encrypted key are absent.
            Existing addresses and encrypted keys are never overwritten. Profiles with an address but no key are
            reported for manual recovery instead of receiving a replacement wallet.
          </AlertDescription>
        </Alert>

        <div className="flex flex-wrap gap-2">
          <Button onClick={checkUsersWithoutWallets} variant="outline" disabled={migrating}>
            <Users className="mr-2 h-4 w-4" />
            Check Celo Coverage
          </Button>
          <Button onClick={runMigration} disabled={migrating || usersWithoutWallets === null || usersWithoutWallets === 0}>
            {migrating ? 'Reconciling wallets...' : 'Run Celo Reconciliation'}
          </Button>
        </div>

        {usersWithoutWallets !== null && (
          <div className="rounded-lg border bg-muted p-4">
            <p className="text-sm font-medium">
              Profiles without a Celo address: <span className="text-lg font-bold">{usersWithoutWallets}</span>
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Internal NC wallet coverage is checked separately; this count is for blockchain addresses only.
            </p>
          </div>
        )}

        {result && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {result.success && !result.failed && !result.needsKeyRecovery
                ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                : <AlertCircle className="h-5 w-5 text-amber-600" />}
              <span className="font-medium">Reconciliation Results</span>
            </div>
            <div className="rounded-lg border p-4">
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-muted-foreground">Profiles scanned</dt><dd className="font-semibold">{result.scanned ?? 0}</dd></div>
                <div><dt className="text-muted-foreground">New Celo wallets</dt><dd className="font-semibold">{result.createdCeloWallets ?? 0}</dd></div>
                <div><dt className="text-muted-foreground">Existing wallets preserved</dt><dd className="font-semibold">{result.existingCeloWalletsPreserved ?? 0}</dd></div>
                <div><dt className="text-muted-foreground">Need key recovery</dt><dd className="font-semibold">{result.needsKeyRecovery ?? 0}</dd></div>
                <div><dt className="text-muted-foreground">Internal wallet rows added</dt><dd className="font-semibold">{result.internalWalletRowsCreated ?? 0}</dd></div>
                <div><dt className="text-muted-foreground">Failures</dt><dd className="font-semibold">{result.failed ?? 0}</dd></div>
              </dl>
              {result.message && <p className="mt-3 text-sm text-muted-foreground">{result.message}</p>}
              {result.error && <p className="mt-3 text-sm text-destructive">{result.error}</p>}
            </div>
          </div>
        )}

        <div className="border-t pt-4">
          <h4 className="text-sm font-medium">Safety guarantees</h4>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-muted-foreground">
            <li>New wallets are generated with cryptographically secure random keys.</li>
            <li>Private keys are encrypted server-side before storage.</li>
            <li>Existing Celo addresses, encrypted keys, NC balances and escrow holds are preserved.</li>
            <li>Only a super admin can run the server-side reconciliation.</li>
            <li>Profiles with an address but missing encrypted key are flagged for manual recovery.</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
