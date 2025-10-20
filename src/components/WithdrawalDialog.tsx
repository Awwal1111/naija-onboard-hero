import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { Coins, Send, AlertCircle, Wallet } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

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
  const { toast } = useToast()
  const [amount, setAmount] = useState('')
  const [accountNumber, setAccountNumber] = useState('')
  const [accountName, setAccountName] = useState('')
  const [bankCode, setBankCode] = useState('')
  const [loading, setLoading] = useState(false)

  // Crypto withdrawal state
  const [cryptoWallet, setCryptoWallet] = useState('')
  const [cryptoCurrency, setCryptoCurrency] = useState<'cUSD' | 'CELO'>('cUSD')
  const [cryptoAmount, setCryptoAmount] = useState('')
  const [cryptoLoading, setCryptoLoading] = useState(false)

  const handleWithdraw = async () => {
    const withdrawAmount = parseFloat(amount)
    if (!withdrawAmount || withdrawAmount < 3000) {
      toast({
        title: "Invalid Amount",
        description: "Minimum withdrawal is NC 3,000",
        variant: "destructive"
      })
      return
    }
    
    if (withdrawAmount > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have NC ${currentBalance.toLocaleString()} withdrawable balance`,
        variant: "destructive"
      })
      return
    }
    
    if (!accountNumber || !accountName || !bankCode) {
      toast({
        title: "Missing Information",
        description: "Please fill in all bank details",
        variant: "destructive"
      })
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
    const withdrawAmount = parseFloat(cryptoAmount)
    if (!withdrawAmount || withdrawAmount < 3000) {
      toast({
        title: "Invalid Amount",
        description: "Minimum withdrawal is NC 3,000",
        variant: "destructive"
      })
      return
    }
    
    if (withdrawAmount > currentBalance) {
      toast({
        title: "Insufficient Balance",
        description: `You only have NC ${currentBalance.toLocaleString()} withdrawable balance`,
        variant: "destructive"
      })
      return
    }
    
    if (!cryptoWallet || !cryptoWallet.match(/^0x[a-fA-F0-9]{40}$/)) {
      toast({
        title: "Invalid Wallet",
        description: "Please enter a valid Celo wallet address",
        variant: "destructive"
      })
      return
    }

    setCryptoLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('celo-withdrawal', {
        body: {
          walletAddress: cryptoWallet,
          ncAmount: withdrawAmount,
          currency: cryptoCurrency
        }
      })

      if (error) throw error

      if (data.success) {
        toast({
          title: "Withdrawal Processing",
          description: `Your ${data.currency} will arrive shortly. TX: ${data.txHash.substring(0, 10)}...`,
        })
        onOpenChange(false)
        setCryptoAmount('')
        setCryptoWallet('')
      } else {
        throw new Error(data.error || 'Withdrawal failed')
      }
    } catch (error: any) {
      console.error('Crypto withdrawal error:', error)
      toast({
        title: "Withdrawal Failed",
        description: error.message || 'Please try again later',
        variant: "destructive"
      })
    } finally {
      setCryptoLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5 text-primary" />
            Withdraw Funds
          </DialogTitle>
          <DialogDescription>
            Choose your preferred withdrawal method
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="auto" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auto" className="gap-2">
              <Coins className="h-4 w-4" />
              Automatic (Recommended)
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Send className="h-4 w-4 mr-2" />
              Manual (Not Recommended)
            </TabsTrigger>
          </TabsList>

          {/* Automatic Withdrawal (Crypto) */}
          <TabsContent value="auto" className="space-y-4">
            <Card className="bg-green-500/5 border-green-500/20">
              <CardContent className="pt-6 space-y-4">
                <div className="flex items-start gap-3">
                  <Coins className="h-5 w-5 text-green-500 mt-0.5" />
                  <div className="flex-1 space-y-2">
                    <h3 className="font-semibold">Withdraw to Celo Wallet</h3>
                    <p className="text-sm text-muted-foreground">
                      Receive cUSD or CELO instantly to your MiniPay or any Celo wallet
                    </p>
                  </div>
                </div>

                {/* Balance Info */}
                <div className="bg-accent/50 rounded-lg p-3">
                  <p className="text-sm">
                    <span className="font-medium">Withdrawable Balance:</span>{' '}
                    NC {currentBalance.toLocaleString()}
                  </p>
                  <p className="text-xs text-text-secondary mt-1">
                    Minimum withdrawal: NC 3,000
                  </p>
                </div>

                {/* Currency Selection */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Currency
                  </label>
                  <Select value={cryptoCurrency} onValueChange={(v: 'cUSD' | 'CELO') => setCryptoCurrency(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cUSD">cUSD (Stable - Recommended)</SelectItem>
                      <SelectItem value="CELO">CELO</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Amount (NC)
                  </label>
                  <BrandInput
                    type="number"
                    value={cryptoAmount}
                    onChange={(e) => setCryptoAmount(e.target.value)}
                    placeholder="Enter amount"
                    min="3000"
                    max={currentBalance.toString()}
                  />
                </div>

                {/* Wallet Address */}
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Your Celo Wallet Address
                  </label>
                  <BrandInput
                    type="text"
                    value={cryptoWallet}
                    onChange={(e) => setCryptoWallet(e.target.value)}
                    placeholder="0x..."
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Your MiniPay or Celo-compatible wallet address
                  </p>
                </div>

                {/* Alert */}
                <div className="flex items-start gap-2 p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-medium">💡 Instant Transfer</p>
                    <p className="text-muted-foreground">
                      Your funds will be sent immediately to your wallet. No waiting!
                    </p>
                  </div>
                </div>

                <BrandButton
                  onClick={handleCryptoWithdraw}
                  disabled={
                    !cryptoAmount || 
                    parseFloat(cryptoAmount) < 3000 || 
                    parseFloat(cryptoAmount) > currentBalance ||
                    !cryptoWallet ||
                    cryptoLoading
                  }
                  className="w-full"
                >
                  {cryptoLoading ? 'Processing...' : `Withdraw to ${cryptoCurrency}`}
                </BrandButton>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Manual Withdrawal (Bank) */}
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
                <p className="text-xs text-text-secondary mt-1">
                  Minimum withdrawal: NC 3,000
                </p>
                <p className="text-xs text-amber-600 mt-1">
                  ⚠️ Only withdrawable balance can be withdrawn. Sign up bonus and daily rewards are non-withdrawable.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">
                  Amount (NC)
                </label>
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
                <label className="text-sm font-medium text-text-primary mb-2 block">
                  Bank
                </label>
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
                <label className="text-sm font-medium text-text-primary mb-2 block">
                  Account Number
                </label>
                <BrandInput
                  type="text"
                  value={accountNumber}
                  onChange={(e) => setAccountNumber(e.target.value)}
                  placeholder="Enter account number"
                  maxLength={10}
                />
              </div>

              <div>
                <label className="text-sm font-medium text-text-primary mb-2 block">
                  Account Name
                </label>
                <BrandInput
                  type="text"
                  value={accountName}
                  onChange={(e) => setAccountName(e.target.value)}
                  placeholder="Enter account name"
                />
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                <p className="text-xs text-yellow-800">
                  ⚠️ Please ensure account details are correct. Incorrect details may delay your withdrawal.
                </p>
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