import React, { useState } from 'react'
import { Plus, ExternalLink, Trash2, Edit, Upload, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { usePortfolio } from '@/hooks/usePortfolio'
import { useAuth } from '@/hooks/useAuth'
import { useFileUpload } from '@/hooks/useFileUpload'
import { toast } from 'sonner'
import { supabase } from '@/integrations/supabase/client'

interface PortfolioItem {
  id: string
  title: string
  description?: string
  project_url?: string
  media_url?: string
  created_at: string
}

interface PortfolioSectionProps {
  userId?: string
  isOwnProfile?: boolean
}

const PortfolioSection: React.FC<PortfolioSectionProps> = ({ userId, isOwnProfile = true }) => {
  const { user } = useAuth()
  const { items, loading, addPortfolioItem, updatePortfolioItem, deletePortfolioItem } = usePortfolio(userId)
  const { uploadFile } = useFileUpload()
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<PortfolioItem | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    project_url: '',
    media_url: ''
  })
  const [uploading, setUploading] = useState(false)

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      project_url: '',
      media_url: ''
    })
    setEditingItem(null)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !user) return

    setUploading(true)
    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/portfolio-${Date.now()}.${fileExt}`
      
      const { url, error } = await uploadFile(file, 'portfolio', fileName)
      
      if (error || !url) {
        throw new Error(error || 'Upload failed')
      }

      setFormData(prev => ({ ...prev, media_url: url }))
      toast.success('Image uploaded successfully!')
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.title.trim()) {
      toast.error('Title is required')
      return
    }

    try {
      if (editingItem) {
        await updatePortfolioItem(editingItem.id, formData)
        toast.success('Portfolio item updated!')
      } else {
        await addPortfolioItem(formData)
        toast.success('Portfolio item added!')
      }
      
      resetForm()
      setIsCreateDialogOpen(false)
    } catch (error) {
      console.error('Error saving portfolio item:', error)
      toast.error('Failed to save portfolio item')
    }
  }

  const handleEdit = (item: PortfolioItem) => {
    setEditingItem(item)
    setFormData({
      title: item.title,
      description: item.description || '',
      project_url: item.project_url || '',
      media_url: item.media_url || ''
    })
    setIsCreateDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this portfolio item?')) return
    
    try {
      // Get the item first to delete the image from storage
      const itemToDelete = items.find(item => item.id === id)
      
      // Delete from database
      await deletePortfolioItem(id)
      
      // Delete image from storage if exists
      if (itemToDelete?.media_url) {
        try {
          const urlParts = itemToDelete.media_url.split('/')
          const bucketPath = urlParts.slice(urlParts.indexOf('portfolio') + 1).join('/')
          await supabase.storage.from('portfolio').remove([bucketPath])
        } catch (storageError) {
          console.error('Error deleting image from storage:', storageError)
        }
      }
      
      toast.success('Portfolio item deleted!')
    } catch (error) {
      console.error('Error deleting portfolio item:', error)
      toast.error('Failed to delete portfolio item')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-muted rounded-xl animate-pulse" />
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Portfolio
          {isOwnProfile && (
            <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
              setIsCreateDialogOpen(open)
              if (!open) resetForm()
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Item
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingItem ? 'Edit Portfolio Item' : 'Add Portfolio Item'}
                </DialogTitle>
              </DialogHeader>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Project title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe your project"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="project_url">Project URL</Label>
                  <Input
                    id="project_url"
                    value={formData.project_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, project_url: e.target.value }))}
                    placeholder="https://..."
                    type="url"
                  />
                </div>

                <div>
                  <Label htmlFor="media">Image</Label>
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    {uploading && <span className="text-sm text-muted-foreground">Uploading...</span>}
                  </div>
                  {formData.media_url && (
                    <div className="mt-2 relative">
                      <img 
                        src={formData.media_url} 
                        alt="Preview" 
                        className="w-full h-32 object-cover rounded"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        className="absolute top-1 right-1"
                        onClick={() => setFormData(prev => ({ ...prev, media_url: '' }))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button type="submit" className="flex-1" disabled={uploading}>
                    {editingItem ? 'Update' : 'Add'} Item
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Plus className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <h3 className="font-semibold mb-2">No portfolio items yet</h3>
            <p className="text-sm">
              {isOwnProfile 
                ? 'Add your first project to showcase your work'
                : 'This user hasn\'t added any portfolio items yet'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {items.map((item) => (
              <div key={item.id} className="group relative">
                <div className="aspect-square bg-muted rounded-xl overflow-hidden">
                  {item.media_url ? (
                    <img 
                      src={item.media_url} 
                      alt={item.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-primary">
                          {item.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-2 px-2">
                          {item.title}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Overlay with actions */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    {item.project_url && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => window.open(item.project_url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    {isOwnProfile && (
                      <>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEdit(item)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(item.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                <div className="mt-2">
                  <h4 className="font-medium text-sm truncate">{item.title}</h4>
                  {item.description && (
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PortfolioSection