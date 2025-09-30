import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  applicationId: string;
  status: 'approved' | 'rejected';
  feedback?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { applicationId, status, feedback }: NotificationRequest = await req.json();

    // Get application details
    const { data: application, error: fetchError } = await supabaseClient
      .from('expert_applications')
      .select('*')
      .eq('id', applicationId)
      .single();

    if (fetchError || !application) {
      throw new Error('Application not found');
    }

    // Log notification - email sending removed for now
    const isApproved = status === 'approved';
    
    console.log(`Notification for ${application.full_name}: ${isApproved ? 'Approved' : 'Rejected'}`);
    if (feedback) {
      console.log(`Feedback: ${feedback}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification logged successfully"
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-expert-notification function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send notification" 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
});