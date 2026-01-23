import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useContests } from '@/hooks/useContests'
import { useAuth } from '@/hooks/useAuth'
import { Trophy, Clock, Users, DollarSign, Plus, ArrowLeft, Star, Filter } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'logo', label: 'Logo & Branding' },
  { value: 'illustration', label: 'Illustration' },
  { value: 'video', label: 'Video & Animation' },
  { value: 'writing', label: 'Writing' },
  { value: 'web', label: 'Web Design' }
]

export default function Contests() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { contests, myContests, loading, createContest, fetchContests } = useContests()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    prize_amount: 10000,
    deadline: '',
    requirements: ''
  })

  const handleCreateContest = async () => {
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

  return (
    <div className="min-h-screen bg-background pb-20">
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
              <p className="text-xs text-muted-foreground">Compete for prizes</p>
            </div>
          </div>
          {user && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> Post Contest</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader>
                  <DialogTitle>Create a Contest</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Title</Label>
                    <Input value={formData.title} onChange={e => setFormData(p => ({ ...p, title: e.target.value }))} placeholder="Logo design for tech startup" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Describe what you're looking for..." rows={3} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Category</Label>
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
                      <Label>Prize (NC)</Label>
                      <Input type="number" value={formData.prize_amount} onChange={e => setFormData(p => ({ ...p, prize_amount: Number(e.target.value) }))} min={5000} />
                    </div>
                  </div>
                  <div>
                    <Label>Deadline</Label>
                    <Input type="datetime-local" value={formData.deadline} onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Requirements (one per line)</Label>
                    <Textarea value={formData.requirements} onChange={e => setFormData(p => ({ ...p, requirements: e.target.value }))} placeholder="PNG and SVG formats&#10;Minimalist style" rows={3} />
                  </div>
                  <Button onClick={handleCreateContest} className="w-full" disabled={!formData.title || !formData.category || !formData.deadline}>
                    Create Contest
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="browse" className="p-4">
        <TabsList className="w-full">
          <TabsTrigger value="browse" className="flex-1">Browse</TabsTrigger>
          <TabsTrigger value="my-contests" className="flex-1">My Contests</TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-4 mt-4">
          {/* Category Filter */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.map(cat => (
              <Button key={cat.value} variant={selectedCategory === cat.value ? 'default' : 'outline'} size="sm" onClick={() => handleCategoryChange(cat.value)}>
                {cat.label}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading contests...</div>
          ) : contests.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No open contests</p>
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>Post First Contest</Button>
              </CardContent>
            </Card>
          ) : (
            contests.map(contest => (
              <Card key={contest.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/contests/${contest.id}`)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{contest.title}</h3>
                      <Badge variant="secondary" className="mt-1">{contest.category}</Badge>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-primary">NC {contest.prize_amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">Prize</p>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{contest.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {contest.submission_count} entries</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(contest.deadline), { addSuffix: true })}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={contest.client_avatar || ''} />
                        <AvatarFallback>{contest.client_name?.[0] || '?'}</AvatarFallback>
                      </Avatar>
                      <span>{contest.client_name}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="my-contests" className="space-y-4 mt-4">
          {myContests.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <p className="text-muted-foreground">You haven't created any contests</p>
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>Create Contest</Button>
              </CardContent>
            </Card>
          ) : (
            myContests.map(contest => (
              <Card key={contest.id} onClick={() => navigate(`/contests/${contest.id}`)}>
                <CardContent className="p-4">
                  <div className="flex justify-between">
                    <div>
                      <h3 className="font-semibold">{contest.title}</h3>
                      <Badge variant={contest.status === 'open' ? 'default' : 'secondary'}>{contest.status}</Badge>
                    </div>
                    <p className="font-bold">NC {contest.prize_amount.toLocaleString()}</p>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
