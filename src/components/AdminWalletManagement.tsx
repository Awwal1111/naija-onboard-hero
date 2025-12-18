import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Minus, Search, Wallet, Users } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'

export const AdminWalletManagement = () => {
  const { toast } = useToast()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<any>(null)
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [searching, setSearching] = useState(false)
  const [processing, setProcessing] = useState(false)

  const searchUser = async () => {
    if (!searchQuery.trim()) return

    setSearching(true)
    setSearchResults([])
    setSelectedUser(null)

    try {
      const query = searchQuery.trim().toLowerCase()

      // Search by name or phone in profiles
      const { data: profileResults, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, full_name, phone_number, wallet_balance, balance_withdrawable, profile_picture_url')
        .or(`full_name.ilike.%${query}%,phone_number.ilike.%${query}%`)
        .limit(10)

      if (profileError) {
        console.error('Profile search error:', profileError)
      }

      // Also try email lookup using the RPC function
      const { data: emailResult } = await supabase.rpc('lookup_user_by_email', {
        lookup_email: searchQuery.trim()
      })

      let results: any[] = profileResults || []

      // If email lookup found a match, add user details
      const emailData = emailResult as { found: boolean; user_id?: string; email?: string } | null
      if (emailData && emailData.found && emailData.user_id) {
        const emailUserId = emailData.user_id
        
        // Check if already in results
        const alreadyInResults = results.some(r => r.user_id === emailUserId)
        
        if (!alreadyInResults) {
          // Fetch full profile data for this user
          const { data: emailUserProfile } = await supabase
            .from('profiles')
            .select('user_id, full_name, phone_number, wallet_balance, balance_withdrawable, profile_picture_url')
            .eq('user_id', emailUserId)
            .single()

          if (emailUserProfile) {
            results = [{
              ...emailUserProfile,
              email: emailData.email
            }, ...results]
          }
        }
      }

      if (results.length === 0) {
        toast({
          title: "Not Found",
          description: "No users found matching that search query.",
          variant: "destructive"
        })
      } else if (results.length === 1) {
        setSelectedUser(results[0])
      } else {
        setSearchResults(results)
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

  const selectUser = (user: any) => {
    setSelectedUser(user)
    setSearchResults([])
  }

  const adjustWallet = async (type: 'add' | 'remove') => {
    if (!selectedUser || !amount || Number(amount) <= 0) return

    setProcessing(true)
    try {
      const amountNum = Number(amount)
      const finalAmount = type === 'remove' ? -amountNum : amountNum

      // Get current balance first
      const { data: currentProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('wallet_balance, balance_withdrawable')
        .eq('user_id', selectedUser.user_id)
        .single()

      if (fetchError) throw fetchError

      // Update wallet balance
      const newBalance = (currentProfile.wallet_balance || 0) + finalAmount
      const newWithdrawable = Math.max(0, (currentProfile.balance_withdrawable || 0) + finalAmount)

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
          Add or remove NC from user accounts. Search by name, email, or phone number.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Search User</CardTitle>
          <CardDescription>Enter name, email, or phone number to find a user</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Name, email, or phone number"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && searchUser()}
            />
            <Button onClick={searchUser} disabled={searching || !searchQuery.trim()}>
              <Search className="h-4 w-4 mr-2" />
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {/* Search Results List */}
          {searchResults.length > 0 && (
            <Card className="bg-muted/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  {searchResults.length} users found - Select one:
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {searchResults.map((user) => (
                  <div
                    key={user.user_id}
                    className="flex items-center justify-between p-3 rounded-lg bg-background hover:bg-muted cursor-pointer border"
                    onClick={() => selectUser(user)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {user.profile_picture_url ? (
                          <img
                            src={user.profile_picture_url}
                            alt={user.full_name}
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          user.full_name?.charAt(0) || 'U'
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{user.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{user.phone_number || user.email || 'No contact'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">{user.wallet_balance?.toFixed(2) || '0.00'} NC</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Selected User Card */}
          {selectedUser && (
            <Card className="bg-muted/50 border-primary">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center text-white font-bold">
                    {selectedUser.profile_picture_url ? (
                      <img
                        src={selectedUser.profile_picture_url}
                        alt={selectedUser.full_name}
                        className="w-full h-full object-cover rounded-full"
                      />
                    ) : (
                      selectedUser.full_name?.charAt(0) || 'U'
                    )}
                  </div>
                  <div>
                    <CardTitle className="text-base">{selectedUser.full_name || 'Unknown User'}</CardTitle>
                    <CardDescription>{selectedUser.email || selectedUser.phone_number || 'No contact info'}</CardDescription>
                  </div>
                </div>
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

                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={() => {
                    setSelectedUser(null)
                    setAmount('')
                    setReason('')
                  }}
                >
                  Clear Selection
                </Button>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AdminWalletManagement
