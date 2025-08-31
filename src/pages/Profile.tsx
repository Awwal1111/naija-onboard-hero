import React, { useState } from 'react'
import { Camera, Wallet, MoreVertical, Edit, Share, Settings, LogOut, Plus, ArrowLeft, Home, MessageCircle, Users, DollarSign, User } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/ui/logo'
import { BrandButton } from '@/components/ui/brand-button'
import { useProfile } from '@/hooks/useProfile'
import { useAuth } from '@/hooks/useAuth'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { BrandInput } from '@/components/ui/brand-input'
import { useToast } from '@/hooks/use-toast'

const Profile = () => {
  const navigate = useNavigate()
  const { profile, loading, updateProfile } = useProfile()
  const { signOut } = useAuth()
  const { toast } = useToast()
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    full_name: '',
    bio: '',
    profession: '',
    phone_number: ''
  })

  const bottomNavItems = [
    { icon: Home, label: 'Feed', path: '/feed' },
    { icon: MessageCircle, label: 'Chat', path: '/chat' },
    { icon: Users, label: 'Expert', path: '/experts' },
    { icon: DollarSign, label: 'Earn', path: '/earn' },
    { icon: User, label: 'Profile', path: '/profile', active: true }
  ]

  const handleEditProfile = () => {
    if (profile) {
      setEditForm({
        full_name: profile.full_name || '',
        bio: profile.bio || '',
        profession: profile.profession || '',
        phone_number: profile.phone_number || ''
      })
    }
    setIsEditDialogOpen(true)
  }

  const handleSaveProfile = async () => {
    const result = await updateProfile(editForm)
    if (result?.success) {
      setIsEditDialogOpen(false)
    }
  }

  const handleShare = async () => {
    const profileUrl = `${window.location.origin}/profile/${profile?.user_id}`
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile?.full_name || 'User'}'s NaijaLancers Profile`,
          text: `Check out my profile on NaijaLancers`,
          url: profileUrl
        })
      } catch (error) {
        console.log('Share cancelled')
      }
    } else {
      // Fallback - copy to clipboard
      await navigator.clipboard.writeText(profileUrl)
      toast({
        title: "Link Copied",
        description: "Profile link copied to clipboard"
      })
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-text-secondary">Loading profile...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <header className="bg-background border-b border-border px-6 py-4 flex items-center justify-between">
        <button onClick={() => navigate('/feed')} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5 text-text-secondary" />
        </button>
        <Logo />
        <div className="w-5" /> {/* Spacer */}
      </header>

      <div className="px-6 py-6">
        {/* User Section */}
        <div className="flex items-start gap-4 mb-8">
          <div className="relative">
            <div className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
            <button className="absolute -bottom-2 -right-2 w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white">
              <Camera className="h-4 w-4" />
            </button>
          </div>
          
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-xl font-bold text-text-primary">
                {profile?.full_name || 'Add your name'}
              </h1>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-2 hover:bg-accent rounded-full">
                    <MoreVertical className="h-5 w-5 text-text-secondary" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem onClick={handleEditProfile}>
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/wallet')}>
                    <Wallet className="mr-2 h-4 w-4" />
                    Wallet & Transactions
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleShare}>
                    <Share className="mr-2 h-4 w-4" />
                    Share Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => navigate('/settings')}>
                    <Settings className="mr-2 h-4 w-4" />
                    App Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Log Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <p className="text-text-secondary text-sm mb-2">
              {profile?.profession || 'Add your profession'}
            </p>
            <p className="text-text-secondary text-xs mb-3">
              {profile?.bio || 'Tell us about yourself'}
            </p>
            <div className="text-sm text-text-primary">
              <span className="font-semibold">{profile?.connections_count || 0}</span> connections
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-4 mb-8">
          <BrandButton 
            className="w-full flex items-center justify-center gap-2" 
            size="lg"
            onClick={() => navigate('/expert-application')}
          >
            <Plus className="h-4 w-4" />
            Apply for Expert
          </BrandButton>
          
          <div className="bg-card border border-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-text-primary">Wallet Balance</h3>
              <Wallet className="h-5 w-5 text-primary" />
            </div>
            <div className="text-3xl font-bold text-primary mb-4">
              ₦{(profile?.wallet_balance || 0).toLocaleString()}
            </div>
            <div className="flex gap-3">
              <BrandButton variant="outline" size="sm" className="flex-1">
                Deposit
              </BrandButton>
              <BrandButton variant="outline" size="sm" className="flex-1">
                Withdraw
              </BrandButton>
            </div>
          </div>
        </div>

        {/* Job/Service Button */}
        <BrandButton 
          className="w-full flex items-center justify-center gap-2" 
          size="lg"
          variant="outline"
          onClick={() => navigate('/post-job')}
        >
          <Plus className="h-4 w-4" />
          Post Job/Service
        </BrandButton>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <BrandInput
              label="Full Name"
              value={editForm.full_name}
              onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
              placeholder="Enter your full name"
            />
            <BrandInput
              label="Phone Number"
              value={editForm.phone_number}
              onChange={(e) => setEditForm(prev => ({ ...prev, phone_number: e.target.value }))}
              placeholder="Enter your phone number"
            />
            <BrandInput
              label="Profession"
              value={editForm.profession}
              onChange={(e) => setEditForm(prev => ({ ...prev, profession: e.target.value }))}
              placeholder="e.g., Freelance Designer"
            />
            <div className="space-y-2">
              <label className="text-sm font-medium text-text-primary">Bio</label>
              <textarea
                value={editForm.bio}
                onChange={(e) => setEditForm(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Tell us about yourself..."
                className="flex min-h-[80px] w-full rounded-lg border border-border bg-input px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
            <div className="flex gap-3">
              <BrandButton variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </BrandButton>
              <BrandButton className="flex-1" onClick={handleSaveProfile}>
                Save Changes
              </BrandButton>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2">
        <div className="flex justify-around items-center">
          {bottomNavItems.map((item) => (
            <Link 
              key={item.label} 
              to={item.path}
              className={`flex flex-col items-center gap-1 py-2 px-3 rounded-xl transition-colors ${
                item.active 
                  ? 'text-primary bg-primary/10' 
                  : 'text-text-secondary hover:text-primary hover:bg-primary/5'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Profile