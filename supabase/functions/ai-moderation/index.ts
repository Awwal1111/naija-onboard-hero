import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface ModerationRequest {
  groupId: string
  messageId: string
  userId: string
  content: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { groupId, messageId, userId, content }: ModerationRequest = await req.json()

    console.log('AI Moderation check for message:', messageId)

    // AI moderation checks
    const violations = await checkForViolations(content)
    
    if (violations.length > 0) {
      // Get user violation history
      const { data: userViolations } = await supabaseClient
        .from('user_violations')
        .select('violation_count')
        .eq('user_id', userId)
        .eq('group_id', groupId)
        .single()

      const currentCount = userViolations?.violation_count || 0
      let actionTaken = 'warning'

      // Determine action based on violation count and severity
      const highSeverityViolations = violations.filter(v => v.severity === 'high')
      
      if (highSeverityViolations.length > 0 || currentCount >= 2) {
        actionTaken = currentCount >= 2 ? 'user_removed' : 'message_deleted'
      }

      // Log the violation
      await supabaseClient
        .from('ai_moderation_logs')
        .insert({
          group_id: groupId,
          message_id: messageId,
          user_id: userId,
          violation_type: violations[0].type,
          severity: violations[0].severity,
          action_taken: actionTaken,
          content_flagged: content.substring(0, 200)
        })

      // Update user violation count
      await supabaseClient
        .from('user_violations')
        .upsert({
          user_id: userId,
          group_id: groupId,
          violation_count: currentCount + 1,
          last_violation_at: new Date().toISOString()
        })

      // Take action based on severity
      if (actionTaken === 'message_deleted') {
        await supabaseClient
          .from('group_messages')
          .update({ 
            deleted_at: new Date().toISOString(),
            content: '[Message removed by AI moderation]'
          })
          .eq('id', messageId)
      } else if (actionTaken === 'user_removed') {
        await supabaseClient
          .from('group_members')
          .update({ is_active: false })
          .eq('group_id', groupId)
          .eq('user_id', userId)
      }

      // Send warning notification to user (if not removed)
      if (actionTaken !== 'user_removed') {
        await supabaseClient
          .from('notifications')
          .insert({
            user_id: userId,
            type: 'moderation_warning',
            title: 'Content Warning',
            message: `Your message was flagged for: ${violations[0].type}. Please follow community guidelines.`,
            metadata: {
              violation_type: violations[0].type,
              action_taken: actionTaken,
              group_id: groupId
            }
          })
      }

      return new Response(
        JSON.stringify({ 
          moderated: true, 
          action: actionTaken, 
          violations: violations.map(v => v.type) 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ moderated: false }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error in AI moderation:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function checkForViolations(content: string) {
  const violations = []
  const lowerContent = content.toLowerCase()

  // Check for sensitive information
  const sensitivePatterns = [
    /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/, // Credit card numbers
    /\b\d{11}\b/, // BVN (Bank Verification Number)
    /\b\d{10}\b/, // NIN (National Identity Number) 
    /password\s*[:=]\s*\S+/i, // Password patterns
    /pin\s*[:=]\s*\d+/i, // PIN patterns
  ]

  for (const pattern of sensitivePatterns) {
    if (pattern.test(content)) {
      violations.push({
        type: 'sensitive_info',
        severity: 'high',
        description: 'Contains sensitive information'
      })
      break
    }
  }

  // Check for spam patterns
  const spamPatterns = [
    /(.{1,20})\1{3,}/, // Repeated text
    /[A-Z]{10,}/, // Excessive caps
    /(http[s]?:\/\/[^\s]+){3,}/, // Multiple links
    /\b(buy now|click here|free money|easy cash)\b/i
  ]

  for (const pattern of spamPatterns) {
    if (pattern.test(content)) {
      violations.push({
        type: 'spam',
        severity: 'medium',
        description: 'Potential spam content'
      })
      break
    }
  }

  // Check for abuse/inappropriate content
  const abusePatterns = [
    /\b(idiot|stupid|fool|bastard|damn)\b/i, // Mild profanity
    /\b(f[*u]ck|sh[*i]t|b[*i]tch)\b/i, // Strong profanity (censored)
  ]

  for (const pattern of abusePatterns) {
    if (pattern.test(content)) {
      violations.push({
        type: 'inappropriate',
        severity: 'low',
        description: 'Contains inappropriate language'
      })
      break
    }
  }

  return violations
}