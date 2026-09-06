// Payout thresholds and the payment-destination predicate.
//
// Both numbers used to live in curators.payout_method / curators.minimum_payout,
// which never existed on the live table — the SELECT that referenced them made
// every payout request fail with 42703 (surfacing as a 404, because the error
// was discarded). They are code constants now: there is one scheme for every
// curator, and the terms page states it as such.
//
//   >= PAYOUT_REQUEST_THRESHOLD : the curator may request a payout themselves
//   >= PAYOUT_AUTO_THRESHOLD    : OTONAMI pays out without a request
export const PAYOUT_REQUEST_THRESHOLD = 5000;
export const PAYOUT_AUTO_THRESHOLD = 10000;

// curators.payment_info is text and comes back as null, '' or '   ' depending on
// how the row was written (the registration form writes '' for bank transfer,
// which is why an `!info` check alone is not enough).
export function hasPaymentInfo(row) {
  return typeof row?.payment_info === 'string' && row.payment_info.trim().length > 0;
}
