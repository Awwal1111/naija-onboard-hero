import { useState } from "react";
import ResponsiveLayout from "@/components/ResponsiveLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Bookmark, Plus, Trash2, Lock, Globe } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const Collections = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newCollection, setNewCollection] = useState({
    name: "",
    description: "",
    is_private: true,
  });

  const { data: collections } = useQuery({
    queryKey: ["collections", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("collections")
        .select("*, collection_items(count)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("collections").insert({
        user_id: user!.id,
        name: newCollection.name,
        description: newCollection.description,
        is_private: newCollection.is_private,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      setShowCreateDialog(false);
      setNewCollection({ name: "", description: "", is_private: true });
      toast({
        title: "Collection created",
        description: "Your new collection has been created successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create collection. Please try again.",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (collectionId: string) => {
      const { error } = await supabase
        .from("collections")
        .delete()
        .eq("id", collectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collections"] });
      toast({
        title: "Collection deleted",
        description: "The collection has been deleted successfully.",
      });
    },
  });

  return (
    <ResponsiveLayout>
      <div className="container max-w-6xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Bookmark className="h-8 w-8 text-primary" />
            My Collections
          </h1>

          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                New Collection
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Collection</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Collection Name</Label>
                  <Input
                    placeholder="e.g., Favorite Jobs"
                    value={newCollection.name}
                    onChange={(e) =>
                      setNewCollection({ ...newCollection, name: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Description (Optional)</Label>
                  <Textarea
                    placeholder="What's this collection for?"
                    value={newCollection.description}
                    onChange={(e) =>
                      setNewCollection({ ...newCollection, description: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Private Collection</Label>
                  <Switch
                    checked={newCollection.is_private}
                    onCheckedChange={(checked) =>
                      setNewCollection({ ...newCollection, is_private: checked })
                    }
                  />
                </div>
                <Button
                  onClick={() => createMutation.mutate()}
                  disabled={!newCollection.name || createMutation.isPending}
                  className="w-full"
                >
                  {createMutation.isPending ? "Creating..." : "Create Collection"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {collections?.map((collection) => (
            <Card key={collection.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {collection.is_private ? (
                      <Lock className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Globe className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="truncate">{collection.name}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteMutation.mutate(collection.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {collection.description && (
                  <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                    {collection.description}
                  </p>
                )}
                <Badge variant="secondary">
                  {collection.collection_items?.[0]?.count || 0} items
                </Badge>
              </CardContent>
            </Card>
          ))}

          {collections?.length === 0 && (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              <Bookmark className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No collections yet. Create one to start organizing your saved items!</p>
            </div>
          )}
        </div>
      </div>
    </ResponsiveLayout>
  );
};

export default Collections;
