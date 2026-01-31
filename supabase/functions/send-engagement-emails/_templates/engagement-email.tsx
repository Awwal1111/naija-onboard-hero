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

interface EngagementEmailProps {
  userName: string
  engagementType: 'incomplete_profile' | 'no_activity' | 'pending_review' | 'milestone_achieved' | 'payment_reminder'
  profileCompletion?: number
  daysSinceLogin?: number
  pendingReviewItem?: string
  milestoneName?: string
  milestoneReward?: number
  pendingAmount?: number
  actionUrl: string
}

export const EngagementEmail = ({
  userName,
  engagementType,
  profileCompletion,
  daysSinceLogin,
  pendingReviewItem,
  milestoneName,
  milestoneReward,
  pendingAmount,
  actionUrl,
}: EngagementEmailProps) => {
  const getContent = () => {
    switch (engagementType) {
      case 'incomplete_profile':
        return {
          emoji: '👤',
          title: 'Complete Your Profile',
          preview: 'Your profile is almost there! Complete it to get more opportunities.',
          subtitle: `Your profile is ${profileCompletion}% complete`,
          description: 'Profiles with 100% completion get 3x more views and job offers. Take a few minutes to finish setting up.',
          buttonText: 'Complete Profile',
          tips: [
            '📸 Add a professional photo',
            '📝 Write a compelling bio',
            '🛠️ List your top skills',
            '💼 Add portfolio items',
          ],
        }
      case 'no_activity':
        return {
          emoji: '👋',
          title: 'We Miss You!',
          preview: `It's been ${daysSinceLogin} days since your last visit`,
          subtitle: 'New opportunities are waiting for you',
          description: `A lot has happened on NaijaLancers since you were last here. New jobs matching your skills have been posted!`,
          buttonText: 'Explore New Jobs',
          tips: [
            '💼 New jobs posted daily',
            '🌟 Experts are getting hired',
            '💰 Daily sign-in rewards available',
          ],
        }
      case 'pending_review':
        return {
          emoji: '⭐',
          title: 'Leave a Review',
          preview: 'Share your experience and help the community',
          subtitle: `Rate your experience with ${pendingReviewItem}`,
          description: 'Your feedback helps build trust in our community. Take a moment to share your experience.',
          buttonText: 'Leave Review',
          tips: [
            '✨ Honest reviews build trust',
            '🤝 Help others make informed decisions',
            '⭐ Good reviews boost expert visibility',
          ],
        }
      case 'milestone_achieved':
        return {
          emoji: '🎉',
          title: 'Congratulations!',
          preview: `You've achieved: ${milestoneName}`,
          subtitle: `Achievement Unlocked: ${milestoneName}`,
          description: milestoneReward 
            ? `Amazing work! You've earned ${milestoneReward} NC as a reward. Keep going!`
            : "You're making great progress on the platform!",
          buttonText: 'View Achievement',
          tips: [],
        }
      case 'payment_reminder':
        return {
          emoji: '💰',
          title: 'Payment Pending',
          preview: `You have ₦${pendingAmount?.toLocaleString()} pending`,
          subtitle: 'Complete your transaction',
          description: `You have a pending payment of ₦${pendingAmount?.toLocaleString()}. Complete it to continue with your project.`,
          buttonText: 'Complete Payment',
          tips: [
            '🔒 All payments are secured with escrow',
            '💳 Multiple payment methods available',
          ],
        }
      default:
        return {
          emoji: '📢',
          title: 'Update from NaijaLancers',
          preview: 'You have a new update',
          subtitle: '',
          description: "Check out what's new on the platform.",
          buttonText: 'View Update',
          tips: [],
        }
    }
  }

  const content = getContent()

  return (
    <Html>
      <Head />
      <Preview>{content.preview}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Text style={headerEmoji}>{content.emoji}</Text>
            <Heading style={h1}>{content.title}</Heading>
            {content.subtitle && <Text style={subtitle}>{content.subtitle}</Text>}
          </Section>

          <Text style={greeting}>Hi {userName},</Text>
          <Text style={text}>{content.description}</Text>

          {/* Progress bar for profile completion */}
          {engagementType === 'incomplete_profile' && profileCompletion && (
            <Section style={progressSection}>
              <Section style={progressBarBg}>
                <Section style={{...progressBarFill, width: `${profileCompletion}%`}} />
              </Section>
              <Text style={progressText}>{profileCompletion}% Complete</Text>
            </Section>
          )}

          {/* Milestone reward box */}
          {engagementType === 'milestone_achieved' && milestoneReward && (
            <Section style={rewardBox}>
              <Text style={rewardLabel}>🎁 Reward Earned</Text>
              <Text style={rewardAmount}>{milestoneReward} NC</Text>
              <Text style={rewardNote}>Added to your wallet</Text>
            </Section>
          )}

          {/* Tips section */}
          {content.tips.length > 0 && (
            <Section style={tipsSection}>
              {content.tips.map((tip, index) => (
                <Text key={index} style={tipItem}>{tip}</Text>
              ))}
            </Section>
          )}

          <Button style={ctaButton} href={actionUrl}>
            {content.buttonText} →
          </Button>

          {engagementType === 'no_activity' && (
            <Section style={incentiveBox}>
              <Text style={incentiveText}>
                🎁 <strong>Daily Sign-in Bonus:</strong> Claim up to 50 NC every day just for logging in!
              </Text>
            </Section>
          )}

          <Hr style={hr} />

          <Text style={footer}>
            <Link href="https://naijalancers.name.ng" target="_blank" style={link}>
              NaijaLancers
            </Link>
            <br />
            Nigeria's Digital Freelance Marketplace
            <br />
            Founded by <strong>Awwal Dayyabu</strong>
            <br />
            <Link href="https://naijalancers.name.ng/settings" style={unsubLink}>
              Manage email preferences
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default EngagementEmail

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
  maxWidth: '600px',
}

const header = {
  backgroundColor: '#008751',
  padding: '32px 40px',
  textAlign: 'center' as const,
}

const headerEmoji = {
  fontSize: '48px',
  margin: '0 0 16px',
}

const h1 = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
}

