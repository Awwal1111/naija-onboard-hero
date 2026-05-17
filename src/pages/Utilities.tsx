import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Smartphone, Gift, Zap, Loader2, AlertTriangle, CheckCircle2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useWallet } from "@/hooks/useWallet";
import { useNavigate } from "react-router-dom";

type Operator = { id: number; name: string; logoUrls?: string[]; minAmount?: number; maxAmount?: number; senderCurrencyCode?: string; destinationCurrencyCode?: string; fx?: { rate: number }; suggestedAmounts?: number[] };
type Product = { productId: number; productName: string; brand?: { brandName: string }; minSenderDenomination: number; maxSenderDenomination: number; senderCurrencyCode: string; logoUrls?: string[] };
type Biller = { id: number; name: string; type: string; serviceType?: string; minLocalTransactionAmount?: number; maxLocalTransactionAmount?: number; localTransactionCurrencyCode?: string };

const NC_PER_USD = 1600;
const FEE_PCT = 0.05;
const ncFor = (usd: number) => Math.ceil(usd * NC_PER_USD * (1 + FEE_PCT));

function FailureBanner({ msg }: { msg: string }) {
  return (
    <Alert variant="destructive" className="mt-3">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Top-up could not be completed</AlertTitle>
      <AlertDescription className="text-xs">
        {msg}
        <div className="mt-1 opacity-80">
          Top-ups, gift cards and bills are paid from a platform-funded wallet. If the wallet is being refilled, your purchase may briefly fail — your NC is always refunded automatically. Please retry in a few minutes.
        </div>
      </AlertDescription>
    </Alert>
  );
}

