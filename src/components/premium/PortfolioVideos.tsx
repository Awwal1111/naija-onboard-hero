import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Video, Play, Upload, Plus, X, Crown, Loader2, Trash2 } from 'lucide-react';
import { useVideoUpload } from '@/hooks/useVideoUpload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PortfolioVideo {
  id: string;
  url: string;
  thumbnail: string;
  title: string;
  description: string;
}

interface PortfolioVideosProps {
  userId: string;
  videos: PortfolioVideo[];
  isOwner: boolean;
  isPremium: boolean;
  onUpdate?: () => void;
}

export function PortfolioVideos({ 
  userId, 
  videos = [], 
  isOwner, 
  isPremium,
  onUpdate 
}: PortfolioVideosProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [newVideo, setNewVideo] = useState({ title: '', description: '', file: null as File | null });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadVideo, uploadProgress } = useVideoUpload();
  const { toast } = useToast();

  const MAX_VIDEOS = 5;
  const canAddMore = videos.length < MAX_VIDEOS;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewVideo(prev => ({ ...prev, file }));
    }
  };

  const handleUpload = async () => {
    if (!newVideo.file || !newVideo.title) {
      toast({
        title: "Missing information",
        description: "Please add a title and select a video",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);
    try {
      const result = await uploadVideo(newVideo.file, 'portfolio-videos');
      
      if (result) {
        const newPortfolioVideo: PortfolioVideo = {
          id: crypto.randomUUID(),
          url: result.videoUrl,
          thumbnail: result.thumbnailUrl,
          title: newVideo.title,
          description: newVideo.description
        };

        const updatedVideos = [...videos, newPortfolioVideo];
        
        const { error } = await supabase
          .from('profiles')
          .update({ portfolio_videos: updatedVideos as unknown as any })
          .eq('user_id', userId);

        if (error) throw error;

        toast({
          title: "Video added!",
          description: "Your portfolio video has been added"
        });
        
        setShowAddDialog(false);
        setNewVideo({ title: '', description: '', file: null });
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

  const handleRemoveVideo = async (videoId: string) => {
    try {
      const updatedVideos = videos.filter(v => v.id !== videoId);
      
      const { error } = await supabase
        .from('profiles')
        .update({ portfolio_videos: updatedVideos as unknown as any })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Video removed",
        description: "Portfolio video has been removed"
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

  // Show nothing if not premium and no videos
  if (!isPremium && videos.length === 0) return null;

  // Show premium upgrade prompt for owners
  if (isOwner && !isPremium) {
    return (
      <Card className="p-4 border-dashed border-2 border-primary/30 bg-primary/5">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Crown className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm">Portfolio Videos</h4>
            <p className="text-xs text-muted-foreground">
              Upgrade to Premium to showcase up to 5 portfolio videos
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Portfolio Videos</h3>
          <Badge variant="secondary" className="text-xs">
            <Crown className="h-3 w-3 mr-1" />
            Premium
          </Badge>
          <span className="text-xs text-muted-foreground">
            ({videos.length}/{MAX_VIDEOS})
          </span>
        </div>
        
        {isOwner && isPremium && canAddMore && (
          <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Video
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Portfolio Video</DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input
                    placeholder="e.g., Logo Design Process"
                    value={newVideo.title}
                    onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description of this work..."
                    value={newVideo.description}
                    onChange={(e) => setNewVideo(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                
                <div 
                  className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {newVideo.file ? (
                    <div className="flex items-center justify-center gap-2">
                      <Video className="h-5 w-5 text-primary" />
                      <span className="text-sm font-medium">{newVideo.file.name}</span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          setNewVideo(prev => ({ ...prev, file: null }));
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm font-medium">Click to select video</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        MP4, MOV, or WebM • Max 100MB
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
                />

                <Button 
                  onClick={handleUpload} 
                  disabled={isUploading || !newVideo.file || !newVideo.title}
                  className="w-full"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Uploading... {uploadProgress.progress}%
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Video
                    </>
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {videos.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {videos.map((video) => (
            <Card key={video.id} className="overflow-hidden">
              <div className="relative aspect-video bg-black">
                {playingId === video.id ? (
                  <video
                    src={video.url}
                    className="w-full h-full object-cover"
                    controls
                    autoPlay
                    onEnded={() => setPlayingId(null)}
                  />
                ) : (
                  <>
                    {video.thumbnail ? (
                      <img 
                        src={video.thumbnail} 
                        alt={video.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Video className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <button
                      onClick={() => setPlayingId(video.id)}
                      className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                    >
                      <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
                        <Play className="h-6 w-6 text-primary-foreground ml-0.5" />
                      </div>
                    </button>
                    
                    {isOwner && (
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 h-7 w-7"
                        onClick={() => handleRemoveVideo(video.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </>
                )}
              </div>
              <div className="p-3">
                <h4 className="font-medium text-sm truncate">{video.title}</h4>
                {video.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                    {video.description}
                  </p>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {videos.length === 0 && isOwner && isPremium && (
        <Card className="p-6 text-center border-dashed">
          <Video className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">
            No portfolio videos yet. Add videos to showcase your work!
          </p>
        </Card>
      )}
    </div>
  );
}
