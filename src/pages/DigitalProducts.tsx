import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const categories: Array<"document" | "ebook" | "pdf" | "template" | "audio" | "video" | "other"> = ["document", "ebook", "pdf", "template", "audio", "video", "other"];

export default function DigitalProducts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "document" | "ebook" | "pdf" | "template" | "audio" | "video" | "other">("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "document" as "document" | "ebook" | "pdf" | "template" | "audio" | "video" | "other",
    price: "",
    file_url: "",
    preview_url: "",
  });

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["digital-products", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("digital_products")
        .select(`
          *,
          profiles!digital_products_user_id_fkey(full_name, profile_picture_url)
        `)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase.from("digital_products").insert({
        title: data.title,
        description: data.description,
        category: data.category,
        price: parseFloat(data.price),
        file_url: data.file_url,
        preview_url: data.preview_url,
      } as any);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Digital product created successfully!" });
      queryClient.invalidateQueries({ queryKey: ["digital-products"] });
      setCreateDialogOpen(false);
      setFormData({ title: "", description: "", category: "document", price: "", file_url: "", preview_url: "" });
    },
    onError: () => {
      toast({ title: "Failed to create product", variant: "destructive" });
    },
  });

  const purchaseProductMutation = useMutation({
    mutationFn: async ({ productId, price }: { productId: string; price: number }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Check if already purchased
      const { data: existing } = await supabase
        .from("digital_product_purchases")
        .select("id")
        .eq("product_id", productId)
        .eq("buyer_id", user.id)
        .single();

      if (existing) {
        throw new Error("You already own this product");
      }

      // Check wallet balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("wallet_balance")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.wallet_balance < price) {
        throw new Error("Insufficient balance");
      }

      // Deduct from buyer
      await supabase
        .from("profiles")
        .update({ wallet_balance: profile.wallet_balance - price })
        .eq("user_id", user.id);

      // Record purchase
      await supabase.from("digital_product_purchases").insert({
        product_id: productId,
        buyer_id: user.id,
        amount: price,
      });

      // Increment download count
      const { data: product } = await supabase
        .from("digital_products")
        .select("download_count")
        .eq("id", productId)
        .single();
      
      if (product) {
        await supabase
          .from("digital_products")
          .update({ download_count: product.download_count + 1 })
          .eq("id", productId);
      }
    },
    onSuccess: () => {
      toast({ title: "Purchase successful! You can now access the product." });
      queryClient.invalidateQueries({ queryKey: ["digital-products"] });
    },
    onError: (error: any) => {
      toast({ title: error.message || "Purchase failed", variant: "destructive" });
    },
  });

  const filteredProducts = products.filter(p =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b px-3 py-2">
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold">Digital Products</h1>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create Digital Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Product title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe your product"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v as any })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(cat => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Price (₦NC)</Label>
                  <Input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="space-y-2">
                  <Label>File URL</Label>
                  <Input
                    value={formData.file_url}
                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preview URL (Optional)</Label>
                  <Input
                    value={formData.preview_url}
                    onChange={(e) => setFormData({ ...formData, preview_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={() => createProductMutation.mutate(formData)}
                  disabled={createProductMutation.isPending}
                >
                  Create Product
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="p-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {categories.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-8">Loading...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No products found</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredProducts.map((product: any) => (
              <Card key={product.id}>
                <CardHeader className="p-3">
                  <Badge className="w-fit">{product.category}</Badge>
                  <h3 className="font-semibold text-sm mt-2">{product.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">₦{product.price}NC</span>
                    <span className="text-xs text-muted-foreground">{product.download_count} downloads</span>
                  </div>
                </CardContent>
                <CardFooter className="p-3 pt-0">
                  <Button
                    size="sm"
                    className="w-full"
                    onClick={() => purchaseProductMutation.mutate({ productId: product.id, price: product.price })}
                    disabled={purchaseProductMutation.isPending}
                  >
                    <ShoppingCart className="h-4 w-4 mr-1" />
                    Purchase
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
