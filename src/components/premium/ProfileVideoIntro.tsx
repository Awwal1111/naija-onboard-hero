import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Video, Play, Upload, X, Crown, Loader2 } from 'lucide-react';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface ProfileVideoIntroProps {
  userId: string;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  isOwner: boolean;
  isPremium: boolean;
  onUpdate?: () => void;
}

export function ProfileVideoIntro({ 
  userId, 
  videoUrl, 
  thumbnailUrl, 
  isOwner, 
  isPremium,
  onUpdate 
}: ProfileVideoIntroProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadVideo, uploadProgress } = useVideoUpload();
  const { toast } = useToast();

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check video duration (max 60 seconds)
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    
    video.onloadedmetadata = async () => {
      URL.revokeObjectURL(video.src);
      
      if (video.duration > 60) {
        toast({
          title: "Video too long",
          description: "Profile intro video must be 60 seconds or less",
          variant: "destructive"
        });
        return;
      }

      setIsUploading(true);
      try {
        const result = await uploadVideo(file, 'profile-intro');
        
        if (result) {
          // Update profile with video URLs
          const { error } = await supabase
            .from('profiles')
            .update({
              intro_video_url: result.videoUrl,
              intro_video_thumbnail: result.thumbnailUrl
            })
            .eq('user_id', userId);

          if (error) throw error;

          toast({
            title: "Video uploaded!",
            description: "Your profile intro video is now live"
          });
          
          setShowUploadDialog(false);
          onUpdate?.();
        }
      } catch (error: any) {
        toast({
          title: "Upload failed",
          description: error.message,
          variant: "destructive"
        });
      } finally {
        setIsUploading(false);
      }
    };
  };

  const handleRemoveVideo = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          intro_video_url: null,
          intro_video_thumbnail: null
        })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Video removed",
        description: "Your profile intro video has been removed"
      });
      
      onUpdate?.();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Show nothing if not premium and no video
  if (!isPremium && !videoUrl) return null;

  // Show premium upgrade prompt for owners
  if (isOwner && !isPremium) {
    return (
      <Card className="p-4 border-dashed border-2 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm">Profile Video Intro</h4>
            <p className="text-xs text-muted-foreground">
              Upgrade to Premium to add a 60-second intro video
            </p>
          </div>
          <Badge variant="outline" className="text-primary border-primary">
            Premium
          </Badge>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Video Introduction</h3>
          <Badge variant="secondary" className="text-xs">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
        </div>
        
        {isOwner && isPremium && (
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                {videoUrl ? 'Change' : 'Add Video'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Profile Video Introduction</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Upload a 30-60 second video introducing yourself to potential clients. 
                  This helps build trust and showcase your personality.
                </p>
                
                <div 
                  className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {isUploading ? (
                    <div className="space-y-2">
                      <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
                      <p className="text-sm">Uploading... {uploadProgress.progress}%</p>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Click to upload video</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        MP4, MOV, or WebM • Max 60 seconds • Max 100MB
                      </p>
                    </>
                  )}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                />

                {videoUrl && (
                  <Button 
                    variant="destructive" 
                    size="sm" 
                    onClick={handleRemoveVideo}
                    className="w-full"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Remove Current Video
                  </Button>
                )}
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {videoUrl && (
        <Card className="overflow-hidden">
          <div className="relative aspect-video bg-black">
            {isPlaying ? (
              <video
                ref={videoRef}
                src={videoUrl}
                className="w-full h-full object-cover"
                controls
                autoPlay
                onEnded={() => setIsPlaying(false)}
              />
            ) : (
              <>
                {thumbnailUrl ? (
                  <img 
                    src={thumbnailUrl} 
                    alt="Video thumbnail"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-muted">
                    <Video className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}
                <button
                  onClick={() => setIsPlaying(true)}
                  className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                >
                  <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
                    <Play className="h-8 w-8 text-primary-foreground ml-1" />
                  </div>
                </button>
              </>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
