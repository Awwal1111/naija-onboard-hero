import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { ArrowUpRight, ArrowDownLeft, Calendar, Hash, FileText, CheckCircle, Clock, XCircle, DollarSign, AlertTriangle } from 'lucide-react'
import { WalletTransaction } from '@/hooks/useWallet'
import { format } from 'date-fns'
import { useDisputes } from '@/hooks/useDisputes'

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
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [disputeDetails, setDisputeDetails] = useState("");
  const { createDispute, isCreatingDispute, getDisputeForTransaction } = useDisputes();

  if (!transaction) return null;

  const existingDispute = getDisputeForTransaction(transaction.id);

  const handleDisputeSubmit = () => {
    if (!disputeReason.trim()) return;
    
    createDispute({
      transactionId: transaction.id,
      reason: disputeReason,
      details: disputeDetails,
    });
    
    setShowDisputeForm(false);
    setDisputeReason("");
    setDisputeDetails("");
    onOpenChange(false);
  };

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

        <div className="space-y-4 py-4">
          {/* Dispute Section at Top */}
          {existingDispute ? (
            <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-sm mb-1">Dispute {existingDispute.status}</h4>
                  <p className="text-xs text-muted-foreground mb-2">
                    Submitted: {format(new Date(existingDispute.created_at), "PPp")}
                  </p>
                  <p className="text-sm"><strong>Reason:</strong> {existingDispute.dispute_reason}</p>
                  {existingDispute.admin_response && (
                    <div className="mt-2 p-2 bg-background rounded">
                      <p className="text-xs font-medium">Admin Response:</p>
                      <p className="text-sm">{existingDispute.admin_response}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : showDisputeForm ? (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <h4 className="font-semibold">Create Dispute</h4>
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Dispute Reason *</Label>
                  <Input
                    value={disputeReason}
                    onChange={(e) => setDisputeReason(e.target.value)}
                    placeholder="e.g., Duplicate charge, incorrect amount"
                    maxLength={100}
                  />
                </div>
                <div>
                  <Label>Additional Details</Label>
                  <Textarea
                    value={disputeDetails}
                    onChange={(e) => setDisputeDetails(e.target.value)}
                    placeholder="Provide more information about the issue..."
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleDisputeSubmit} 
                    disabled={!disputeReason.trim() || isCreatingDispute}
                    className="flex-1"
                    variant="destructive"
                  >
                    {isCreatingDispute ? "Submitting..." : "Submit Dispute"}
                  </Button>
                  <Button 
                    onClick={() => setShowDisputeForm(false)} 
                    variant="outline"
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <Button 
              onClick={() => setShowDisputeForm(true)} 
              variant="outline" 
              className="w-full"
              size="sm"
            >
              <AlertTriangle className="h-4 w-4 mr-2" />
              Report Issue / Create Dispute
            </Button>
          )}

          <Separator />

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