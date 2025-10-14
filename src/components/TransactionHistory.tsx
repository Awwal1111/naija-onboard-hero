import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle, ChevronRight } from 'lucide-react'
import { useWallet, WalletTransaction } from '@/hooks/useWallet'
import { TransactionDetailDialog } from './TransactionDetailDialog'
import { AllTransactionsDialog } from './AllTransactionsDialog'
import { BrandButton } from './ui/brand-button'

export const TransactionHistory = () => {
  const { transactions, loading } = useWallet()
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [allTransactionsOpen, setAllTransactionsOpen] = useState(false)

  const handleTransactionClick = (transaction: WalletTransaction) => {
    setSelectedTransaction(transaction)
    setDialogOpen(true)
  }

  const getTransactionIcon = (type: string) => {
    return type === 'credit' ? (
      <ArrowDownLeft className="h-4 w-4 text-green-500" />
    ) : (
      <ArrowUpRight className="h-4 w-4 text-red-500" />
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-500" />
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Clock className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-100 text-green-800',
      pending: 'bg-yellow-100 text-yellow-800',
      failed: 'bg-red-100 text-red-800'
    }
    
    return (
      <Badge className={`text-xs ${variants[status as keyof typeof variants] || 'bg-gray-100 text-gray-800'}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const formatAmount = (amount: number) => {
    return `NC ${Math.abs(amount).toLocaleString()}`
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-gray-200 h-8 w-8"></div>
                  <div className="flex-1 space-y-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-text-secondary text-sm">No transactions yet</p>
            <p className="text-text-secondary text-xs mt-1">
              Your transaction history will appear here
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {transactions.slice(0, 5).map((transaction) => {
                const isCredit = transaction.kind === 'credit' || 
                               transaction.kind.includes('win') || 
                               transaction.kind.includes('received') ||
                               transaction.kind.includes('reward') ||
                               transaction.kind.includes('deposit') ||
                               transaction.kind === 'transfer_in'
                
                return (
                  <button
                    key={transaction.id}
                    onClick={() => handleTransactionClick(transaction)}
                    className="w-full flex items-center justify-between p-4 hover:bg-accent/70 active:bg-accent rounded-xl transition-all duration-200 group border border-transparent hover:border-border"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        isCredit ? 'bg-green-500/10' : 'bg-red-500/10'
                      }`}>
                        {isCredit ? (
                          <ArrowDownLeft className="h-5 w-5 text-green-500" />
                        ) : (
                          <ArrowUpRight className="h-5 w-5 text-red-500" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0 text-left">
                        <p className="font-medium text-sm truncate">{transaction.reference}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <p className="text-xs text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleDateString()}
                          </p>
                          {getStatusBadge(transaction.status)}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                      <div className="text-right">
                        <p className={`font-semibold text-sm whitespace-nowrap ${
                          isCredit ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {isCredit ? '+' : '-'}{Math.abs(transaction.amount).toLocaleString()} NC
                        </p>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                  </button>
                )
              })}
            </div>
            
            {transactions.length > 5 && (
              <div className="text-center pt-4">
                <BrandButton 
                  variant="outline" 
                  size="sm"
                  onClick={() => setAllTransactionsOpen(true)}
                  className="w-full"
                >
                  View all {transactions.length} transactions
                </BrandButton>
              </div>
            )}

            <TransactionDetailDialog
              transaction={selectedTransaction}
              open={dialogOpen}
              onOpenChange={setDialogOpen}
            />

            <AllTransactionsDialog
              open={allTransactionsOpen}
              onOpenChange={setAllTransactionsOpen}
            />
          </>
        )}
      </CardContent>
    </Card>
  )
}