// Single source of truth for credit pricing and the response window.
//
// These are spec values, not data: they must never be re-typed inline. Any
// surface that shows a yen figure derived from credits imports from here so a
// price change is one edit, not a grep hunt.

/** JPY per credit (list price, before volume discount). */
export const CREDIT_PRICE_JPY = 160;

/**
 * Share of a pitch's credit value paid to the curator for a completed review.
 * Flat across outcomes (accept / decline / feedback) — see
 * app/api/curator/pitch/[id]/route.js.
 */
export const CURATOR_REVENUE_SHARE = 0.5;

/** Days a curator has to respond before credits are returned automatically. */
export const RESPONSE_WINDOW_DAYS = 7;

/** Yen an artist spends for `credits` credits. */
export const creditsToJpy = (credits) => (credits || 0) * CREDIT_PRICE_JPY;

/** Yen a curator earns per completed review at the given tier. */
export const curatorPerReviewJpy = (tier) =>
  Math.round((tier || 0) * CREDIT_PRICE_JPY * CURATOR_REVENUE_SHARE);
