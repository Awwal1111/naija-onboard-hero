import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function PartnerJoin() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const [partner,setPartner]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  useEffect(()=>{let active=true;(async()=>{
    const {data,error}=await supabase.rpc("get_public_institutional_partner",{p_slug:slug});
    if(!active)return;
    if(error || !data?.success){setPartner(null);setLoading(false);return;}
    localStorage.setItem("nl_partner_slug",data.slug);
    setPartner(data);setLoading(false);
  })();return()=>{active=false}},[slug]);
  if(loading)return <div className="min-h-screen grid place-items-center">Loading partner…</div>;
  if(!partner)return <div className="min-h-screen grid place-items-center p-6"><Card><CardContent className="p-6 space-y-3"><h1 className="text-xl font-semibold">Partner link unavailable</h1><p>This invitation link is invalid or inactive.</p><Button onClick={()=>navigate("/signup")}>Continue to NaijaLancers</Button></CardContent></Card></div>;
  return <main className="min-h-screen grid place-items-center p-6 bg-background"><Card className="max-w-xl w-full"><CardContent className="p-8 text-center space-y-5">
    <p className="text-sm font-medium text-primary">NaijaLancers Institutional Partner</p><h1 className="text-3xl font-bold">Welcome {partner.name} students and freelancers!</h1>
    <p className="text-muted-foreground">Create your NaijaLancers profile to discover opportunities, work with clients and receive payments securely.</p>
    <Button className="w-full" onClick={()=>navigate("/signup?partner="+encodeURIComponent(partner.slug))}>Join NaijaLancers</Button>
  </CardContent></Card></main>;
}
