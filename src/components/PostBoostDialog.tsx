import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Zap, TrendingUp, Eye, Users } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { supabase } from '@/integrations/supabase/client'
import { useQueryClient } from '@tanstack/react-query'

interface PostBoostDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  postId: string
  postTitle?: string
  currentBoost?: number
  onSuccess?: () => void
}

const QUICK_AMOUNTS = [200, 500, 1000, 2000]

const PostBoostDialog: React.FC<PostBoostDialogProps> = ({
  open,
  onOpenChange,
  postId,
  postTitle,
  currentBoost = 0,
  onSuccess
}) => {
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const handleBoost = async () => {
    const boostAmount = parseFloat(amount)
    
    if (!boostAmount || boostAmount < 100) {
      toast({
        title: "Invalid amount",
        description: "Minimum boost amount is ₦100",
        variant: "destructive"
      })
      return
    }

    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to boost posts",
        variant: "destructive"
      })
      return
    }

    setLoading(true)

    try {
      // Get user's wallet balance
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('wallet_balance')
        .eq('user_id', user.id)
        .single()

      if (profileError) throw profileError

      if ((profile?.wallet_balance || 0) < boostAmount) {
        toast({
          title: "Insufficient balance",
          description: `You need ₦${boostAmount.toLocaleString()} but have ₦${(profile?.wallet_balance || 0).toLocaleString()}`,
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      // Deduct from wallet
      const { error: walletError } = await supabase
        .from('profiles')
        .update({ 
          wallet_balance: (profile?.wallet_balance || 0) - boostAmount 
        })
        .eq('user_id', user.id)

      if (walletError) throw walletError

      // Update post boost
      const newBoostAmount = currentBoost + boostAmount
      const { error: postError } = await supabase
        .from('posts')
        .update({
          boost_amount: newBoostAmount,
          boosted_at: new Date().toISOString()
        })
        .eq('id', postId)

      if (postError) throw postError

      // Record transaction
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          amount: boostAmount,
          type: 'debit',
          balance_type: 'main',
          description: `Post boost - ${postTitle?.slice(0, 30) || 'Post'}`,
          status: 'completed',
          metadata: { post_id: postId }
        })

      toast({
        title: "Post boosted!",
        description: `Your post now has a total boost of ₦${newBoostAmount.toLocaleString()}`
      })

      queryClient.invalidateQueries({ queryKey: ['personalized-posts-v2'] })
      onSuccess?.()
      onOpenChange(false)
      setAmount('')
    } catch (error: any) {
      toast({
        title: "Boost failed",
        description: error.message || "Something went wrong",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            Boost Your Post
          </DialogTitle>
          <DialogDescription>
            Boosted posts appear higher in the feed and get more visibility
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Benefits */}
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-3 bg-muted rounded-lg">
              <Eye className="h-5 w-5 mx-auto text-primary mb-1" />
              <p className="text-xs font-medium">More Views</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
              <p className="text-xs font-medium">Top Ranking</p>
            </div>
            <div className="text-center p-3 bg-muted rounded-lg">
              <Users className="h-5 w-5 mx-auto text-blue-500 mb-1" />
              <p className="text-xs font-medium">More Reach</p>
            </div>
          </div>

          {/* Current Boost */}
          {currentBoost > 0 && (
            <div className="flex items-center justify-between p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
              <span className="text-sm font-medium">Current Boost</span>
              <span className="text-amber-600 dark:text-amber-400 font-bold">
                ₦{currentBoost.toLocaleString()}
              </span>
            </div>
          )}

          {/* Amount Input */}
          <div className="space-y-3">
            <Label>Boost Amount (₦)</Label>
            <Input
              type="number"
              placeholder="Enter amount (min ₦100)"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="100"
            />
            
            {/* Quick Amounts */}
            <div className="flex gap-2">
              {QUICK_AMOUNTS.map((quickAmount) => (
                <Button
                  key={quickAmount}
                  variant={amount === quickAmount.toString() ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setAmount(quickAmount.toString())}
                >
                  ₦{quickAmount.toLocaleString()}
                </Button>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-muted/50 rounded-lg">
            <p className="font-medium text-foreground">How Post Boost Works:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>Boosted posts rank higher in the feed</li>
              <li>Boost amount is cumulative (add more anytime)</li>
              <li>No expiration - your boost stays forever</li>
              <li>Higher boost = more visibility</li>
            </ul>
          </div>

          {/* Summary */}
          {amount && parseFloat(amount) >= 100 && (
            <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span>New Total Boost</span>
                <span className="font-bold text-primary">
                  ₦{(currentBoost + parseFloat(amount)).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Payment</span>
                <span className="font-medium">₦{parseFloat(amount).toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Action Button */}
          <Button
            onClick={handleBoost}
            disabled={loading || !amount || parseFloat(amount) < 100}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Pay & Boost Post
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default PostBoostDialog
