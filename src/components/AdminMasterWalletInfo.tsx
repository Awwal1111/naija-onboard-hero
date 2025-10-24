import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Wallet, Copy, CheckCircle, Info, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { ethers } from 'ethers'

export const AdminMasterWalletInfo = () => {
  const [masterAddress, setMasterAddress] = useState<string>('')
  const [balance, setBalance] = useState({ celo: '0', cusd: '0' })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [copied, setCopied] = useState(false)

  const ALCHEMY_RPC = "https://celo-mainnet.g.alchemy.com/v2/nJP_zi_my4rK4ihI5i7Py"
  const CUSD_ADDRESS = "0x765DE816845861e75A25fCA122bb6898B8B1282a"

  useEffect(() => {
    fetchMasterWalletInfo()
  }, [])

  const fetchMasterWalletInfo = async () => {
    setLoading(true)
    try {
      // Call edge function to get master wallet address
      const response = await fetch('https://jxybqmquymxkvxxpiuhv.supabase.co/functions/v1/get-master-wallet-address', {
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) {
        throw new Error('Failed to fetch master wallet address')
      }

      const data = await response.json()
      setMasterAddress(data.address)
      
      // Fetch balances
      await fetchBalances(data.address)
    } catch (error: any) {
      console.error('Error fetching master wallet:', error)
      toast.error('Failed to load master wallet info')
    } finally {
      setLoading(false)
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

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchBalances(masterAddress)
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
    </div>
  )
}
