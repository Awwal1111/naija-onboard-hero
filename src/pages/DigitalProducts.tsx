import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, ShoppingCart, Star, Eye, CheckCircle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import EnhancedProductDialog from "@/components/EnhancedProductDialog";
import { usePersonalizedProducts } from "@/hooks/usePersonalizedDiscovery";
import { BookmarkButton } from "@/components/BookmarkButton";

const categories: Array<"document" | "ebook" | "pdf" | "template" | "audio" | "video" | "other"> = ["document", "ebook", "pdf", "template", "audio", "video", "other"];

export default function DigitalProducts() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"all" | typeof categories[number]>("all");
  const [activeTab, setActiveTab] = useState("discover");
  const [myProducts, setMyProducts] = useState<any[]>([]);
  const [purchasedProducts, setPurchasedProducts] = useState<any[]>([]);
  const [stats, setStats] = useState({ created: 0, purchased: 0, revenue: 0, downloads: 0 });

  const { products: allProducts, loading: isLoading } = usePersonalizedProducts(50);

  useEffect(() => {
    if (user) fetchMyData();
  }, [user]);

  const fetchMyData = async () => {
    const [createdRes, purchasedRes, salesRes] = await Promise.all([
      supabase.from('digital_products').select('*').eq('user_id', user?.id).order('created_at', { ascending: false }),
      supabase.from('digital_product_purchases').select('*, digital_products(*)').eq('buyer_id', user?.id),
      supabase.from('digital_product_purchases').select('amount, digital_products!inner(user_id)').eq('digital_products.user_id', user?.id)
    ]);
    setMyProducts(createdRes.data || []);
    setPurchasedProducts(purchasedRes.data || []);
    setStats({
      created: createdRes.data?.length || 0,
      purchased: purchasedRes.data?.length || 0,
      revenue: (salesRes.data || []).reduce((sum, p) => sum + (p.amount || 0), 0),
      downloads: (createdRes.data || []).reduce((sum, p) => sum + (p.download_count || 0), 0)
    });
  };

  const products = selectedCategory === "all" ? allProducts : allProducts.filter((p: any) => p.category === selectedCategory);

  const purchaseMutation = useMutation({
    mutationFn: async ({ productId, price, isDemo }: { productId: string; price: number; isDemo: boolean }) => {
      if (isDemo) throw new Error("Demo products cannot be purchased");
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) throw new Error("Not authenticated");

      const { data: existing } = await supabase.from("digital_product_purchases").select("id").eq("product_id", productId).eq("buyer_id", authUser.id).single();
      if (existing) throw new Error("Already purchased");

      const { data: profile } = await supabase.from("profiles").select("wallet_balance").eq("user_id", authUser.id).single();
      if (!profile || profile.wallet_balance < price) throw new Error("Insufficient balance");

      await supabase.from("profiles").update({ wallet_balance: profile.wallet_balance - price }).eq("user_id", authUser.id);
      await supabase.from("digital_product_purchases").insert({ product_id: productId, buyer_id: authUser.id, amount: price });
      
      const { data: product } = await supabase.from("digital_products").select("download_count").eq("id", productId).single();
      if (product) await supabase.from("digital_products").update({ download_count: (product.download_count || 0) + 1 }).eq("id", productId);
    },
    onSuccess: () => {
      toast({ title: "Purchase successful!" });
      queryClient.invalidateQueries({ queryKey: ["digital-products"] });
      fetchMyData();
    },
    onError: (error: any) => {
      toast({ title: error.message, variant: "destructive" });
    },
  });

  const filteredProducts = products.filter((p: any) =>
    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ProductCard = ({ product, showPurchase = true }: { product: any; showPurchase?: boolean }) => (
    <Card className={product.is_demo ? "border-yellow-500/50 bg-yellow-50/10" : ""}>
      <CardHeader className="p-3 pb-1">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {product.is_demo && <Badge variant="outline" className="text-yellow-600 border-yellow-500/50 text-xs">DEMO</Badge>}
            <Badge className="text-xs capitalize">{product.category}</Badge>
          </div>
          {product.is_verified && <CheckCircle className="h-4 w-4 text-green-500" />}
        </div>
        <h3 className="font-semibold text-sm line-clamp-2">{product.title}</h3>
        <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
      </CardHeader>
      <CardContent className="p-3 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold text-primary">₦{product.price}NC</span>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <BookmarkButton type="product" itemId={product.id} />
            {product.average_rating > 0 && (
              <span className="flex items-center gap-1"><Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />{product.average_rating.toFixed(1)}</span>
            )}
            <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{product.download_count || 0}</span>
          </div>
        </div>
      </CardContent>
      {showPurchase && (
        <CardFooter className="p-3 pt-0">
          <Button
            size="sm"
            className="w-full"
            variant={product.is_demo ? "outline" : "default"}
            disabled={product.is_demo || purchaseMutation.isPending}
            onClick={() => purchaseMutation.mutate({ productId: product.id, price: product.price, isDemo: product.is_demo })}
          >
            {product.is_demo ? "Demo - Not Purchasable" : <><ShoppingCart className="h-4 w-4 mr-1" />Purchase</>}
          </Button>
        </CardFooter>
      )}
    </Card>
  );

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-bold flex-1">Digital Products</h1>
          <EnhancedProductDialog trigger={<Button size="sm" className="gap-1"><Plus className="h-4 w-4" />Create</Button>} />
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        {/* Stats */}
        <div className="grid grid-cols-4 gap-2 p-4">
          <Card className="bg-green-500/10 border-green-500/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-lg font-bold text-green-600">{stats.created}</div>
              <div className="text-[10px] text-muted-foreground">Created</div>
            </CardContent>
          </Card>
          <Card className="bg-blue-500/10 border-blue-500/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-lg font-bold text-blue-600">{stats.purchased}</div>
              <div className="text-[10px] text-muted-foreground">Purchased</div>
            </CardContent>
          </Card>
          <Card className="bg-purple-500/10 border-purple-500/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-lg font-bold text-purple-600">₦{stats.revenue}</div>
              <div className="text-[10px] text-muted-foreground">Revenue</div>
            </CardContent>
          </Card>
          <Card className="bg-orange-500/10 border-orange-500/20">
            <CardContent className="pt-3 pb-3 text-center">
              <div className="text-lg font-bold text-orange-600">{stats.downloads}</div>
              <div className="text-[10px] text-muted-foreground">Downloads</div>
            </CardContent>
          </Card>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="px-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="discover">Discover</TabsTrigger>
            <TabsTrigger value="my-products">My Products</TabsTrigger>
            <TabsTrigger value="purchased">Purchased</TabsTrigger>
          </TabsList>

          <TabsContent value="discover" className="mt-4 space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search products..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
              </div>
              <Select value={selectedCategory} onValueChange={(v) => setSelectedCategory(v as any)}>
                <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categories.map(cat => <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : filteredProducts.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-semibold">No products found</h3></CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                {filteredProducts.map((product: any) => <ProductCard key={product.id} product={product} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-products" className="mt-4 space-y-4">
            {myProducts.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-semibold mb-2">No Products Created</h3><p className="text-sm text-muted-foreground mb-4">Create digital products to sell</p><EnhancedProductDialog trigger={<Button><Plus className="h-4 w-4 mr-1" />Create Product</Button>} /></CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                {myProducts.map((product) => (
                  <Card key={product.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold">{product.title}</h3>
                          <Badge variant="outline" className="text-xs capitalize mt-1">{product.category}</Badge>
                        </div>
                        <span className="font-bold text-primary">₦{product.price}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1"><Eye className="h-3 w-3" />{product.download_count || 0} sales</span>
                        {product.average_rating > 0 && <span className="flex items-center gap-1"><Star className="h-3 w-3" />{product.average_rating.toFixed(1)}</span>}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="purchased" className="mt-4 space-y-4">
            {purchasedProducts.length === 0 ? (
              <Card><CardContent className="py-12 text-center"><ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" /><h3 className="font-semibold mb-2">No Purchased Products</h3><p className="text-sm text-muted-foreground">Browse and purchase digital products</p></CardContent></Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-4">
                {purchasedProducts.map((purchase) => (
                  <Card key={purchase.id}>
                    <CardContent className="pt-4">
                      <h3 className="font-semibold mb-1">{purchase.digital_products?.title}</h3>
                      <p className="text-xs text-muted-foreground mb-3">Purchased {new Date(purchase.created_at).toLocaleDateString()}</p>
                      {purchase.digital_products?.file_url && (
                        <Button size="sm" className="w-full" asChild>
                          <a href={purchase.digital_products.file_url} target="_blank" rel="noopener noreferrer">Download</a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
