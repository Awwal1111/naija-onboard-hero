import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle } from 'lucide-react'
import { useWallet } from '@/hooks/useWallet'

export const TransactionHistory = () => {
  const { transactions, loading } = useWallet()

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
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN'
    }).format(Math.abs(amount))
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
          <div className="space-y-3">
            {transactions.slice(0, 5).map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-lg transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1">
                    {getTransactionIcon(transaction.transaction_type)}
                    {getStatusIcon(transaction.status)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{transaction.description}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <p className="text-xs text-text-secondary">
                        {new Date(transaction.created_at).toLocaleDateString()}
                      </p>
                      {getStatusBadge(transaction.status)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium text-sm ${
                    transaction.transaction_type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.transaction_type === 'credit' ? '+' : '-'}{formatAmount(transaction.amount)}
                  </p>
                  {transaction.reference_id && (
                    <p className="text-xs text-text-secondary">
                      Ref: {transaction.reference_id.slice(-8)}
                    </p>
                  )}
                </div>
              </div>
            ))}
            
            {transactions.length > 5 && (
              <div className="text-center pt-3">
                <button className="text-sm text-primary hover:underline">
                  View all transactions
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}