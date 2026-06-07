// Sandbox response handler for the Developer API.
//
// Hard rules enforced by tests in sandbox_test.ts:
//   - This module MUST NOT import the Supabase client, ethers, fetch wrappers,
//     or anything that touches production tables or external services.
//   - Every response object MUST include { mode: 'sandbox', simulated: true }.
//   - Identifiers MUST be obviously fake (contain "_test_" or "SANDBOX").

export function rid(prefix: string): string {
  return `${prefix}_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function sandboxAddress(): string {
  // 40-hex address with a clearly fake "SANDBOX" marker so it can never be
  // mistaken for a real Celo address.
  const tail = crypto.randomUUID().replace(/-/g, '').slice(0, 25);
  return '0xSANDBOX' + tail;
}

export function sandboxTxHash(): string {
  const tail = crypto.randomUUID().replace(/-/g, '') +
    crypto.randomUUID().replace(/-/g, '').slice(0, 25);
  return '0xSANDBOX' + tail;
}

export function handleSandbox(
  endpoint: string,
  _method: string,
  body: any,
  params: URLSearchParams,
): { data?: any; error?: string; status?: number } {
  const now = new Date().toISOString();
  const meta = {
    mode: 'sandbox' as const,
    simulated: true,
    note: 'No real funds were moved. This is a test response.',
  };

  // wallet
  if (endpoint === 'wallet/create') {
    if (!body?.external_user_id) return { error: 'external_user_id is required', status: 400 };
    return { data: {
      wallet_id: rid('wlt'),
      external_user_id: body.external_user_id,
      address: sandboxAddress(),
      chain: 'CELO',
      created_at: now,
      ...meta,
    } };
  }
  if (endpoint === 'wallet/balance') {
    return { data: {
      external_user_id: params.get('external_user_id') ?? 'sandbox-user',
      balances: { CELO: '1.5', cUSD: '500.00', USDT: '500.00', NC: '10000' },
      ...meta,
    } };
  }
  if (endpoint === 'wallet/transfer') {
    const amount = Number(body?.amount) || 0;
    if (!body?.from || !body?.to || !amount) return { error: 'from, to, amount required', status: 400 };
    return { data: {
      reference: rid('tx'),
      from: body.from, to: body.to, amount, currency: body.currency || 'NC',
      status: 'completed', tx_hash: sandboxTxHash(), created_at: now, ...meta,
    } };
  }

  // VTU
  if (endpoint === 'vtu/airtime' || endpoint === 'vtu/data') {
    if (!body?.phone || !body?.amount) return { error: 'phone and amount required', status: 400 };
    return { data: {
      reference: rid('vtu'), provider: body.provider || 'MTN', phone: body.phone,
      amount: Number(body.amount), status: 'success', created_at: now, ...meta,
    } };
  }

  // Notifications
  if (endpoint === 'notifications/email' || endpoint === 'notifications/send') {
    return { data: { message_id: rid('msg'), to: body?.to, status: 'queued', ...meta } };
  }
  if (endpoint === 'notifications/sms') {
    return { data: { message_id: rid('sms'), to: body?.to, status: 'queued', ...meta } };
  }
  if (endpoint === 'notifications/push') {
    return { data: { notification_id: rid('push'), delivered_to: 1, ...meta } };
  }

  // Video
  if (endpoint === 'video/create-room') {
    const id = rid('room');
    return { data: {
      room_id: id, room_name: body?.room_name || 'sandbox-room',
      join_url: `https://naijalancers.name.ng/video/sandbox/${id}`,
      max_participants: body?.max_participants || 8,
      expires_at: new Date(Date.now() + 3600_000).toISOString(), ...meta,
    } };
  }
  if (endpoint === 'video/join-room') {
    return { data: { token: rid('jwt'), room_id: body?.room_id, expires_in: 3600, ...meta } };
  }

  // AI
  if (endpoint === 'ai/chat') {
    return { data: {
      id: rid('ai'),
      message: 'This is a sandbox AI response. Live mode will call the real LLM.',
      tokens_used: 24, model: 'sandbox-mock-v1', ...meta,
    } };
  }

  // Ramp
  if (endpoint === 'ramp/quote/buy' || endpoint === 'ramp/quote/sell') {
    const fiat = Number(params.get('fiat_amount') || body?.fiat_amount || 10000);
    const rate = 1550;
    return { data: {
      type: endpoint.endsWith('buy') ? 'buy' : 'sell',
      fiat_currency: 'NGN', fiat_amount: fiat,
      asset: 'USDT', asset_amount: +(fiat / rate).toFixed(6),
      rate, fees: { platform: 0, network: 0 }, ...meta,
    } };
  }
  if (endpoint === 'ramp/session/buy' || endpoint === 'ramp/session/sell') {
    const sid = rid('ramp');
    return { data: {
      session_id: sid, type: endpoint.endsWith('buy') ? 'buy' : 'sell',
      hosted_url: `https://naijalancers.name.ng/ramp/sandbox/${sid}`,
      status: 'pending', expires_at: new Date(Date.now() + 7200_000).toISOString(), ...meta,
    } };
  }
  if (endpoint.startsWith('ramp/session/')) {
    return { data: { session_id: endpoint.split('/')[2], status: 'completed', completed_at: now, ...meta } };
  }

  // Payments / escrow
  if (endpoint === 'payments/escrow/create') {
    return { data: {
      escrow_id: rid('esc'), amount: Number(body?.amount) || 0, currency: body?.currency || 'NC',
      payer_external_id: body?.payer_external_id, payee_external_id: body?.payee_external_id,
      status: 'created', created_at: now, ...meta,
    } };
  }
  if (endpoint.startsWith('payments/escrow/') && endpoint.endsWith('/fund')) {
    return { data: { escrow_id: endpoint.split('/')[2], status: 'funded', funded_at: now, ...meta } };
  }
  if (endpoint.startsWith('payments/escrow/') && endpoint.endsWith('/release')) {
    return { data: { escrow_id: endpoint.split('/')[2], status: 'released', released_at: now, ...meta } };
  }
  if (endpoint.startsWith('payments/escrow/') && endpoint.endsWith('/refund')) {
    return { data: { escrow_id: endpoint.split('/')[2], status: 'refunded', refunded_at: now, ...meta } };
  }
  if (endpoint === 'payments/payout' || endpoint === 'payments/credit') {
    return { data: {
      reference: rid('pay'), amount: Number(body?.amount) || 0, currency: 'NC',
      status: 'completed', recipient_external_id: body?.recipient_external_id, ...meta,
    } };
  }

  // Smart contracts / on-chain escrow
  if (endpoint === 'contracts/deploy' || endpoint === 'escrow/onchain/deploy') {
    return { data: {
      contract_address: sandboxAddress(), tx_hash: sandboxTxHash(),
      chain: 'CELO-Alfajores', block: 12345678, gas_used: '210000', ...meta,
    } };
  }
  if (endpoint === 'contracts/call') {
    return { data: { tx_hash: sandboxTxHash(), chain: 'CELO-Alfajores', status: 'success', ...meta } };
  }
  if (endpoint === 'contracts/read') {
    return { data: { result: '0', chain: 'CELO-Alfajores', ...meta } };
  }

  return { error: `Endpoint not implemented in sandbox: ${endpoint}`, status: 404 };
}
