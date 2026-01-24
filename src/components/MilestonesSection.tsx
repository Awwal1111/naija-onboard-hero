import { useState, useEffect } from 'react';
import { useMilestones, Milestone } from '@/hooks/useMilestones';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Target,
  Plus,
  CheckCircle2,
  Clock,
  RotateCcw,
  DollarSign,
  Upload,
  Send,
  Trash2,
  Calendar
} from 'lucide-react';
import { format } from 'date-fns';

interface MilestonesSectionProps {
  orderId?: string;
  safepayId?: string;
  isBuyer: boolean;
  isSeller: boolean;
  totalAmount: number;
  orderStatus: string;
}

export const MilestonesSection = ({
  orderId,
  safepayId,
  isBuyer,
  isSeller,
  totalAmount,
  orderStatus
}: MilestonesSectionProps) => {
  const { user } = useAuth();
  const {
    getMilestones,
    createMilestones,
    submitMilestone,
    approveMilestone,
    requestRevision,
    releaseMilestone,
    getMilestoneProgress,
    loading
  } = useMilestones();

  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [showRevisionDialog, setShowRevisionDialog] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<Milestone | null>(null);

  // Create form state
  const [newMilestones, setNewMilestones] = useState([
    { title: '', description: '', amount: 0, due_date: '' }
  ]);

  // Submit form state
  const [deliverables, setDeliverables] = useState('');
  const [notes, setNotes] = useState('');

  // Revision form state
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    loadMilestones();
  }, [orderId, safepayId]);

  const loadMilestones = async () => {
    const data = await getMilestones(orderId, safepayId);
    setMilestones(data);
  };

  const progress = getMilestoneProgress(milestones);

  const handleCreateMilestones = async () => {
    const validMilestones = newMilestones.filter(m => m.title && m.amount > 0);
    if (validMilestones.length === 0) return;

    await createMilestones({
      orderId,
      safepayId,
      milestones: validMilestones
    });

    setShowCreateDialog(false);
    setNewMilestones([{ title: '', description: '', amount: 0, due_date: '' }]);
    loadMilestones();
  };

  const handleSubmit = async () => {
    if (!selectedMilestone) return;
    
    const urls = deliverables.split('\n').filter(url => url.trim());
    await submitMilestone(selectedMilestone.id, urls, notes);
    
    setShowSubmitDialog(false);
    setDeliverables('');
    setNotes('');
    setSelectedMilestone(null);
    loadMilestones();
  };

  const handleApprove = async (milestone: Milestone) => {
    await approveMilestone(milestone.id);
    loadMilestones();
  };

  const handleRequestRevision = async () => {
    if (!selectedMilestone) return;
    
    await requestRevision(selectedMilestone.id, feedback);
    
    setShowRevisionDialog(false);
    setFeedback('');
    setSelectedMilestone(null);
    loadMilestones();
  };

  const handleRelease = async (milestone: Milestone) => {
    await releaseMilestone(milestone.id);
    loadMilestones();
  };

  const addMilestoneRow = () => {
    setNewMilestones([...newMilestones, { title: '', description: '', amount: 0, due_date: '' }]);
  };

  const updateMilestoneRow = (index: number, field: string, value: any) => {
    const updated = [...newMilestones];
    updated[index] = { ...updated[index], [field]: value };
    setNewMilestones(updated);
  };

  const removeMilestoneRow = (index: number) => {
    if (newMilestones.length > 1) {
      setNewMilestones(newMilestones.filter((_, i) => i !== index));
    }
  };

  const getStatusBadge = (status: Milestone['status']) => {
    const config = {
      pending: { label: 'Pending', variant: 'secondary' as const, icon: Clock },
      in_progress: { label: 'In Progress', variant: 'default' as const, icon: Target },
      submitted: { label: 'Submitted', variant: 'default' as const, icon: Send },
      revision_requested: { label: 'Revision Needed', variant: 'secondary' as const, icon: RotateCcw },
      approved: { label: 'Approved', variant: 'default' as const, icon: CheckCircle2 },
      released: { label: 'Released', variant: 'default' as const, icon: DollarSign }
    };

    const c = config[status];
    const Icon = c.icon;

    return (
      <Badge variant={c.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  const canCreateMilestones = isBuyer && milestones.length === 0 && orderStatus !== 'completed' && orderStatus !== 'cancelled';

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Milestones
          </CardTitle>
          {canCreateMilestones && (
            <Button size="sm" variant="outline" onClick={() => setShowCreateDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Milestones
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {milestones.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No milestones set for this order</p>
            {canCreateMilestones && (
              <p className="text-xs mt-1">Split this project into milestones for phased payments</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Progress Overview */}
            <div className="bg-muted/50 rounded-lg p-3">
              <div className="flex justify-between text-sm mb-2">
                <span>Overall Progress</span>
                <span className="font-medium">{progress.completed}/{milestones.length} completed</span>
              </div>
              <Progress value={progress.percentage} className="h-2" />
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>₦{progress.released_amount.toLocaleString()} released</span>
                <span>₦{progress.total_amount.toLocaleString()} total</span>
              </div>
            </div>

            {/* Milestone List */}
            <div className="space-y-3">
              {milestones.map((milestone, index) => (
                <div
                  key={milestone.id}
                  className="border rounded-lg p-3 space-y-2"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">#{index + 1}</span>
                        <h4 className="font-medium text-sm">{milestone.title}</h4>
                      </div>
                      {milestone.description && (
                        <p className="text-xs text-muted-foreground mt-1">{milestone.description}</p>
                      )}
                    </div>
                    {getStatusBadge(milestone.status)}
                  </div>

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      ₦{milestone.amount.toLocaleString()}
                    </div>
                    {milestone.due_date && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(milestone.due_date), 'MMM d')}
                      </div>
                    )}
                    {milestone.revision_count > 0 && (
                      <div className="flex items-center gap-1">
                        <RotateCcw className="h-3 w-3" />
                        {milestone.revision_count}/{milestone.max_revisions} revisions
                      </div>
                    )}
                  </div>

                  {/* Deliverables */}
                  {milestone.deliverable_urls && milestone.deliverable_urls.length > 0 && (
                    <div className="text-xs">
                      <p className="text-muted-foreground mb-1">Deliverables:</p>
                      <div className="flex flex-wrap gap-1">
                        {milestone.deliverable_urls.map((url, i) => (
                          <a
                            key={i}
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline"
                          >
                            Link {i + 1}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Feedback */}
                  {milestone.client_feedback && (
                    <div className="bg-muted/50 rounded p-2 text-xs">
                      <p className="font-medium">Feedback:</p>
                      <p className="text-muted-foreground">{milestone.client_feedback}</p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2">
                    {/* Seller: Submit work */}
                    {isSeller && (milestone.status === 'pending' || milestone.status === 'in_progress' || milestone.status === 'revision_requested') && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedMilestone(milestone);
                          setShowSubmitDialog(true);
                        }}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Submit Work
                      </Button>
                    )}

                    {/* Buyer: Approve */}
                    {isBuyer && milestone.status === 'submitted' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(milestone)}
                          disabled={loading}
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Approve
                        </Button>
                        {milestone.revision_count < milestone.max_revisions && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedMilestone(milestone);
                              setShowRevisionDialog(true);
                            }}
                          >
                            <RotateCcw className="h-3 w-3 mr-1" />
                            Request Revision
                          </Button>
                        )}
                      </>
                    )}

                    {/* Buyer: Release funds */}
                    {isBuyer && milestone.status === 'approved' && (
                      <Button
                        size="sm"
                        onClick={() => handleRelease(milestone)}
                        disabled={loading}
                      >
                        <DollarSign className="h-3 w-3 mr-1" />
                        Release Payment
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Create Milestones Dialog */}
        <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
          <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Milestones</DialogTitle>
              <DialogDescription>
                Split this project into deliverable milestones. Total: ₦{totalAmount.toLocaleString()}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {newMilestones.map((m, index) => (
                <div key={index} className="border rounded-lg p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Milestone {index + 1}</span>
                    {newMilestones.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => removeMilestoneRow(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                  <Input
                    placeholder="Title (e.g., Initial Design)"
                    value={m.title}
                    onChange={(e) => updateMilestoneRow(index, 'title', e.target.value)}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={m.description}
                    onChange={(e) => updateMilestoneRow(index, 'description', e.target.value)}
                    rows={2}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Amount (₦)"
                      value={m.amount || ''}
                      onChange={(e) => updateMilestoneRow(index, 'amount', Number(e.target.value))}
                    />
                    <Input
                      type="date"
                      value={m.due_date}
                      onChange={(e) => updateMilestoneRow(index, 'due_date', e.target.value)}
                    />
                  </div>
                </div>
              ))}

              <Button variant="outline" onClick={addMilestoneRow} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Another Milestone
              </Button>

              <div className="text-sm text-muted-foreground">
                Total allocated: ₦{newMilestones.reduce((sum, m) => sum + (m.amount || 0), 0).toLocaleString()}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateMilestones} disabled={loading}>
                Create Milestones
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Submit Work Dialog */}
        <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Submit Work</DialogTitle>
              <DialogDescription>
                Submit your deliverables for "{selectedMilestone?.title}"
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Deliverable Links (one per line)</label>
                <Textarea
                  placeholder="https://drive.google.com/..."
                  value={deliverables}
                  onChange={(e) => setDeliverables(e.target.value)}
                  rows={3}
                />
              </div>
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  placeholder="Any notes for the client..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowSubmitDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading || !deliverables.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Submit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Request Revision Dialog */}
        <Dialog open={showRevisionDialog} onOpenChange={setShowRevisionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Revision</DialogTitle>
              <DialogDescription>
                Provide feedback for "{selectedMilestone?.title}"
              </DialogDescription>
            </DialogHeader>

            <Textarea
              placeholder="What changes are needed?"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
            />

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowRevisionDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleRequestRevision} disabled={loading || !feedback.trim()}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Request Revision
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default MilestonesSection;
