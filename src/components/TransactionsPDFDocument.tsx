import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 10,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#22c55e',
    paddingBottom: 10,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  subtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 4,
  },
  summaryContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    gap: 10,
  },
  summaryBox: {
    flex: 1,
    padding: 10,
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  creditValue: {
    color: '#22c55e',
  },
  debitValue: {
    color: '#ef4444',
  },
  table: {
    marginTop: 10,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f9fafb',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  colDate: {
    width: '15%',
  },
  colType: {
    width: '20%',
  },
  colReference: {
    width: '35%',
  },
  colAmount: {
    width: '15%',
    textAlign: 'right',
  },
  colStatus: {
    width: '15%',
    textAlign: 'center',
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 8,
    color: '#374151',
  },
  cellText: {
    fontSize: 8,
    color: '#4b5563',
  },
  creditText: {
    color: '#22c55e',
  },
  debitText: {
    color: '#ef4444',
  },
  statusBadge: {
    fontSize: 7,
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 2,
  },
  completedStatus: {
    backgroundColor: '#dcfce7',
    color: '#166534',
  },
  pendingStatus: {
    backgroundColor: '#fef9c3',
    color: '#854d0e',
  },
  failedStatus: {
    backgroundColor: '#fee2e2',
    color: '#991b1b',
  },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 30,
    right: 30,
    textAlign: 'center',
    fontSize: 8,
    color: '#9ca3af',
  },
})

interface TransactionsPDFDocumentProps {
  data: {
    transactions: Array<{
      date: string
      time: string
      type: string
      reference: string
      amount: string
      isCredit: boolean
      status: string
    }>
    summary: {
      totalCredits: number
      totalDebits: number
      netBalance: number
      count: number
    }
    generatedAt: string
  }
}

const TransactionsPDFDocument: React.FC<TransactionsPDFDocumentProps> = ({ data }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'completed':
        return styles.completedStatus
      case 'pending':
        return styles.pendingStatus
      case 'failed':
        return styles.failedStatus
      default:
        return {}
    }
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>NaijaLancers Transaction History</Text>
          <Text style={styles.subtitle}>Generated on {data.generatedAt}</Text>
        </View>

        <View style={styles.summaryContainer}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Credits</Text>
            <Text style={[styles.summaryValue, styles.creditValue]}>
              +{data.summary.totalCredits.toLocaleString()} NC
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Total Debits</Text>
            <Text style={[styles.summaryValue, styles.debitValue]}>
              -{data.summary.totalDebits.toLocaleString()} NC
            </Text>
          </View>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryLabel}>Net Balance</Text>
            <Text style={[styles.summaryValue, data.summary.netBalance >= 0 ? styles.creditValue : styles.debitValue]}>
              {data.summary.netBalance >= 0 ? '+' : ''}{data.summary.netBalance.toLocaleString()} NC
            </Text>
          </View>
        </View>

        <Text style={{ fontSize: 9, color: '#6b7280', marginBottom: 8 }}>
          {data.summary.count} transactions
        </Text>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.colDate, styles.headerText]}>Date</Text>
            <Text style={[styles.colType, styles.headerText]}>Type</Text>
            <Text style={[styles.colReference, styles.headerText]}>Reference</Text>
            <Text style={[styles.colAmount, styles.headerText]}>Amount</Text>
            <Text style={[styles.colStatus, styles.headerText]}>Status</Text>
          </View>

          {data.transactions.map((tx, index) => (
            <View key={index} style={styles.tableRow}>
              <View style={styles.colDate}>
                <Text style={styles.cellText}>{tx.date}</Text>
                <Text style={[styles.cellText, { fontSize: 7, color: '#9ca3af' }]}>{tx.time}</Text>
              </View>
              <Text style={[styles.colType, styles.cellText]}>{tx.type}</Text>
              <Text style={[styles.colReference, styles.cellText]}>
                {tx.reference.length > 40 ? tx.reference.substring(0, 40) + '...' : tx.reference}
              </Text>
              <Text style={[styles.colAmount, styles.cellText, tx.isCredit ? styles.creditText : styles.debitText]}>
                {tx.amount} NC
              </Text>
              <View style={styles.colStatus}>
                <Text style={[styles.statusBadge, getStatusStyle(tx.status)]}>
                  {tx.status}
                </Text>
              </View>
            </View>
          ))}
        </View>

        <Text style={styles.footer}>
          NaijaLancers • Your trusted freelance platform • www.naijalancers.name.ng
        </Text>
      </Page>
    </Document>
  )
}

export default TransactionsPDFDocument
