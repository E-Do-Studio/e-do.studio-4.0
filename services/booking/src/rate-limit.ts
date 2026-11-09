import { createHash } from 'node:crypto';
import type { Queryable } from './db.ts';

export function hashIp(ip: string): string {
  return createHash('sha256').update(ip).digest('base64');
}

/**
 * `true` si l'appel passe : fenêtre fixe par IP hachée et par usage. Une base
 * indisponible laisse passer (jamais un formulaire bloqué par une panne).
 */
export async function rateLimit(
  q: Queryable,
  bucket: string,
  ipHash: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  try {
    const [row] = await q.query<{ count: number }>(
      `INSERT INTO rate_limits (bucket, ip_hash, window_start, count)
       VALUES ($1, $2, to_timestamp(floor(extract(epoch FROM now()) / $3) * $3), 1)
       ON CONFLICT (bucket, ip_hash, window_start) DO UPDATE SET count = rate_limits.count + 1
       RETURNING count`,
      [bucket, ipHash, windowSeconds],
    );
    return row.count <= limit;
  } catch (err) {
    console.error('rate-limit', err);
    return true;
  }
}
