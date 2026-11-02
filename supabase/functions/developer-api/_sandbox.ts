// Isolated mock responses for the focused hosted escrow and payments API.
// This module must remain free of imports, database access, and network calls.

export function rid(prefix: string): string {
  return `${prefix}_test_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

export function handleSandbox(
  endpoint: string,
  method: string,
  body: any,
  params: URLSearchParams,
): { data?: any; error?: string; status?: number } {
  const now = new Date().toISOString();
  const meta = {
    mode: 'sandbox' as const,
    simulated: true,
    note: 'No real funds were moved. This is a test response.',
  };

  if (endpoint === 'payments/escrow/create' && method === 'POST') {
    const amount = Number(body?.amount);
    const inspectionDays = Number(body?.inspection_period_days ?? 5);
    if (!body?.payer_external_id || !body?.payee_external_id || !body?.payee_user_id || !Number.isFinite(amount) || amount <= 0) {
      return { error: 'payer_external_id, payee_external_id, payee_user_id, and positive amount required', status: 400 };
    }
    if (!Number.isInteger(inspectionDays) || inspectionDays < 1 || inspectionDays > 30) {
      return { error: 'inspection_period_days must be an integer between 1 and 30', status: 400 };
    }
    const escrowId = rid('escrow');
    return { data: {
      escrow_id: escrowId,
      payer_external_id: body.payer_external_id,
      payee_external_id: body.payee_external_id,
      payee_user_id: body.payee_user_id,
      amount,
      currency: 'NC',
      status: 'pending',
      inspection_period_days: inspectionDays,
      actions: {
        fund: `/payments/escrow/${escrowId}/fund`,
        release: `/payments/escrow/${escrowId}/release`,
        refund: `/payments/escrow/${escrowId}/refund`,
        dispute: `/payments/escrow/${escrowId}/dispute`,
      },
      created_at: now,
      ...meta,
    } };
  }

  if (endpoint === 'payments/escrow' && method === 'GET') {
    return { data: { escrows: [], ...meta } };
  }

  const escrowMatch = endpoint.match(/^payments\/escrow\/([^/]+)(?:\/(fund|release|refund|dispute))?$/);
  if (escrowMatch) {
    const escrowId = escrowMatch[1];
    const action = escrowMatch[2];
    if (method === 'GET' && !action) {
      return { data: { escrow_id: escrowId, status: 'funded', inspection_period_days: 5, auto_release_at: now, ...meta } };
    }
    if (method === 'POST' && action === 'dispute') {
      const reason = typeof body?.reason === 'string' ? body.reason.trim() : '';
      if (reason.length < 3 || reason.length > 500) return { error: 'reason is required and must be 3 to 500 characters', status: 400 };
      return { data: { escrow_id: escrowId, status: 'disputed', reason, disputed_at: now, ...meta } };
    }
    if (method === 'POST' && ['fund', 'release', 'refund'].includes(action || '')) {
      const status = action === 'fund' ? 'funded' : action === 'release' ? 'released' : 'refunded';
      return { data: { escrow_id: escrowId, status, [`${status}_at`]: now, ...(action === 'fund' ? { auto_release_at: now } : {}), ...meta } };
    }
  }

  if (endpoint === 'payments/payout' && method === 'POST') {
    const amount = Number(body?.amount);
    if ((!body?.user_id && !body?.email) || !Number.isFinite(amount) || amount <= 0) {
      return { error: 'user_id or email and positive amount required', status: 400 };
    }
    return { data: { reference: body?.reference || rid('payout'), amount, currency: 'NC', status: 'completed', ...meta } };
  }

  if (endpoint === 'payments/charge/session' && method === 'POST') {
    const amount = Number(body?.amount);
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) {
      return { error: 'amount must be greater than 0 and no more than 1,000,000 NC', status: 400 };
    }
    const sessionId = rid('charge');
    return { data: { session_id: sessionId, amount, currency: 'NC', status: 'pending', redirect_url: `https://naijalancers.name.ng/charge/${sessionId}`, ...meta } };
  }
  if (endpoint === 'payments/charge/session' && method === 'GET') {
    const sessionId = params.get('session_id') || params.get('id') || rid('charge');
    return { data: { session_id: sessionId, amount: 0, currency: 'NC', status: 'pending', ...meta } };
  }

  return { error: `Endpoint not implemented in sandbox: ${endpoint}`, status: 404 };
}