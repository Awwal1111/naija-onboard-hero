import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ExternalLink, Award } from 'lucide-react';
import { useCertificates } from '@/hooks/useCertificates';

interface Props { userId?: string; isOwnProfile?: boolean }

export function CertificatesEditor({ userId, isOwnProfile }: Props) {
  const { items, loading, add, remove } = useCertificates(userId);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [issuer, setIssuer] = useState('');
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!title.trim()) return;
    setBusy(true);
    const res = await add({
      title: title.trim(),
      issuer: issuer.trim() || null,
      credential_url: url.trim() || null,
      credential_id: null,
      issue_date: null,
      expiry_date: null,
    });
    setBusy(false);
    if (res?.success) { setTitle(''); setIssuer(''); setUrl(''); setOpen(false); }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base flex items-center gap-2"><Award className="h-4 w-4" />Certificates</CardTitle>
        {isOwnProfile && (
          <Button size="sm" variant="outline" onClick={() => setOpen(!open)}>
            <Plus className="h-4 w-4 mr-1" /> Add
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {isOwnProfile && open && (
          <div className="space-y-2 p-3 border rounded-md bg-muted/30">
            <div>
              <Label htmlFor="cert-title">Title</Label>
              <Input id="cert-title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. AWS Certified Solutions Architect" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label htmlFor="cert-issuer">Issuer</Label>
                <Input id="cert-issuer" value={issuer} onChange={(e) => setIssuer(e.target.value)} placeholder="Amazon, Coursera…" />
              </div>
              <div>
                <Label htmlFor="cert-url">Link</Label>
                <Input id="cert-url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button size="sm" onClick={submit} disabled={busy || !title.trim()}>Save</Button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No certificates added yet.</p>
        ) : (
          <ul className="space-y-2">
            {items.map(c => (
              <li key={c.id} className="flex items-center justify-between p-2 rounded-md border bg-card">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">{c.title}</div>
                  {(c.issuer || c.credential_url) && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      {c.issuer && <Badge variant="secondary" className="text-[10px]">{c.issuer}</Badge>}
                      {c.credential_url && (
                        <a href={c.credential_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline inline-flex items-center gap-0.5">
                          View <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
                {isOwnProfile && (
                  <Button size="icon" variant="ghost" onClick={() => remove(c.id)} aria-label="Remove">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
