import React from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

export type GigTier = 'basic' | 'standard' | 'premium';
export interface GigPackage {
  price: number;
  delivery_days: number;
  revisions: number;
  features: string[];
  title?: string;
}
export type GigPackages = Partial<Record<GigTier, GigPackage>>;

const TIERS: { id: GigTier; label: string; hint: string }[] = [
  { id: 'basic', label: 'Basic', hint: 'Entry offer — quick deliverable' },
  { id: 'standard', label: 'Standard', hint: 'Most popular — more value' },
  { id: 'premium', label: 'Premium', hint: 'Full package — maximum value' },
];

interface Props {
  value: GigPackages;
  onChange: (next: GigPackages) => void;
  basePrice?: number;
}

export function GigPackageEditor({ value, onChange, basePrice }: Props) {
  const setTier = (tier: GigTier, patch: Partial<GigPackage>) => {
    const current = value[tier] || { price: 0, delivery_days: 7, revisions: 1, features: [] };
    onChange({ ...value, [tier]: { ...current, ...patch } });
  };

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Packages (Basic / Standard / Premium)</h3>
        <Badge variant="secondary" className="text-[10px]">Optional</Badge>
      </div>
      <p className="text-xs text-muted-foreground">
        Offer up to three tiers. Buyers pick a tier at checkout. Leave a tier empty to skip it.
        {basePrice ? ` (Base price ₦${basePrice.toLocaleString()} is used when no tier is set.)` : ''}
      </p>

      <Tabs defaultValue="basic">
        <TabsList className="grid w-full grid-cols-3">
          {TIERS.map(t => (
            <TabsTrigger key={t.id} value={t.id} className="text-xs">{t.label}</TabsTrigger>
          ))}
        </TabsList>

        {TIERS.map(t => {
          const pkg = value[t.id];
          const enabled = !!pkg;
          return (
            <TabsContent key={t.id} value={t.id} className="space-y-3 mt-3">
              <p className="text-xs text-muted-foreground">{t.hint}</p>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setTier(t.id, { price: basePrice || 0, delivery_days: 7, revisions: 1, features: [] });
                    } else {
                      const next = { ...value }; delete next[t.id]; onChange(next);
                    }
                  }}
                />
                Enable {t.label} tier
              </label>

              {enabled && (
                <div className="space-y-2">
                  <Input
                    placeholder="Package title (e.g. Starter logo)"
                    value={pkg?.title || ''}
                    onChange={(e) => setTier(t.id, { title: e.target.value })}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="text-[11px] text-muted-foreground">Price (₦)</label>
                      <Input type="number" min={0} value={pkg?.price ?? 0}
                        onChange={(e) => setTier(t.id, { price: Number(e.target.value) || 0 })} />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Delivery (days)</label>
                      <Input type="number" min={1} value={pkg?.delivery_days ?? 7}
                        onChange={(e) => setTier(t.id, { delivery_days: Number(e.target.value) || 1 })} />
                    </div>
                    <div>
                      <label className="text-[11px] text-muted-foreground">Revisions</label>
                      <Input type="number" min={0} value={pkg?.revisions ?? 1}
                        onChange={(e) => setTier(t.id, { revisions: Number(e.target.value) || 0 })} />
                    </div>
                  </div>
                  <div>
                    <label className="text-[11px] text-muted-foreground">Features (one per line)</label>
                    <Textarea
                      rows={3}
                      placeholder={'High-res files\nSource files\nCommercial license'}
                      value={(pkg?.features || []).join('\n')}
                      onChange={(e) => setTier(t.id, { features: e.target.value.split('\n').map(s => s.trim()).filter(Boolean) })}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </Card>
  );
}
