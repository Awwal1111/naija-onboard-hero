import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { supabase } from '@/integrations/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useQueryClient } from '@tanstack/react-query'
import { AIWritingAssistant } from '@/components/AIWritingAssistant'

interface EditPostDialogProps {
  isOpen: boolean
  onClose: () => void
  post: {
    id: string
    title?: string
    content: string
    content_type?: string
  }
}

const EditPostDialog: React.FC<EditPostDialogProps> = ({
  isOpen,
  onClose,
  post
}) => {
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [title, setTitle] = useState(post.title || '')
  const [content, setContent] = useState(post.content || '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setTitle(post.title || '')
      setContent(post.content || '')
    }
  }, [isOpen, post])

  const handleSave = async () => {
    if (!content.trim()) {
      toast({
        title: "Error",
        description: "Post content cannot be empty",
        variant: "destructive"
      })
      return
    }

    setSaving(true)
    try {
      const { error } = await supabase
        .from('posts')
        .update({
          title: title.trim() || null,
          content: content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id)

      if (error) throw error

      toast({
        title: "Post updated",
        description: "Your post has been updated successfully"
      })

      queryClient.invalidateQueries({ queryKey: ['personalized-posts-v2'] })
      onClose()
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update post",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edit Post</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {(post.content_type === 'job' || post.content_type === 'media') && (
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Post title"
              />
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="content">Content</Label>
              <AIWritingAssistant
                text={content}
                onApply={(text) => setContent(text)}
                context="post"
                variant="icon"
              />
            </div>
            <Textarea
              id="content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="What's on your mind?"
              rows={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || !content.trim()}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default EditPostDialog
