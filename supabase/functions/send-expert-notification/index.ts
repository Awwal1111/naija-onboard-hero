import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@4.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationRequest {
  applicationId: string;
  status: 'approved' | 'rejected';
  feedback?: string;
}

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Prepare email content
    const isApproved = status === 'approved';
    const subject = isApproved 
      ? "🎉 Your Expert Application has been Approved!" 
      : "Expert Application Update";

    const emailContent = isApproved 
      ? `
        <h1>Congratulations ${application.full_name}!</h1>
        <p>Your expert application for <strong>${application.skill_category}</strong> has been approved.</p>
        <p>You are now a verified expert on NaijaLancers and can start offering your services to clients.</p>
        ${feedback ? `<p><strong>Admin Note:</strong> ${feedback}</p>` : ''}
        <p>Welcome to our expert community!</p>
        <p>Best regards,<br>The NaijaLancers Team</p>
      `
      : `
        <h1>Application Update</h1>
        <p>Dear ${application.full_name},</p>
        <p>Thank you for your interest in becoming an expert on NaijaLancers.</p>
        <p>After careful review, we regret to inform you that your application for <strong>${application.skill_category}</strong> has not been approved at this time.</p>
        ${feedback ? `<p><strong>Feedback:</strong> ${feedback}</p>` : ''}
        <p>You are welcome to reapply in the future once you have addressed any areas for improvement.</p>
        <p>Best regards,<br>The NaijaLancers Team</p>
      `;

    // Send email notification
    const emailResponse = await resend.emails.send({
      from: "NaijaLancers <noreply@naija.com>",
      to: [application.email],
      subject: subject,
      html: emailContent,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent successfully",
        emailId: emailResponse.data?.id
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