// Expiry of time-limited credit grants, run from app/api/cron/check-expired-pitches
// after the pitch refunds of the same run.
//
// There are no credit lots in the schema: artists.credits is one integer and a
// pitch spend never records which grant it drew from. A grant expires through
// its ledger row instead — a credit_transactions row with amount > 0 and
// metadata.expires_at is a lot. What expires is the unused part:
//
//   lot remaining = granted − net spend charged to it
//   net spend of a pitch = pitch_spend − expiry_refund of the same pitch_id
//
// Each pitch sent while a lot was active is charged to the active lot that
// expires first, up to what that lot still holds. A pitch refunded later costs
// nothing, so a refund (whenever it lands) is netted out rather than handed
// back to a lot. A pitch still awaiting a response when the lot expires counts
// as spent; its refund, if it comes, returns as ordinary credit.
//
// Each expiry is a credit_transactions row of type 'credit_expiry' keyed by
// metadata.lot_tx_id, written even when nothing expires (amount 0) so the lot
// is never looked at again. The partial unique index credit_tx_expiry_lot_uniq
// on that key makes the ledger INSERT the claim: of two overlapping runs
// (Vercel Cron + GitHub Actions) exactly one gets the row, and only that one
// moves the balance. Manual expiries (runner 'manual') use the same shape, so
// the cron skips them.

export const EXPIRY_TYPE = 'credit_expiry';

const ts = (iso) => new Date(iso).getTime();

export function isLot(tx) {
  return tx.amount > 0 && typeof tx.metadata?.expires_at === 'string' && !Number.isNaN(ts(tx.metadata.expires_at));
}

// Lot start: metadata.granted_at when present (manual grants record it), else
// the row's created_at.
function lotStart(lot) {
  return ts(lot.metadata?.granted_at || lot.created_at);
}

// Pure: given every ledger row of one artist, return the unused amount of each
// of their lots, keyed by lot id. No balance cap here — see expireDueLots.
export function lotRemainders(rows) {
  const lots = rows
    .filter(isLot)
    .map((l) => ({ id: l.id, start: lotStart(l), end: ts(l.metadata.expires_at), left: l.amount }))
    .sort((a, b) => a.end - b.end || a.start - b.start);

  const refunded = {};
  for (const r of rows) {
    const pid = r.metadata?.pitch_id;
    if (r.type === 'expiry_refund' && pid) refunded[pid] = (refunded[pid] || 0) + r.amount;
  }

  const spends = rows
    .filter((r) => r.type === 'pitch_spend' && r.amount < 0)
    .sort((a, b) => ts(a.created_at) - ts(b.created_at));

  for (const s of spends) {
    const at = ts(s.created_at);
    let net = -s.amount - (refunded[s.metadata?.pitch_id] || 0);
    for (const lot of lots) {
      if (net <= 0) break;
      if (at < lot.start || at >= lot.end || lot.left <= 0) continue;
      const take = Math.min(net, lot.left);
      lot.left -= take;
      net -= take;
    }
  }

  return Object.fromEntries(lots.map((l) => [l.id, Math.max(0, l.left)]));
}

