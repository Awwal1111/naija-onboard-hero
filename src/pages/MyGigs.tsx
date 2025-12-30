import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Pause, Play, Zap, Star, Eye, MoreVertical, Package, TrendingUp, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyGigs, MyGig } from '@/hooks/useMyGigs';
import { GigBoostDialog } from '@/components/GigBoostDialog';
import { useAuth } from '@/hooks/useAuth';

export default function MyGigs() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { gigs, loading, stats, toggleGigStatus, deleteGig, refetch } = useMyGigs();
  const [selectedGig, setSelectedGig] = useState<MyGig | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showBoostDialog, setShowBoostDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!selectedGig) return;
    setDeleting(true);
    await deleteGig(selectedGig.id);
    setDeleting(false);
    setShowDeleteDialog(false);
    setSelectedGig(null);
  };

  const handleToggleStatus = async (gig: MyGig) => {
    await toggleGigStatus(gig.id, gig.status);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="p-6 text-center">
          <h2 className="font-semibold mb-2">Please Log In</h2>
          <p className="text-sm text-muted-foreground mb-4">You need to be logged in to manage your gigs</p>
          <Button onClick={() => navigate('/login')}>Log In</Button>
        </Card>
      </div>
    );
  }

  const activeGigs = gigs.filter(g => g.status === 'active');
  const pausedGigs = gigs.filter(g => g.status === 'paused');

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center justify-between px-4 py-3">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-bold">My Gigs</h1>
          <Button size="sm" onClick={() => navigate('/post-job')}>
            <Plus className="h-4 w-4 mr-1" />
            Create
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        {/* Stats Overview */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="p-4 text-center">
            <Package className="h-5 w-5 mx-auto text-primary mb-1" />
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total Gigs</div>
          </Card>
          <Card className="p-4 text-center">
            <TrendingUp className="h-5 w-5 mx-auto text-green-500 mb-1" />
            <div className="text-2xl font-bold">{stats.active}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </Card>
          <Card className="p-4 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-yellow-500 mb-1" />
            <div className="text-2xl font-bold">{stats.totalOrders}</div>
            <div className="text-xs text-muted-foreground">Orders</div>
          </Card>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : gigs.length === 0 ? (
          <Card className="p-8 text-center">
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="font-semibold mb-2">No Gigs Yet</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first gig to start selling your services
            </p>
            <Button onClick={() => navigate('/post-job')}>
              <Plus className="h-4 w-4 mr-2" />
              Create Your First Gig
            </Button>
          </Card>
        ) : (
          <Tabs defaultValue="active">
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="active">
                Active ({activeGigs.length})
              </TabsTrigger>
              <TabsTrigger value="paused">
                Paused ({pausedGigs.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-3">
              {activeGigs.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <p>No active gigs</p>
                </Card>
              ) : (
                activeGigs.map(gig => (
                  <GigManagementCard
                    key={gig.id}
                    gig={gig}
                    onView={() => navigate(`/gig/${gig.id}`)}
                    onEdit={() => navigate(`/edit-gig/${gig.id}`)}
                    onToggleStatus={() => handleToggleStatus(gig)}
                    onBoost={() => { setSelectedGig(gig); setShowBoostDialog(true); }}
                    onDelete={() => { setSelectedGig(gig); setShowDeleteDialog(true); }}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="paused" className="space-y-3">
              {pausedGigs.length === 0 ? (
                <Card className="p-6 text-center text-muted-foreground">
                  <p>No paused gigs</p>
                </Card>
              ) : (
                pausedGigs.map(gig => (
                  <GigManagementCard
                    key={gig.id}
                    gig={gig}
                    onView={() => navigate(`/gig/${gig.id}`)}
                    onEdit={() => navigate(`/edit-gig/${gig.id}`)}
                    onToggleStatus={() => handleToggleStatus(gig)}
                    onBoost={() => { setSelectedGig(gig); setShowBoostDialog(true); }}
                    onDelete={() => { setSelectedGig(gig); setShowDeleteDialog(true); }}
                  />
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Gig</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete "{selectedGig?.title}"? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Boost Dialog */}
      {selectedGig && (
        <GigBoostDialog
          open={showBoostDialog}
          onOpenChange={setShowBoostDialog}
          gigId={selectedGig.id}
          gigTitle={selectedGig.title}
          currentBoost={selectedGig.boost_amount || 0}
          onSuccess={refetch}
        />
      )}
    </div>
  );
}

interface GigManagementCardProps {
  gig: MyGig;
  onView: () => void;
  onEdit: () => void;
  onToggleStatus: () => void;
  onBoost: () => void;
  onDelete: () => void;
}

const GigManagementCard: React.FC<GigManagementCardProps> = ({
  gig,
  onView,
  onEdit,
  onToggleStatus,
  onBoost,
  onDelete
}) => {
  const coverImage = gig.photo_urls?.[0] || '/placeholder.svg';
  const isPaused = gig.status === 'paused';

  return (
    <Card className={`overflow-hidden ${isPaused ? 'opacity-70' : ''}`}>
      <CardContent className="p-0">
        <div className="flex gap-3 p-3">
          {/* Thumbnail */}
          <div 
            className="w-20 h-16 rounded-md overflow-hidden bg-muted flex-shrink-0 cursor-pointer"
            onClick={onView}
          >
            <img
              src={coverImage}
              alt={gig.title}
              className="w-full h-full object-cover"
            />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <h3 
                className="font-medium text-sm line-clamp-1 cursor-pointer hover:text-primary"
                onClick={onView}
              >
                {gig.title}
              </h3>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={onView}>
                    <Eye className="h-4 w-4 mr-2" />
                    View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEdit}>
                    <Edit className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onBoost}>
                    <Zap className="h-4 w-4 mr-2 text-yellow-500" />
                    Boost
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onToggleStatus}>
                    {isPaused ? (
                      <>
                        <Play className="h-4 w-4 mr-2 text-green-500" />
                        Activate
                      </>
                    ) : (
                      <>
                        <Pause className="h-4 w-4 mr-2" />
                        Pause
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="text-destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant={isPaused ? 'secondary' : 'default'} className="text-[10px] h-5">
                {isPaused ? 'Paused' : 'Active'}
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5">
                {gig.category}
              </Badge>
              {(gig.boost_amount || 0) > 0 && (
                <Badge className="text-[10px] h-5 bg-gradient-to-r from-yellow-500 to-orange-500 text-white border-0">
                  <Zap className="h-3 w-3 mr-0.5" />
                  ₦{gig.boost_amount.toLocaleString()}
                </Badge>
              )}
            </div>

            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  {(gig.average_rating || 0).toFixed(1)}
                </span>
                <span>{gig.review_count || 0} reviews</span>
              </div>
              <span className="text-sm font-bold text-primary">
                ₦{gig.price.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