const subtitle = {
  color: '#a7f3d0',
  fontSize: '14px',
  margin: '8px 0 0',
}

const greeting = {
  color: '#333',
  fontSize: '16px',
  fontWeight: '600',
  padding: '24px 40px 8px',
  margin: '0',
}

const text = {
  color: '#555',
  fontSize: '15px',
  lineHeight: '24px',
  padding: '0 40px',
  margin: '0 0 24px',
}

const progressSection = {
  padding: '0 40px',
  marginBottom: '24px',
}

const progressBarBg = {
  backgroundColor: '#e5e7eb',
  borderRadius: '10px',
  height: '12px',
  overflow: 'hidden',
}

const progressBarFill = {
  backgroundColor: '#008751',
  height: '12px',
  borderRadius: '10px',
}

const progressText = {
  color: '#6b7280',
  fontSize: '13px',
  textAlign: 'center' as const,
  marginTop: '8px',
}

const rewardBox = {
  backgroundColor: '#ecfdf5',
  borderRadius: '12px',
  padding: '24px',
  margin: '0 40px 24px',
  textAlign: 'center' as const,
  border: '2px dashed #10b981',
}

const rewardLabel = {
  color: '#059669',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const rewardAmount = {
  color: '#059669',
  fontSize: '36px',
  fontWeight: 'bold',
  margin: '0',
}

const rewardNote = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '4px 0 0',
}

const tipsSection = {
  backgroundColor: '#f8fafc',
  padding: '20px 40px',
  margin: '0 40px 24px',
  borderRadius: '8px',
}

const tipItem = {
  color: '#374151',
  fontSize: '14px',
  lineHeight: '24px',
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
  padding: '14px 32px',
  margin: '0 40px 24px',
}

const incentiveBox = {
  backgroundColor: '#fffbeb',
  padding: '16px',
  borderRadius: '8px',
  margin: '0 40px 24px',
  textAlign: 'center' as const,
}

const incentiveText = {
  color: '#92400e',
  fontSize: '14px',
  margin: '0',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '24px 40px',
}

const link = {
  color: '#008751',
  textDecoration: 'underline',
}

const unsubLink = {
  color: '#9ca3af',
  fontSize: '11px',
}

const footer = {
  color: '#8898aa',
  fontSize: '12px',
  lineHeight: '18px',
  textAlign: 'center' as const,
  padding: '0 40px 32px',
}
