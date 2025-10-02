import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Plus, Minus, Search, Wallet } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const AdminWalletManagement = () => {
  const { toast } = useToast()
  const [searchEmail, setSearchEmail] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [searching, setSearching] = useState(false)
  const [processing, setProcessing] = useState(false)

  const searchUser = async () => {
    if (!searchEmail.trim()) return

    setSearching(true)
    try {
      // First get user from auth.users via email
      const { data: authData, error: authError } = await supabase
        .from('profiles')
        .select('user_id, full_name, wallet_balance, balance_withdrawable')
        .eq('phone_number', searchEmail)
        .maybeSingle()

      if (authError) throw authError

      if (!authData) {
        toast({
          title: "Not Found",
          description: "User not found with that phone number. Try searching by email through admin panel.",
          variant: "destructive"
        })
      } else {
        setSelectedUser(authData)
      }
    } catch (error: any) {
      console.error('Error searching user:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to search user",
        variant: "destructive"
      })
    } finally {
      setSearching(false)
    }
  }

  const adjustWallet = async (type: 'add' | 'remove') => {
    if (!selectedUser || !amount || Number(amount) <= 0) return

    setProcessing(true)
    try {
      const amountNum = Number(amount)
      const finalAmount = type === 'remove' ? -amountNum : amountNum

      // Update wallet balance
      const newBalance = selectedUser.wallet_balance + finalAmount
      const newWithdrawable = Math.max(0, selectedUser.balance_withdrawable + finalAmount)

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ 
          wallet_balance: newBalance,
          balance_withdrawable: newWithdrawable
        })
        .eq('user_id', selectedUser.user_id)

      if (updateError) throw updateError

      // Log transaction
      const { error: txError } = await supabase
        .from('wallet_transactions')
        .insert({
          user_id: selectedUser.user_id,
          amount: finalAmount,
          kind: type === 'add' ? 'admin_credit' : 'admin_debit',
          status: 'completed',
          reference: reason || `Admin ${type === 'add' ? 'added' : 'removed'} funds`
        })

      if (txError) throw txError

      toast({
        title: "Success",
        description: `Successfully ${type === 'add' ? 'added' : 'removed'} ${amountNum} NC ${type === 'add' ? 'to' : 'from'} user's wallet`,
      })

      // Refresh user data
      setSelectedUser({ ...selectedUser, wallet_balance: newBalance, balance_withdrawable: newWithdrawable })
      setAmount('')
      setReason('')
    } catch (error: any) {
      console.error('Error adjusting wallet:', error)
      toast({
        title: "Error",
        description: error.message || "Failed to adjust wallet",
        variant: "destructive"
      })
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Alert>
        <Wallet className="h-4 w-4" />
        <AlertDescription>
          Add or remove NC from user accounts for manual adjustments, corrections, or special rewards.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Search User</CardTitle>
          <CardDescription>Enter email or phone number to find a user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Email or phone number"
              value={searchEmail}
              onChange={(e) => setSearchEmail(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUser()}
            />
            <Button onClick={searchUser} disabled={searching || !searchEmail.trim()}>
              <Search className="h-4 w-4 mr-2" />
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {selectedUser && (
            <Card className="bg-muted/50">
              <CardHeader>
                <CardTitle className="text-base">{selectedUser.full_name}</CardTitle>
                <CardDescription>{selectedUser.email || searchEmail}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Current Balance</p>
                    <p className="text-2xl font-bold text-primary">
                      {selectedUser.wallet_balance?.toFixed(2) || '0.00'} NC
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Withdrawable</p>
                    <p className="text-lg font-semibold">
                      {selectedUser.balance_withdrawable?.toFixed(2) || '0.00'} NC
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (NC)</Label>
                  <Input
                    id="amount"
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reason">Reason</Label>
                  <Textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Reason for adjustment..."
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => adjustWallet('add')}
                    disabled={processing || !amount || Number(amount) <= 0}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add NC
                  </Button>
                  <Button
                    onClick={() => adjustWallet('remove')}
                    disabled={processing || !amount || Number(amount) <= 0}
                    variant="destructive"
                    className="flex-1"
                  >
                    <Minus className="h-4 w-4 mr-2" />
                    Remove NC
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminWalletManagement
