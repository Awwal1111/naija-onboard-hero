import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useContests } from '@/hooks/useContests'
import { useAuth } from '@/hooks/useAuth'
import { useUserMode } from '@/hooks/useUserMode'
import { Trophy, Clock, Users, DollarSign, Plus, ArrowLeft, Star, Wallet, AlertCircle, X, Search, FileImage, TrendingUp } from 'lucide-react'
import { formatDistanceToNow, isBefore, addDays } from 'date-fns'
import { BottomNavBar } from '@/components/BottomNavBar'

const CATEGORIES = [
  { value: 'all', label: 'All' },
  { value: 'logo', label: 'Logo & Branding' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'video', label: 'Video & Animation' },
  { value: 'writing', label: 'Writing' },
  { value: 'web', label: 'Web Design' },
  { value: 'ui-ux', label: 'UI/UX Design' },
  { value: 'marketing', label: 'Marketing' }
]

export default function Contests() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { isClient, isFreelancer } = useUserMode()
  const { contests, myContests, loading, createContest, fetchContests, userBalance, fetchUserBalance, cancelContest } = useContests()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState(isFreelancer && !isClient ? 'browse' : 'browse')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    prize_amount: 10000,
    deadline: '',
    requirements: ''
  })

  useEffect(() => {
    if (user) {
      fetchUserBalance()
    }
  }, [user])

  const hasEnoughBalance = userBalance >= formData.prize_amount

  // Validate deadline is at least 24 hours in the future
  const minDeadline = addDays(new Date(), 1).toISOString().slice(0, 16)
  const isDeadlineValid = !formData.deadline || !isBefore(new Date(formData.deadline), addDays(new Date(), 1))

  const handleCreateContest = async () => {
    if (!hasEnoughBalance) return
    if (!isDeadlineValid) return
    
    const result = await createContest({
      ...formData,
      requirements: formData.requirements.split('\n').filter(Boolean),
      style_preferences: []
    })
    if (result.data) {
      setShowCreateDialog(false)
      setFormData({ title: '', description: '', category: '', prize_amount: 10000, deadline: '', requirements: '' })
    }
  }

  const handleCategoryChange = (cat: string) => {
    setSelectedCategory(cat)
    fetchContests(cat === 'all' ? undefined : cat)
  }

  const handleCancelContest = async (contestId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to cancel this contest? The escrow funds will be refunded to your wallet.')) {
      await cancelContest(contestId)
    }
  }

  // Filter contests by search
  const filteredContests = contests.filter(c => 
    !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" /> Contests
              </h1>
              <p className="text-xs text-muted-foreground">
                {isClient ? 'Run contests & find talent' : 'Compete for prizes'}
              </p>
            </div>
          </div>
          {/* Only clients can create contests */}
          {user && isClient && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Post Contest</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create a Contest</DialogTitle>
                  <DialogDescription>
                    The prize amount will be held in escrow until a winner is selected.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  {/* Balance Display */}
                  <Card className={`${hasEnoughBalance ? 'bg-green-500/10 border-green-500/30' : 'bg-destructive/10 border-destructive/30'}`}>
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Wallet className={`h-5 w-5 ${hasEnoughBalance ? 'text-green-600' : 'text-destructive'}`} />
                        <span className="text-sm">Your Balance</span>
                      </div>
                      <span className={`font-bold ${hasEnoughBalance ? 'text-green-600' : 'text-destructive'}`}>
                        NC {userBalance.toLocaleString()}
                      </span>
                    </CardContent>
                  </Card>

                  {!hasEnoughBalance && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        You need NC {(formData.prize_amount - userBalance).toLocaleString()} more. 
                        <Button variant="link" className="p-0 h-auto ml-1" onClick={() => navigate('/earn')}>
                          Top up wallet →
                        </Button>
                      </AlertDescription>
                    </Alert>
                  )}

                  <div>
                    <Label>Title *</Label>
                    <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Logo design for tech startup" />
                  </div>
                  <div>
                    <Label>Description *</Label>
                    <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Describe what you're looking for in detail..." rows={4} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category *</Label>
                      <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          {CATEGORIES.filter(c => c.value !== 'all').map(c => (
                            <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Prize (NC) *</Label>
                      <Input type="number" value={formData.prize_amount} onChange={e => setFormData(p => ({ ...p, prize_amount: Number(e.target.value) }))} min={5000} />
                      <p className="text-xs text-muted-foreground mt-1">Min: NC 5,000 · Held in escrow</p>
                    </div>
                  </div>
                  <div>
                    <Label>Deadline *</Label>
                    <Input type="datetime-local" value={formData.deadline} onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))} min={minDeadline} />
                    {formData.deadline && !isDeadlineValid && (
                      <p className="text-xs text-destructive mt-1">Deadline must be at least 24 hours from now</p>
                    )}
                  </div>
                  <div>
                    <Label>Requirements (one per line)</Label>
                    <Textarea value={formData.requirements} onChange={e => setFormData(p => ({ ...p, requirements: e.target.value }))} placeholder="PNG and SVG formats&#10;Minimalist style&#10;Must include brand colors" rows={3} />
                  </div>
                  <Button 
                    onClick={handleCreateContest} 
                    className="w-full" 
                    disabled={!formData.title || !formData.description || !formData.category || !formData.deadline || !hasEnoughBalance || !isDeadlineValid}
                  >
                    {hasEnoughBalance ? `Create Contest (NC ${formData.prize_amount.toLocaleString()} held)` : 'Insufficient Balance'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search contests..." 
            value={searchQuery} 
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
        <TabsList className="w-full">
          <TabsTrigger value="browse" className="flex-1">
            <Trophy className="h-3.5 w-3.5 mr-1" />
            Browse
          </TabsTrigger>
          {isClient && (
            <TabsTrigger value="my-contests" className="flex-1">
              <Star className="h-3.5 w-3.5 mr-1" />
              My Contests
            </TabsTrigger>
          )}
          {isFreelancer && (
            <TabsTrigger value="my-entries" className="flex-1">
              <FileImage className="h-3.5 w-3.5 mr-1" />
              My Entries
            </TabsTrigger>
          )}
        </TabsList>

        {/* Browse Tab */}
        <TabsContent value="browse" className="space-y-4 mt-4">
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
            {CATEGORIES.map(cat => (
              <Button key={cat.value} variant={selectedCategory === cat.value ? 'default' : 'outline'} size="sm" className="shrink-0" onClick={() => handleCategoryChange(cat.value)}>
                {cat.label}
              </Button>
            ))}
          </div>

          {/* Stats Banner */}
          <div className="grid grid-cols-3 gap-2">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-primary">{contests.length}</p>
                <p className="text-xs text-muted-foreground">Open</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-primary">
                  NC {contests.reduce((s, c) => s + c.prize_amount, 0).toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Total Prizes</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-lg font-bold text-primary">
                  {contests.reduce((s, c) => s + (c.submission_count || 0), 0)}
                </p>
                <p className="text-xs text-muted-foreground">Entries</p>
              </CardContent>
            </Card>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => (
                <Card key={i}><CardContent className="p-4"><div className="animate-pulse space-y-3"><div className="h-4 bg-muted rounded w-3/4" /><div className="h-3 bg-muted rounded w-1/2" /><div className="h-3 bg-muted rounded w-full" /></div></CardContent></Card>
              ))}
            </div>
          ) : filteredContests.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">No open contests</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {searchQuery ? 'Try a different search' : 'Check back later or create one!'}
                </p>
                {isClient && (
                  <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>Post First Contest</Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredContests.map(contest => (
                <Card key={contest.id} className="cursor-pointer hover:shadow-md transition-all hover:border-primary/30" onClick={() => navigate(`/contests/${contest.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{contest.title}</h3>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">{contest.category}</Badge>
                          {contest.escrow_funded && (
                            <Badge variant="outline" className="text-xs text-green-600 border-green-600/30">
                              <Wallet className="h-3 w-3 mr-1" />Secured
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-lg font-bold text-primary">NC {contest.prize_amount.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">Prize</p>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{contest.description}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {contest.submission_count} entries</span>
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(contest.deadline), { addSuffix: true })}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Avatar className="h-5 w-5">
                          <AvatarImage src={contest.client_avatar || ''} />
                          <AvatarFallback className="text-[10px]">{contest.client_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>
                        <span className="truncate max-w-[80px]">{contest.client_name}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* My Contests Tab (Clients) */}
        {isClient && (
          <TabsContent value="my-contests" className="space-y-4 mt-4">
            {myContests.length === 0 ? (
              <Card className="text-center py-8">
                <CardContent>
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                  <p className="font-medium">No contests yet</p>
                  <p className="text-sm text-muted-foreground mt-1">Create a contest to find the best talent</p>
                  <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>Create Contest</Button>
                </CardContent>
              </Card>
            ) : (
              myContests.map(contest => (
                <Card key={contest.id} className="cursor-pointer hover:shadow-md transition-all" onClick={() => navigate(`/contests/${contest.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{contest.title}</h3>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <Badge variant={
                            contest.status === 'open' ? 'default' : 
                            contest.status === 'completed' ? 'secondary' : 
                            'outline'
                          }>
                            {contest.status}
                          </Badge>
                          {contest.escrow_funded && (
                            <Badge variant="outline" className="text-green-600 border-green-600/30">
                              <Wallet className="h-3 w-3 mr-1" />
                              Escrow Funded
                            </Badge>
                          )}
                          {contest.winner_id && (
                            <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/30" variant="outline">
                              <Trophy className="h-3 w-3 mr-1" />Winner Selected
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <p className="font-bold">NC {contest.prize_amount.toLocaleString()}</p>
                        {contest.status === 'open' && !contest.winner_id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={(e) => handleCancelContest(contest.id, e)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        )}

        {/* My Entries Tab (Freelancers) */}
        {isFreelancer && (
          <TabsContent value="my-entries" className="space-y-4 mt-4">
            <Card className="text-center py-8">
              <CardContent>
                <FileImage className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="font-medium">Your Contest Entries</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Browse open contests and submit your work to win prizes
                </p>
                <Button className="mt-4" variant="outline" onClick={() => setActiveTab('browse')}>
                  Browse Contests
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      <BottomNavBar />
    </div>
  )
}
