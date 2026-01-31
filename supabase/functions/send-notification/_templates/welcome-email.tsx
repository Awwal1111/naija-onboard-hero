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
  Button,
  Img,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface WelcomeEmailProps {
  userName: string
  referrerName?: string
  signupBonus?: number
}

export const WelcomeEmail = ({
  userName,
  referrerName,
  signupBonus = 500,
}: WelcomeEmailProps) => (
  <Html>
    <Head />
    <Preview>Welcome to NaijaLancers - Your freelance journey starts now! 🚀</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header with Logo */}
        <Section style={header}>
          <Img
            src="https://naijalancers.name.ng/logo.png"
            width="60"
            height="60"
            alt="NaijaLancers"
            style={logo}
          />
          <Heading style={h1}>Welcome to NaijaLancers! 🎉</Heading>
        </Section>

        <Text style={greeting}>Hi {userName},</Text>
        
        <Text style={text}>
          {referrerName 
            ? `Congratulations! You've joined Nigeria's fastest-growing freelance marketplace, referred by ${referrerName}.`
            : "Congratulations! You've joined Nigeria's fastest-growing freelance marketplace."
          }
        </Text>

        {signupBonus > 0 && (
          <Section style={bonusBox}>
            <Text style={bonusTitle}>🎁 Welcome Bonus</Text>
            <Text style={bonusAmount}>{signupBonus} NC</Text>
            <Text style={bonusDesc}>credited to your wallet</Text>
          </Section>
        )}

        <Section style={stepsSection}>
          <Text style={sectionTitle}>Get Started in 3 Easy Steps:</Text>
          
          <Section style={stepBox}>
            <Text style={stepNumber}>1</Text>
            <Text style={stepText}>
              <strong>Complete Your Profile</strong><br />
              Add your skills, portfolio, and a professional photo to stand out
            </Text>
          </Section>
          
          <Section style={stepBox}>
            <Text style={stepNumber}>2</Text>
            <Text style={stepText}>
              <strong>Browse Opportunities</strong><br />
              Explore jobs, gigs, and expert classes tailored to your skills
            </Text>
          </Section>
          
          <Section style={stepBox}>
            <Text style={stepNumber}>3</Text>
            <Text style={stepText}>
              <strong>Start Earning</strong><br />
              Apply to jobs, create gigs, or refer friends for instant rewards
            </Text>
          </Section>
        </Section>

        <Button style={ctaButton} href="https://naijalancers.name.ng/dashboard">
          Go to Dashboard →
        </Button>

        <Section style={featuresSection}>
          <Text style={featuresTitle}>Why NaijaLancers?</Text>
          <Text style={featureItem}>✅ Secure SafePay escrow protection</Text>
          <Text style={featureItem}>✅ Instant withdrawals to your bank</Text>
          <Text style={featureItem}>✅ Verified experts and clients</Text>
          <Text style={featureItem}>✅ AI-powered job matching</Text>
          <Text style={featureItem}>✅ Free learning resources</Text>
        </Section>

        <Hr style={hr} />

        <Text style={helpText}>
          Need help getting started? Reply to this email or chat with our support team anytime.
        </Text>
        
        <Text style={footer}>
          <Link href="https://naijalancers.name.ng" target="_blank" style={link}>
            NaijaLancers
          </Link>
          <br />
          Nigeria's Digital Freelance Marketplace
          <br />
          Support: support@naijalancers.name.ng | WhatsApp: +234 816 714 0857
        </Text>
      </Container>
    </Body>
  </Html>
)

export default WelcomeEmail

const main = {
  backgroundColor: '#f6f9fc',
  fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
}

const container = {
  backgroundColor: '#ffffff',
  margin: '0 auto',
  padding: '0',
  marginBottom: '64px',
  borderRadius: '12px',
  overflow: 'hidden',
}

const header = {
  backgroundColor: '#008751',
  padding: '32px 40px',
  textAlign: 'center' as const,
}

const logo = {
  margin: '0 auto 16px',
  borderRadius: '12px',
}

const h1 = {
  color: '#ffffff',
  fontSize: '28px',
  fontWeight: 'bold',
  margin: '0',
  padding: '0',
}

const greeting = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  padding: '32px 40px 8px',
  margin: '0',
}

const text = {
  color: '#555',
  fontSize: '16px',
  lineHeight: '26px',
  padding: '0 40px',
  margin: '0 0 24px',
}

const bonusBox = {
  backgroundColor: '#ecfdf5',
  borderRadius: '12px',
  padding: '24px',
  margin: '24px 40px',
  textAlign: 'center' as const,
  border: '2px dashed #10b981',
}

const bonusTitle = {
  color: '#059669',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const bonusAmount = {
  color: '#059669',
  fontSize: '32px',
  fontWeight: 'bold',
  margin: '0',
}

const bonusDesc = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '4px 0 0',
}

const stepsSection = {
  padding: '0 40px',
  marginTop: '32px',
}

const sectionTitle = {
  color: '#333',
  fontSize: '18px',
  fontWeight: 'bold',
  marginBottom: '16px',
}

const stepBox = {
  display: 'flex',
  marginBottom: '16px',
  padding: '16px',
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
}

const stepNumber = {
  backgroundColor: '#008751',
  color: '#ffffff',
  width: '28px',
  height: '28px',
  borderRadius: '50%',
  textAlign: 'center' as const,
  lineHeight: '28px',
  fontWeight: 'bold',
  marginRight: '16px',
  flexShrink: 0,
}

const stepText = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '22px',
  margin: '0',
}

const ctaButton = {
  backgroundColor: '#008751',
  borderRadius: '8px',
  color: '#ffffff',
  fontSize: '16px',
  fontWeight: 'bold',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'block',
  padding: '16px 32px',
  margin: '32px 40px',
}

const featuresSection = {
  backgroundColor: '#f8fafc',
  padding: '24px 40px',
  margin: '32px 0',
}

const featuresTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  marginBottom: '12px',
}

const featureItem = {
  color: '#555',
  fontSize: '14px',
  lineHeight: '24px',
  margin: '0',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '0 40px',
}

const helpText = {
  color: '#6b7280',
  fontSize: '14px',
  textAlign: 'center' as const,
  padding: '24px 40px',
  margin: '0',
}

const link = {
  color: '#008751',
  textDecoration: 'underline',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  padding: '0 40px 32px',
}
