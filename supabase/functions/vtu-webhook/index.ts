import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-signature',
};

// HMAC SHA256 verification function
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );
  
  const computedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return computedSignature === signature;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const vtuUserPin = Deno.env.get('VTU_USER_PIN')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get signature from header
    const signature = req.headers.get('x-signature') || '';
    
    // Get raw body for signature verification
    const rawBody = await req.text();
    const webhookData = JSON.parse(rawBody);

    console.log('VTU Webhook received:', webhookData);
    console.log('Signature:', signature);

    // Verify signature
    const isValid = await verifySignature(rawBody, signature, vtuUserPin);
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ status: 'error', message: 'Invalid signature' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook signature verified successfully');

    // Extract webhook data
    const {
      request_id,
      order_id,
      status,
      amount,
      service_id,
      phone,
      customer_id,
      message,
    } = webhookData;

    // Find the transaction by request_id in metadata
    const { data: transactions, error: fetchError } = await supabase
      .from('wallet_transactions')
      .select('*')
      .contains('metadata', { vtu_request_id: request_id })
      .order('created_at', { ascending: false })
      .limit(1);

    if (fetchError) {
      console.error('Error fetching transaction:', fetchError);
      throw fetchError;
    }

    if (!transactions || transactions.length === 0) {
      console.log('Transaction not found for request_id:', request_id);
      return new Response(
        JSON.stringify({ status: 'success', message: 'Transaction not found, but acknowledged' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const transaction = transactions[0];
    console.log('Found transaction:', transaction.id);

    // Update transaction status based on webhook status
    let newStatus: string;
    let shouldRefund = false;

    switch (status) {
      case 'completed-api':
      case 'completed':
        newStatus = 'completed';
        break;
      case 'refunded':
        newStatus = 'refunded';
        shouldRefund = true;
        break;
      case 'processing-api':
      case 'processing':
        newStatus = 'processing';
        break;
      case 'failed':
        newStatus = 'failed';
        shouldRefund = true;
        break;
      default:
        newStatus = status;
    }

    // Update transaction status
    const { error: updateError } = await supabase
      .from('wallet_transactions')
      .update({
        status: newStatus,
        metadata: {
          ...transaction.metadata,
          vtu_order_id: order_id,
          vtu_status: status,
          vtu_message: message,
          webhook_received_at: new Date().toISOString(),
        },
      })
      .eq('id', transaction.id);

    if (updateError) {
      console.error('Error updating transaction:', updateError);
      throw updateError;
    }

    console.log('Transaction updated to status:', newStatus);

    // Handle refunds for failed/refunded transactions
    if (shouldRefund && transaction.status !== 'refunded' && transaction.status !== 'failed') {
      const refundAmount = Math.abs(transaction.amount);
      
      console.log('Processing refund of', refundAmount, 'NC for user', transaction.user_id);

      const { error: refundError } = await supabase
        .from('profiles')
        .update({
          wallet_balance: supabase.raw(`wallet_balance + ${refundAmount}`),
          balance_withdrawable: supabase.raw(`balance_withdrawable + ${refundAmount}`),
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', transaction.user_id);

      if (refundError) {
        console.error('Error processing refund:', refundError);
      } else {
        console.log('Refund processed successfully');
      }
    }

    return new Response(
      JSON.stringify({ 
        status: 'success', 
        message: 'Webhook processed successfully',
        transaction_id: transaction.id,
        new_status: newStatus,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error processing VTU webhook:', error);
    return new Response(
      JSON.stringify({ status: 'error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
