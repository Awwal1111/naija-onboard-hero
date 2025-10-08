import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AirtimeRequest {
  network: '01' | '02' | '03' | '04'; // 01=MTN, 02=GLO, 03=9mobile, 04=Airtel
  amount: number;
  phone: string;
  bonusType?: '01' | '02'; // 01=MTN Awuf (400%), 02=MTN Garabasa (1000%)
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { network, amount, phone, bonusType }: AirtimeRequest = await req.json();

    // Validate input
    if (!network || !amount || !phone) {
      throw new Error("Missing required fields");
    }

    if (amount < 50 || amount > 200000) {
      throw new Error("Amount must be between ₦50 and ₦200,000");
    }

    // Validate phone number (Nigerian format)
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('0')) {
      throw new Error("Invalid Nigerian phone number");
    }

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Check wallet balance
    const { data: profile, error: profileError } = await supabaseService
      .from('profiles')
      .select('wallet_balance, balance_withdrawable')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error("Profile not found");
    }

    if (profile.wallet_balance < amount) {
      throw new Error(`Insufficient balance. Available: ${profile.wallet_balance} NC`);
    }

    // Deduct from wallet
    const { error: walletError } = await supabaseService
      .from('profiles')
      .update({
        wallet_balance: profile.wallet_balance - amount,
        balance_withdrawable: Math.max(0, profile.balance_withdrawable - amount),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id);

    if (walletError) {
      console.error("Wallet update error:", walletError);
      throw new Error("Failed to deduct from wallet");
    }

    // Generate unique request ID
    const requestId = `${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Prepare Clubkonnect API call
    const userId = Deno.env.get("CLUBKONNECT_USER_ID");
    const apiKey = Deno.env.get("CLUBKONNECT_API_KEY");
    
    let apiUrl = `https://www.nellobytesystems.com/APIAirtimeV1.asp?UserID=${userId}&APIKey=${apiKey}&MobileNetwork=${network}&Amount=${amount}&MobileNumber=${cleanPhone}&RequestID=${requestId}`;
    
    // Add bonus type if provided
    if (bonusType && network === '01') {
      apiUrl += `&BonusType=${bonusType}`;
    }

    console.log("Calling Clubkonnect API for user:", user.id);
    console.log("API URL:", apiUrl.replace(apiKey, 'HIDDEN'));

    // Call Clubkonnect API
    const apiResponse = await fetch(apiUrl);
    
    if (!apiResponse.ok) {
      throw new Error(`API request failed with status ${apiResponse.status}`);
    }

    const responseText = await apiResponse.text();
    console.log("Clubkonnect API raw response:", responseText);

    let apiData;
    try {
      apiData = JSON.parse(responseText);
    } catch (parseError) {
      console.error("Failed to parse API response:", parseError);
      throw new Error("Invalid response from airtime provider");
    }

    console.log("Clubkonnect API parsed response:", apiData);

    // Check for API errors
    const statusCode = apiData.statuscode?.toString();
    const status = apiData.status || apiData.STATUS;
    
    // Handle error responses
    const errorStatuses = [
      'INVALID_CREDENTIALS', 'MISSING_CREDENTIALS', 'MISSING_USERID',
      'MISSING_APIKEY', 'MISSING_MOBILENETWORK', 'MISSING_AMOUNT',
      'INVALID_AMOUNT', 'MINIMUM_50', 'MAXIMUM_200000', 'INVALID_RECIPIENT'
    ];
    
    if (errorStatuses.includes(status)) {
      // Refund the wallet since purchase failed
      await supabaseService
        .from('profiles')
        .update({
          wallet_balance: profile.wallet_balance,
          balance_withdrawable: profile.balance_withdrawable,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', user.id);
      
      throw new Error(status.replace(/_/g, ' '));
    }

    // statuscode "100" = ORDER_RECEIVED (success)
    // statuscode "200" = ORDER_COMPLETED (success)
    const isSuccess = statusCode === "100" || statusCode === "200";
    const transactionStatus = statusCode === "200" ? 'completed' : 'pending';
    
    // Log transaction
    const { error: transactionError } = await supabaseService
      .from('wallet_transactions')
      .insert({
        user_id: user.id,
        amount: -amount,
        kind: 'airtime_purchase',
        status: transactionStatus,
        reference: requestId,
        metadata: {
          network,
          phone: cleanPhone,
          bonusType,
          orderid: apiData.orderid,
          statuscode: statusCode,
          clubkonnect_response: apiData
        }
      });

    if (transactionError) {
      console.error("Transaction log error:", transactionError);
    }

    return new Response(
      JSON.stringify({
        success: isSuccess,
        message: status || apiData.remark || "Airtime purchase initiated",
        orderid: apiData.orderid,
        requestId,
        balance: profile.wallet_balance - amount,
        statusCode
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
    console.error("Error in buy-airtime:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Failed to purchase airtime"
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
