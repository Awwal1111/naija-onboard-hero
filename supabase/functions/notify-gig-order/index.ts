import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { order_id, event } = await req.json();
    if (!order_id || !event) throw new Error("order_id and event are required");

    const supa = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error } = await supa
      .from("gig_orders")
      .select("id, buyer_id, seller_id, title, amount, platform_fee, status")
      .eq("id", order_id)
      .single();
    if (error || !order) throw new Error("Order not found");

    type Target = { userId: string; title: string; message: string; priority: "high" | "normal" };
    const targets: Target[] = [];
    const amt = `NC ${Number(order.amount).toLocaleString()}`;

    switch (event) {
      case "placed":
        targets.push({
          userId: order.seller_id,
          title: "🎉 New gig order",
          message: `You have a new order for "${order.title}" — ${amt} held in escrow.`,
          priority: "high",
        });
        targets.push({
          userId: order.buyer_id,
          title: "Order placed",
          message: `${amt} held in escrow for "${order.title}". You'll be notified on delivery.`,
          priority: "normal",
        });
        break;
      case "accepted":
      case "in_progress":
        targets.push({
          userId: order.buyer_id,
          title: "Seller started your order",
          message: `Work on "${order.title}" is now ${event.replace("_", " ")}.`,
          priority: "normal",
        });
        break;
      case "delivered":
        targets.push({
          userId: order.buyer_id,
          title: "📦 Order delivered",
          message: `Your order "${order.title}" was delivered. Review and accept to release ${amt}.`,
          priority: "high",
        });
        break;
      case "revision_requested":
        targets.push({
          userId: order.seller_id,
          title: "Revision requested",
          message: `Buyer requested a revision on "${order.title}".`,
          priority: "high",
        });
        break;
      case "completed": {
        const seller = Number(order.amount) - Number(order.platform_fee || 0);
        targets.push({
          userId: order.seller_id,
          title: "💰 Payment released",
          message: `NC ${seller.toLocaleString()} credited to your wallet for "${order.title}".`,
          priority: "high",
        });
        targets.push({
          userId: order.buyer_id,
          title: "Order completed",
          message: `Thanks! "${order.title}" marked complete.`,
          priority: "normal",
        });
        break;
      }
      case "cancelled":
        targets.push({
          userId: order.buyer_id,
          title: "Order cancelled — refund issued",
          message: `${amt} refunded to your wallet for "${order.title}".`,
          priority: "high",
        });
        targets.push({
          userId: order.seller_id,
          title: "Order cancelled",
          message: `Order "${order.title}" was cancelled.`,
          priority: "normal",
        });
        break;
      default:
        return new Response(JSON.stringify({ ok: true, skipped: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    await Promise.all(
      targets.map((t) =>
        supa.functions.invoke("smart-notification", {
          body: {
            userId: t.userId,
            type: "gig_order",
            title: t.title,
            message: t.message,
            priority: t.priority,
            data: { order_id, event, amount: order.amount },
            actionUrl: `/orders/${order_id}`,
          },
        }).catch((e) => console.error("[notify-gig-order] smart-notification failed", e))
      )
    );

    return new Response(JSON.stringify({ ok: true, sent: targets.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("[notify-gig-order] error", e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
