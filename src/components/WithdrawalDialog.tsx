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
import { useCeloWallet } from '@/hooks/useCeloWallet'
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
  const { sendCUSD, sendCELO, cUsdBalance, celoBalance, isTestnet } = useCeloWallet()
  
  // Bank withdrawal state
  const [amount, setAmount] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [loading, setLoading] = useState(false)

  // Crypto withdrawal state
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState('')
  const [cryptoCurrency, setCryptoCurrency] = useState<'cUSD' | 'CELO'>('cUSD')
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount)
    if (!withdrawAmount || withdrawAmount < 3000) {
      toast.error("Minimum withdrawal is NC 3,000")
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
      toast.error("Please enter a valid amount")
      return
    }

    const amountNum = parseFloat(cryptoAmount)
    
    // Check balance based on currency
    const availableBalance = cryptoCurrency === 'cUSD' 
      ? parseFloat(cUsdBalance) 
      : parseFloat(celoBalance)

    if (amountNum > availableBalance) {
      toast.error(`Insufficient ${cryptoCurrency} balance`)
      return
    }

    if (amountNum < 0.01) {
      toast.error("Minimum withdrawal is 0.01")
      return
    }

    setIsLoading(true)

    try {
      let txHash: string
      
      if (cryptoCurrency === 'cUSD') {
        txHash = await sendCUSD(cryptoWalletAddress, cryptoAmount)
      } else {
        txHash = await sendCELO(cryptoWalletAddress, cryptoAmount)
      }

      toast.success(`Withdrawal successful! Tx: ${txHash.slice(0, 10)}...`)
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
                  {isTestnet && <Badge variant="outline">Testnet</Badge>}
                </CardTitle>
                <CardDescription>
                  Send {cryptoCurrency} from your wallet to any address
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-xs text-muted-foreground">Available cUSD</p>
                    <p className="text-lg font-bold">{parseFloat(cUsdBalance).toFixed(4)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Available CELO</p>
                    <p className="text-lg font-bold">{parseFloat(celoBalance).toFixed(4)}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crypto-currency">Currency</Label>
                  <Select value={cryptoCurrency} onValueChange={(v) => setCryptoCurrency(v as 'cUSD' | 'CELO')}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cUSD">cUSD (Stable)</SelectItem>
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
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="crypto-amount">Amount ({cryptoCurrency})</Label>
                  <Input
                    id="crypto-amount"
                    type="number"
                    step="0.01"
                    placeholder="Enter amount"
                    value={cryptoAmount}
                    onChange={(e) => setCryptoAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Available: {cryptoCurrency === 'cUSD' ? cUsdBalance : celoBalance} {cryptoCurrency}
                  </p>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs space-y-1">
                    <p>• Minimum: 0.01 {cryptoCurrency}</p>
                    <p>• Network: Celo {isTestnet ? 'Alfajores (Testnet)' : 'Mainnet'}</p>
                    <p>• Instant transfer with minimal gas fees</p>
                  </AlertDescription>
                </Alert>

                <BrandButton 
                  onClick={handleCryptoWithdraw} 
                  className="w-full"
                  disabled={isLoading}
                >
                  {isLoading ? "Processing..." : `Send ${cryptoCurrency}`}
                </BrandButton>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4">
            <Card className="bg-orange-500/5 border-orange-500/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-orange-500 mt-0.5" />
                  <div className="text-sm space-y-1">
                    <p className="font-medium">Manual Bank Transfer (Slower)</p>
                    <p className="text-muted-foreground">
                      Requires admin processing. May take 1-3 business days.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <div className="bg-accent/50 rounded-lg p-3">
                <p className="text-sm">
                  <span className="font-medium">Withdrawable Balance:</span>{' '}
                  NC {currentBalance.toLocaleString()}
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Minimum withdrawal: NC 3,000
                </p>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Amount (NC)
                </Label>
                <BrandInput
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="Enter amount"
                  min="3000"
                  max={currentBalance.toString()}
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Bank
                </Label>
                <Select value={bankCode} onValueChange={setBankCode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {nigerianBanks.map((bank) => (
                      <SelectItem key={bank.code} value={bank.code}>
                        {bank.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Account Number
                </Label>
                <BrandInput
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter account number"
                  maxLength={10}
                />
              </div>

              <div>
                <Label className="text-sm font-medium mb-2 block">
                  Account Name
                </Label>
                <BrandInput
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Enter account name"
                />
              </div>

              <div className="flex gap-2">
                <BrandButton
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  className="flex-1"
                >
                  Cancel
                </BrandButton>
                <BrandButton
                  onClick={handleWithdraw}
                  disabled={
                    !amount || 
                    parseFloat(amount) < 3000 || 
                    parseFloat(amount) > currentBalance ||
                    !accountNumber || 
                    !accountName || 
                    !bankCode ||
                    loading
                  }
                  className="flex-1"
                >
                  {loading ? 'Processing...' : 'Withdraw'}
                </BrandButton>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
