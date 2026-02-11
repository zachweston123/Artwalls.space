// @deprecated — Stripe Connect logic lives in worker/index.ts.
throw new Error('server/stripeConnect.js is deprecated');

let stripeClient;

/**
 * Initialize Stripe client (reuses existing instance from server/index.js)
 * @param {Stripe} stripe - Stripe instance
 */
export function initStripeConnect(stripe) {
  stripeClient = stripe;
}

/**
 * Get or create a Stripe Connect Express account for an artist or venue
 * @param {Object} params
 * @param {string} params.email - User email
 * @param {string} params.name - User name
 * @param {string} params.accountType - 'artist' or 'venue'
 * @param {string} params.userId - User UUID
 * @returns {Promise<{accountId: string, isNew: boolean}>}
 */
export async function getOrCreateConnectAccount({ email, name, accountType, userId }) {
  if (!stripeClient) {
    throw new Error('Stripe client not initialized. Call initStripeConnect first.');
  }

  // Create Express account
  const account = await stripeClient.accounts.create({
    type: 'express',
    country: 'US', // You can make this dynamic based on user location
    email,
    business_type: 'individual',
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: name || undefined,
      product_description: accountType === 'artist' 
        ? 'Art sales and commissions' 
        : 'Art venue hosting and commissions',
    },
    metadata: {
      artwalls_user_id: userId,
      artwalls_account_type: accountType,
    },
  });

  return {
    accountId: account.id,
    isNew: true,
  };
}

/**
 * Create an Account Link for Stripe Connect onboarding
 * @param {Object} params
 * @param {string} params.accountId - Stripe Connect account ID
 * @param {string} params.returnUrl - URL to return to after onboarding
 * @param {string} params.refreshUrl - URL to return to if link expires
 * @returns {Promise<{url: string}>}
 */
export async function createAccountLink({ accountId, returnUrl, refreshUrl }) {
  if (!stripeClient) {
    throw new Error('Stripe client not initialized');
  }

  const accountLink = await stripeClient.accountLinks.create({
    account: accountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: 'account_onboarding',
  });

  return { url: accountLink.url };
}

/**
 * Retrieve and sync the latest status of a Stripe Connect account
 * @param {string} accountId - Stripe Connect account ID
 * @returns {Promise<Object>} Account status object
 */
export async function syncConnectAccountStatus(accountId) {
  if (!stripeClient) {
    throw new Error('Stripe client not initialized');
  }

  const account = await stripeClient.accounts.retrieve(accountId);

  return {
    accountId: account.id,
    chargesEnabled: account.charges_enabled,
    payoutsEnabled: account.payouts_enabled,
    detailsSubmitted: account.details_submitted,
    requirementsCurrentlyDue: account.requirements?.currently_due || [],
    requirementsEventuallyDue: account.requirements?.eventually_due || [],
    onboardingStatus: getOnboardingStatus(account),
    syncedAt: new Date().toISOString(),
  };
}

/**
 * Determine onboarding status from Stripe account object
 * @param {Stripe.Account} account
 * @returns {string} 'not_started' | 'pending' | 'complete' | 'restricted'
 */
function getOnboardingStatus(account) {
  if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
    return 'complete';
  }
  if (account.details_submitted && (!account.charges_enabled || !account.payouts_enabled)) {
    return 'restricted';
  }
  if (account.details_submitted || (account.requirements?.currently_due?.length > 0)) {
    return 'pending';
  }
  return 'not_started';
}

/**
 * Create transfers to artist and venue after a successful charge
 * @param {Object} params
 * @param {string} params.chargeId - Stripe Charge ID
 * @param {string} params.artistAccountId - Artist's Stripe Connect account ID
 * @param {string} params.venueAccountId - Venue's Stripe Connect account ID (optional)
 * @param {number} params.artistAmountCents - Amount to transfer to artist in cents
 * @param {number} params.venueAmountCents - Amount to transfer to venue in cents
 * @param {string} params.orderId - Order UUID for metadata
 * @returns {Promise<{artistTransferId: string, venueTransferId: string|null}>}
 */
export async function createPayoutTransfers({
  chargeId,
  artistAccountId,
  venueAccountId,
  artistAmountCents,
  venueAmountCents,
  orderId,
}) {
  if (!stripeClient) {
    throw new Error('Stripe client not initialized');
  }

  const transfers = {};

  // Transfer to artist
  if (artistAccountId && artistAmountCents > 0) {
    const artistTransfer = await stripeClient.transfers.create({
      amount: artistAmountCents,
      currency: 'usd',
      destination: artistAccountId,
      source_transaction: chargeId,
      metadata: {
        order_id: orderId,
        recipient_type: 'artist',
      },
    });
    transfers.artistTransferId = artistTransfer.id;
  }

  // Transfer to venue
  if (venueAccountId && venueAmountCents > 0) {
    const venueTransfer = await stripeClient.transfers.create({
      amount: venueAmountCents,
      currency: 'usd',
      destination: venueAccountId,
      source_transaction: chargeId,
      metadata: {
        order_id: orderId,
        recipient_type: 'venue',
      },
    });
    transfers.venueTransferId = venueTransfer.id;
  }

  return transfers;
}

/**
 * Check if an account is ready to receive payouts
 * @param {Object} accountStatus - Status object from syncConnectAccountStatus
 * @returns {boolean}
 */
export function isAccountPayoutReady(accountStatus) {
  return accountStatus.payoutsEnabled && accountStatus.chargesEnabled;
}

/**
 * Retrieve balance transaction to get actual Stripe fees
 * @param {string} balanceTransactionId - Stripe Balance Transaction ID
 * @returns {Promise<{fee: number, net: number}>}
 */
export async function getBalanceTransactionFees(balanceTransactionId) {
  if (!stripeClient) {
    throw new Error('Stripe client not initialized');
  }

  const balanceTxn = await stripeClient.balanceTransactions.retrieve(balanceTransactionId);

  return {
    fee: balanceTxn.fee,
    net: balanceTxn.net,
    currency: balanceTxn.currency,
  };
}
