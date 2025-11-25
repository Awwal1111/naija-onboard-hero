import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useExpertClasses } from '@/hooks/useExpertClasses'

interface CreateClassDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export const CreateClassDialog: React.FC<CreateClassDialogProps> = ({ open, onOpenChange }) => {
  const { createClass } = useExpertClasses()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    scheduled_start: '',
    duration_minutes: 60,
    max_participants: 20,
    is_free: true,
    price: 0,
    category: '',
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    createClass({
      ...formData,
      status: 'scheduled',
      class_type: 'live',
    })
    onOpenChange(false)
    setFormData({
      title: '',
      description: '',
      scheduled_start: '',
      duration_minutes: 60,
      max_participants: 20,
      is_free: true,
      price: 0,
      category: '',
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Class</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Class Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Introduction to Web Development"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="What will students learn in this class?"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Programming, Design, Marketing"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_start">Start Date & Time *</Label>
              <Input
                id="scheduled_start"
                type="datetime-local"
                value={formData.scheduled_start}
                onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                min="15"
                max="480"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="max_participants">Max Participants</Label>
            <Input
              id="max_participants"
              type="number"
              value={formData.max_participants}
              onChange={(e) => setFormData({ ...formData, max_participants: parseInt(e.target.value) })}
              min="2"
              max="50"
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label htmlFor="is_free">Free Class</Label>
              <p className="text-sm text-muted-foreground">
                Make this class free for everyone
              </p>
            </div>
            <Switch
              id="is_free"
              checked={formData.is_free}
              onCheckedChange={(checked) => setFormData({ ...formData, is_free: checked, price: checked ? 0 : formData.price })}
            />
          </div>

          {!formData.is_free && (
            <div className="space-y-2">
              <Label htmlFor="price">Price (₦)</Label>
              <Input
                id="price"
                type="number"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
                min="0"
                step="0.01"
              />
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Class
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
