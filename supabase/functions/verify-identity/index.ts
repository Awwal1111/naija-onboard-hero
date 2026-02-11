import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NINBVN_API_KEY = Deno.env.get('NINBVN_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!NINBVN_API_KEY) {
      throw new Error('NINBVN_API_KEY is not configured');
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const anonClient = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { type, id_number, consent, selfie_base64 } = await req.json();

    if (!type || !id_number || !consent) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields: type, id_number, consent' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['nin', 'bvn'].includes(type)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid verification type. Use "nin" or "bvn"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate ID number format
    const cleanId = id_number.replace(/\s/g, '');
    if (type === 'nin' && cleanId.length !== 11) {
      return new Response(
        JSON.stringify({ success: false, error: 'NIN must be 11 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (type === 'bvn' && cleanId.length !== 11) {
      return new Response(
        JSON.stringify({ success: false, error: 'BVN must be 11 digits' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user already has a verification
    const { data: existing } = await supabase
      .from('identity_verifications')
      .select('id, status')
      .eq('user_id', user.id)
      .single();

    if (existing?.status === 'verified') {
      return new Response(
        JSON.stringify({ success: false, error: 'Identity already verified' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-identity] Verifying ${type} for user: ${user.id}`);

    // Call checkmyninbvn.com.ng API
    const endpoint = type === 'nin' 
      ? 'https://checkmyninbvn.com.ng/api/nin-verification'
      : 'https://checkmyninbvn.com.ng/api/bvn-verification';

    const apiResponse = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': NINBVN_API_KEY,
      },
      body: JSON.stringify({
        [type]: cleanId,
        consent: true,
      }),
    });

    const apiResult = await apiResponse.json();
    console.log(`[verify-identity] API response status: ${apiResult.status}`);

    if (apiResult.status !== 'success' || !apiResult.data) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: apiResult.message || 'Verification failed. Please check your ID number and try again.' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verifiedData = apiResult.data;

    // Hash the NIN/BVN for storage (never store plaintext)
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(cleanId));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const idHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    // Store verification photo if provided by API
    let verificationPhotoUrl = null;
    if (verifiedData.photo) {
      try {
        const photoData = verifiedData.photo.replace(/^data:image\/\w+;base64,/, '');
        const binaryData = Uint8Array.from(atob(photoData), c => c.charCodeAt(0));
        const blob = new Blob([binaryData], { type: 'image/jpeg' });
        
        const filePath = `${user.id}/id-photo-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('verification-photos')
          .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

        if (!uploadError) {
          verificationPhotoUrl = filePath;
        }
      } catch (e) {
        console.error('[verify-identity] Photo upload error:', e);
      }
    }

    // Store selfie if provided
    let selfieUrl = null;
    if (selfie_base64) {
      try {
        const selfieData = selfie_base64.replace(/^data:image\/\w+;base64,/, '');
        const binaryData = Uint8Array.from(atob(selfieData), c => c.charCodeAt(0));
        const blob = new Blob([binaryData], { type: 'image/jpeg' });
        
        const filePath = `${user.id}/selfie-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('verification-photos')
          .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true });

        if (!uploadError) {
          selfieUrl = filePath;
        }
      } catch (e) {
        console.error('[verify-identity] Selfie upload error:', e);
      }
    }

    // AI Risk scoring
    const riskFactors: string[] = [];
    let riskScore = 0;

    // Get user profile for cross-checking
    const { data: profile } = await supabase
      .from('profiles')
      .select('full_name, created_at, wallet_balance, connections_count')
      .eq('user_id', user.id)
      .single();

    // Check name mismatch
    const profileName = (profile?.full_name || '').toUpperCase();
    const verifiedName = `${verifiedData.firstname || ''} ${verifiedData.surname || verifiedData.lastname || ''}`.toUpperCase();
    
    if (profileName && !profileName.includes(verifiedData.firstname?.toUpperCase() || '')) {
      riskFactors.push('name_mismatch');
      riskScore += 20;
    }

    // Check account age (new accounts with immediate verification = slightly suspicious)
    if (profile?.created_at) {
      const accountAgeDays = (Date.now() - new Date(profile.created_at).getTime()) / (1000 * 60 * 60 * 24);
      if (accountAgeDays < 1) {
        riskFactors.push('very_new_account');
        riskScore += 15;
      }
    }

    // Check if this NIN/BVN hash is already used by another account
    const { data: duplicateCheck } = await supabase
      .from('identity_verifications')
      .select('user_id')
      .eq('id_number_hash', idHash)
      .neq('user_id', user.id)
      .single();

    if (duplicateCheck) {
      riskFactors.push('duplicate_id');
      riskScore += 50;
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'This ID number is already associated with another account. Contact support if this is an error.',
          risk_flag: true
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upsert verification record
    const verificationRecord = {
      user_id: user.id,
      verification_type: type,
      status: 'verified',
      id_number_hash: idHash,
      id_number_last4: cleanId.slice(-4),
      verified_first_name: verifiedData.firstname,
      verified_last_name: verifiedData.surname || verifiedData.lastname,
      verified_middle_name: verifiedData.middlename,
      verified_gender: verifiedData.gender,
      verified_dob: verifiedData.birthdate || verifiedData.dob,
      verified_state: verifiedData.residence_state || verifiedData.state_of_residence,
      verification_photo_url: verificationPhotoUrl,
      ai_risk_score: riskScore,
      ai_risk_factors: riskFactors,
      api_report_id: apiResult.reportID,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase
        .from('identity_verifications')
        .update(verificationRecord)
        .eq('user_id', user.id);
    } else {
      await supabase
        .from('identity_verifications')
        .insert(verificationRecord);
    }

    // Update profile
    const profileUpdate: Record<string, any> = {
      identity_verified: true,
      identity_verified_at: new Date().toISOString(),
      verification_country: 'NG',
      risk_score: riskScore,
      updated_at: new Date().toISOString(),
    };

    if (selfieUrl) {
      profileUpdate.face_selfie_url = selfieUrl;
    }

    await supabase
      .from('profiles')
      .update(profileUpdate)
      .eq('user_id', user.id);

    console.log(`[verify-identity] Successfully verified ${type} for user: ${user.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        verified: true,
        verification_type: type,
        verified_name: `${verifiedData.firstname} ${verifiedData.surname || verifiedData.lastname || ''}`.trim(),
        risk_score: riskScore,
        risk_factors: riskFactors.length > 0 ? riskFactors : undefined,
        message: `${type.toUpperCase()} verified successfully!`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-identity] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Identity verification failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
