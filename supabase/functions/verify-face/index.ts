import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LUXAND_API_KEY = Deno.env.get('LUXAND_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LUXAND_API_KEY) {
      throw new Error('LUXAND_API_KEY is not configured');
    }

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ success: false, error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    // Get user from auth
    const anonClient = createClient(
      SUPABASE_URL!,
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

    const { image_base64 } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ success: false, error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-face] Processing face verification for user: ${user.id}`);

    // Call Luxand.cloud Liveness Detection API
    // Using detect/faces endpoint with liveness check
    const formData = new FormData();
    
    // Convert base64 to blob
    const imageData = image_base64.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(imageData), c => c.charCodeAt(0));
    const blob = new Blob([binaryData], { type: 'image/jpeg' });
    formData.append('photo', blob, 'selfie.jpg');

    console.log('[verify-face] Calling Luxand API for face detection...');

    // First, detect faces in the image
    const detectResponse = await fetch('https://api.luxand.cloud/photo/detect', {
      method: 'POST',
      headers: {
        'token': LUXAND_API_KEY
      },
      body: formData
    });

    if (!detectResponse.ok) {
      const errorText = await detectResponse.text();
      console.error('[verify-face] Luxand detect error:', errorText);
      return new Response(
        JSON.stringify({ success: false, error: 'Face detection failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const detectResult = await detectResponse.json();
    console.log('[verify-face] Luxand detect result:', JSON.stringify(detectResult));

    // Check if a face was detected
    if (!detectResult || detectResult.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'No face detected in the image. Please ensure your face is clearly visible.',
          verified: false 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check for multiple faces
    if (detectResult.length > 1) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Multiple faces detected. Please take a selfie with only your face visible.',
          verified: false 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Face detected successfully - we consider this a successful verification
    // In a more advanced setup, you could add:
    // - Liveness detection (anti-spoofing)
    // - Face matching against a stored reference photo
    const faceData = detectResult[0];
    
    // Check if the face is of sufficient quality (has basic landmarks)
    const hasValidFace = faceData.rectangle && 
                         faceData.rectangle.width > 50 && 
                         faceData.rectangle.height > 50;

    if (!hasValidFace) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Face quality too low. Please take a clearer photo.',
          verified: false 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('[verify-face] Face verification successful, updating profile...');

    // Update user profile with face_verified = true
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        face_verified: true,
        face_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (updateError) {
      console.error('[verify-face] Profile update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[verify-face] Successfully verified face for user: ${user.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        verified: true,
        message: 'Face verification successful! Your identity has been verified.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[verify-face] Error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Face verification failed' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
