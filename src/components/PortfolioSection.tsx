import React, { useState } from 'react'
import { Plus, ExternalLink, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useFileUpload } from '@/hooks/useFileUpload'
import { useAuth } from '@/hooks/useAuth'

interface PortfolioSectionProps {
  userId?: string
  isOwnProfile?: boolean
}

const PortfolioSection: React.FC<PortfolioSectionProps> = ({ userId, isOwnProfile = false }) => {
  const { user } = useAuth()
  const { items, loading, addPortfolioItem, deletePortfolioItem } = usePortfolio(userId)
  const { uploadFile, uploadProgress } = useFileUpload()
  
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_url: '',
    media_file: null as File | null
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setFormData(prev => ({ ...prev, media_file: file }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    let mediaUrl = ''
    if (formData.media_file) {
      const { url, error } = await uploadFile(formData.media_file, 'portfolio')
      if (error) {
        console.error('Upload error:', error)
        return
      }
      mediaUrl = url || ''
    }

    const { error } = await addPortfolioItem({
      title: formData.title,
      description: formData.description,
      project_url: formData.project_url,
      media_url: mediaUrl
    })

    if (!error) {
      setFormData({
        title: '',
        description: '',
        project_url: '',
        media_file: null
      })
      setIsAddDialogOpen(false)
    }
  }

  const handleDelete = async (itemId: string) => {
    if (window.confirm('Are you sure you want to delete this portfolio item?')) {
      await deletePortfolioItem(itemId)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-text-primary">Portfolio</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-40 bg-background-secondary rounded mb-3"></div>
                <div className="h-4 bg-background-secondary rounded mb-2"></div>
                <div className="h-3 bg-background-secondary rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-text-primary">Portfolio</h3>
        {isOwnProfile && (
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add Portfolio Item</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div>
                  <Label htmlFor="project_url">Project URL</Label>
                  <Input
                    id="project_url"
                    type="url"
                    value={formData.project_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, project_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                
                <div>
                  <Label htmlFor="media_file">Image/Video</Label>
                  <Input
                    id="media_file"
                    type="file"
                    accept="image/*,video/*"
                    onChange={handleFileChange}
                  />
                </div>
                
                <Button type="submit" className="w-full" disabled={uploadProgress.isUploading}>
                  {uploadProgress.isUploading ? 'Uploading...' : 'Add Portfolio Item'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-text-secondary">
              {isOwnProfile ? "Add your first portfolio item to showcase your work" : "No portfolio items yet"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardContent className="p-0">
                {item.media_url && (
                  <div className="h-40 overflow-hidden">
                    {item.media_url.includes('.mp4') || item.media_url.includes('.mov') ? (
                      <video 
                        src={item.media_url} 
                        className="w-full h-full object-cover"
                        controls
                      />
                    ) : (
                      <img 
                        src={item.media_url} 
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                    )}
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex items-start justify-between mb-2">
                    <h4 className="font-semibold text-text-primary line-clamp-1">{item.title}</h4>
                    {isOwnProfile && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(item.id)}
                        className="text-destructive hover:text-destructive p-1 h-auto"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {item.description && (
                    <p className="text-text-secondary text-sm mb-3 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  
                  {item.project_url && (
                    <a 
                      href={item.project_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:text-primary-hover text-sm"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Project
                    </a>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}

export default PortfolioSection