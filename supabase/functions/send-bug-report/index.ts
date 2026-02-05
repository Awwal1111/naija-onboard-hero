import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface BugReportRequest {
  ticketId: string;
  category: string;
  severity: string;
  title: string;
  description: string;
  stepsToReproduce: string;
  aiResponse: string;
  userInfo: {
    userId: string;
    userName: string;
    userEmail: string;
    userPhone: string;
  };
  metadata: {
    userAgent: string;
    url: string;
    timestamp: string;
  };
}

const categoryLabels: Record<string, string> = {
  ui: 'UI/Display Issue',
  functional: 'Feature Not Working',
  performance: 'Performance Issue',
  mobile: 'Mobile Issue',
  other: 'Other'
};

const severityColors: Record<string, string> = {
  low: '#3B82F6',
  medium: '#EAB308',
  high: '#F97316',
  critical: '#EF4444'
};

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: BugReportRequest = await req.json();
    const { ticketId, category, severity, title, description, stepsToReproduce, aiResponse, userInfo, metadata } = body;

    console.log(`Processing bug report: ${ticketId}`, { category, severity });

    const severityUpper = severity.toUpperCase();
    const severityColor = severityColors[severity] || '#6B7280';
    const isUrgent = severity === 'critical' || severity === 'high';

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bug Report - ${ticketId}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f4f4f5; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #059669, #10B981); padding: 24px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 24px;">🐛 Bug Report</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0; font-size: 14px;">Ticket ID: ${ticketId}</p>
    </div>

    <!-- Severity Banner -->
    <div style="background: ${severityColor}; color: white; padding: 12px 24px; text-align: center;">
      <strong>${severityUpper} PRIORITY</strong>
      ${isUrgent ? ' ⚠️ REQUIRES IMMEDIATE ATTENTION' : ''}
    </div>

    <!-- Content -->
    <div style="padding: 24px;">
      
      <!-- Issue Summary -->
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px;">Issue Summary</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Category:</td>
            <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${categoryLabels[category] || category}</td>
          </tr>
          <tr>
            <td style="padding: 6px 0; color: #6b7280; font-size: 14px;">Title:</td>
            <td style="padding: 6px 0; color: #111827; font-size: 14px; font-weight: 500;">${title || 'Not provided'}</td>
          </tr>
        </table>
      </div>

      <!-- Description -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px; color: #111827; font-size: 16px;">Description</h3>
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${description}</p>
      </div>

      <!-- Steps to Reproduce -->
      ${stepsToReproduce ? `
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px; color: #111827; font-size: 16px;">Steps to Reproduce</h3>
        <p style="margin: 0; color: #374151; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${stepsToReproduce}</p>
      </div>
      ` : ''}

      <!-- AI Response -->
      <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 8px; color: #059669; font-size: 14px;">✨ AI-Generated Response (Sent to User)</h3>
        <p style="margin: 0; color: #065f46; font-size: 13px; line-height: 1.5; white-space: pre-wrap;">${aiResponse}</p>
      </div>

      <!-- User Info -->
      <div style="background: #f9fafb; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
        <h3 style="margin: 0 0 12px; color: #111827; font-size: 16px;">👤 User Information</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Name:</td>
            <td style="padding: 4px 0; color: #111827; font-size: 13px;">${userInfo.userName}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Email:</td>
            <td style="padding: 4px 0; color: #111827; font-size: 13px;">${userInfo.userEmail}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280; font-size: 13px;">Phone:</td>
            <td style="padding: 4px 0; color: #111827; font-size: 13px;">${userInfo.userPhone}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #6b7280; font-size: 13px;">User ID:</td>
            <td style="padding: 4px 0; color: #111827; font-size: 13px; font-family: monospace;">${userInfo.userId}</td>
          </tr>
        </table>
      </div>

      <!-- Technical Info -->
      <div style="background: #fef3c7; border-radius: 8px; padding: 16px;">
        <h3 style="margin: 0 0 12px; color: #92400e; font-size: 14px;">🔧 Technical Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; color: #92400e; font-size: 12px;">URL:</td>
            <td style="padding: 4px 0; color: #78350f; font-size: 12px; word-break: break-all;">${metadata.url}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #92400e; font-size: 12px;">Time:</td>
            <td style="padding: 4px 0; color: #78350f; font-size: 12px;">${new Date(metadata.timestamp).toLocaleString()}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #92400e; font-size: 12px;">Browser:</td>
            <td style="padding: 4px 0; color: #78350f; font-size: 11px; word-break: break-all;">${metadata.userAgent}</td>
          </tr>
        </table>
      </div>

    </div>

    <!-- Footer -->
    <div style="background: #f4f4f5; padding: 16px 24px; text-align: center;">
      <p style="margin: 0; color: #6b7280; font-size: 12px;">
        NaijaLancers Bug Tracking System<br>
        <a href="https://naijalancers.name.ng" style="color: #059669;">naijalancers.name.ng</a>
      </p>
    </div>

  </div>
</body>
</html>
    `;

    // Send email to support
    const emailResponse = await resend.emails.send({
      from: "NaijaLancers Bug Reports <notifications@naijalancers.name.ng>",
      to: ["support@naijalancers.name.ng"],
      subject: `${isUrgent ? '🚨 ' : ''}[${severityUpper}] Bug Report ${ticketId}: ${title || categoryLabels[category]}`,
      html: emailHtml,
      reply_to: userInfo.userEmail !== 'No email' ? userInfo.userEmail : undefined
    });

    console.log('Bug report email sent:', emailResponse);

    return new Response(
      JSON.stringify({ success: true, emailId: emailResponse.data?.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Send bug report error:', error);
    
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});