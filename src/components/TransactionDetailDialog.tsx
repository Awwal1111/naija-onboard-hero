import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ArrowUpRight, ArrowDownLeft, Calendar, Hash, FileText, CheckCircle, Clock, XCircle, DollarSign } from 'lucide-react'
import { WalletTransaction } from '@/hooks/useWallet'
import { format } from 'date-fns'

interface TransactionDetailDialogProps {
  transaction: WalletTransaction | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const TransactionDetailDialog: React.FC<TransactionDetailDialogProps> = ({
  transaction,
  open,
  onOpenChange
}) => {
  if (!transaction) return null

  const getStatusIcon = () => {
    switch (transaction.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Clock className="h-5 w-5 text-muted-foreground" />
    }
  }

  const getStatusBadge = () => {
    const variants = {
      completed: 'bg-green-500/10 text-green-500 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20'
    }
    
    return (
      <Badge 
        variant="outline" 
        className={`${variants[transaction.status as keyof typeof variants] || 'bg-muted text-muted-foreground'}`}
      >
        {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
      </Badge>
    )
  }

  const isCredit = transaction.kind === 'credit' || 
                   transaction.kind.includes('win') || 
                   transaction.kind.includes('received') ||
                   transaction.kind.includes('reward') ||
                   transaction.kind.includes('deposit') ||
                   transaction.kind === 'transfer_in'

  const formatTransactionType = (kind: string) => {
    return kind
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-center text-xl font-bold flex items-center justify-center gap-2">
            {isCredit ? (
              <ArrowDownLeft className="h-5 w-5 text-green-500" />
            ) : (
              <ArrowUpRight className="h-5 w-5 text-red-500" />
            )}
            Transaction Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Amount Section */}
          <div className="text-center py-6 bg-accent/50 rounded-xl">
            <p className="text-sm text-muted-foreground mb-2">Amount</p>
            <p className={`text-4xl font-bold ${isCredit ? 'text-green-500' : 'text-red-500'}`}>
              {isCredit ? '+' : '-'}{Math.abs(transaction.amount).toLocaleString()} NC
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              {formatTransactionType(transaction.kind)}
            </p>
          </div>

          <Separator />

          {/* Status */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {getStatusIcon()}
              <span>Status</span>
            </div>
            {getStatusBadge()}
          </div>

          <Separator />

          {/* Transaction Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Description</p>
                <p className="text-sm font-medium">{transaction.reference}</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Date & Time</p>
                <p className="text-sm font-medium">
                  {format(new Date(transaction.created_at), 'PPpp')}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground mb-1">Transaction ID</p>
                <p className="text-xs font-mono break-all text-muted-foreground">
                  {transaction.id}
                </p>
              </div>
            </div>

            {transaction.safepay_id && (
              <>
                <Separator className="my-2" />
                <div className="flex items-start gap-3">
                  <DollarSign className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">SafePay ID</p>
                    <p className="text-xs font-mono break-all text-muted-foreground">
                      {transaction.safepay_id}
                    </p>
                  </div>
                </div>
              </>
            )}

            {transaction.metadata && Object.keys(transaction.metadata).length > 0 && (
              <>
                <Separator className="my-2" />
                <div className="flex items-start gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Additional Info</p>
                    <div className="text-xs space-y-1">
                      {Object.entries(transaction.metadata).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="font-medium">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
