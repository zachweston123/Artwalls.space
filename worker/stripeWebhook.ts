type StripeEvent = {
  id: string;
  type: string;
  data?: unknown;
};

function parseStripeSignatureHeader(headerValue: string) {
  const parts = headerValue
    .split(',')
    .map((p) => p.trim())
    .filter(Boolean);

  const timestamp = parts.find((p) => p.startsWith('t='))?.slice(2) || '';
  const signatures = parts.filter((p) => p.startsWith('v1=')).map((p) => p.slice(3));

  if (!timestamp || signatures.length === 0) {
    throw new Error('Invalid stripe-signature header');
  }

  return { timestamp, signatures };
}

async function hmacSha256Hex(secret: string, payload: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function verifyAndParseStripeEvent(request: Request, webhookSecret: string): Promise<StripeEvent> {
  const sigHeader = request.headers.get('stripe-signature');
  if (!sigHeader) throw new Error('Missing stripe-signature header');

  const { timestamp, signatures } = parseStripeSignatureHeader(sigHeader);

  // Stripe requires verifying the *raw* request body bytes.
  const bodyBuffer = await request.arrayBuffer();
  const bodyText = new TextDecoder().decode(bodyBuffer);

  const signedPayload = `${timestamp}.${bodyText}`;
  const expectedSignature = await hmacSha256Hex(webhookSecret, signedPayload);

  const ok = signatures.some((s) => timingSafeEqualHex(s, expectedSignature));
  if (!ok) throw new Error('Webhook signature verification failed');

  const parsed = JSON.parse(bodyText);
  return parsed as StripeEvent;
}
