import { WalletTransaction } from '@/hooks/useWallet'
import { format } from 'date-fns'

export const exportToCSV = (transactions: WalletTransaction[], filename: string = 'transactions') => {
  const headers = ['Date', 'Type', 'Reference', 'Amount (NC)', 'Status']
  
  const rows = transactions.map(t => {
    const isCredit = t.kind === 'credit' || 
                     t.kind.includes('win') || 
                     t.kind.includes('received') ||
                     t.kind.includes('reward') ||
                     t.kind.includes('deposit') ||
                     t.kind === 'transfer_in'
    
    return [
      format(new Date(t.created_at), 'yyyy-MM-dd HH:mm:ss'),
      t.kind.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      `"${t.reference?.replace(/"/g, '""') || ''}"`,
      isCredit ? `+${Math.abs(t.amount)}` : `-${Math.abs(t.amount)}`,
      t.status
    ].join(',')
  })

  const csvContent = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`
  link.click()
  URL.revokeObjectURL(link.href)
}

export const generatePDFData = (transactions: WalletTransaction[]) => {
  let totalCredits = 0
  let totalDebits = 0

  const formattedTransactions = transactions.map(t => {
    const isCredit = t.kind === 'credit' || 
                     t.kind.includes('win') || 
                     t.kind.includes('received') ||
                     t.kind.includes('reward') ||
                     t.kind.includes('deposit') ||
                     t.kind === 'transfer_in'
    
    const amount = Math.abs(t.amount)
    if (isCredit) {
      totalCredits += amount
    } else {
      totalDebits += amount
    }

    return {
      date: format(new Date(t.created_at), 'MMM dd, yyyy'),
      time: format(new Date(t.created_at), 'HH:mm'),
      type: t.kind.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      reference: t.reference || '-',
      amount: isCredit ? `+${amount.toLocaleString()}` : `-${amount.toLocaleString()}`,
      isCredit,
      status: t.status
    }
  })

  return {
    transactions: formattedTransactions,
    summary: {
      totalCredits,
      totalDebits,
      netBalance: totalCredits - totalDebits,
      count: transactions.length
    },
    generatedAt: format(new Date(), 'MMMM dd, yyyy HH:mm')
  }
}
