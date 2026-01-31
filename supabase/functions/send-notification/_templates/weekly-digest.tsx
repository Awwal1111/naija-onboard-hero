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
  Column,
  Row,
} from 'npm:@react-email/components@0.0.22'
import * as React from 'npm:react@18.3.1'

interface JobItem {
  title: string
  budget: string
  skills: string[]
}

interface ExpertItem {
  name: string
  skill: string
  rating: number
}

interface WeeklyDigestProps {
  userName: string
  weekStartDate: string
  weekEndDate: string
  stats: {
    profileViews: number
    connectionRequests: number
    newMessages: number
    earnings?: number
  }
  recommendedJobs: JobItem[]
  topExperts: ExpertItem[]
  trendingSkills: string[]
}

export const WeeklyDigest = ({
  userName,
  weekStartDate,
  weekEndDate,
  stats,
  recommendedJobs,
  topExperts,
  trendingSkills,
}: WeeklyDigestProps) => (
  <Html>
    <Head />
    <Preview>Your Weekly NaijaLancers Digest - {weekStartDate} to {weekEndDate}</Preview>
    <Body style={main}>
      <Container style={container}>
        {/* Header */}
        <Section style={header}>
          <Img
            src="https://naijalancers.name.ng/logo.png"
            width="48"
            height="48"
            alt="NaijaLancers"
            style={logo}
          />
          <Text style={headerText}>Weekly Digest</Text>
          <Text style={dateRange}>{weekStartDate} - {weekEndDate}</Text>
        </Section>

        <Text style={greeting}>Hi {userName},</Text>
        <Text style={introText}>
          Here's what happened on NaijaLancers this week and opportunities waiting for you.
        </Text>

        {/* Stats Section */}
        <Section style={statsSection}>
          <Text style={sectionTitle}>📊 Your Week at a Glance</Text>
          <Row style={statsRow}>
            <Column style={statBox}>
              <Text style={statNumber}>{stats.profileViews}</Text>
              <Text style={statLabel}>Profile Views</Text>
            </Column>
            <Column style={statBox}>
              <Text style={statNumber}>{stats.connectionRequests}</Text>
              <Text style={statLabel}>Connection Requests</Text>
            </Column>
            <Column style={statBox}>
              <Text style={statNumber}>{stats.newMessages}</Text>
              <Text style={statLabel}>New Messages</Text>
            </Column>
            {stats.earnings !== undefined && stats.earnings > 0 && (
              <Column style={statBox}>
                <Text style={statNumberGreen}>₦{stats.earnings.toLocaleString()}</Text>
                <Text style={statLabel}>Earnings</Text>
              </Column>
            )}
          </Row>
        </Section>

        {/* Recommended Jobs */}
        {recommendedJobs.length > 0 && (
          <Section style={jobsSection}>
            <Text style={sectionTitle}>💼 Jobs Matching Your Skills</Text>
            {recommendedJobs.slice(0, 3).map((job, index) => (
              <Section key={index} style={jobCard}>
                <Text style={jobTitle}>{job.title}</Text>
                <Text style={jobBudget}>{job.budget}</Text>
                <Text style={jobSkills}>{job.skills.join(' • ')}</Text>
              </Section>
            ))}
            <Button style={secondaryButton} href="https://naijalancers.name.ng/jobs">
              View All Jobs →
            </Button>
          </Section>
        )}

        <Hr style={hr} />

        {/* Top Experts */}
        {topExperts.length > 0 && (
          <Section style={expertsSection}>
            <Text style={sectionTitle}>⭐ Featured Experts This Week</Text>
            {topExperts.slice(0, 3).map((expert, index) => (
              <Section key={index} style={expertCard}>
                <Text style={expertName}>{expert.name}</Text>
                <Text style={expertSkill}>{expert.skill}</Text>
                <Text style={expertRating}>{'⭐'.repeat(Math.floor(expert.rating))} {expert.rating.toFixed(1)}</Text>
              </Section>
            ))}
            <Button style={secondaryButton} href="https://naijalancers.name.ng/experts">
              Browse Experts →
            </Button>
          </Section>
        )}

        <Hr style={hr} />

        {/* Trending Skills */}
        {trendingSkills.length > 0 && (
          <Section style={trendingSection}>
            <Text style={sectionTitle}>🔥 Trending Skills</Text>
            <Text style={trendingList}>
              {trendingSkills.map((skill, index) => (
                <span key={index} style={skillBadge}>{skill}</span>
              ))}
            </Text>
            <Text style={trendingNote}>
              Consider adding these to your profile to increase visibility!
            </Text>
          </Section>
        )}

        {/* CTA */}
        <Button style={ctaButton} href="https://naijalancers.name.ng/dashboard">
          Open Dashboard
        </Button>

        <Hr style={hr} />

        {/* Footer */}
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

export default WeeklyDigest

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
  padding: '24px 40px',
  textAlign: 'center' as const,
}

