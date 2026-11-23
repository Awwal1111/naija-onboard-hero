import { useState, type FormEvent } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function PartnerPortal(){
 const {slug=""}=useParams();const [pin,setPin]=useState("");const [loading,setLoading]=useState(false);const [data,setData]=useState<any>(null);const [error,setError]=useState("");
 const unlock=async(e:FormEvent)=>{e.preventDefault();setLoading(true);setError("");const {data,error}=await supabase.rpc("verify_partner_portal",{p_slug:slug,p_password:pin});setLoading(false);if(error||!data?.success){setError(data?.error||error?.message||"Unable to verify PIN");return;}setData(data);};
 if(!data)return <main className="min-h-screen grid place-items-center p-5"><Card className="w-full max-w-md"><CardHeader><CardTitle>Partner activities portal</CardTitle></CardHeader><CardContent><form onSubmit={unlock} className="space-y-4"><p className="text-muted-foreground">Enter your organization access PIN.</p><div><Label>Access PIN</Label><Input value={pin} onChange={e=>setPin(e.target.value)} autoComplete="one-time-code" required/></div>{error&&<p className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={loading}>{loading?"Verifying…":"Unlock dashboard"}</Button></form></CardContent></Card></main>;
 const stats=data.stats||{};
 return <main className="min-h-screen p-4 md:p-8 bg-background"><div className="max-w-5xl mx-auto space-y-6"><div className="flex justify-between items-center"><div><p className="text-sm text-primary">NaijaLancers Partner Portal</p><h1 className="text-2xl font-bold">{data.partner_name}</h1></div><Button variant="outline" onClick={()=>setData(null)}>Lock portal</Button></div>
 <div className="grid grid-cols-2 md:grid-cols-4 gap-3">{[["Students",stats.students_registered],["Gross work volume","₦"+Number(stats.gross_volume||0).toLocaleString()],["Commission earned","₦"+Number(stats.total_earned||0).toLocaleString()],["Paid out","₦"+Number(stats.total_paid_out||0).toLocaleString()],["Unpaid balance","₦"+Number(stats.unpaid_balance||0).toLocaleString()]].map(([label,value])=><Card key={String(label)}><CardContent className="p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="text-xl font-semibold">{value}</p></CardContent></Card>)}</div>
 <Card><CardHeader><CardTitle>Recent completed work</CardTitle></CardHeader><CardContent>{(data.recent_deals||[]).length===0?<p className="text-muted-foreground">No completed partner-attributed work yet.</p>:<div className="space-y-3">{data.recent_deals.map((d:any)=><div key={d.id} className="flex justify-between border-b pb-2 text-sm"><div><p className="font-medium">{d.deal_type==="hire_contract"?"Hire contract":"Gig order"}</p><p className="text-muted-foreground">{new Date(d.created_at).toLocaleDateString()}</p></div><strong>₦{Number(d.commission_amount).toLocaleString()}</strong></div>)}</div>}</CardContent></Card>
 </div></main>;
}
