export type StripeEvent = {
  id: string;
  type: string;
  data?: { object?: any; [key: string]: any };
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

// Overload: (body: string, sigHeader: string, secret: string) — for use when body is already read
// Overload: (request: Request, secret: string) — for use from Pages Functions
export async function verifyAndParseStripeEvent(bodyOrRequest: string | Request, sigOrSecret: string, maybeSecret?: string): Promise<StripeEvent> {
  let bodyText: string;
  let sigHeader: string;
  let webhookSecret: string;

  if (typeof bodyOrRequest === 'string') {
    // 3-arg form: (body, sig, secret)
    bodyText = bodyOrRequest;
    sigHeader = sigOrSecret;
    webhookSecret = maybeSecret!;
  } else {
    // 2-arg form: (request, secret)
    webhookSecret = sigOrSecret;
    const hdr = bodyOrRequest.headers.get('stripe-signature');
    if (!hdr) throw new Error('Missing stripe-signature header');
    sigHeader = hdr;
    const bodyBuffer = await bodyOrRequest.arrayBuffer();
    bodyText = new TextDecoder().decode(bodyBuffer);
  }

  if (!sigHeader) throw new Error('Missing stripe-signature header');

  const { timestamp, signatures } = parseStripeSignatureHeader(sigHeader);

  const signedPayload = `${timestamp}.${bodyText}`;
  const expectedSignature = await hmacSha256Hex(webhookSecret, signedPayload);

  const ok = signatures.some((s) => timingSafeEqualHex(s, expectedSignature));
  if (!ok) throw new Error('Webhook signature verification failed');

  // Reject events older than 5 minutes (300 seconds) to prevent replay attacks
  const timestampSeconds = parseInt(timestamp, 10);
  const nowSeconds = Math.floor(Date.now() / 1000);
  const tolerance = 300;
  if (Math.abs(nowSeconds - timestampSeconds) > tolerance) {
    throw new Error('Webhook timestamp outside tolerance window');
  }

  const parsed = JSON.parse(bodyText);
  return parsed as StripeEvent;
}
