import React, { useState } from 'react';
import { Star, Quote, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useGigTestimonials, GigTestimonial } from '@/hooks/useGigTestimonials';
import { useAuth } from '@/hooks/useAuth';

interface GigTestimonialsSectionProps {
  gigId: string;
  gigOwnerId: string;
}

export const GigTestimonialsSection: React.FC<GigTestimonialsSectionProps> = ({
  gigId,
  gigOwnerId
}) => {
  const { user } = useAuth();
  const { testimonials, loading, addTestimonial } = useGigTestimonials(gigId);
  const [showForm, setShowForm] = useState(false);
  const [text, setText] = useState('');
  const [rating, setRating] = useState(5);
  const [projectType, setProjectType] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const canAddTestimonial = user && user.id !== gigOwnerId;

  const handleSubmit = async () => {
    if (!text.trim()) return;
    
    setSubmitting(true);
    const result = await addTestimonial(text, rating, projectType);
    setSubmitting(false);
    
    if (!result.error) {
      setText('');
      setProjectType('');
      setRating(5);
      setShowForm(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => (
          <Card key={i} className="p-4">
            <div className="flex gap-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-16 w-full" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Client Testimonials</h3>
        {canAddTestimonial && !showForm && (
          <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Testimonial
          </Button>
        )}
      </div>

      {/* Add Testimonial Form */}
      {showForm && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <h4 className="font-medium mb-3 text-sm">Share Your Experience</h4>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setRating(star)}
                    className="focus:outline-none"
                  >
                    <Star 
                      className={`h-6 w-6 transition-colors ${
                        star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground hover:text-yellow-400'
                      }`} 
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Project Type (Optional)</label>
              <Input
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
                placeholder="e.g., Logo Design, Website"
                className="h-9"
              />
            </div>

            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Your Testimonial</label>
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Share your experience working with this seller..."
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit} 
                disabled={submitting || !text.trim()}
                size="sm"
              >
                {submitting ? 'Submitting...' : 'Submit Testimonial'}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowForm(false);
                  setText('');
                  setProjectType('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Testimonials List */}
      {testimonials.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Quote className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No testimonials yet</p>
          {canAddTestimonial && (
            <p className="text-xs mt-1">Be the first to share your experience!</p>
          )}
        </Card>
      ) : (
        <div className="space-y-3">
          {testimonials.map(testimonial => (
            <TestimonialCard key={testimonial.id} testimonial={testimonial} />
          ))}
        </div>
      )}
    </div>
  );
};

const TestimonialCard: React.FC<{ testimonial: GigTestimonial }> = ({ testimonial }) => {
  return (
    <Card className="p-4 relative overflow-hidden">
      <Quote className="absolute top-2 right-2 h-8 w-8 text-primary/10" />
      
      <div className="flex items-start gap-3">
        <Avatar className="h-10 w-10">
          <AvatarImage src={testimonial.user?.profile_picture_url || ''} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm">
            {testimonial.user?.full_name?.charAt(0) || '?'}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-medium text-sm">{testimonial.user?.full_name || 'Client'}</span>
              {testimonial.user?.profession && (
                <span className="text-xs text-muted-foreground ml-2">{testimonial.user.profession}</span>
              )}
            </div>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map(star => (
                <Star 
                  key={star} 
                  className={`h-3 w-3 ${star <= testimonial.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} 
                />
              ))}
            </div>
          </div>
          
          {testimonial.project_type && (
            <span className="text-xs text-primary bg-primary/10 px-2 py-0.5 rounded mt-1 inline-block">
              {testimonial.project_type}
            </span>
          )}
          
          <p className="text-sm text-muted-foreground mt-2 italic">
            "{testimonial.testimonial}"
          </p>
          
          <span className="text-xs text-muted-foreground mt-2 block">
            {new Date(testimonial.created_at).toLocaleDateString('en-NG', { 
              month: 'short', 
              year: 'numeric' 
            })}
          </span>
        </div>
      </div>
    </Card>
  );
};

export default GigTestimonialsSection;
