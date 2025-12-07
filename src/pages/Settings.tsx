import React, { useState, useEffect } from 'react'
import { ArrowLeft, Trash2, Eye, Globe, Users, Lock, Moon, Sun, Bell, Languages, Shield, HelpCircle, FileText, User, Activity, TrendingUp, CheckCircle, ShieldCheck, Phone, Mail, Camera } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { supabase } from '@/integrations/supabase/client'
import { Logo } from '@/components/ui/logo'
import { Separator } from '@/components/ui/separator'
import { PushNotificationToggle } from '@/components/PushNotificationToggle'
import { TestNotifications } from '@/components/TestNotifications'
import { TwoFactorSetup } from '@/components/TwoFactorSetup'
import { EmailVerificationStatus } from '@/components/EmailVerificationBanner'
import { UserBadges } from '@/components/UserBadges'
import { FaceVerificationDialog } from '@/components/FaceVerificationDialog'

interface NotificationPreferences {
  chats: boolean
  jobs: boolean
  referrals: boolean
  tasks: boolean
  expertStatus: boolean
}

const Settings = () => {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user, signOut } = useAuth()
  const { profile, updateProfile } = useProfile()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [language, setLanguage] = useState('en')
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'registered' | 'private'>('public')
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    chats: true,
    jobs: true,
    referrals: true,
    tasks: true,
    expertStatus: true
  })
  const [activityLog, setActivityLog] = useState<any[]>([])

  useEffect(() => {
    // Load saved preferences
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light'
    const savedLanguage = localStorage.getItem('language') || 'en'
    const savedNotifications = localStorage.getItem('notifications')
    
    setTheme(savedTheme)
    setLanguage(savedLanguage)
    if (savedNotifications) {
      setNotifications(JSON.parse(savedNotifications))
    }
    
    // Apply theme
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    
    // Load activity log
    loadActivityLog()
  }, [])

  const loadActivityLog = async () => {
    if (!user) return
    
    try {
      // Fetch user's recent activities
      const { data: posts } = await supabase
        .from('posts')
        .select('id, content_type, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10)

      const { data: jobs } = await supabase
        .from('job_posts')
        .select('id, title, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5)

      const activities = [
        ...posts?.map(post => ({
          type: 'post',
          description: `Posted a ${post.content_type}`,
          timestamp: post.created_at
        })) || [],
        ...jobs?.map(job => ({
          type: 'job',
          description: `Posted job: ${job.title}`,
          timestamp: job.created_at
        })) || []
      ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

      setActivityLog(activities)
    } catch (error) {
      console.error('Error loading activity log:', error)
    }
  }

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    
    toast({
      title: "Theme Updated",
      description: `Switched to ${newTheme} mode`
    })
  }

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage)
    localStorage.setItem('language', newLanguage)
    
    toast({
      title: "Language Updated",
      description: "Language preference saved"
    })
  }

  const handleNotificationChange = (key: keyof NotificationPreferences, value: boolean) => {
    const updated = { ...notifications, [key]: value }
    setNotifications(updated)
    localStorage.setItem('notifications', JSON.stringify(updated))
  }

  const handleProfileVisibilityChange = async (visibility: 'public' | 'registered' | 'private') => {
    setProfileVisibility(visibility)
    
    // Update in database if needed
    await updateProfile({ 
      // You might want to add a visibility field to the profiles table
      bio: profile?.bio || '' 
    })
    
    toast({
      title: "Privacy Updated",
      description: `Profile visibility set to ${visibility}`
    })
  }

  const handleDeleteAccount = async () => {
    const confirmed = confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")
    
    if (confirmed) {
      try {
        // Delete user account (this might need an admin function)
        const { error } = await supabase.auth.admin.deleteUser(user?.id || '')
        
        if (error) throw error
        
        toast({
          title: "Account Deleted",
          description: "Your account has been permanently deleted"
        })
        
        await signOut()
        navigate('/')
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete account. Please contact support.",
          variant: "destructive"
        })
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6 text-text-secondary hover:text-text-primary transition-colors" />
          </button>
          <h1 className="text-xl font-semibold text-text-primary">App Settings</h1>
        </div>
        <Logo />
      </header>

      <div className="px-6 py-6 max-w-2xl mx-auto space-y-6">
        {/* Account Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-text-primary">Analytics</h4>
                <p className="text-sm text-text-secondary">View your performance metrics</p>
              </div>
              <Button variant="outline" onClick={() => navigate('/analytics')}>
                <TrendingUp className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-text-primary">Activity Log</h4>
                <p className="text-sm text-text-secondary">View your recent actions</p>
              </div>
              <Button variant="outline" onClick={() => navigate('/activity-log')}>
                <Activity className="h-4 w-4 mr-2" />
                View Log
              </Button>
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-text-primary text-destructive">Delete Account</h4>
                <p className="text-sm text-text-secondary">Permanently delete your account & data</p>
              </div>
              <Button variant="destructive" onClick={handleDeleteAccount}>
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Languages className="h-5 w-5" />
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Language */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-text-primary">Language</h4>
                <p className="text-sm text-text-secondary">Choose your preferred language</p>
              </div>
              <Select value={language} onValueChange={handleLanguageChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="ha">Hausa</SelectItem>
                  <SelectItem value="yo">Yoruba</SelectItem>
                  <SelectItem value="ig">Igbo</SelectItem>
                  <SelectItem value="pcm">Nigerian Pidgin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Theme */}
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-text-primary">Theme</h4>
                <p className="text-sm text-text-secondary">Light or dark mode</p>
              </div>
              <div className="flex items-center gap-2">
                <Sun className={`h-4 w-4 ${theme === 'light' ? 'text-primary' : 'text-text-secondary'}`} />
                <Switch 
                  checked={theme === 'dark'} 
                  onCheckedChange={(checked) => handleThemeChange(checked ? 'dark' : 'light')}
                />
                <Moon className={`h-4 w-4 ${theme === 'dark' ? 'text-primary' : 'text-text-secondary'}`} />
              </div>
            </div>

            {/* Notification Preferences */}
            <div>
              <h4 className="font-medium text-text-primary mb-3">Notification Preferences</h4>
              <div className="space-y-3">
                {Object.entries({
                  chats: 'Chat Messages',
                  jobs: 'New Job Posts',
                  referrals: 'Referral Updates',
                  tasks: 'New Tasks Available',
                  expertStatus: 'Expert Status Updates'
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">{label}</span>
                    <Switch 
                      checked={notifications[key as keyof NotificationPreferences]}
                      onCheckedChange={(checked) => handleNotificationChange(key as keyof NotificationPreferences, checked)}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Push Notifications */}
        <PushNotificationToggle />

        {/* Test Notifications */}
        <TestNotifications />

        {/* Privacy & Security */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-text-primary">Profile Visibility</h4>
                <p className="text-sm text-text-secondary">Control who can see your profile</p>
              </div>
              <Select value={profileVisibility} onValueChange={handleProfileVisibilityChange}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Public
                    </div>
                  </SelectItem>
                  <SelectItem value="registered">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Registered Users Only
                    </div>
                  </SelectItem>
                  <SelectItem value="private">
                    <div className="flex items-center gap-2">
                      <Lock className="h-4 w-4" />
                      Private
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-text-primary">Public on Google</h4>
                <p className="text-sm text-text-secondary">Allow your profile to appear in Google search results</p>
              </div>
              <Switch 
                checked={(profile as any)?.public_on_google ?? true}
                onCheckedChange={async (checked) => {
                  await updateProfile({ public_on_google: checked } as any);
                  toast({
                    title: "SEO Settings Updated",
                    description: checked ? "Your profile will appear in search results" : "Your profile is hidden from search engines"
                  });
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Verification Status Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Verification Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Badges */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div>
                <h4 className="font-medium text-foreground">Your Badges</h4>
                <p className="text-xs text-muted-foreground mt-1">Earned verification badges</p>
              </div>
              <UserBadges 
                badges={{
                  isExpert: profile?.is_expert,
                  emailVerified: (profile as any)?.email_verified,
                  phoneVerified: (profile as any)?.phone_verified,
                  faceVerified: (profile as any)?.face_verified,
                  averageRating: profile?.average_rating,
                  ratingCount: profile?.rating_count,
                  avgResponseTimeSeconds: (profile as any)?.avg_response_time_seconds
                }}
                size="md"
              />
            </div>

            <Separator />

            {/* Email Verification */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${(profile as any)?.email_verified ? 'bg-green-100 dark:bg-green-900/30' : 'bg-amber-100 dark:bg-amber-900/30'}`}>
                  <Mail className={`h-4 w-4 ${(profile as any)?.email_verified ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`} />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Email</h4>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <EmailVerificationStatus 
                email={user?.email}
                isVerified={(profile as any)?.email_verified}
              />
            </div>

            <Separator />

            {/* Phone Verification */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${(profile as any)?.phone_verified ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                  <Phone className={`h-4 w-4 ${(profile as any)?.phone_verified ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Phone Number</h4>
                  <p className="text-xs text-muted-foreground">Verify via Telegram bot</p>
                </div>
              </div>
              {(profile as any)?.phone_verified ? (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">Verified</span>
                </div>
              ) : (
                <Button variant="outline" size="sm" onClick={() => window.open('https://t.me/NaijaLancersBot', '_blank')}>
                  Verify via Telegram
                </Button>
              )}
            </div>

            <Separator />

            {/* Face Verification */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${(profile as any)?.face_verified ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                  <Camera className={`h-4 w-4 ${(profile as any)?.face_verified ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <h4 className="font-medium text-foreground">Identity</h4>
                  <p className="text-xs text-muted-foreground">Face verification</p>
                </div>
              </div>
              <FaceVerificationDialog 
                isVerified={(profile as any)?.face_verified}
                onVerified={() => {
                  toast({
                    title: "Identity Verified",
                    description: "Your face has been verified successfully!",
                  });
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Security Features Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Security Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Transaction PIN */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <h4 className="font-medium text-text-primary">Transaction PIN</h4>
                <p className="text-xs text-text-secondary mt-1">
                  Secure payments & withdrawals with 4-digit PIN
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate('/settings/pin')}>
                <Lock className="h-4 w-4 mr-2" />
                {(profile as any)?.transaction_pin ? 'Change' : 'Set Up'}
              </Button>
            </div>

            <Separator />

            {/* Two-Factor Authentication */}
            <TwoFactorSetup />
          </CardContent>
        </Card>

        {/* About Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              About
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <button 
              onClick={() => navigate('/terms-conditions')}
              className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-text-secondary" />
                <span className="text-text-primary">Terms & Conditions</span>
              </div>
            </button>
            
            <button 
              onClick={() => navigate('/help-support')}
              className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-accent transition-colors"
            >
              <div className="flex items-center gap-3">
                <HelpCircle className="h-5 w-5 text-text-secondary" />
                <span className="text-text-primary">Help & Support</span>
              </div>
            </button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default Settings