// Expire every lot whose expires_at has passed and that has no credit_expiry
// row yet. onExpired({ artist, expired, lot, newBalance }) is called after the
// balance moved; it must not throw (errors are caught and logged).
export async function expireDueLots(supabase, { now = new Date(), artistIds = null, onExpired } = {}) {
  const nowMs = now.getTime();

  let lotQuery = supabase
    .from('credit_transactions')
    .select('id, artist_id, amount, type, metadata, created_at')
    .gt('amount', 0)
    .not('metadata->expires_at', 'is', null);
  if (artistIds) lotQuery = lotQuery.in('artist_id', artistIds);
  const { data: lotRows, error: lotErr } = await lotQuery;
  if (lotErr) throw lotErr;

  const due = (lotRows || []).filter((l) => isLot(l) && ts(l.metadata.expires_at) <= nowMs);
  if (due.length === 0) return { processed: [], skipped: 0 };

  const { data: doneRows, error: doneErr } = await supabase
    .from('credit_transactions')
    .select('metadata')
    .eq('type', EXPIRY_TYPE)
    .in('metadata->>lot_tx_id', due.map((l) => l.id));
  if (doneErr) throw doneErr;
  const done = new Set((doneRows || []).map((r) => r.metadata?.lot_tx_id));

  const pending = due.filter((l) => !done.has(l.id));
  const byArtist = {};
  for (const l of pending) (byArtist[l.artist_id] ||= []).push(l);

  const processed = [];
  let skipped = 0;

  for (const [artistId, lots] of Object.entries(byArtist)) {
    try {
      const { data: rows, error: rowsErr } = await supabase
        .from('credit_transactions')
        .select('id, amount, type, metadata, created_at')
        .eq('artist_id', artistId);
      if (rowsErr) throw rowsErr;
      const { data: artist, error: artistErr } = await supabase
        .from('artists')
        .select('id, name, email, credits')
        .eq('id', artistId)
        .maybeSingle();
      if (artistErr) throw artistErr;
      if (!artist) {
        console.error(`[credit-expiry] artist ${artistId} not found — lots left for review`);
        continue;
      }

      const remainders = lotRemainders(rows || []);
      let balance = artist.credits ?? 0;
      lots.sort((a, b) => ts(a.metadata.expires_at) - ts(b.metadata.expires_at));

      for (const lot of lots) {
        const unused = remainders[lot.id] ?? 0;
        const expired = Math.max(0, Math.min(unused, balance));
        const r = await expireLot(supabase, { artist, lot, granted: lot.amount, unused, expired });
        if (!r) { skipped++; continue; }
        balance = r.newBalance ?? balance - expired;
        processed.push({ artist_id: artistId, lot_tx_id: lot.id, expired, new_balance: balance });
        if (expired > 0 && onExpired) {
          try {
            await onExpired({ artist, expired, lot, newBalance: balance });
          } catch (e) {
            console.error('[credit-expiry] notification failed', { lot: lot.id, error: e?.message || e });
          }
        }
      }
    } catch (e) {
      console.error(`[credit-expiry] artist ${artistId} failed:`, e?.message || e);
    }
  }

  return { processed, skipped };
}

// Claim by ledger INSERT, then move the balance; undo the claim if the balance
// could not move (e.g. a pitch spent the credits in between) so the next run
// recomputes. Returns null when skipped.
async function expireLot(supabase, { artist, lot, granted, unused, expired }) {
  const { data: claim, error: claimErr } = await supabase
    .from('credit_transactions')
    .insert({
      artist_id: artist.id,
      amount: -expired,
      type: EXPIRY_TYPE,
      description: 'Granted credits expired (unused portion)',
      metadata: {
        lot_tx_id: lot.id,
        lot_reason: lot.metadata?.reason ?? null,
        granted,
        net_consumed: granted - unused,
        expired,
        expires_at: lot.metadata.expires_at,
        computed_at: new Date().toISOString(),
        runner: 'cron',
      },
    })
    .select('id')
    .single();
  if (claimErr) {
    if (claimErr.code !== '23505') {
      console.error(`[credit-expiry] claim failed for lot ${lot.id}:`, claimErr.message);
    }
    return null; // 23505: another run owns this lot
  }

  if (expired === 0) return { newBalance: null };

  const { data: newBalance, error: rpcErr } = await supabase.rpc('increment_artist_credits', {
    p_artist_id: artist.id,
    p_amount: -expired,
  });
  if (rpcErr) {
    console.error(`[credit-expiry] balance update failed for lot ${lot.id}, releasing claim:`, rpcErr.message);
    const { error: delErr } = await supabase
      .from('credit_transactions')
      .delete()
      .eq('id', claim.id)
      .eq('type', EXPIRY_TYPE);
    if (delErr) console.error(`[credit-expiry] CRITICAL: claim release failed for ${claim.id}:`, delErr.message);
    return null;
  }
  return { newBalance };
}
