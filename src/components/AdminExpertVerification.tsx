import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Shield, CheckCircle, XCircle, Clock, User, Mail, Briefcase, CreditCard, Search, Filter } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ExpertProfile {
  user_id: string;
  full_name: string;
  profession: string;
  profile_picture_url: string;
  is_expert: boolean;
  verification_status: 'unverified' | 'submitted' | 'verified';
  verification_payment_status: 'not_paid' | 'paid';
  verification_description: string;
  verification_submitted_at: string;
  email?: string;
}

export const AdminExpertVerification: React.FC = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedExpert, setSelectedExpert] = useState<ExpertProfile | null>(null);
  const [feedback, setFeedback] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Fetch all experts for verification
  const { data: experts = [], isLoading } = useQuery({
    queryKey: ['admin-expert-verifications'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, full_name, profession, profile_picture_url, is_expert, verification_status, verification_payment_status, verification_description, verification_submitted_at')
        .eq('is_expert', true)
        .order('verification_submitted_at', { ascending: false, nullsFirst: false });
      
      if (error) throw error;
      return data as ExpertProfile[];
    },
  });

  // Approve/Reject mutation
  const updateVerificationMutation = useMutation({
    mutationFn: async ({ userId, status }: { userId: string; status: 'verified' | 'unverified' }) => {
      const { error } = await supabase
        .from('profiles')
        .update({
          verification_status: status,
          verification_reviewed_at: new Date().toISOString(),
          verification_reviewed_by: user!.id,
        })
        .eq('user_id', userId);
      
      if (error) throw error;

      // Send notification to user
      await supabase.functions.invoke('send-notification', {
        body: {
          user_id: userId,
          type: 'expert_verification',
          title: status === 'verified' ? 'Verification Approved!' : 'Verification Rejected',
          message: status === 'verified' 
            ? 'Congratulations! Your expert status has been verified. You now have access to all expert benefits.'
            : `Your verification was not approved. ${feedback || 'Please contact support for more information.'}`,
        }
      });
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-expert-verifications'] });
      toast({
        title: status === 'verified' ? 'Expert Verified' : 'Verification Rejected',
        description: status === 'verified' 
          ? 'The expert has been verified successfully.'
          : 'The expert verification has been rejected.',
      });
      setSelectedExpert(null);
      setFeedback('');
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to update verification status.',
        variant: 'destructive',
      });
    },
  });

  const getStatusBadge = (status: string, paymentStatus: string) => {
    if (status === 'verified') {
      return <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Verified</Badge>;
    }
    if (status === 'submitted') {
      if (paymentStatus === 'paid') {
        return <Badge className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20">Ready for Review</Badge>;
      }
      return <Badge className="bg-orange-500/10 text-orange-600 border-orange-500/20">Awaiting Payment</Badge>;
    }
    return <Badge variant="secondary">Unverified</Badge>;
  };

  const filteredExperts = experts.filter(expert => {
    const matchesSearch = expert.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          expert.profession?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || 
                          (statusFilter === 'pending' && expert.verification_status === 'submitted' && expert.verification_payment_status === 'paid') ||
                          expert.verification_status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = experts.filter(e => e.verification_status === 'submitted' && e.verification_payment_status === 'paid').length;
  const verifiedCount = experts.filter(e => e.verification_status === 'verified').length;
  const unverifiedCount = experts.filter(e => e.verification_status === 'unverified').length;

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-3 gap-4">
        <Card className="bg-yellow-500/5 border-yellow-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold text-yellow-600">{pendingCount}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-green-500/5 border-green-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Verified</p>
                <p className="text-2xl font-bold text-green-600">{verifiedCount}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/50" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-muted/50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Unverified</p>
                <p className="text-2xl font-bold">{unverifiedCount}</p>
              </div>
              <User className="h-8 w-8 text-muted-foreground/50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or profession..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Experts</SelectItem>
            <SelectItem value="pending">Pending Review</SelectItem>
            <SelectItem value="verified">Verified</SelectItem>
            <SelectItem value="unverified">Unverified</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Expert List */}
      <div className="space-y-3">
        {filteredExperts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No experts found matching your criteria.</p>
            </CardContent>
          </Card>
        ) : (
          filteredExperts.map((expert) => (
            <Card 
              key={expert.user_id}
              className={`hover:border-primary/50 transition-colors cursor-pointer ${
                expert.verification_status === 'submitted' && expert.verification_payment_status === 'paid' 
                  ? 'border-yellow-500/30 bg-yellow-500/5' 
                  : ''
              }`}
              onClick={() => setSelectedExpert(expert)}
            >
              <CardContent className="py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={expert.profile_picture_url} />
                      <AvatarFallback>{expert.full_name?.[0] || 'E'}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-semibold flex items-center gap-2">
                        {expert.full_name}
                        {getStatusBadge(expert.verification_status, expert.verification_payment_status)}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Briefcase className="h-3 w-3" />
                        {expert.profession || 'No profession set'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right text-sm text-muted-foreground">
                      {expert.verification_submitted_at && (
                        <p>Submitted: {new Date(expert.verification_submitted_at).toLocaleDateString()}</p>
                      )}
                      <p className="flex items-center gap-1">
                        <CreditCard className="h-3 w-3" />
                        {expert.verification_payment_status === 'paid' ? 'Paid' : 'Not Paid'}
                      </p>
                    </div>
                    {expert.verification_status === 'submitted' && expert.verification_payment_status === 'paid' && (
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Review Dialog */}
      <Dialog open={!!selectedExpert} onOpenChange={() => setSelectedExpert(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Expert Verification Review</DialogTitle>
            <DialogDescription>
              Review the expert's submission and decide on verification status.
            </DialogDescription>
          </DialogHeader>

          {selectedExpert && (
            <div className="space-y-4">
              {/* Expert Info */}
              <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedExpert.profile_picture_url} />
                  <AvatarFallback className="text-xl">{selectedExpert.full_name?.[0] || 'E'}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedExpert.full_name}</h3>
                  <p className="text-muted-foreground">{selectedExpert.profession}</p>
                  <div className="flex gap-2 mt-1">
                    {getStatusBadge(selectedExpert.verification_status, selectedExpert.verification_payment_status)}
                  </div>
                </div>
              </div>

              {/* Submission Details */}
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Verification Status</p>
                  <p className="capitalize">{selectedExpert.verification_status}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Payment Status</p>
                  <p>{selectedExpert.verification_payment_status === 'paid' ? '✓ Paid' : '✗ Not Paid'}</p>
                </div>
                {selectedExpert.verification_description && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Document Description</p>
                    <p className="p-3 bg-muted rounded-lg text-sm">{selectedExpert.verification_description}</p>
                  </div>
                )}
                {selectedExpert.verification_submitted_at && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Submitted On</p>
                    <p>{new Date(selectedExpert.verification_submitted_at).toLocaleString()}</p>
                  </div>
                )}
              </div>

              {/* Feedback for rejection */}
              {selectedExpert.verification_status !== 'verified' && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Admin Feedback (optional)</label>
                  <Textarea
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Provide feedback if rejecting..."
                    rows={2}
                  />
                </div>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelectedExpert(null)}>
              Close
            </Button>
            {selectedExpert && selectedExpert.verification_status !== 'verified' && (
              <>
                <Button
                  variant="destructive"
                  onClick={() => updateVerificationMutation.mutate({ 
                    userId: selectedExpert.user_id, 
                    status: 'unverified' 
                  })}
                  disabled={updateVerificationMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  onClick={() => updateVerificationMutation.mutate({ 
                    userId: selectedExpert.user_id, 
                    status: 'verified' 
                  })}
                  disabled={updateVerificationMutation.isPending || selectedExpert.verification_payment_status !== 'paid'}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminExpertVerification;
