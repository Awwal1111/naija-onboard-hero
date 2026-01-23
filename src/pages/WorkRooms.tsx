import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useWorkrooms } from '@/hooks/useWorkrooms'
import { useAuth } from '@/hooks/useAuth'
import { FolderKanban, Plus, ArrowLeft, Users, CheckSquare, Clock, FileText } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function WorkRooms() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { workrooms, loading, createWorkroom } = useWorkrooms()
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '', project_type: '', deadline: '', total_budget: 0 })

  const handleCreate = async () => {
    const result = await createWorkroom(formData)
    if (result.data) {
      setShowCreateDialog(false)
      setFormData({ name: '', description: '', project_type: '', deadline: '', total_budget: 0 })
    }
  }

  const activeRooms = workrooms.filter(r => r.status === 'active')
  const completedRooms = workrooms.filter(r => r.status !== 'active')

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
                <FolderKanban className="h-5 w-5 text-primary" /> WorkRooms
              </h1>
              <p className="text-xs text-muted-foreground">Team collaboration spaces</p>
            </div>
          </div>
          {user && (
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button size="sm"><Plus className="h-4 w-4 mr-1" /> New Room</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Create WorkRoom</DialogTitle></DialogHeader>
                <div className="space-y-4">
                  <div><Label>Project Name</Label><Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Website Redesign" /></div>
                  <div><Label>Description</Label><Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} rows={2} /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><Label>Project Type</Label><Input value={formData.project_type} onChange={e => setFormData(p => ({ ...p, project_type: e.target.value }))} placeholder="Website" /></div>
                    <div><Label>Budget (NC)</Label><Input type="number" value={formData.total_budget} onChange={e => setFormData(p => ({ ...p, total_budget: Number(e.target.value) }))} /></div>
                  </div>
                  <div><Label>Deadline</Label><Input type="date" value={formData.deadline} onChange={e => setFormData(p => ({ ...p, deadline: e.target.value }))} /></div>
                  <Button onClick={handleCreate} className="w-full" disabled={!formData.name}>Create WorkRoom</Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <Tabs defaultValue="active" className="p-4">
        <TabsList className="w-full">
          <TabsTrigger value="active" className="flex-1">Active ({activeRooms.length})</TabsTrigger>
          <TabsTrigger value="completed" className="flex-1">Completed ({completedRooms.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4 mt-4">
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : activeRooms.length === 0 ? (
            <Card className="text-center py-8">
              <CardContent>
                <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
                <p className="text-muted-foreground">No active WorkRooms</p>
                <Button className="mt-4" onClick={() => setShowCreateDialog(true)}>Create Your First Room</Button>
              </CardContent>
            </Card>
          ) : (
            activeRooms.map(room => (
              <Card key={room.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/workrooms/${room.id}`)}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-semibold">{room.name}</h3>
                      {room.project_type && <Badge variant="secondary">{room.project_type}</Badge>}
                    </div>
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                  </div>
                  {room.description && <p className="text-sm text-muted-foreground line-clamp-1 mb-3">{room.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {room.member_count} members</span>
                    <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" /> {room.task_count} tasks</span>
                    {room.deadline && <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDistanceToNow(new Date(room.deadline), { addSuffix: true })}</span>}
                  </div>
                  {room.total_budget > 0 && (
                    <div className="mt-2 flex justify-between text-xs">
                      <span>Budget: NC {room.total_budget.toLocaleString()}</span>
                      <span className="text-green-600">Spent: NC {room.spent_budget.toLocaleString()}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="completed" className="space-y-4 mt-4">
          {completedRooms.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No completed projects</p>
          ) : (
            completedRooms.map(room => (
              <Card key={room.id} className="opacity-75" onClick={() => navigate(`/workrooms/${room.id}`)}>
                <CardContent className="p-4">
                  <div className="flex justify-between">
                    <h3 className="font-semibold">{room.name}</h3>
                    <Badge variant="secondary">{room.status}</Badge>
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
