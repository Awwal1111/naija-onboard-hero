import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'
import { toast } from 'sonner'
import { RefreshCw, ArrowDown, Loader2 } from 'lucide-react'

interface NCConverterDialogProps {
  open: boolean
  onClose: () => void
}

export const NCConverterDialog = ({ open, onClose }: NCConverterDialogProps) => {
  const { user } = useAuth()
  const { profile, refetch } = useProfile()
  const [loading, setLoading] = useState(false)

  const nonWithdrawable = profile?.balance_non_withdrawable || 0
  const canConvert = nonWithdrawable >= 100

  const handleConvert = async () => {
    if (!user || !canConvert) return
    setLoading(true)

    try {
      const { data, error } = await supabase.rpc('convert_nc_balance', {
        p_user_id: user.id,
        p_input_amount: 100,
        p_output_amount: 5,
      })

      if (error) throw error

      const result = data as { success: boolean; error?: string }
      if (!result.success) {
        throw new Error(result.error || 'Conversion failed')
      }

      toast.success('Converted 100 NC → 5 withdrawable NC!')
      refetch()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Conversion failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-primary" />
            NC Converter
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="bg-muted rounded-xl p-4 text-center space-y-3">
            <div>
              <p className="text-xs text-muted-foreground">Non-Withdrawable Balance</p>
              <p className="text-2xl font-bold text-foreground">{nonWithdrawable.toFixed(2)} NC</p>
            </div>

            <ArrowDown className="h-6 w-6 mx-auto text-primary" />

            <div className="bg-primary/10 rounded-lg p-3">
              <p className="text-xs text-muted-foreground">You receive</p>
              <p className="text-xl font-bold text-primary">5 NC <span className="text-xs font-normal text-muted-foreground">(withdrawable)</span></p>
              <p className="text-xs text-muted-foreground mt-1">for every 100 non-withdrawable NC</p>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            Convert your earned rewards into real withdrawable NC at a 100:5 rate.
          </p>

          <Button
            className="w-full"
            disabled={!canConvert || loading}
            onClick={handleConvert}
          >
            {loading ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Converting...</>
            ) : canConvert ? (
              'Convert 100 NC → 5 NC'
            ) : (
              `Need ${(100 - nonWithdrawable).toFixed(0)} more NC`
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
