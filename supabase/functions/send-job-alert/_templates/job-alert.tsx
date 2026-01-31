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

interface JobAlertProps {
  userName: string
  alertType: 'new_application' | 'proposal_received' | 'job_match' | 'application_status'
  jobTitle: string
  applicantName?: string
  applicantSkills?: string[]
  proposalMessage?: string
  budget?: string
  deadline?: string
  applicationStatus?: 'accepted' | 'rejected' | 'shortlisted'
  actionUrl: string
}

export const JobAlert = ({
  userName,
  alertType,
  jobTitle,
  applicantName,
  applicantSkills,
  proposalMessage,
  budget,
  deadline,
  applicationStatus,
  actionUrl,
}: JobAlertProps) => {
  const getAlertContent = () => {
    switch (alertType) {
      case 'new_application':
        return {
          emoji: '📬',
          title: 'New Application Received!',
          preview: `${applicantName} applied to your job: ${jobTitle}`,
          description: `Great news! ${applicantName} has applied to your job posting.`,
          buttonText: 'Review Application',
        }
      case 'proposal_received':
        return {
          emoji: '💼',
          title: 'New Proposal Received!',
          preview: `${applicantName} sent a proposal for: ${jobTitle}`,
          description: `${applicantName} has submitted a proposal for your project.`,
          buttonText: 'View Proposal',
        }
      case 'job_match':
        return {
          emoji: '🎯',
          title: 'Perfect Job Match!',
          preview: `A new job matches your skills: ${jobTitle}`,
          description: `We found a job that matches your expertise. Don't miss out!`,
          buttonText: 'Apply Now',
        }
      case 'application_status':
        const statusEmoji = applicationStatus === 'accepted' ? '🎉' : applicationStatus === 'shortlisted' ? '⭐' : '📋'
        const statusText = applicationStatus === 'accepted' ? 'Accepted!' : applicationStatus === 'shortlisted' ? 'Shortlisted!' : 'Updated'
        return {
          emoji: statusEmoji,
          title: `Application ${statusText}`,
          preview: `Your application for ${jobTitle} has been ${applicationStatus}`,
          description: `Your application for "${jobTitle}" has been ${applicationStatus}.`,
          buttonText: 'View Details',
        }
      default:
        return {
          emoji: '📢',
          title: 'Job Update',
          preview: `Update about: ${jobTitle}`,
          description: 'You have an update about a job.',
          buttonText: 'View Update',
        }
    }
  }

  const content = getAlertContent()

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
          </Section>

          <Text style={greeting}>Hi {userName},</Text>
          <Text style={text}>{content.description}</Text>

          {/* Job Details Card */}
          <Section style={jobCard}>
            <Text style={jobTitle}>{jobTitle}</Text>
            
            {budget && (
              <Text style={jobDetail}>
                <span style={detailLabel}>Budget:</span> {budget}
              </Text>
            )}
            
            {deadline && (
              <Text style={jobDetail}>
                <span style={detailLabel}>Deadline:</span> {deadline}
              </Text>
            )}

            {applicantName && alertType !== 'job_match' && (
              <>
                <Hr style={cardHr} />
                <Text style={applicantTitle}>From: {applicantName}</Text>
                {applicantSkills && applicantSkills.length > 0 && (
                  <Text style={skillsText}>
                    Skills: {applicantSkills.join(', ')}
                  </Text>
                )}
                {proposalMessage && (
                  <Text style={proposalText}>"{proposalMessage}"</Text>
                )}
              </>
            )}

            {applicationStatus && (
              <Section style={statusBadgeContainer}>
                <Text style={applicationStatus === 'accepted' ? statusAccepted : 
                             applicationStatus === 'shortlisted' ? statusShortlisted : 
                             statusRejected}>
                  {applicationStatus.toUpperCase()}
                </Text>
              </Section>
            )}
          </Section>

          <Button style={ctaButton} href={actionUrl}>
            {content.buttonText} →
          </Button>

          {alertType === 'new_application' || alertType === 'proposal_received' ? (
            <Text style={tipText}>
              💡 Tip: Respond quickly to stand out! Clients prefer freelancers who are responsive.
            </Text>
          ) : alertType === 'job_match' ? (
            <Text style={tipText}>
              💡 Tip: Personalize your application to increase your chances of getting hired.
            </Text>
          ) : null}

          <Hr style={hr} />

          <Text style={footer}>
            <Link href="https://naijalancers.name.ng" target="_blank" style={link}>
              NaijaLancers
            </Link>
            <br />
            Nigeria's Digital Freelance Marketplace
            <br />
            <Link href="https://naijalancers.name.ng/settings" style={unsubLink}>
              Manage notification settings
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export default JobAlert

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

const jobCard = {
  backgroundColor: '#f8fafc',
  borderRadius: '12px',
  padding: '24px',
  margin: '0 40px',
  border: '1px solid #e5e7eb',
}

const jobTitle = {
  color: '#1f2937',
  fontSize: '18px',
  fontWeight: 'bold',
  margin: '0 0 12px',
}

const jobDetail = {
  color: '#6b7280',
  fontSize: '14px',
  margin: '4px 0',
}

const detailLabel = {
  fontWeight: '600',
  color: '#374151',
}

const cardHr = {
  borderColor: '#e5e7eb',
  margin: '16px 0',
}

const applicantTitle = {
  color: '#1f2937',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const skillsText = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '0 0 8px',
}

const proposalText = {
  color: '#4b5563',
  fontSize: '14px',
  fontStyle: 'italic',
  backgroundColor: '#ffffff',
  padding: '12px',
  borderRadius: '8px',
  margin: '8px 0 0',
  borderLeft: '3px solid #008751',
}

const statusBadgeContainer = {
  marginTop: '16px',
}

const statusAccepted = {
  backgroundColor: '#dcfce7',
  color: '#166534',
  padding: '6px 16px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 'bold',
  display: 'inline-block',
}

const statusShortlisted = {
  backgroundColor: '#fef3c7',
  color: '#92400e',
  padding: '6px 16px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 'bold',
  display: 'inline-block',
}

const statusRejected = {
  backgroundColor: '#fee2e2',
  color: '#991b1b',
  padding: '6px 16px',
  borderRadius: '20px',
  fontSize: '12px',
  fontWeight: 'bold',
  display: 'inline-block',
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
  margin: '24px 40px',
}

const tipText = {
  color: '#6b7280',
  fontSize: '13px',
  backgroundColor: '#fffbeb',
  padding: '12px 16px',
  borderRadius: '8px',
  margin: '0 40px 24px',
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
