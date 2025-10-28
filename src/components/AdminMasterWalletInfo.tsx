import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Wallet, Copy, CheckCircle, Info, RefreshCw, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { ethers } from 'ethers'
import { supabase } from '@/integrations/supabase/client'

export const AdminMasterWalletInfo = () => {
  const [masterAddress, setMasterAddress] = useState<string>('')
  const [balance, setBalance] = useState({ celo: '0', cusd: '0' })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)
  const [initializing, setInitializing] = useState(false)
  const [transactions, setTransactions] = useState<any[]>([])
  const [loadingTx, setLoadingTx] = useState(false)

  const ALCHEMY_RPC = "https://celo-mainnet.g.alchemy.com/v2/nJP_zi_my4rK4ihI5i7Py"
  const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a"

  useEffect(() => {
    fetchMasterWalletInfo()
  }, [])

  const fetchMasterWalletInfo = async () => {
    setLoading(true)
    try {
      const response = await fetch('https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/get-master-wallet-address', {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      const data = await response.json()
      
      if (!data.success || !data.address) {
        setMasterAddress('')
        return
      }

      setMasterAddress(data.address)
      await fetchBalances(data.address)
      await fetchTransactions()
    } catch (error: any) {
      console.error('Error fetching master wallet:', error)
      setMasterAddress('')
    } finally {
      setLoading(false)
    }
  }

  const initializeMasterWallet = async () => {
    setInitializing(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Please log in first')
        return
      }

      const response = await fetch('https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/initialize-master-wallet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      })

      const data = await response.json()
      
      if (!data.success) {
        toast.error(data.error || 'Failed to initialize master wallet')
        return
      }

      toast.success('Master wallet created! Please fund it with at least 0.1 CELO for gas fees.')
      setMasterAddress(data.address)
      await fetchBalances(data.address)
    } catch (error: any) {
      console.error('Error initializing master wallet:', error)
      toast.error('Failed to initialize master wallet')
    } finally {
      setInitializing(false)
    }
  }

  const fetchBalances = async (address: string) => {
    try {
      const provider = new ethers.JsonRpcProvider(ALCHEMY_RPC)
      
      // Get CELO balance
      const celoBalance = await provider.getBalance(address)
      const celoFormatted = ethers.formatEther(celoBalance)
      
      // Get cUSD balance
      const cUsdAbi = ["function balanceOf(address) view returns (uint256)"]
      const cUsdContract = new ethers.Contract(CUSD_ADDRESS, cUsdAbi, provider)
      const cusdBalance = await cUsdContract.balanceOf(address)
      const cusdFormatted = ethers.formatEther(cusdBalance)
      
      setBalance({
        celo: parseFloat(celoFormatted).toFixed(4),
        cusd: parseFloat(cusdFormatted).toFixed(4)
      })
    } catch (error) {
      console.error('Error fetching balances:', error)
    }
  }

  const fetchTransactions = async () => {
    setLoadingTx(true)
    try {
      const { data, error } = await supabase
        .from('crypto_transactions')
        .select('*, profiles!inner(full_name)')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setTransactions(data || [])
    } catch (error) {
      console.error('Error fetching transactions:', error)
      toast.error('Failed to fetch transactions')
    } finally {
      setLoadingTx(false)
    }
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchBalances(masterAddress)
    await fetchTransactions()
    setRefreshing(false)
    toast.success('Balances refreshed')
  }

  const copyToClipboard = () => {
    navigator.clipboard.writeText(masterAddress)
    setCopied(true)
    toast.success('Address copied to clipboard')
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center">
          <p className="text-muted-foreground">Loading master wallet info...</p>
        </CardContent>
      </Card>
    )
  }

  if (!masterAddress) {
    return (
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <p className="font-medium mb-2">Master Wallet Not Initialized</p>
            <p className="text-xs">You need to generate the master wallet first. This is a one-time operation that creates a secure wallet for auto-sweep functionality.</p>
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Initialize Master Wallet
            </CardTitle>
            <CardDescription>Generate a secure master wallet for your platform</CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={initializeMasterWallet}
              disabled={initializing}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              {initializing ? 'Creating Wallet...' : 'Create Master Wallet'}
            </Button>
            <Alert className="mt-4 bg-yellow-500/10 border-yellow-500/20">
              <Info className="h-4 w-4 text-yellow-500" />
              <AlertDescription className="text-xs">
                <p className="font-medium">Important:</p>
                <p>• This will generate a new Celo wallet</p>
                <p>• The private key is encrypted and stored securely</p>
                <p>• You must fund it with at least 0.1 CELO for gas fees</p>
                <p>• This can only be done once</p>
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <p className="font-medium mb-2">Master Wallet Information</p>
          <p className="text-xs">This is the wallet that holds funds for automatic withdrawals. You can send CELO, cUSD, or USDT to this address to fund the system.</p>
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Master Wallet Address
          </CardTitle>
          <CardDescription>Send crypto here to fund automatic withdrawals</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-muted rounded-lg space-y-2">
            <p className="text-xs text-muted-foreground">Wallet Address (Celo Mainnet)</p>
            <div className="flex items-center gap-2">
              <code className="text-sm font-mono bg-background px-3 py-2 rounded flex-1 break-all">
                {masterAddress}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={copyToClipboard}
                className="shrink-0"
              >
                {copied ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-accent/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">CELO Balance</p>
              <p className="text-2xl font-bold text-primary">{balance.celo}</p>
            </div>
            <div className="p-4 bg-accent/30 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">cUSD Balance</p>
              <p className="text-2xl font-bold text-primary">{balance.cusd}</p>
            </div>
          </div>

          <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            className="w-full"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing...' : 'Refresh Balances'}
          </Button>

          <Alert className="bg-yellow-500/10 border-yellow-500/20">
            <Info className="h-4 w-4 text-yellow-500" />
            <AlertDescription className="text-xs space-y-1">
              <p className="font-medium">⚠️ Important Notes:</p>
              <p>• Only send CELO, cUSD, or USDT on Celo Mainnet</p>
              <p>• Sending other tokens may result in permanent loss</p>
              <p>• This wallet is used for automatic withdrawals</p>
              <p>• Keep sufficient balance for user withdrawals</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-primary" />
              Recent Transactions
            </div>
            <Button size="sm" variant="outline" onClick={fetchTransactions} disabled={loadingTx}>
              <RefreshCw className={`h-3 w-3 ${loadingTx ? 'animate-spin' : ''}`} />
            </Button>
          </CardTitle>
          <CardDescription>Last 20 crypto transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTx ? (
            <p className="text-center text-muted-foreground">Loading...</p>
          ) : transactions.length === 0 ? (
            <p className="text-center text-muted-foreground">No transactions yet</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {transactions.map((tx) => (
                <div key={tx.id} className="p-3 border rounded-lg bg-muted/30 space-y-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">
                        {tx.transaction_type === 'deposit' ? '↓' : '↑'} {tx.crypto_amount.toFixed(4)} {tx.crypto_currency}
                      </p>
                      <p className="text-xs text-muted-foreground">{tx.profiles?.full_name || 'Unknown'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-medium">₦{tx.nc_amount.toLocaleString()} NC</p>
                      <p className={`text-xs ${tx.status === 'completed' ? 'text-green-500' : tx.status === 'failed' ? 'text-red-500' : 'text-yellow-500'}`}>
                        {tx.status}
                      </p>
                    </div>
                  </div>
                  {tx.tx_hash && (
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {tx.tx_hash}
                    </p>
                  )}
                  {tx.error_message && (
                    <p className="text-xs text-red-500">{tx.error_message}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(tx.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
