import { jwtVerify, SignJWT } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'fallback-otonami-secret-change-me'
);

/**
 * Verify JWT token from Authorization header.
 * Returns payload ({ artistId or id, email, role, ... }) or null.
 */
export async function verifyToken(request) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.split(' ')[1];
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Verify a raw JWT string (for cases where you already extracted the token).
 */
export async function verifyTokenString(token) {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload;
  } catch {
    return null;
  }
}

/**
 * Sign a JWT with 30-day expiration.
 */
export async function signToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

/**
 * Sign an artist session.
 *
 * `artistId` stays the *active* artist and keeps its original meaning, so every
 * existing route that reads `payload.artistId` (pitch creation, credits, EPK,
 * tracks…) keeps working untouched. Switching artists re-issues this token with
 * a different `artistId`; `accountId` is what proves the switch was allowed.
 *
 * `email` is the account's login address, not the artist's contact address —
 * under a label account those differ.
 */
export async function signArtistSession({ accountId, artistId, email }) {
  return signToken({ accountId, artistId, email, role: 'artist' });
}
