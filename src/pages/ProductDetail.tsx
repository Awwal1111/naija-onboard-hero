import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Download, Star, Eye, CheckCircle, FileText, Award, ExternalLink } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [purchaseOpen, setPurchaseOpen] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("digital_products")
        .select(`
          *,
          profiles:user_id (full_name, profile_picture_url)
        `)
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const { data: hasPurchased } = useQuery({
    queryKey: ["has-purchased", id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("digital_product_purchases")
        .select("id")
        .eq("product_id", id)
        .eq("buyer_id", user.id)
        .single();
      return !!data;
    },
    enabled: !!user,
  });

  const { data: reviews } = useQuery({
    queryKey: ["product-reviews", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_reviews")
        .select(`
          *,
          profiles:reviewer_id (full_name, profile_picture_url)
        `)
        .eq("product_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please log in to purchase");

      // Check balance
      const { data: profile } = await supabase
        .from("profiles")
        .select("balance_withdrawable")
        .eq("user_id", user.id)
        .single();

      if (!profile || profile.balance_withdrawable < product.price) {
        throw new Error("Insufficient balance");
      }

      // Calculate platform fee (5%)
      const platformFee = Math.round(product.price * 0.05);
      const sellerAmount = product.price - platformFee;

      // Deduct from buyer
      await supabase
        .from("profiles")
        .update({
          wallet_balance: profile.balance_withdrawable - product.price,
          balance_withdrawable: profile.balance_withdrawable - product.price,
        })
        .eq("user_id", user.id);

      // Credit seller (minus platform fee)
      await supabase.rpc("increment_wallet_balance", {
        target_user_id: product.user_id,
        amount_to_add: sellerAmount,
      });

      // Record purchase
      await supabase.from("digital_product_purchases").insert({
        product_id: id,
        buyer_id: user.id,
        amount: product.price,
      });

      // Create download access
      await supabase.from("product_downloads").insert({
        product_id: id,
        buyer_id: user.id,
      });

      // Update download count
      await supabase
        .from("digital_products")
        .update({ download_count: (product.download_count || 0) + 1 })
        .eq("id", id);

      // Log transactions
      await supabase.from("wallet_transactions").insert([
        {
          user_id: user.id,
          kind: "product_purchase",
          amount: -product.price,
          status: "completed",
          reference: `Purchase: ${product.title}`,
        },
        {
          user_id: product.user_id,
          kind: "product_sale",
          amount: sellerAmount,
          status: "completed",
          reference: `Sale: ${product.title} (after 5% fee)`,
        },
        {
          user_id: product.user_id,
          kind: "platform_fee",
          amount: -platformFee,
          status: "completed",
          reference: `Platform fee (5%): ${product.title}`,
        },
      ]);
    },
    onSuccess: () => {
      toast({
        title: "Purchase successful!",
        description: "You can now download the product",
      });
      queryClient.invalidateQueries({ queryKey: ["has-purchased", id] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      setPurchaseOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Purchase failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadMutation = useMutation({
    mutationFn: async () => {
      if (!hasPurchased) throw new Error("Product not purchased");

      // Update download count
      await supabase
        .from("product_downloads")
        .update({
          download_count: 1,
          last_downloaded_at: new Date().toISOString(),
        })
        .eq("product_id", id)
        .eq("buyer_id", user!.id);

      // Open file URL
      if (product.file_url) {
        window.open(product.file_url, "_blank");
      }
    },
    onSuccess: () => {
      toast({
        title: "Download started",
        description: "Your file is being downloaded",
      });
    },
  });

  if (isLoading) return <div className="container mx-auto px-4 py-8">Loading...</div>;
  if (!product) return <div className="container mx-auto px-4 py-8">Product not found</div>;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <Button onClick={() => navigate("/products")} variant="ghost" className="mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Products
        </Button>

        <div className="grid md:grid-cols-3 gap-8">
          <div className="md:col-span-2 space-y-6">
            {product.preview_url && (
              <img src={product.preview_url} alt={product.title} className="w-full h-96 object-cover rounded-lg" />
            )}

            <div>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">{product.title}</h1>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{product.category}</Badge>
                    {product.is_verified && (
                      <Badge variant="default">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                {product.average_rating > 0 && (
                  <div className="flex items-center gap-1">
                    <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{product.average_rating}</span>
                    <span className="text-muted-foreground">({product.review_count} reviews)</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <Eye className="w-5 h-5" />
                  <span>{product.download_count || 0} downloads</span>
                </div>
              </div>

              <p className="text-lg mb-6">{product.description}</p>

              {product.detailed_description && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Detailed Description</h2>
                  <p className="whitespace-pre-wrap">{product.detailed_description}</p>
                </div>
              )}

              {product.features && Array.isArray(product.features) && product.features.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Features</h2>
                  <ul className="list-disc list-inside space-y-2">
                    {product.features.map((feature: string, index: number) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {product.requirements && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Requirements</h2>
                  <p>{product.requirements}</p>
                </div>
              )}

              {reviews && reviews.length > 0 && (
                <div className="mb-6">
                  <h2 className="text-xl font-semibold mb-3">Reviews</h2>
                  <div className="space-y-4">
                    {reviews.map((review: any) => (
                      <Card key={review.id} className="p-4">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {review.profiles?.profile_picture_url && (
                              <img
                                src={review.profiles.profile_picture_url}
                                alt=""
                                className="w-8 h-8 rounded-full"
                              />
                            )}
                            <span className="font-semibold">{review.profiles?.full_name}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span>{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-sm">{review.review_text}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <Card className="p-6 sticky top-6">
              <div className="space-y-4">
                <div className="text-3xl font-bold">₦{product.price?.toLocaleString()}NC</div>

                {product.file_size && (
                  <p className="text-sm text-muted-foreground">File size: {product.file_size}</p>
                )}
                {product.version && (
                  <p className="text-sm text-muted-foreground">Version: {product.version}</p>
                )}

                {hasPurchased ? (
                  <Button onClick={() => downloadMutation.mutate()} className="w-full" size="lg">
                    <Download className="w-4 h-4 mr-2" />
                    Download Now
                  </Button>
                ) : (
                  <Button onClick={() => setPurchaseOpen(true)} className="w-full" size="lg">
                    Purchase Now
                  </Button>
                )}

                {product.demo_url && (
                  <Button onClick={() => window.open(product.demo_url, "_blank")} variant="outline" className="w-full">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View Demo
                  </Button>
                )}

                <Separator />

                <div className="space-y-2 text-sm">
                  {product.license_type && (
                    <div className="flex items-center gap-2">
                      <Award className="w-4 h-4" />
                      <span>License: {product.license_type}</span>
                    </div>
                  )}
                  {product.support_included && (
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Support included</span>
                    </div>
                  )}
                  {product.instant_download && (
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      <span>Instant download</span>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <Dialog open={purchaseOpen} onOpenChange={setPurchaseOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Purchase</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p>You are about to purchase:</p>
            <div className="p-4 bg-muted rounded-lg">
              <p className="font-semibold">{product.title}</p>
              <p className="text-2xl font-bold mt-2">₦{product.price?.toLocaleString()}NC</p>
            </div>
            <p className="text-sm text-muted-foreground">
              This amount will be deducted from your wallet balance.
            </p>
            <Button
              onClick={() => purchaseMutation.mutate()}
              disabled={purchaseMutation.isPending}
              className="w-full"
            >
              {purchaseMutation.isPending ? "Processing..." : "Confirm Purchase"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