const Utilities = () => {
  const { user } = useAuth();
  const { balance } = useWallet();
  const navigate = useNavigate();
  const withdrawable = Number(balance?.withdrawable ?? 0);

  if (!user) {
    return (
      <div className="container max-w-md py-10 text-center">
        <p>Please sign in to use bill payments.</p>
        <Button className="mt-3" onClick={() => navigate("/login")}>Sign in</Button>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl py-4 pb-24">
      <Helmet>
        <title>Bills & Top-ups — NaijaLancers</title>
        <meta name="description" content="Buy airtime, data, gift cards and pay utility bills worldwide using your NC balance." />
      </Helmet>

      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
        <h1 className="text-2xl font-bold">Bills & Top-ups</h1>
      </div>

      <Card className="mb-4">
        <CardContent className="py-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Available to spend</span>
          <span className="font-bold">NC {withdrawable.toLocaleString()}</span>
        </CardContent>
      </Card>

      <Tabs defaultValue="airtime">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="airtime"><Smartphone className="h-4 w-4 mr-1" /> Airtime</TabsTrigger>
          <TabsTrigger value="giftcard"><Gift className="h-4 w-4 mr-1" /> Gift cards</TabsTrigger>
          <TabsTrigger value="utility"><Zap className="h-4 w-4 mr-1" /> Utilities</TabsTrigger>
        </TabsList>

        <TabsContent value="airtime"><AirtimeForm /></TabsContent>
        <TabsContent value="giftcard"><GiftCardForm /></TabsContent>
        <TabsContent value="utility"><UtilityForm /></TabsContent>
      </Tabs>
    </div>
  );
};

// ============ Airtime ============
function AirtimeForm() {
  const [country, setCountry] = useState("NG");
  const [phone, setPhone] = useState("");
  const [operators, setOperators] = useState<Operator[]>([]);
  const [opId, setOpId] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase.functions.invoke("reloadly-service", { body: { action: "airtime_operators", country } })
      .then(({ data }) => {
        const list = Array.isArray(data?.operators) ? data.operators : [];
        setOperators(list.filter((o: any) => o?.id && o?.name));
      })
      .finally(() => setLoading(false));
  }, [country]);

  const op = operators.find(o => String(o.id) === opId);
  const usd = Number(amount || 0);
  const nc = usd > 0 ? ncFor(usd) : 0;

  const submit = async () => {
    setError(null); setSuccess(null);
    if (!opId || !phone || !usd) return toast.error("Fill in all fields");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reloadly-service", {
        body: { action: "airtime_topup", operatorId: Number(opId), amount: usd, phone, country },
      });
      if (error || !data?.success) {
        setError(data?.error || error?.message || "Top-up failed");
      } else {
        setSuccess(`Sent ${op?.name} top-up of $${usd} to ${phone}`);
        setAmount(""); setPhone("");
      }
    } catch (e: any) {
      setError(e?.message || "Top-up failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle className="text-base">Airtime & Data</CardTitle>
        <CardDescription>Top up any mobile number in 150+ countries.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["NG","KE","GH","ZA","UG","TZ","RW","CM","US","GB","IN","PH"].map(c => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Phone number</Label>
          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="2348012345678" />
        </div>
        <div className="space-y-2">
          <Label>Operator</Label>
          <Select value={opId} onValueChange={setOpId} disabled={loading || operators.length === 0}>
            <SelectTrigger><SelectValue placeholder={loading ? "Loading…" : "Choose operator"} /></SelectTrigger>
            <SelectContent className="max-h-72">
              {operators.map(o => <SelectItem key={o.id} value={String(o.id)}>{o.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Amount (USD)</Label>
          <Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)}
                 placeholder={op ? `$${op.minAmount ?? 1} – $${op.maxAmount ?? 50}` : "1.00"} />
          {op?.suggestedAmounts?.length ? (
            <div className="flex gap-2 flex-wrap">
              {op.suggestedAmounts.slice(0,6).map(a => (
                <Button key={a} type="button" size="sm" variant="outline" onClick={() => setAmount(String(a))}>${a}</Button>
              ))}
            </div>
          ) : null}
          {usd > 0 && <p className="text-xs text-muted-foreground">You will be charged <strong>NC {nc.toLocaleString()}</strong> (includes 5% service fee)</p>}
        </div>
        <Button className="w-full" onClick={submit} disabled={submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending…</> : "Send airtime"}
        </Button>
        {success && <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>{success}</AlertDescription></Alert>}
        {error && <FailureBanner msg={error} />}
      </CardContent>
    </Card>
  );
}

// ============ Gift cards ============
function GiftCardForm() {
  const [country, setCountry] = useState("US");
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase.functions.invoke("reloadly-service", { body: { action: "giftcard_products", country } })
      .then(({ data }) => {
        const list = Array.isArray(data?.products?.content) ? data.products.content : Array.isArray(data?.products) ? data.products : [];
        setProducts(list.filter((p: any) => p?.productId && p?.productName));
      })
      .finally(() => setLoading(false));
  }, [country]);

  const product = products.find(p => String(p.productId) === productId);
  const usd = Number(unitPrice || 0);
  const nc = usd > 0 ? ncFor(usd) : 0;

  const submit = async () => {
    setError(null); setSuccess(null);
    if (!productId || !usd) return toast.error("Choose product & amount");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reloadly-service", {
        body: { action: "giftcard_order", productId: Number(productId), unitPrice: usd, quantity: 1,
                country, recipientEmail: recipientEmail || undefined },
      });
      if (error || !data?.success) {
        setError(data?.error || error?.message || "Order failed");
      } else {
        setSuccess(`Gift card ordered — ${product?.productName}. Check your email${recipientEmail ? ` (${recipientEmail})` : ""} for the code.`);
        setUnitPrice(""); setRecipientEmail("");
      }
    } catch (e: any) {
      setError(e?.message || "Order failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle className="text-base">Gift cards</CardTitle>
        <CardDescription>Amazon, Steam, Netflix, Apple, Google Play and more.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["US","GB","CA","NG","KE","GH","ZA","AU","DE","FR","IN"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Product</Label>
          <Select value={productId} onValueChange={(v) => { setProductId(v); const p = products.find(pp => String(pp.productId) === v); if (p?.minSenderDenomination) setUnitPrice(String(p.minSenderDenomination)); }}
                  disabled={loading || products.length === 0}>
            <SelectTrigger><SelectValue placeholder={loading ? "Loading…" : "Choose gift card"} /></SelectTrigger>
            <SelectContent className="max-h-72">
              {products.slice(0, 200).map(p => (
                <SelectItem key={p.productId} value={String(p.productId)}>
                  {p.brand?.brandName ? `${p.brand.brandName} — ${p.productName}` : p.productName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Amount ({product?.senderCurrencyCode || "USD"})</Label>
          <Input type="number" inputMode="decimal" value={unitPrice} onChange={e => setUnitPrice(e.target.value)}
                 placeholder={product ? `${product.minSenderDenomination} – ${product.maxSenderDenomination}` : "5"} />
          {usd > 0 && <p className="text-xs text-muted-foreground">You will be charged <strong>NC {nc.toLocaleString()}</strong> (includes 5% service fee)</p>}
        </div>
        <div className="space-y-2">
          <Label>Recipient email (optional)</Label>
          <Input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} placeholder="me@example.com" />
        </div>
        <Button className="w-full" onClick={submit} disabled={submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Ordering…</> : "Buy gift card"}
        </Button>
        {success && <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>{success}</AlertDescription></Alert>}
        {error && <FailureBanner msg={error} />}
      </CardContent>
    </Card>
  );
}

// ============ Utility bills ============
function UtilityForm() {
  const [country, setCountry] = useState("NG");
  const [billers, setBillers] = useState<Biller[]>([]);
  const [billerId, setBillerId] = useState("");
  const [accountNo, setAccountNo] = useState("");
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    supabase.functions.invoke("reloadly-service", { body: { action: "utility_billers", country } })
      .then(({ data }) => {
        const list = Array.isArray(data?.billers?.content) ? data.billers.content : Array.isArray(data?.billers) ? data.billers : [];
        setBillers(list.filter((b: any) => b?.id && b?.name));
      })
      .finally(() => setLoading(false));
  }, [country]);

  const biller = billers.find(b => String(b.id) === billerId);
  const usd = Number(amount || 0);
  const nc = usd > 0 ? ncFor(usd) : 0;

  const submit = async () => {
    setError(null); setSuccess(null);
    if (!billerId || !accountNo || !usd) return toast.error("Fill in all fields");
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("reloadly-service", {
        body: { action: "utility_pay", billerId: Number(billerId), amount: usd,
                subscriberAccountNumber: accountNo, country },
      });
      if (error || !data?.success) {
        setError(data?.error || error?.message || "Bill payment failed");
      } else {
        setSuccess(`${biller?.name} bill paid for ${accountNo}`);
        setAmount(""); setAccountNo("");
      }
    } catch (e: any) {
      setError(e?.message || "Bill payment failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="mt-3">
      <CardHeader>
        <CardTitle className="text-base">Pay utility bills</CardTitle>
        <CardDescription>Electricity, water, internet, cable TV and more.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Label>Country</Label>
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["NG","KE","GH","ZA","UG","TZ","RW","CM"].map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Biller</Label>
          <Select value={billerId} onValueChange={setBillerId} disabled={loading || billers.length === 0}>
            <SelectTrigger><SelectValue placeholder={loading ? "Loading…" : "Choose biller"} /></SelectTrigger>
            <SelectContent className="max-h-72">
              {billers.map(b => <SelectItem key={b.id} value={String(b.id)}>{b.name} {b.type ? `· ${b.type}` : ""}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Account / meter number</Label>
          <Input value={accountNo} onChange={e => setAccountNo(e.target.value)} placeholder="e.g. meter number" />
        </div>
        <div className="space-y-2">
          <Label>Amount (USD)</Label>
          <Input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="5.00" />
          {usd > 0 && <p className="text-xs text-muted-foreground">You will be charged <strong>NC {nc.toLocaleString()}</strong> (includes 5% service fee)</p>}
        </div>
        <Button className="w-full" onClick={submit} disabled={submitting}>
          {submitting ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Paying…</> : "Pay bill"}
        </Button>
        {success && <Alert><CheckCircle2 className="h-4 w-4" /><AlertDescription>{success}</AlertDescription></Alert>}
        {error && <FailureBanner msg={error} />}
      </CardContent>
    </Card>
  );
}

export default Utilities;
