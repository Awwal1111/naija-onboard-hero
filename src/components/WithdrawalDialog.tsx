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
  
  // Bank withdrawal state (Quidax Off-Ramp)
  const [bankAmount, setBankAmount] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [selectedBankCode, setSelectedBankCode] = useState('')
  const [bankLoading, setBankLoading] = useState(false)
  const [offRampQuote, setOffRampQuote] = useState<any>(null)
  const [isLoadingOffRampQuote, setIsLoadingOffRampQuote] = useState(false)

  // Crypto withdrawal state
  const [cryptoWalletAddress, setCryptoWalletAddress] = useState('')
  const [cryptoCurrency, setCryptoCurrency] = useState<'cUSD' | 'CELO' | 'USDT'>('cUSD')
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  React.useEffect(() => {
    if (bankAmount && parseFloat(bankAmount) >= 100) {
      fetchOffRampQuote()
    } else {
      setOffRampQuote(null)
    }
  }, [bankAmount])

  const fetchOffRampQuote = async () => {
    if (!bankAmount || parseFloat(bankAmount) < 100) return
    
    const ncAmount = parseFloat(bankAmount)
    // Convert NC to USDT (assuming 1 NC ≈ 1 NGN ≈ 0.000625 USDT at ₦1600/USD)
    const usdtAmount = ncAmount / 1600

    setIsLoadingOffRampQuote(true)
    try {
      const { data, error } = await supabase.functions.invoke('quidax-off-ramp', {
        body: { 
          action: 'get_quote',
          tokenAmount: usdtAmount
        }
      })
      
      if (error) throw error
      if (data?.data) {
        setOffRampQuote(data.data)
      }
    } catch (error: any) {
      console.error('Error fetching off-ramp quote:', error)
    } finally {
      setIsLoadingOffRampQuote(false)
    }
  }

  const handleBankWithdrawal = async () => {
    const withdrawAmount = parseFloat(bankAmount)
    if (!withdrawAmount || withdrawAmount < 100) {
      toast.error("Minimum withdrawal is NC 100")
      return
    }
    
    if (withdrawAmount > currentBalance) {
      toast.error(`You only have NC ${currentBalance.toLocaleString()} withdrawable balance`)
      return
    }
    
    if (!bankAccountNumber || !bankAccountName || !selectedBankCode) {
      toast.error("Please fill in all bank details")
      return
    }

    setBankLoading(true)
    try {
      const bankDetails = {
        account_number: bankAccountNumber,
        account_name: bankAccountName,
        bank_code: selectedBankCode
      }

      const { data, error } = await supabase.functions.invoke('quidax-off-ramp', {
        body: {
          action: 'initiate_withdrawal',
          ncAmount: withdrawAmount,
          bankDetails
        }
      })

      if (error) throw error

      if (data?.success) {
        toast.success('Withdrawal initiated! Funds will arrive in your bank account shortly.')
        onOpenChange(false)
        setBankAmount('')
        setBankAccountNumber('')
        setBankAccountName('')
        setSelectedBankCode('')
      }
    } catch (error: any) {
      console.error('Bank withdrawal error:', error)
      toast.error(error.message || 'Withdrawal failed. Please try again.')
    } finally {
      setBankLoading(false)
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
              <span>Bank</span>
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
            <Card className="bg-green-500/5 border-green-500/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5 text-green-500" />
                  Cash Out to Bank
                  <Badge variant="default" className="bg-green-500">Direct</Badge>
                </CardTitle>
                <CardDescription>
                  Convert NC to Naira and receive directly in your bank account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    <p className="font-medium mb-1">How it works:</p>
                    <p>• Your NC is converted to USDT</p>
                    <p>• USDT is sold for Naira via Quidax</p>
                    <p>• Naira is sent directly to your bank account</p>
                    <p>• Usually completes within 5-10 minutes</p>
                  </AlertDescription>
                </Alert>

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">Your Withdrawable Balance</p>
                  <p className="text-2xl font-bold">NC {currentBalance.toLocaleString()}</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank-amount">Amount (NC)</Label>
                  <Input
                    id="bank-amount"
                    type="number"
                    placeholder="Enter NC amount"
                    min="100"
                    step="100"
                    value={bankAmount}
                    onChange={(e) => setBankAmount(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Min: NC 100 | Available: NC {currentBalance.toLocaleString()}
                  </p>
                </div>

                {offRampQuote && (
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <p className="text-xs text-muted-foreground">You will receive approximately:</p>
                    <p className="text-lg font-bold">₦{offRampQuote.fiat_amount?.toLocaleString()}</p>
                    <p className="text-xs text-muted-foreground">
                      Rate: ₦{offRampQuote.rate} per USDT
                    </p>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="bank-account">Bank Account Number</Label>
                  <Input
                    id="bank-account"
                    placeholder="0123456789"
                    maxLength={10}
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bank-name">Bank</Label>
                  <Select value={selectedBankCode} onValueChange={setSelectedBankCode}>
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

                <div className="space-y-2">
                  <Label htmlFor="account-name">Account Name</Label>
                  <Input
                    id="account-name"
                    placeholder="Enter account name as shown on bank"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                  />
                </div>

                <BrandButton 
                  className="w-full"
                  onClick={handleBankWithdrawal}
                  disabled={bankLoading || !bankAmount || parseFloat(bankAmount) < 100 || !bankAccountNumber || !bankAccountName || !selectedBankCode}
                >
                  {bankLoading ? 'Processing...' : 'Withdraw to Bank Account'}
                </BrandButton>

                <div className="text-xs text-muted-foreground space-y-1 border-t pt-4">
                  <p className="font-medium">Benefits:</p>
                  <ul className="list-disc list-inside space-y-1">
                    <li>No manual approval needed</li>
                    <li>Direct to your bank account</li>
                    <li>Secure automated processing</li>
                    <li>Real-time status updates</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
