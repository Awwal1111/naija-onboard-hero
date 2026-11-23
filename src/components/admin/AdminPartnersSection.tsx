import { useEffect, useState, type FormEvent } from "react";
import { Copy, Plus, RefreshCw, Power, Wallet } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

type Partner = {
  id: string; name: string; slug: string; partner_cut_pct: number;
  platform_fee_pct: number; website_url?: string; payout_info?: Record<string, unknown>;
  total_earned: number; total_paid_out: number; is_active: boolean; student_count: number;
};

export function AdminPartnersSection() {
  const { toast } = useToast();
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pin, setPin] = useState("");
  const [form, setForm] = useState({name:"",slug:"",partnerCut:"10",platformFee:"5",website:"",payout:"{}"});
  const [payout, setPayout] = useState({partnerId:"",amount:"",notes:""});

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("admin_list_institutional_partners");
    if (error) toast({ title:"Could not load partners", description:error.message, variant:"destructive" });
    else setPartners((data || []) as Partner[]);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const create = async (e: FormEvent) => {
    e.preventDefault(); setSaving(true); setPin("");
    let payoutInfo: Record<string, unknown>;
    try { payoutInfo = JSON.parse(form.payout || "{}"); }
    catch { toast({title:"Invalid payout JSON",description:"Enter valid JSON for payout details.",variant:"destructive"}); setSaving(false); return; }
    const { data, error } = await supabase.rpc("admin_create_institutional_partner", {
      p_name:form.name, p_slug:form.slug, p_partner_cut_pct:Number(form.partnerCut),
      p_platform_fee_pct:Number(form.platformFee), p_website_url:form.website || null, p_payout_info:payoutInfo
    });
    if (error) toast({title:"Partner creation failed",description:error.message,variant:"destructive"});
    else { setPin(data?.pin || ""); setForm({name:"",slug:"",partnerCut:"10",platformFee:"5",website:"",payout:"{}"}); await load(); toast({title:"Partner created",description:"Copy and securely share the PIN now. It cannot be retrieved later."}); }
    setSaving(false);
  };

  const toggle = async (p: Partner) => {
    const {error}=await supabase.rpc("admin_set_institutional_partner_active",{p_partner_id:p.id,p_is_active:!p.is_active});
    if(error) toast({title:"Update failed",description:error.message,variant:"destructive"}); else await load();
  };
  const recordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const {error}=await supabase.rpc("admin_record_institutional_partner_payout",{
      p_partner_id:payout.partnerId,p_amount:Number(payout.amount),p_notes:payout.notes || null
    });
    if(error) toast({title:"Payout record failed",description:error.message,variant:"destructive"});
    else {toast({title:"Payout recorded"});setPayout({partnerId:"",amount:"",notes:""});await load();}
  };
  const copy = async (value:string) => { await navigator.clipboard.writeText(value); toast({title:"Copied"}); };

  return <div className="space-y-6">
    <Card><CardHeader><CardTitle>Create institutional partner</CardTitle></CardHeader><CardContent>
      <form onSubmit={create} className="grid gap-3 md:grid-cols-2">
        <div><Label>Organization name</Label><Input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></div>
        <div><Label>Slug</Label><Input required pattern="[a-z0-9][a-z0-9-]{1,48}" placeholder="nelavista" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value.toLowerCase()})}/></div>
        <div><Label>Partner commission (%)</Label><Input type="number" min="0" max="100" step="0.01" required value={form.partnerCut} onChange={e=>setForm({...form,partnerCut:e.target.value})}/></div>
        <div><Label>NaijaLancers fee (%)</Label><Input type="number" min="0" max="100" step="0.01" required value={form.platformFee} onChange={e=>setForm({...form,platformFee:e.target.value})}/></div>
        <div className="md:col-span-2"><Label>Website</Label><Input value={form.website} onChange={e=>setForm({...form,website:e.target.value})}/></div>
        <div className="md:col-span-2"><Label>Payout details (JSON)</Label><Textarea value={form.payout} onChange={e=>setForm({...form,payout:e.target.value})}/></div>
        <Button type="submit" disabled={saving}><Plus className="h-4 w-4 mr-2"/>{saving?"Creating…":"Create partner"}</Button>
      </form>
      {pin && <div className="mt-4 rounded border p-3"><p className="font-semibold">New partner PIN — copy now</p><p className="text-xl font-mono">{pin}</p><Button type="button" variant="outline" onClick={()=>copy(pin)}><Copy className="h-4 w-4 mr-2"/>Copy PIN</Button></div>}
    </CardContent></Card>

    <Card><CardHeader className="flex flex-row items-center justify-between"><CardTitle>Partners</CardTitle><Button variant="outline" size="sm" onClick={load}><RefreshCw className="h-4 w-4 mr-2"/>Refresh</Button></CardHeader><CardContent>
      {loading ? <p>Loading partners…</p> : partners.length===0 ? <p className="text-muted-foreground">No partners created yet.</p> :
      <div className="space-y-3">{partners.map(p=><div key={p.id} className="rounded-lg border p-4 space-y-3">
        <div className="flex flex-wrap justify-between gap-2"><div><h3 className="font-semibold">{p.name}</h3><p className="text-sm text-muted-foreground">/{p.slug} · Partner {p.partner_cut_pct}% · Platform {p.platform_fee_pct}%</p></div>
          <div className="flex items-center gap-2"><span className="text-sm">{p.is_active?"Active":"Paused"}</span><Switch checked={p.is_active} onCheckedChange={()=>toggle(p)}/></div></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div>Students<strong className="block">{p.student_count}</strong></div>
          <div>Earned<strong className="block">₦{Number(p.total_earned).toLocaleString()}</strong></div>
          <div>Paid<strong className="block">₦{Number(p.total_paid_out).toLocaleString()}</strong></div>
          <div>Unpaid<strong className="block">₦{(Number(p.total_earned)-Number(p.total_paid_out)).toLocaleString()}</strong></div>
        </div>
        <div className="flex flex-wrap gap-2 text-sm">
          <Button variant="outline" size="sm" onClick={()=>copy(location.origin+"/join/"+p.slug)}><Copy className="h-3 w-3 mr-1"/>Signup link</Button>
          <Button variant="outline" size="sm" onClick={()=>copy(location.origin+"/partner/"+p.slug)}><Copy className="h-3 w-3 mr-1"/>Portal link</Button>
        </div>
        <form onSubmit={recordPayout} className="flex flex-wrap items-end gap-2 border-t pt-3">
          <input type="hidden" value={p.id}/>
          <div><Label>Record payout (₦)</Label><Input type="number" min="0.01" step="0.01" required value={payout.partnerId===p.id?payout.amount:""} onChange={e=>setPayout({...payout,partnerId:p.id,amount:e.target.value})}/></div>
          <div className="min-w-36 flex-1"><Label>Note</Label><Input value={payout.partnerId===p.id?payout.notes:""} onChange={e=>setPayout({...payout,partnerId:p.id,notes:e.target.value})}/></div>
          <Button type="submit" variant="secondary" disabled={payout.partnerId!==p.id || !payout.amount}><Wallet className="h-4 w-4 mr-1"/>Record payout</Button>
        </form>
      </div>)}</div>}
    </CardContent></Card>
  </div>;
}