const logo = {
  margin: '0 auto 8px',
  borderRadius: '8px',
}

const headerText = {
  color: '#ffffff',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
}

const dateRange = {
  color: '#a7f3d0',
  fontSize: '14px',
  margin: '4px 0 0',
}

const greeting = {
  color: '#333',
  fontSize: '18px',
  fontWeight: '600',
  padding: '24px 40px 8px',
  margin: '0',
}

const introText = {
  color: '#6b7280',
  fontSize: '15px',
  lineHeight: '24px',
  padding: '0 40px',
  margin: '0 0 24px',
}

const statsSection = {
  padding: '0 40px',
}

const sectionTitle = {
  color: '#333',
  fontSize: '16px',
  fontWeight: 'bold',
  marginBottom: '16px',
}

const statsRow = {
  backgroundColor: '#f8fafc',
  borderRadius: '8px',
  padding: '16px',
}

const statBox = {
  textAlign: 'center' as const,
  padding: '8px',
}

const statNumber = {
  color: '#333',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
}

const statNumberGreen = {
  color: '#059669',
  fontSize: '24px',
  fontWeight: 'bold',
  margin: '0',
}

const statLabel = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '4px 0 0',
}

const jobsSection = {
  padding: '24px 40px',
}

const jobCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '16px',
  marginBottom: '12px',
  borderLeft: '4px solid #008751',
}

const jobTitle = {
  color: '#333',
  fontSize: '15px',
  fontWeight: '600',
  margin: '0 0 4px',
}

const jobBudget = {
  color: '#059669',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0 0 8px',
}

const jobSkills = {
  color: '#6b7280',
  fontSize: '12px',
  margin: '0',
}

const hr = {
  borderColor: '#e6ebf1',
  margin: '24px 40px',
}

const expertsSection = {
  padding: '0 40px',
}

const expertCard = {
  backgroundColor: '#f9fafb',
  borderRadius: '8px',
  padding: '12px 16px',
  marginBottom: '8px',
}

const expertName = {
  color: '#333',
  fontSize: '14px',
  fontWeight: '600',
  margin: '0',
}

const expertSkill = {
  color: '#6b7280',
  fontSize: '13px',
  margin: '2px 0',
}

const expertRating = {
  color: '#f59e0b',
  fontSize: '12px',
  margin: '0',
}

const trendingSection = {
  padding: '0 40px',
}

const trendingList = {
  margin: '0 0 12px',
}

const skillBadge = {
  backgroundColor: '#ecfdf5',
  color: '#059669',
  padding: '4px 12px',
  borderRadius: '16px',
  fontSize: '12px',
  fontWeight: '500',
  marginRight: '8px',
  display: 'inline-block',
  marginBottom: '8px',
}

const trendingNote = {
  color: '#6b7280',
  fontSize: '13px',
  fontStyle: 'italic',
  margin: '0',
}

const secondaryButton = {
  backgroundColor: '#f3f4f6',
  borderRadius: '6px',
  color: '#374151',
  fontSize: '14px',
  fontWeight: '600',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  padding: '10px 20px',
  marginTop: '12px',
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
