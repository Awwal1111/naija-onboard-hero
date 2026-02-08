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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseClient = createClient(supabaseUrl, supabaseKey);

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

    const isApproved = status === 'approved';
    
    const title = isApproved 
      ? '🎉 Expert Application Approved!' 
      : 'Expert Application Update';
    
    const message = isApproved
      ? `Congratulations ${application.full_name}! Your expert application for ${application.skill_category} has been approved. You now have access to expert features including gig creation, classes, and priority visibility.`
      : `Hi ${application.full_name}, your expert application for ${application.skill_category} was not approved at this time.${feedback ? ` Feedback: ${feedback}` : ' You can reapply after addressing the requirements.'}`;

    // Create in-app notification
    const { error: notifError } = await supabaseClient
      .from('notifications')
      .insert({
        user_id: application.user_id,
        type: 'expert_application',
        title,
        message,
        metadata: {
          applicationId,
          status,
          feedback: feedback || null,
          skill_category: application.skill_category,
        }
      });

    if (notifError) {
      console.error('Error creating notification:', notifError);
    }

    // Send email notification via send-notification function
    try {
      const response = await fetch(`${supabaseUrl}/functions/v1/send-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify({
          userId: application.user_id,
          type: 'expert_application',
          title,
          message,
          sendEmail: true,
          emailTemplate: 'general',
          metadata: {
            actionUrl: isApproved 
              ? 'https://naijalancers.name.ng/expert-profile' 
              : 'https://naijalancers.name.ng/expert-application',
            actionText: isApproved ? 'Set Up Your Expert Profile' : 'Update & Reapply',
          }
        })
      });

      if (!response.ok) {
        console.error('Email notification failed:', await response.text());
      }
    } catch (emailErr) {
      console.error('Failed to send email:', emailErr);
    }

    // Send admin feedback as a chat message if feedback exists
    if (feedback) {
      // Find or create chat between admin system and user
      console.log(`Admin feedback for ${application.full_name}: ${feedback}`);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Notification sent successfully"
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
