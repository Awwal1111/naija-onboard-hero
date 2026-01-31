import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Section,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface TransactionReceiptProps {
  userName: string
  transactionType: string
  amount: string
  reference: string
  date: string
  status: string
  description?: string
}

export const TransactionReceipt = ({
  userName,
  transactionType,
  amount,
  reference,
  date,
  status,
  description,
}: TransactionReceiptProps) => (
  <Html>
    <Head />
    <Preview>Transaction Receipt - {reference}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Transaction Receipt</Heading>
        <Text style={text}>Dear {userName},</Text>
        <Text style={text}>
          Your transaction has been {status.toLowerCase()}. Here are the details:
        </Text>
        
        <Section style={detailsSection}>
          <Text style={detailLabel}>Transaction Type:</Text>
          <Text style={detailValue}>{transactionType}</Text>
          
          <Text style={detailLabel}>Amount:</Text>
          <Text style={detailValue}>{amount}</Text>
          
          <Text style={detailLabel}>Reference:</Text>
          <Text style={detailValue}>{reference}</Text>
          
          <Text style={detailLabel}>Date:</Text>
          <Text style={detailValue}>{date}</Text>
          
          <Text style={detailLabel}>Status:</Text>
          <Text style={detailValue}>{status}</Text>
          
          {description && (
            <>
              <Text style={detailLabel}>Description:</Text>
              <Text style={detailValue}>{description}</Text>
            </>
          )}
        </Section>

        <Hr style={hr} />
        
        <Text style={text}>
          If you have any questions about this transaction, please contact our support team.
        </Text>
        
        <Text style={footer}>
          <Link
            href="https://naijalancers.name.ng"
            target="_blank"
            style={link}
          >
            NaijaLancers
          </Link>
          <br />
          Nigeria's Digital Freelance Marketplace
          <br />
          Founded by <strong>Awwal Dayyabu</strong>
          <br />
          Support: support@naijalancers.name.ng | WhatsApp: +234 816 714 0857
        </Text>
      </Container>
    </Body>
  </Html>
)

export default TransactionReceipt

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '20px 0 48px',
  marginBottom: '64px',
}

const h1 = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '40px 0',
  padding: '0',
  textAlign: 'center' as const,
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
}

const detailsSection = {
  padding: '24px 40px',
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  margin: '24px 40px',
}

const detailLabel = {
  color: '#666',
  fontSize: '14px',
  fontWeight: '600',
  marginBottom: '4px',
  marginTop: '12px',
}

const detailValue = {
  color: '#333',
  fontSize: '16px',
  marginTop: '0',
  marginBottom: '0',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '20px 40px',
}

const link = {
  color: '#10b981',
  textDecoration: 'underline',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '16px',
  textAlign: 'center' as const,
  marginTop: '32px',
}
