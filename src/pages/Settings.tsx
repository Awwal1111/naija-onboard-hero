import React, { useState, useEffect } from 'react'
import { ArrowLeft, Trash2, Eye, Globe, Users, Lock, Moon, Sun, Bell, Languages, Shield, HelpCircle, FileText, User, Activity, TrendingUp, CheckCircle, ShieldCheck, Phone, Mail, Camera, Fingerprint, IdCard, ShieldAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { useAuth } from '@/hooks/useAuth'
import { useProfile } from '@/hooks/useProfile'
import { useLanguage } from '@/hooks/useLanguage'
import { useBiometric } from '@/hooks/useBiometric'
import { supabase } from '@/integrations/supabase/client'
import { useUserSecrets } from '@/hooks/useUserSecrets'
import { Logo } from '@/components/ui/logo'
import { Separator } from '@/components/ui/separator'
import { PushNotificationToggle } from '@/components/PushNotificationToggle'
import { TestNotifications } from '@/components/TestNotifications'
import { TwoFactorSetup } from '@/components/TwoFactorSetup'
import { EmailVerificationStatus } from '@/components/EmailVerificationBanner'
import { UserBadges } from '@/components/UserBadges'
import { FaceVerificationDialog } from '@/components/FaceVerificationDialog'
import { PhoneVerificationDialog } from '@/components/PhoneVerificationDialog'
import { IdentityVerificationDialog } from '@/components/IdentityVerificationDialog'
import { LoginHistoryCard } from '@/components/LoginHistoryCard'
import { AccountTypeSettings } from '@/components/AccountTypeSettings'
import { InternationalSettings } from '@/components/settings/InternationalSettings'
import { UserModeSettings } from '@/components/settings/UserModeSettings'
import { SMSNotificationSettings } from '@/components/settings/SMSNotificationSettings'

const BiometricToggle = () => {
  const { isAvailable, isEnabled, enableBiometric, disableBiometric, loading } = useBiometric()
  
  const handleToggle = async () => {
    if (isEnabled) {
      await disableBiometric()
    } else {
      await enableBiometric()
    }
  }
  
  return (
    <div className="flex items-center gap-3">
      {!isAvailable && (
        <Badge variant="secondary" className="text-xs">Not Available</Badge>
      )}
      {isEnabled && (
        <Badge className="bg-green-500 text-xs">Enabled</Badge>
      )}
      <Switch
        checked={isEnabled}
        onCheckedChange={handleToggle}
        disabled={!isAvailable || loading}
      />
    </div>
  )
}

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
  const { hasPin } = useUserSecrets()
  const { language, setLanguage, t, languageNames } = useLanguage()
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [profileVisibility, setProfileVisibility] = useState<'public' | 'registered' | 'private'>('public')
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    chats: true,
    jobs: true,
    referrals: true,
    tasks: true,
    expertStatus: true
  })
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [emailDigestFrequency, setEmailDigestFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'never'>('weekly')
  const [phoneVerifyOpen, setPhoneVerifyOpen] = useState(false)

  useEffect(() => {
    if (profile) {
      setEmailNotifications((profile as any).email_notifications !== false)
      setEmailDigestFrequency((profile as any).email_digest_frequency || 'weekly')
    }
  }, [profile])

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' || 'light'
    const savedNotifications = localStorage.getItem('notifications')
    setTheme(savedTheme)
    if (savedNotifications) setNotifications(JSON.parse(savedNotifications))
    document.documentElement.classList.toggle('dark', savedTheme === 'dark')
  }, [])

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme)
    localStorage.setItem('theme', newTheme)
    document.documentElement.classList.toggle('dark', newTheme === 'dark')
    toast({ title: "Theme Updated", description: `Switched to ${newTheme} mode` })
  }

  const handleLanguageChange = (newLanguage: 'en' | 'ha' | 'yo' | 'ig' | 'pcm') => {
    setLanguage(newLanguage)
    toast({ title: t('message.success'), description: `${t('settings.language')}: ${languageNames[newLanguage]}` })
  }

  const handleNotificationChange = (key: keyof NotificationPreferences, value: boolean) => {
    const updated = { ...notifications, [key]: value }
    setNotifications(updated)
    localStorage.setItem('notifications', JSON.stringify(updated))
  }

  const handleProfileVisibilityChange = async (visibility: 'public' | 'registered' | 'private') => {
    setProfileVisibility(visibility)
    await updateProfile({ bio: profile?.bio || '' })
    toast({ title: "Privacy Updated", description: `Profile visibility set to ${visibility}` })
  }

  const handleDeleteAccount = async () => {
    const confirmed = confirm("Are you sure you want to permanently delete your account? This action cannot be undone.")
    if (confirmed) {
      try {
        const { error } = await supabase.auth.admin.deleteUser(user?.id || '')
        if (error) throw error
        toast({ title: "Account Deleted", description: "Your account has been permanently deleted" })
        await signOut()
        navigate('/')
      } catch (error) {
        toast({ title: "Error", description: "Failed to delete account. Please contact support.", variant: "destructive" })
      }
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)}>
            <ArrowLeft className="h-6 w-6 text-muted-foreground hover:text-foreground transition-colors" />
          </button>
          <h1 className="text-xl font-semibold">App Settings</h1>
        </div>
        <Logo />
      </header>

      <div className="px-4 py-6 max-w-2xl mx-auto">
        <Tabs defaultValue="account" className="w-full">
          <TabsList className="w-full grid grid-cols-4 mb-6">
            <TabsTrigger value="account" className="text-xs sm:text-sm">
              <User className="h-4 w-4 mr-1 hidden sm:inline" />
              Account
            </TabsTrigger>
            <TabsTrigger value="notifications" className="text-xs sm:text-sm">
              <Bell className="h-4 w-4 mr-1 hidden sm:inline" />
              Alerts
            </TabsTrigger>
            <TabsTrigger value="verification" className="text-xs sm:text-sm">
              <ShieldCheck className="h-4 w-4 mr-1 hidden sm:inline" />
              Verify
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm">
              <Shield className="h-4 w-4 mr-1 hidden sm:inline" />
              Security
            </TabsTrigger>
          </TabsList>

          {/* ===== ACCOUNT TAB ===== */}
          <TabsContent value="account" className="space-y-6">
            {/* Account Actions */}
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
                    <h4 className="font-medium">Analytics</h4>
                    <p className="text-sm text-muted-foreground">View your performance metrics</p>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/analytics')}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Activity Log</h4>
                    <p className="text-sm text-muted-foreground">View your recent actions</p>
                  </div>
                  <Button variant="outline" onClick={() => navigate('/activity-log')}>
                    <Activity className="h-4 w-4 mr-2" />
                    View
                  </Button>
                </div>
              </CardContent>
            </Card>

            <AccountTypeSettings />
            <UserModeSettings />
            <InternationalSettings />

            {/* Preferences */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sun className="h-5 w-5" />
                  Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Theme</h4>
                    <p className="text-sm text-muted-foreground">Light or dark mode</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Sun className={`h-4 w-4 ${theme === 'light' ? 'text-primary' : 'text-muted-foreground'}`} />
                    <Switch 
                      checked={theme === 'dark'} 
                      onCheckedChange={(checked) => handleThemeChange(checked ? 'dark' : 'light')}
                    />
                    <Moon className={`h-4 w-4 ${theme === 'dark' ? 'text-primary' : 'text-muted-foreground'}`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* About */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <button onClick={() => navigate('/terms-conditions')} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <span>Terms & Conditions</span>
                </button>
                <button onClick={() => navigate('/help-support')} className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors">
                  <HelpCircle className="h-5 w-5 text-muted-foreground" />
                  <span>Help & Support</span>
                </button>
              </CardContent>
            </Card>

            {/* Danger Zone */}
            <Card className="border-destructive/30">
              <CardContent className="pt-6">
                <Button variant="destructive" onClick={handleDeleteAccount} className="w-full">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Account
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== NOTIFICATIONS TAB ===== */}
          <TabsContent value="notifications" className="space-y-6">
            {/* In-App Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries({
                  chats: 'Chat Messages',
                  jobs: 'New Job Posts',
                  referrals: 'Referral Updates',
                  tasks: 'New Tasks Available',
                  expertStatus: 'Expert Status Updates'
                }).map(([key, label]) => (
                  <div key={key} className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <Switch 
                      checked={notifications[key as keyof NotificationPreferences]}
                      onCheckedChange={(checked) => handleNotificationChange(key as keyof NotificationPreferences, checked)}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Email Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="h-5 w-5" />
                  Email Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Email Alerts</h4>
                    <p className="text-sm text-muted-foreground">Receive email notifications</p>
                  </div>
                  <Switch 
                    checked={emailNotifications}
                    onCheckedChange={async (checked) => {
                      setEmailNotifications(checked)
                      if (user) {
                        await supabase.from('profiles').update({ email_notifications: checked }).eq('user_id', user.id)
                        toast({ title: checked ? 'Email notifications enabled' : 'Email notifications disabled' })
                      }
                    }}
                  />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Digest Frequency</h4>
                    <p className="text-sm text-muted-foreground">Summary of platform activity</p>
                  </div>
                  <Select 
                    value={emailDigestFrequency} 
                    onValueChange={async (v: 'daily' | 'weekly' | 'monthly' | 'never') => {
                      setEmailDigestFrequency(v)
                      if (user) {
                        await supabase.from('profiles').update({ email_digest_frequency: v }).eq('user_id', user.id)
                        toast({ title: `Digest frequency set to ${v}` })
                      }
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-background border border-border z-[100]">
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="never">Never</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Push Notifications */}
            <PushNotificationToggle />
            
            {/* SMS Settings */}
            <SMSNotificationSettings />

            {/* Test Notifications */}
            <TestNotifications />
          </TabsContent>

          {/* ===== VERIFICATION TAB ===== */}
          <TabsContent value="verification" className="space-y-6">
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
                    <h4 className="font-medium">Your Badges</h4>
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
                      <h4 className="font-medium">Email</h4>
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
                      <h4 className="font-medium">Phone Number</h4>
                      <p className="text-xs text-muted-foreground">
                        {(profile as any)?.phone_verified 
                          ? (profile as any)?.phone_number || 'Verified'
                          : 'Verify via code sent to Telegram'
                        }
                      </p>
                    </div>
                  </div>
                  {(profile as any)?.phone_verified ? (
                    <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                      <CheckCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">Verified</span>
                    </div>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setPhoneVerifyOpen(true)}>
                      Verify Phone
                    </Button>
                  )}
                </div>

                <PhoneVerificationDialog 
                  open={phoneVerifyOpen} 
                  onOpenChange={setPhoneVerifyOpen}
                />

                <Separator />

                {/* Face Verification */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${(profile as any)?.face_verified ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                      <Camera className={`h-4 w-4 ${(profile as any)?.face_verified ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h4 className="font-medium">Face Selfie</h4>
                      <p className="text-xs text-muted-foreground">Open-source face verification</p>
                    </div>
                  </div>
                  <FaceVerificationDialog 
                    isVerified={(profile as any)?.face_verified}
                    onVerified={() => {
                      toast({ title: "Face Verified", description: "Your selfie has been verified successfully!" })
                    }}
                  />
                </div>

                <Separator />

                {/* NIN/BVN Identity Verification */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${(profile as any)?.identity_verified ? 'bg-green-100 dark:bg-green-900/30' : 'bg-muted'}`}>
                      <IdCard className={`h-4 w-4 ${(profile as any)?.identity_verified ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground'}`} />
                    </div>
                    <div>
                      <h4 className="font-medium">Government ID</h4>
                      <p className="text-xs text-muted-foreground">
                        {(profile as any)?.identity_verified 
                          ? 'NIN/BVN verified'
                          : 'NIN or BVN verification (Nigerian users)'}
                      </p>
                    </div>
                  </div>
                  <IdentityVerificationDialog 
                    isVerified={(profile as any)?.identity_verified}
                    onVerified={() => {
                      toast({ title: "ID Verified!", description: "Your government ID has been verified successfully!" })
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Login History */}
            <LoginHistoryCard />
          </TabsContent>

          {/* ===== SECURITY TAB ===== */}
          <TabsContent value="security" className="space-y-6">
            {/* Privacy */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Privacy
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Profile Visibility</h4>
                    <p className="text-sm text-muted-foreground">Control who can see your profile</p>
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
                          Registered Only
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
                    <h4 className="font-medium">Public on Google</h4>
                    <p className="text-sm text-muted-foreground">Allow profile in search results</p>
                  </div>
                  <Switch 
                    checked={(profile as any)?.public_on_google ?? true}
                    onCheckedChange={async (checked) => {
                      await updateProfile({ public_on_google: checked } as any)
                      toast({
                        title: "SEO Settings Updated",
                        description: checked ? "Your profile will appear in search results" : "Your profile is hidden from search engines"
                      })
                    }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Biometric Authentication */}
            <Card className="border-primary/20 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Fingerprint className="h-5 w-5 text-primary" />
                  Biometric Authentication
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">Fingerprint / Face ID</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Use biometrics to authorize transactions
                    </p>
                  </div>
                  <BiometricToggle />
                </div>
              </CardContent>
            </Card>

            {/* Security Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldAlert className="h-5 w-5" />
                  Security Features
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <h4 className="font-medium">Transaction PIN</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Secure payments with 4-digit PIN
                    </p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => navigate('/settings/pin')}>
                    <Lock className="h-4 w-4 mr-2" />
                    {hasPin ? 'Change' : 'Set Up'}
                  </Button>
                </div>
                <Separator />
                <TwoFactorSetup />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default Settings
