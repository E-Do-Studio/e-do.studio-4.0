// Alertes du studio. Une alerte ouverte par clé : un problème qui se répète
// incrémente un compteur au lieu d'envoyer dix e-mails. `warning` et
// `critical` partent tout de suite (job `alerts.flush`) ; `info` attend le
// récapitulatif du matin.
import type { Queryable } from './db.ts';
import { trackService } from './posthog.ts';
import { enqueue } from './queue.ts';

export type Severity = 'info' | 'warning' | 'critical';

export interface Alert {
  id: number;
  key: string;
  severity: Severity;
  subject: string;
  body: string;
  occurrences: number;
  first_seen_at: string;
  last_seen_at: string;
  notified_at: string | null;
  resolved_at: string | null;
}

const RANK: Record<Severity, number> = { info: 0, warning: 1, critical: 2 };

export async function raiseAlert(
  q: Queryable,
  alert: { key: string; severity: Severity; subject: string; body: string },
): Promise<void> {
  trackService('booking_alert_raised', {
    severity: alert.severity,
    kind: alert.key.split(':').slice(0, 2).join(':'),
  });
  // Une info est un fait accompli (un orphelin supprimé) : rien à suivre, elle
  // naît close et ne figure qu'au récapitulatif.
  if (alert.severity === 'info') {
    await q.query(
      `INSERT INTO alerts (key, severity, subject, body, resolved_at)
       VALUES ($1, 'info', $2, $3, now())`,
      [alert.key, alert.subject, alert.body],
    );
    return;
  }
  const open = await q.query<Alert>(
    'SELECT * FROM alerts WHERE key = $1 AND resolved_at IS NULL',
    [alert.key],
  );
  const current = open[0];
  if (current) {
    // Une aggravation se renotifie ; une répétition non.
    const escalated = RANK[alert.severity] > RANK[current.severity];
    await q.query(
      `UPDATE alerts SET occurrences = occurrences + 1, last_seen_at = now(),
              severity = $2, subject = $3, body = $4,
              notified_at = CASE WHEN $5 THEN NULL ELSE notified_at END
       WHERE id = $1`,
      [
        current.id,
        escalated ? alert.severity : current.severity,
        alert.subject,
        alert.body,
        escalated,
      ],
    );
    if (!escalated) return;
  } else {
    await q.query(
      `INSERT INTO alerts (key, severity, subject, body) VALUES ($1, $2, $3, $4)`,
      [alert.key, alert.severity, alert.subject, alert.body],
    );
  }
  await enqueue(q, 'alerts.flush', {}, { dedupeKey: 'alerts.flush' });
}

export async function resolveAlert(q: Queryable, key: string): Promise<void> {
  await q.query(
    'UPDATE alerts SET resolved_at = now() WHERE key = $1 AND resolved_at IS NULL',
    [key],
  );
}

export async function pendingNotifications(q: Queryable): Promise<Alert[]> {
  return q.query<Alert>(
    `SELECT * FROM alerts
     WHERE resolved_at IS NULL AND notified_at IS NULL
     ORDER BY first_seen_at`,
  );
}

export async function markNotified(q: Queryable, ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await q.query('UPDATE alerts SET notified_at = now() WHERE id = ANY($1)', [
    ids,
  ]);
}

/** Pour le récapitulatif : tout ce qui est ouvert, et ce qui s'est réglé depuis hier. */
export async function digestContent(
  q: Queryable,
): Promise<{ open: Alert[]; resolved: Alert[] }> {
  const open = await q.query<Alert>(
    `SELECT * FROM alerts WHERE resolved_at IS NULL ORDER BY severity DESC, first_seen_at`,
  );
  const resolved = await q.query<Alert>(
    `SELECT * FROM alerts WHERE resolved_at > now() - interval '24 hours' ORDER BY resolved_at`,
  );
  return { open, resolved };
}
