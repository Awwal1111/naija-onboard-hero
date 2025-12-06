import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowUpRight, ArrowDownLeft, Filter, Calendar, ChevronRight, Download, FileText, FileSpreadsheet } from 'lucide-react'
import { useWallet, WalletTransaction } from '@/hooks/useWallet'
import { TransactionDetailDialog } from './TransactionDetailDialog'
import { BrandButton } from './ui/brand-button'
import { Button } from './ui/button'
import { format, startOfMonth, endOfMonth, startOfYear, subMonths, isWithinInterval } from 'date-fns'
import { exportToCSV, generatePDFData } from '@/lib/exportTransactions'
import { pdf } from '@react-pdf/renderer'
import TransactionsPDFDocument from './TransactionsPDFDocument'
import { useToast } from '@/hooks/use-toast'

interface AllTransactionsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const AllTransactionsDialog: React.FC<AllTransactionsDialogProps> = ({
  open,
  onOpenChange
}) => {
  const { toast } = useToast()
  const { transactions, loading } = useWallet()
  const [selectedTransaction, setSelectedTransaction] = useState<WalletTransaction | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [filterPeriod, setFilterPeriod] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [isExporting, setIsExporting] = useState(false)

  const handleTransactionClick = (transaction: WalletTransaction) => {
    setSelectedTransaction(transaction)
    setDetailDialogOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-green-500/10 text-green-500 border-green-500/20',
      pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
      failed: 'bg-red-500/10 text-red-500 border-red-500/20'
    }
    
    return (
      <Badge 
        variant="outline" 
        className={`text-xs ${variants[status as keyof typeof variants] || 'bg-muted text-muted-foreground'}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    )
  }

  const filterTransactionsByPeriod = (transactions: WalletTransaction[]) => {
    if (filterPeriod === 'all') return transactions

    const now = new Date()
    let startDate: Date
    let endDate: Date = now

    switch (filterPeriod) {
      case 'today':
        startDate = new Date(now.setHours(0, 0, 0, 0))
        break
      case 'this_week':
        startDate = new Date(now.setDate(now.getDate() - 7))
        break
      case 'this_month':
        startDate = startOfMonth(now)
        endDate = endOfMonth(now)
        break
      case 'last_month':
        const lastMonth = subMonths(now, 1)
        startDate = startOfMonth(lastMonth)
        endDate = endOfMonth(lastMonth)
        break
      case 'this_year':
        startDate = startOfYear(now)
        break
      default:
        return transactions
    }

    return transactions.filter(t => 
      isWithinInterval(new Date(t.created_at), { start: startDate, end: endDate })
    )
  }

  const filterTransactionsByType = (transactions: WalletTransaction[]) => {
    if (filterType === 'all') return transactions

    if (filterType === 'credit') {
      return transactions.filter(t => 
        t.kind === 'credit' || 
        t.kind.includes('win') || 
        t.kind.includes('received') ||
        t.kind.includes('reward') ||
        t.kind.includes('deposit') ||
        t.kind === 'transfer_in'
      )
    }

    if (filterType === 'debit') {
      return transactions.filter(t => 
        !['credit', 'transfer_in'].includes(t.kind) &&
        !t.kind.includes('win') &&
        !t.kind.includes('received') &&
        !t.kind.includes('reward') &&
        !t.kind.includes('deposit')
      )
    }

    return transactions.filter(t => t.kind === filterType)
  }

  const filteredTransactions = filterTransactionsByType(filterTransactionsByPeriod(transactions))

  const calculateTotals = () => {
    const credit = filteredTransactions
      .filter(t => 
        t.kind === 'credit' || 
        t.kind.includes('win') || 
        t.kind.includes('received') ||
        t.kind.includes('reward') ||
        t.kind.includes('deposit') ||
        t.kind === 'transfer_in'
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    const debit = filteredTransactions
      .filter(t => 
        !['credit', 'transfer_in'].includes(t.kind) &&
        !t.kind.includes('win') &&
        !t.kind.includes('received') &&
        !t.kind.includes('reward') &&
        !t.kind.includes('deposit')
      )
      .reduce((sum, t) => sum + Math.abs(t.amount), 0)

    return { credit, debit }
  }

  const totals = calculateTotals()

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      toast({ title: 'No transactions to export', variant: 'destructive' })
      return
    }
    exportToCSV(filteredTransactions, 'naijalancers_transactions')
    toast({ title: 'CSV exported successfully' })
  }

  const handleExportPDF = async () => {
    if (filteredTransactions.length === 0) {
      toast({ title: 'No transactions to export', variant: 'destructive' })
      return
    }
    
    setIsExporting(true)
    try {
      const pdfData = generatePDFData(filteredTransactions)
      const blob = await pdf(<TransactionsPDFDocument data={pdfData} />).toBlob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `naijalancers_transactions_${format(new Date(), 'yyyy-MM-dd')}.pdf`
      link.click()
      URL.revokeObjectURL(url)
      toast({ title: 'PDF exported successfully' })
    } catch (error) {
      console.error('PDF export error:', error)
      toast({ title: 'Failed to export PDF', variant: 'destructive' })
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] bg-card border-border">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                All Transactions
              </DialogTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportCSV}
                  disabled={filteredTransactions.length === 0}
                  className="gap-1"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  CSV
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExportPDF}
                  disabled={filteredTransactions.length === 0 || isExporting}
                  className="gap-1"
                >
                  <FileText className="h-4 w-4" />
                  {isExporting ? 'Exporting...' : 'PDF'}
                </Button>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4">
            {/* Filters */}
            <div className="flex gap-3 flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <Select value={filterPeriod} onValueChange={setFilterPeriod}>
                  <SelectTrigger className="w-full bg-input">
                    <SelectValue placeholder="Filter by period" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="this_week">This Week</SelectItem>
                    <SelectItem value="this_month">This Month</SelectItem>
                    <SelectItem value="last_month">Last Month</SelectItem>
                    <SelectItem value="this_year">This Year</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex-1 min-w-[150px]">
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger className="w-full bg-input">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="credit">Credits</SelectItem>
                    <SelectItem value="debit">Debits</SelectItem>
                    <SelectItem value="deposit">Deposits</SelectItem>
                    <SelectItem value="withdrawal">Withdrawals</SelectItem>
                    <SelectItem value="transfer_in">Transfers In</SelectItem>
                    <SelectItem value="transfer_out">Transfers Out</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Credits</p>
                <p className="text-2xl font-bold text-green-500">
                  +{totals.credit.toLocaleString()} NC
                </p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                <p className="text-xs text-muted-foreground mb-1">Total Debits</p>
                <p className="text-2xl font-bold text-red-500">
                  -{totals.debit.toLocaleString()} NC
                </p>
              </div>
            </div>

            {/* Transactions List */}
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {loading ? (
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="animate-pulse p-4 bg-accent/50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="rounded-full bg-muted h-10 w-10"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-muted rounded w-3/4"></div>
                          <div className="h-3 bg-muted rounded w-1/2"></div>
                        </div>
                        <div className="h-4 bg-muted rounded w-20"></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : filteredTransactions.length === 0 ? (
                <div className="text-center py-12">
                  <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No transactions found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your filters
                  </p>
                </div>
              ) : (
                filteredTransactions.map((transaction) => {
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
                              {format(new Date(transaction.created_at), 'MMM dd, yyyy HH:mm')}
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
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <TransactionDetailDialog
        transaction={selectedTransaction}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
      />
    </>
  )
}
