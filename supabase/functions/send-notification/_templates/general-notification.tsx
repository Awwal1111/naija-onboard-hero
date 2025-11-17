import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
  Button,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface GeneralNotificationProps {
  userName: string
  title: string
  message: string
  actionUrl?: string
  actionText?: string
}

export const GeneralNotification = ({
  userName,
  title,
  message,
  actionUrl,
  actionText,
}: GeneralNotificationProps) => (
  <Html>
    <Head />
    <Preview>{title}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{title}</Heading>
        <Text style={greeting}>Hi {userName},</Text>
        <Text style={text}>{message}</Text>
        
        {actionUrl && actionText && (
          <Button style={button} href={actionUrl}>
            {actionText}
          </Button>
        )}
        
        <Text style={footer}>
          <Link
            href="https://naijalancers.com"
            target="_blank"
            style={link}
          >
            NaijaLancers
          </Link>
          <br />
          Nigeria's Digital Freelance Marketplace
          <br />
          Support: support@naijalancers.com | WhatsApp: +234 816 714 0857
        </Text>
      </Container>
    </Body>
  </Html>
)

export default GeneralNotification

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
  margin: '40px 0 20px',
  padding: '0',
  textAlign: 'center' as const,
}

const greeting = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
  marginBottom: '8px',
}

const text = {
  color: '#333',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
}

const button = {
  backgroundColor: '#10b981',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '12px 20px',
  margin: '32px 40px',
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
  padding: '0 40px',
}
