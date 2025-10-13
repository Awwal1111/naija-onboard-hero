import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, ShoppingCart, Star, Eye, CheckCircle } from "lucide-react";
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
import EnhancedProductDialog from "@/components/EnhancedProductDialog";

const categories: Array<"document" | "ebook" | "pdf" | "template" | "audio" | "video" | "other"> = ["document", "ebook", "pdf", "template", "audio", "video", "other"];

export default function DigitalProducts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | "document" | "ebook" | "pdf" | "template" | "audio" | "video" | "other">("all");

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
        .order("average_rating", { ascending: false });

      if (selectedCategory !== "all") {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
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
          <EnhancedProductDialog
            trigger={
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Create
              </Button>
            }
          />
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
          <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
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
                  <div className="flex items-center justify-between mb-2">
                    <Badge className="w-fit">{product.category}</Badge>
                    {product.is_verified && (
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircle className="h-3 w-3" />
                        Verified
                      </div>
                    )}
                  </div>
                  <h3 className="font-semibold text-sm">{product.title}</h3>
                  <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
                  {product.average_rating > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        <span className="text-xs font-semibold">{product.average_rating.toFixed(1)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">({product.review_count} reviews)</span>
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-3 pt-0">
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-primary">₦{product.price}NC</span>
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {product.download_count} downloads
                    </span>
                  </div>
                  {product.preview_url && (
                    <a
                      href={product.preview_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-2 inline-block"
                    >
                      Preview Product
                    </a>
                  )}
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
