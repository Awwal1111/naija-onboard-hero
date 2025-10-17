import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BrandButton } from '@/components/ui/brand-button'
import { BrandInput } from '@/components/ui/brand-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useWallet } from '@/hooks/useWallet'
import { useToast } from '@/hooks/use-toast'

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Withdraw Funds</DialogTitle>
        </DialogHeader>
        
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
      </DialogContent>
    </Dialog>
  )
}