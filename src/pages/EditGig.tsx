import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Upload, X, ImageIcon, Loader2 } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BrandButton } from '@/components/ui/brand-button';
import { BrandInput } from '@/components/ui/brand-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const EditGig = () => {
  const navigate = useNavigate();
  const { gigId } = useParams<{ gigId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    category: '',
    delivery_days: '7',
    response_time: 'Within 1 hour'
  });

  const { data: gig, isLoading: gigLoading } = useQuery({
    queryKey: ['edit-gig', gigId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('jobs_services')
        .select('*')
        .eq('id', gigId)
        .eq('user_id', user?.id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!gigId && !!user
  });

  useEffect(() => {
    if (gig) {
      setFormData({
        title: gig.title || '',
        description: gig.description || '',
        price: String(gig.price || ''),
        category: gig.category || '',
        delivery_days: String(gig.delivery_days || 7),
        response_time: gig.response_time || 'Within 1 hour'
      });
      setExistingUrls(gig.photo_urls || []);
    }
  }, [gig]);

  const jobCategories = [
    'Web Development', 'Mobile App Development', 'UI/UX Design', 'Graphic Design',
    'Digital Marketing', 'Content Writing', 'Data Analysis', 'Video Editing',
    'Photography', 'Social Media Management', 'Virtual Assistant', 'Accounting & Finance',
    'Translation Services', 'Voice Over', 'Music Production', 'Architecture',
    'Engineering', 'Legal Services', 'Business Consulting', 'Event Planning',
    'Fashion Design', 'Interior Design', 'Teaching & Tutoring', 'Health & Fitness',
    'Beauty & Wellness', 'Cleaning Services', 'Delivery Services', 'Repair & Maintenance',
    'Security Services', 'Catering & Food', 'Transportation', 'Real Estate',
    'Agriculture', 'Manufacturing', 'Trading & Sales', 'Other'
  ];

  const responseTimes = [
    'Within 1 hour', 'Within 2 hours', 'Within 12 hours', 'Within 24 hours', 'Within 48 hours'
  ];

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const totalImages = existingUrls.length + selectedImages.length + files.length;
    if (totalImages > 5) {
      toast({ title: 'Too many images', description: 'Maximum 5 images', variant: 'destructive' });
      return;
    }

    const validFiles = files.filter(file => {
      if (!file.type.startsWith('image/')) return false;
      if (file.size > 5 * 1024 * 1024) return false;
      return true;
    });

    const newPreviews = validFiles.map(file => URL.createObjectURL(file));
    setSelectedImages(prev => [...prev, ...validFiles]);
    setPreviewUrls(prev => [...prev, ...newPreviews]);
  };

  const removeExistingImage = (index: number) => {
    setExistingUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeNewImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const uploadImages = async (): Promise<string[]> => {
    if (!user || selectedImages.length === 0) return [];

    setUploadingImages(true);
    const uploadedUrls: string[] = [];

    try {
      for (const file of selectedImages) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

        const { error } = await supabase.storage
          .from('gig-images')
          .upload(fileName, file, { cacheControl: '3600', upsert: false });

        if (error) throw error;

        const { data: urlData } = supabase.storage.from('gig-images').getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }
      return uploadedUrls;
    } finally {
      setUploadingImages(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !gigId) return;

    const price = parseFloat(formData.price);
    if (isNaN(price) || price <= 0) {
      toast({ title: 'Invalid Price', description: 'Enter a valid price', variant: 'destructive' });
      return;
    }

    setLoading(true);

    try {
      const newPhotoUrls = await uploadImages();
      const allPhotoUrls = [...existingUrls, ...newPhotoUrls];

      const { error } = await supabase
        .from('jobs_services')
        .update({
          title: formData.title,
          description: formData.description,
          price: price,
          category: formData.category,
          photo_urls: allPhotoUrls,
          delivery_days: parseInt(formData.delivery_days) || 7,
          response_time: formData.response_time
        })
        .eq('id', gigId)
        .eq('user_id', user.id);

      if (error) throw error;

      toast({ title: 'Gig Updated!', description: 'Your changes have been saved.' });
      navigate('/my-gigs');
    } catch (error: any) {
      toast({ title: 'Update Failed', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  if (gigLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <Skeleton className="h-10 w-40 mb-6" />
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!gig) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-6 text-center">
          <h2 className="font-semibold mb-2">Gig Not Found</h2>
          <p className="text-sm text-muted-foreground mb-4">This gig doesn't exist or you don't own it</p>
          <BrandButton onClick={() => navigate('/my-gigs')}>Back to My Gigs</BrandButton>
        </Card>
      </div>
    );
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-background border-b px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="flex items-center gap-2">
          <ArrowLeft className="h-5 w-5 text-muted-foreground" />
        </button>
        <h1 className="font-semibold">Edit Gig</h1>
        <div className="w-5" />
      </header>

      <div className="px-4 sm:px-6 py-6 max-w-2xl mx-auto">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photos */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold">Photos</h2>
            
            {(existingUrls.length > 0 || previewUrls.length > 0) && (
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {existingUrls.map((url, index) => (
                  <div key={`existing-${index}`} className="relative aspect-square rounded-lg overflow-hidden border group">
                    <img src={url} alt={`Image ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeExistingImage(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                    {index === 0 && (
                      <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                        Cover
                      </span>
                    )}
                  </div>
                ))}
                {previewUrls.map((url, index) => (
                  <div key={`new-${index}`} className="relative aspect-square rounded-lg overflow-hidden border border-primary group">
                    <img src={url} alt={`New ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeNewImage(index)}
                      className="absolute top-1 right-1 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {existingUrls.length + previewUrls.length < 5 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-lg p-6 text-center cursor-pointer hover:border-primary/50"
              >
                <ImageIcon className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Click to upload</p>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageSelect} className="hidden" />
          </div>

          {/* Basic Info */}
          <div className="space-y-4">
            <BrandInput
              label="Service Title *"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              required
            />

            <div className="space-y-2">
              <label className="text-sm font-medium">Category *</label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {jobCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <BrandInput
              label="Price (₦) *"
              type="number"
              value={formData.price}
              onChange={(e) => handleInputChange('price', e.target.value)}
              min="0"
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Delivery (days)</label>
                <Input
                  type="number"
                  value={formData.delivery_days}
                  onChange={(e) => handleInputChange('delivery_days', e.target.value)}
                  min="1"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Response Time</label>
                <Select value={formData.response_time} onValueChange={(value) => handleInputChange('response_time', value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {responseTimes.map((rt) => (
                      <SelectItem key={rt} value={rt}>{rt}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              placeholder="Describe your service..."
              className="flex min-h-[120px] w-full rounded-lg border border-border bg-input px-3 py-2 text-sm"
              required
            />
          </div>

          <BrandButton type="submit" className="w-full" size="lg" disabled={loading || uploadingImages}>
            {loading || uploadingImages ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {uploadingImages ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              'Save Changes'
            )}
          </BrandButton>
        </form>
      </div>
    </div>
  );
};

export default EditGig;
