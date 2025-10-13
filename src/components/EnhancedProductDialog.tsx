import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";

interface EnhancedProductDialogProps {
  trigger: React.ReactNode;
}

const categories: Array<"document" | "ebook" | "pdf" | "template" | "audio" | "video" | "other"> = ["document", "ebook", "pdf", "template", "audio", "video", "other"];

export default function EnhancedProductDialog({ trigger }: EnhancedProductDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    detailed_description: "",
    category: "document" as typeof categories[number],
    price: "",
    file_url: "",
    preview_url: "",
    demo_url: "",
    requirements: "",
    compatibility: "",
    version: "",
    license_type: "personal" as "personal" | "commercial" | "extended" | "unlimited",
    file_size: "",
    file_format: "",
    refund_policy: "",
    support_included: false,
    instant_download: true,
    features: [{ item: "" }],
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (!data.title || !data.price || !data.file_url) {
        throw new Error("Please fill in all required fields");
      }

      const featuresList = data.features.filter(f => f.item).map(f => f.item);

      const { error } = await supabase.from("digital_products").insert({
        title: data.title,
        description: data.description,
        detailed_description: data.detailed_description || null,
        category: data.category,
        price: parseFloat(data.price),
        file_url: data.file_url,
        preview_url: data.preview_url || null,
        demo_url: data.demo_url || null,
        requirements: data.requirements || null,
        compatibility: data.compatibility || null,
        version: data.version || null,
        license_type: data.license_type,
        file_size: data.file_size || null,
        file_format: data.file_format || null,
        refund_policy: data.refund_policy || null,
        support_included: data.support_included,
        instant_download: data.instant_download,
        features: featuresList,
        status: "active",
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Digital product created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["digital-products"] });
      setOpen(false);
      setFormData({
        title: "",
        description: "",
        detailed_description: "",
        category: "document",
        price: "",
        file_url: "",
        preview_url: "",
        demo_url: "",
        requirements: "",
        compatibility: "",
        version: "",
        license_type: "personal",
        file_size: "",
        file_format: "",
        refund_policy: "",
        support_included: false,
        instant_download: true,
        features: [{ item: "" }],
      });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Failed to create product", variant: "destructive" });
    },
  });

  const addFeature = () => {
    setFormData({ ...formData, features: [...formData.features, { item: "" }] });
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  const updateFeature = (index: number, value: string) => {
    const updated = [...formData.features];
    updated[index].item = value;
    setFormData({ ...formData, features: updated });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Digital Product</DialogTitle>
          <p className="text-sm text-muted-foreground">Provide comprehensive details to attract buyers</p>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Basic Information */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Basic Information</h3>
            
            <div className="space-y-2">
              <Label>Product Title *</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Professional Resume Template Pack"
                maxLength={100}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category *</Label>
                <Select value={formData.category} onValueChange={(v: any) => setFormData({ ...formData, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-50">
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Price (₦NC) *</Label>
                <Input
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Short Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief summary (shown in listings)"
                rows={2}
                maxLength={200}
              />
            </div>

            <div className="space-y-2">
              <Label>Detailed Description</Label>
              <Textarea
                value={formData.detailed_description}
                onChange={(e) => setFormData({ ...formData, detailed_description: e.target.value })}
                placeholder="Comprehensive description of your product, what it includes, and how it helps buyers"
                rows={5}
              />
            </div>
          </div>

          {/* Product Features */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Features & Highlights</h3>
            
            <div className="space-y-2">
              <Label>Key Features</Label>
              {formData.features.map((feature, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="e.g., Fully editable in Microsoft Word"
                    value={feature.item}
                    onChange={(e) => updateFeature(index, e.target.value)}
                    className="flex-1"
                  />
                  {formData.features.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeFeature(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addFeature} className="w-full">
                <Plus className="h-4 w-4 mr-1" />
                Add Feature
              </Button>
            </div>
          </div>

          {/* Technical Details */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Technical Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>File Format</Label>
                <Input
                  value={formData.file_format}
                  onChange={(e) => setFormData({ ...formData, file_format: e.target.value })}
                  placeholder="e.g., PDF, DOCX, ZIP"
                />
              </div>
              <div className="space-y-2">
                <Label>File Size</Label>
                <Input
                  value={formData.file_size}
                  onChange={(e) => setFormData({ ...formData, file_size: e.target.value })}
                  placeholder="e.g., 5 MB"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Version</Label>
              <Input
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="e.g., 2.0"
              />
            </div>

            <div className="space-y-2">
              <Label>Requirements</Label>
              <Textarea
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="What software/hardware is needed to use this product?"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label>Compatibility</Label>
              <Textarea
                value={formData.compatibility}
                onChange={(e) => setFormData({ ...formData, compatibility: e.target.value })}
                placeholder="e.g., Works with Windows, Mac, iOS, Android"
                rows={2}
              />
            </div>
          </div>

          {/* Files & Links */}
          <div className="space-y-4 border-b pb-4">
            <h3 className="font-semibold">Files & Links</h3>
            
            <div className="space-y-2">
              <Label>Product File URL *</Label>
              <Input
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://... (secure download link)"
              />
              <p className="text-xs text-muted-foreground">This link will be shared with buyers after purchase</p>
            </div>

            <div className="space-y-2">
              <Label>Preview/Thumbnail URL</Label>
              <Input
                value={formData.preview_url}
                onChange={(e) => setFormData({ ...formData, preview_url: e.target.value })}
                placeholder="https://... (product image)"
              />
            </div>

            <div className="space-y-2">
              <Label>Demo URL</Label>
              <Input
                value={formData.demo_url}
                onChange={(e) => setFormData({ ...formData, demo_url: e.target.value })}
                placeholder="https://... (live demo or video)"
              />
            </div>
          </div>

          {/* License & Support */}
          <div className="space-y-4">
            <h3 className="font-semibold">License & Support</h3>
            
            <div className="space-y-2">
              <Label>License Type</Label>
              <Select value={formData.license_type} onValueChange={(v: any) => setFormData({ ...formData, license_type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border-border z-50">
                  <SelectItem value="personal">Personal Use Only</SelectItem>
                  <SelectItem value="commercial">Commercial Use</SelectItem>
                  <SelectItem value="extended">Extended License</SelectItem>
                  <SelectItem value="unlimited">Unlimited License</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Refund Policy</Label>
              <Textarea
                value={formData.refund_policy}
                onChange={(e) => setFormData({ ...formData, refund_policy: e.target.value })}
                placeholder="Explain your refund terms"
                rows={2}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.support_included}
                  onCheckedChange={(checked) => setFormData({ ...formData, support_included: checked as boolean })}
                />
                <Label>Customer Support Included</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={formData.instant_download}
                  onCheckedChange={(checked) => setFormData({ ...formData, instant_download: checked as boolean })}
                />
                <Label>Instant Download</Label>
              </div>
            </div>
          </div>

          <Button
            className="w-full"
            onClick={() => createProductMutation.mutate(formData)}
            disabled={createProductMutation.isPending || !formData.title || !formData.price || !formData.file_url}
          >
            {createProductMutation.isPending ? "Creating..." : "Create Product"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}