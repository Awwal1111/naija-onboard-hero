import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Coins, Send, AlertCircle, Wallet, Info } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'

interface WithdrawalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentBalance: number
}

const nigerianBanks = [
  { code: "044", name: "Access Bank" },
  { code: "014", name: "Afribank Nigeria Plc" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "032", name: "Union Bank" },
  { code: "033", name: "United Bank for Africa" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" }
]

export const WithdrawalDialog = ({ open, onOpenChange, currentBalance }: WithdrawalDialogProps) => {
  const { initiateWithdrawal } = useWallet()
  
  // Bank withdrawal state
  const [amount, setAmount] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [loading, setLoading] = useState(false)

  // Crypto withdrawal state
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState('')
  const [cryptoCurrency, setCryptoCurrency] = useState<'cUSD' | 'CELO' | 'USDT'>('cUSD')
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount)
    if (!withdrawAmount || withdrawAmount < 100) {
      toast.error("Minimum withdrawal is NC 100")
      return
    }
    
    if (withdrawAmount > currentBalance) {
      toast.error(`You only have NC ${currentBalance.toLocaleString()} withdrawable balance`)
      return
    }
    
    if (!accountNumber || !accountName || !bankCode) {
      toast.error("Please fill in all bank details")
      return
    }

    setLoading(true)
    try {
      const bankDetails = {
        account_number: accountNumber,
        account_name: accountName,
        bank_code: bankCode
      }

      const result = await initiateWithdrawal(withdrawAmount, bankDetails)
      if (result.success) {
        onOpenChange(false)
        setAmount('')
        setAccountNumber('')
        setAccountName('')
        setBankCode('')
      }
    } catch (error) {
      console.error('Withdrawal error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCryptoWithdraw = async () => {
    if (!cryptoWalletAddress.trim()) {
      toast.error("Please enter recipient wallet address")
      return
    }

    if (!cryptoWalletAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast.error("Invalid wallet address")
      return
    }

    if (!cryptoAmount || parseFloat(cryptoAmount) <= 0) {
      toast.error("Please enter a valid NC amount")
      return
    }

    const ncAmount = parseFloat(cryptoAmount)
    
    // Check NC balance (withdrawable balance)
    if (ncAmount > currentBalance) {
      toast.error(`Insufficient balance. You have NC ${currentBalance.toLocaleString()}`)
      return
    }

    if (ncAmount < 100) {
      toast.error("Minimum withdrawal is NC 100")
      return
    }

    setIsLoading(true)

    try {
      // Call the backend edge function to process withdrawal
      const { data: { session } } = await supabase.auth.getSession()
      
      const response = await supabase.functions.invoke('celo-withdrawal', {
        body: {
          walletAddress: cryptoWalletAddress,
          ncAmount: ncAmount,
          currency: cryptoCurrency
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      })

      if (response.error) throw new Error(response.error.message)

      toast.success(`Withdrawal successful! ${response.data.cryptoAmount.toFixed(4)} ${cryptoCurrency} sent`)
      setCryptoAmount("")
      setCryptoWalletAddress("")
      onOpenChange(false)
    } catch (error: any) {
      console.error('Withdrawal error:', error)
      toast.error(error.message || "Withdrawal failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Withdraw Funds
          </DialogTitle>
          <DialogDescription>
            Choose your preferred withdrawal method
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="automatic" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="automatic" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Coins className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Automatic</span>
            </TabsTrigger>
            <TabsTrigger value="manual" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2">
              <Send className="h-3 w-3 sm:h-4 sm:w-4" />
              <span>Manual</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="automatic" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Crypto Withdrawal
                  <Badge variant="default">Instant</Badge>
                </CardTitle>
                <CardDescription>
                  Convert your NC balance to {cryptoCurrency} and send to any wallet
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <p className="font-medium mb-1">How it works:</p>
                    <p>• Your NC balance will be converted to crypto at current rates</p>
                    <p>• Crypto will be sent from our master wallet to your address</p>
                    <p>• Transaction is instant and final</p>
                  </AlertDescription>
                </Alert>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Your Withdrawable Balance</p>
                  <p className="text-2xl font-bold">NC {currentBalance.toLocaleString()}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crypto-currency">Currency</Label>
                  <Select value={cryptoCurrency} onValueChange={(v) => setCryptoCurrency(v as 'cUSD' | 'CELO' | 'USDT')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cUSD">cUSD (Stable)</SelectItem>
                      <SelectItem value="USDT">USDT (Stable)</SelectItem>
                      <SelectItem value="CELO">CELO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crypto-wallet">Recipient Wallet Address</Label>
                  <Input
                    id="crypto-wallet"
                    placeholder="0x..."
                    value={cryptoWalletAddress}
                    onChange={(e) => setCryptoWalletAddress(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault()
                      const pastedText = e.clipboardData.getData('text')
                      setCryptoWalletAddress(pastedText.trim())
                    }}
                    autoComplete="off"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crypto-amount">Amount (NC)</Label>
                  <Input
                    id="crypto-amount"
                    type="number"
                    step="100"
                    min="100"
                    placeholder="Enter NC amount"
                    value={cryptoAmount}
                    onChange={(e) => setCryptoAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Min: NC 100 | Available: NC {currentBalance.toLocaleString()}
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs space-y-1">
                    <p>• Minimum: NC 100</p>
                    <p>• Network: Celo Mainnet</p>
                    <p>• Current Rate: ~₦1,600/USD</p>
                    <p>• Gas fees covered by us</p>
                  </AlertDescription>
                </Alert>

                <BrandButton 
                  onClick={handleCryptoWithdraw} 
                  className="w-full"
                  disabled={isLoading || !cryptoAmount || parseFloat(cryptoAmount) < 100}
                >
                  {isLoading ? "Processing..." : `Withdraw as ${cryptoCurrency}`}
                </BrandButton>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card className="bg-red-500/5 border-red-500/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                  <div className="text-sm space-y-2">
                    <p className="font-medium text-red-500">Manual Withdrawal Temporarily Unavailable</p>
                    <p className="text-muted-foreground">
                      Manual bank withdrawals are currently disabled. Please use automatic crypto withdrawal instead.
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Automatic withdrawal is instant and more secure. Your NC will be converted to crypto and sent directly to your wallet.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
