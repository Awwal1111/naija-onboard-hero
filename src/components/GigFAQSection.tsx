import React, { useState } from 'react';
import { ChevronDown, Plus, Pencil, Trash2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { useGigFAQs, GigFAQ } from '@/hooks/useGigFAQs';
import { cn } from '@/lib/utils';

interface GigFAQSectionProps {
  gigId: string;
  isOwner: boolean;
}

export const GigFAQSection: React.FC<GigFAQSectionProps> = ({ gigId, isOwner }) => {
  const { faqs, loading, addFAQ, updateFAQ, deleteFAQ } = useGigFAQs(gigId);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [newAnswer, setNewAnswer] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQuestion, setEditQuestion] = useState('');
  const [editAnswer, setEditAnswer] = useState('');

  const handleAdd = async () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    
    setSubmitting(true);
    const result = await addFAQ(newQuestion, newAnswer);
    setSubmitting(false);
    
    if (!result.error) {
      setNewQuestion('');
      setNewAnswer('');
      setShowAddForm(false);
    }
  };

  const handleEdit = (faq: GigFAQ) => {
    setEditingId(faq.id);
    setEditQuestion(faq.question);
    setEditAnswer(faq.answer);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editQuestion.trim() || !editAnswer.trim()) return;
    
    setSubmitting(true);
    await updateFAQ(editingId, editQuestion, editAnswer);
    setSubmitting(false);
    setEditingId(null);
  };

  const handleDelete = async (faqId: string) => {
    if (confirm('Are you sure you want to delete this FAQ?')) {
      await deleteFAQ(faqId);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-12 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Frequently Asked Questions</h3>
        {isOwner && !showAddForm && (
          <Button variant="outline" size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add FAQ
          </Button>
        )}
      </div>

      {/* Add FAQ Form */}
      {showAddForm && (
        <Card className="p-4 border-primary/20 bg-primary/5">
          <h4 className="font-medium mb-3 text-sm">Add New FAQ</h4>
          <div className="space-y-3">
            <Input
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Question..."
              className="h-9"
            />
            <Textarea
              value={newAnswer}
              onChange={(e) => setNewAnswer(e.target.value)}
              placeholder="Answer..."
              rows={3}
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleAdd} 
                disabled={submitting || !newQuestion.trim() || !newAnswer.trim()}
                size="sm"
              >
                {submitting ? 'Adding...' : 'Add FAQ'}
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewQuestion('');
                  setNewAnswer('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* FAQ List */}
      {faqs.length === 0 ? (
        <Card className="p-6 text-center text-muted-foreground">
          <p className="text-sm">No FAQs yet</p>
          {isOwner && (
            <p className="text-xs mt-1">Add common questions and answers for buyers</p>
          )}
        </Card>
      ) : (
        <div className="space-y-2">
          {faqs.map(faq => (
            <FAQItem 
              key={faq.id} 
              faq={faq} 
              isOwner={isOwner}
              isEditing={editingId === faq.id}
              editQuestion={editQuestion}
              editAnswer={editAnswer}
              setEditQuestion={setEditQuestion}
              setEditAnswer={setEditAnswer}
              onEdit={() => handleEdit(faq)}
              onSave={handleSaveEdit}
              onCancel={() => setEditingId(null)}
              onDelete={() => handleDelete(faq.id)}
              submitting={submitting}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface FAQItemProps {
  faq: GigFAQ;
  isOwner: boolean;
  isEditing: boolean;
  editQuestion: string;
  editAnswer: string;
  setEditQuestion: (q: string) => void;
  setEditAnswer: (a: string) => void;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete: () => void;
  submitting: boolean;
}

const FAQItem: React.FC<FAQItemProps> = ({
  faq,
  isOwner,
  isEditing,
  editQuestion,
  editAnswer,
  setEditQuestion,
  setEditAnswer,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  submitting
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (isEditing) {
    return (
      <Card className="p-4 border-primary/20">
        <div className="space-y-3">
          <Input
            value={editQuestion}
            onChange={(e) => setEditQuestion(e.target.value)}
            placeholder="Question..."
            className="h-9"
          />
          <Textarea
            value={editAnswer}
            onChange={(e) => setEditAnswer(e.target.value)}
            placeholder="Answer..."
            rows={3}
          />
          <div className="flex gap-2">
            <Button onClick={onSave} disabled={submitting} size="sm">
              {submitting ? 'Saving...' : 'Save'}
            </Button>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger className="w-full p-4 text-left flex items-center justify-between hover:bg-muted/50 transition-colors">
          <span className="font-medium text-sm pr-4">{faq.question}</span>
          <div className="flex items-center gap-2">
            {isOwner && (
              <>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7"
                  onClick={(e) => { e.stopPropagation(); onEdit(); }}
                >
                  <Pencil className="h-3 w-3" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </>
            )}
            <ChevronDown className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              isOpen && "rotate-180"
            )} />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="px-4 pb-4 pt-0 text-sm text-muted-foreground border-t">
            <p className="pt-3">{faq.answer}</p>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

export default GigFAQSection;
