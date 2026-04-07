import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const { referral_code } = await req.json()
    if (!referral_code || typeof referral_code !== 'string' || referral_code.length > 20) {
      return new Response(JSON.stringify({ error: 'Invalid referral code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 1. Find referrer
    const { data: referrer, error: refErr } = await supabaseAdmin
      .from('profiles')
      .select('user_id, full_name')
      .eq('referral_code', referral_code.trim().toUpperCase())
      .single()

    if (refErr || !referrer) {
      return new Response(JSON.stringify({ error: 'Invalid referral code' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (referrer.user_id === user.id) {
      return new Response(JSON.stringify({ error: 'You cannot refer yourself' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 2. Check if already referred
    const { data: existing } = await supabaseAdmin
      .from('referrals')
      .select('id')
      .eq('referee_id', user.id)
      .maybeSingle()

    if (existing) {
      return new Response(JSON.stringify({ error: 'You have already been referred' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. IP-based anti-cheat: get referee's IP from ip_tracking
    const { data: refereIps } = await supabaseAdmin
      .from('ip_tracking')
      .select('ip_address')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(5)

    const { data: referrerIps } = await supabaseAdmin
      .from('ip_tracking')
      .select('ip_address')
      .eq('user_id', referrer.user_id)
      .order('created_at', { ascending: false })
      .limit(5)

    // Check if referee shares any IP with referrer (self-referral fraud)
    const refereeIpSet = new Set((refereIps || []).map(r => r.ip_address))
    const sharedIp = (referrerIps || []).some(r => refereeIpSet.has(r.ip_address))

    if (sharedIp) {
      // Flag but don't block - create referral as flagged
      console.warn(`IP overlap detected: referee ${user.id} shares IP with referrer ${referrer.user_id}`)
      
      await supabaseAdmin.from('ip_tracking').insert({
        ip_address: Array.from(refereeIpSet)[0] || 'unknown',
        user_id: user.id,
        action_type: 'referral_flagged',
        is_flagged: true,
        flag_reason: `Shared IP with referrer ${referrer.user_id}`
      })

      return new Response(JSON.stringify({ error: 'Referral rejected: suspicious activity detected. Both accounts share the same network.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 4. Check if this IP was used by too many referees of the same referrer
    if (refereIps && refereIps.length > 0) {
      const refereeMainIp = refereIps[0].ip_address
      // Find other users with same IP
      const { data: sameIpUsers } = await supabaseAdmin
        .from('ip_tracking')
        .select('user_id')
        .eq('ip_address', refereeMainIp)
        .neq('user_id', user.id)

      if (sameIpUsers && sameIpUsers.length > 0) {
        const sameIpUserIds = sameIpUsers.map(u => u.user_id)
        // Check how many of these are referees of the same referrer
        const { count } = await supabaseAdmin
          .from('referrals')
          .select('id', { count: 'exact', head: true })
          .eq('referrer_id', referrer.user_id)
          .in('referee_id', sameIpUserIds)

        if (count && count >= 2) {
          return new Response(JSON.stringify({ error: 'Too many referrals from the same network. This referral cannot be processed.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }
    }

    // 5. Create referral (pending - reward on profile completion)
    const { error: insertErr } = await supabaseAdmin
      .from('referrals')
      .insert({
        referrer_id: referrer.user_id,
        referee_id: user.id,
        status: 'pending',
        points_earned: 0
      })

    if (insertErr) {
      if (insertErr.code === '23505') {
        return new Response(JSON.stringify({ error: 'Referral already exists' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      throw insertErr
    }

    // 6. Check if referee profile is already complete -> auto-complete referral
    const { data: refereeProfile } = await supabaseAdmin
      .from('profiles')
      .select('full_name, state, area, phone_number, profile_picture_url')
      .eq('user_id', user.id)
      .single()

    const isProfileComplete = refereeProfile?.full_name && refereeProfile?.state && refereeProfile?.area && refereeProfile?.phone_number

    if (isProfileComplete) {
      await completeReferral(supabaseAdmin, referrer.user_id, user.id, referrer.full_name)
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Referral applied! ₦50 credited to both you and your referrer.',
        rewarded: true
      }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Referral code applied! Complete your profile to unlock ₦50 reward for both of you.',
      rewarded: false
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error) {
    console.error('Referral validation error:', error)
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

async function completeReferral(supabase: any, referrerId: string, refereeId: string, referrerName: string | null) {
  const reward = 50

  // Update referral status
  await supabase
    .from('referrals')
    .update({ status: 'completed', points_earned: reward, completed_at: new Date().toISOString() })
    .eq('referrer_id', referrerId)
    .eq('referee_id', refereeId)

  // Credit both users (non-withdrawable)
  await supabase.rpc('increment_wallet_balance', { target_user_id: refereeId, amount_to_add: reward })
  await supabase.rpc('increment_wallet_balance', { target_user_id: referrerId, amount_to_add: reward })

  // Transaction records
  await supabase.from('wallet_transactions').insert([
    { user_id: refereeId, kind: 'referral_reward', amount: reward, status: 'completed', reference: `Referral reward - referred by ${referrerName || 'a friend'}` },
    { user_id: referrerId, kind: 'referral_reward', amount: reward, status: 'completed', reference: `Referral reward - new user completed profile` }
  ])

  // Notify referrer
  await supabase.from('notifications').insert({
    user_id: referrerId,
    title: '🎉 Referral Completed!',
    message: `Your referral completed their profile! You earned ₦${reward} NC.`,
    type: 'referral'
  })
}
