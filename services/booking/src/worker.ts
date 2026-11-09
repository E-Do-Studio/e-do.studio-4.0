// Le worker : une boucle unique qui exécute la file, une tâche à la fois.
// Séquentiel exprès : deux synchros d'une même réservation ne se croisent
// jamais, et le volume d'un studio n'a rien à gagner au parallélisme.
import { syncHubspotBooking, syncHubspotContact } from './hubspot.ts';
import { scrubbed, trackService } from './posthog.ts';
import {
  digestContent,
  markNotified,
  pendingNotifications,
  raiseAlert,
  resolveAlert,
} from './alerts.ts';
import { type EmailPayload, loadBundle } from './bookings.ts';
import { reconcile, syncBooking } from './calendar-sync.ts';
import type { Db } from './db.ts';
import type { CalendarApi } from './google.ts';
import {
  renderAlertEmail,
  renderDigestEmail,
  sendClientEmail,
  sendContactEmail,
  sendStudioEmail,
  type Mailer,
} from './mailer.ts';
import {
  ALERT_AFTER_ATTEMPTS,
  claimNext,
  enqueue,
  type Job,
  markDone,
  markFailed,
  requeueStale,
} from './queue.ts';

export interface WorkerDeps {
  db: Db;
  calendar: CalendarApi;
  mailer: Mailer;
  studioEmail: string;
  alertEmail: string;
  hubspotToken?: string;
  log?: (msg: string, extra?: Record<string, unknown>) => void;
}

const RECONCILE_EVERY_MS = 10 * 60_000;
const DIGEST_HOUR_PARIS = 8;

const errorText = (err: unknown) =>
  err instanceof Error ? err.message : String(err);

/** Ce qu'un travail concerne, pour le dire au studio. */
async function describe(deps: WorkerDeps, job: Job): Promise<string> {
  const bookingId = job.payload.bookingId as string | undefined;
  if (!bookingId) return job.kind;
  const bundle = await loadBundle(deps.db, bookingId);
  return bundle
    ? `${job.kind} — ${bundle.booking.reference} (${bundle.booking.client_name})`
    : `${job.kind} — ${bookingId}`;
}

const KIND_LABEL: Record<string, string> = {
  'calendar.sync': "La synchro de l'agenda Google",
  'calendar.reconcile': "Le contrôle de l'agenda Google",
  'email.client': "L'e-mail au client",
  'email.studio': "L'e-mail au studio",
  'email.contact': "L'e-mail du formulaire de contact",
  'alerts.flush': "L'envoi des alertes",
  'alerts.digest': 'Le récapitulatif quotidien',
};

export const jobAlertKey = (job: Pick<Job, 'kind' | 'dedupe_key' | 'id'>) =>
  `job:${job.dedupe_key ?? `${job.kind}:${job.id}`}`;

export async function runJob(deps: WorkerDeps, job: Job): Promise<void> {
  const { db } = deps;
  switch (job.kind) {
    case 'calendar.sync': {
      const started = Date.now();
      const result = await syncBooking(db, deps.calendar, job.payload.bookingId as string);
      if (result.upserted + result.removed > 0) {
        trackService('calendar_synced', {
          booking_id: job.payload.bookingId,
          events_written: result.upserted,
          events_removed: result.removed,
          attempts: job.attempts,
          duration_ms: Date.now() - started,
        });
      }
      return;
    }
    case 'calendar.reconcile': {
      const report = await reconcile(db, deps.calendar);
      deps.log?.('réconciliation agenda', { ...report });
      trackService('calendar_reconciled', {
        events_scanned: report.scanned,
        events_ours: report.ours,
        orphans_removed: report.removedOrphans.length,
        events_adopted: report.adopted.length,
        events_recreated: report.recreated.length,
        unknown_references: report.unknown.length,
        bookings_resynced: report.resyncQueued,
      });
      for (const orphan of report.removedOrphans) {
        trackService('calendar_orphan_removed', { reference: orphan.split(' ')[0] });
      }
      return;
    }
    case 'email.client':
      await sendClientEmail(
        db,
        deps.mailer,
        deps.studioEmail,
        job.payload as unknown as EmailPayload,
        job,
      );
      trackService('booking_email_sent', {
        recipient: 'client',
        template: (job.payload as unknown as EmailPayload).template,
        booking_id: job.payload.bookingId,
        attempts: job.attempts,
      });
      return;
    case 'email.studio':
      await sendStudioEmail(
        db,
        deps.mailer,
        deps.studioEmail,
        job.payload as unknown as EmailPayload,
        job.id,
      );
      trackService('booking_email_sent', {
        recipient: 'studio',
        template: (job.payload as unknown as EmailPayload).template,
        booking_id: job.payload.bookingId,
        attempts: job.attempts,
      });
      return;
    case 'email.contact':
      await sendContactEmail(
        deps.mailer,
        deps.studioEmail,
        job.payload as unknown as Parameters<typeof sendContactEmail>[2],
        job.id,
      );
      trackService('contact_email_sent', {
        recipient: job.payload.recipient,
        attempts: job.attempts,
      });
      return;
    case 'hubspot.contact': {
      if (!deps.hubspotToken) return;
      const c = job.payload as unknown as Parameters<typeof syncHubspotContact>[1];
      // Pas de reprise, comme pour les réservations : une note par appel.
      try {
        await syncHubspotContact(deps.hubspotToken, c);
        trackService('hubspot_synced', { kind: 'contact' });
      } catch (err) {
        trackService('hubspot_failed', { kind: 'contact', error: scrubbed(errorText(err)) });
        await raiseAlert(db, {
          key: `hubspot:contact:${job.id}`,
          severity: 'info',
          subject: `HubSpot n'a pas reçu le contact de ${c.nom}`,
          body: errorText(err),
        });
      }
      return;
    }
    case 'hubspot.booking': {
      if (!deps.hubspotToken) return;
      const bundle = await loadBundle(db, job.payload.bookingId as string);
      if (!bundle) return;
      const { booking, sessions } = bundle;
      // Pas de reprise : HubSpot crée une affaire à chaque appel, un essai
      // répété en ferait deux. Un échec reste visible au récapitulatif.
      try {
        await syncHubspotBooking(deps.hubspotToken, {
          reference: booking.reference,
          clientName: booking.client_name,
          clientEmail: booking.client_email,
          clientPhone: booking.client_phone,
          clientCompany: booking.client_company,
          projectType: booking.project_type,
          totalEstimate: booking.total_estimate,
          preferredDate: booking.preferred_date,
          notes: booking.notes,
          plateaux: sessions.map((s) => s.plateau_key),
        });
        trackService('hubspot_synced', { kind: 'booking', reference: booking.reference });
      } catch (err) {
        trackService('hubspot_failed', {
          kind: 'booking',
          reference: booking.reference,
          error: scrubbed(errorText(err)),
        });
        await raiseAlert(db, {
          key: `hubspot:${booking.id}`,
          severity: 'info',
          subject: `HubSpot n'a pas reçu ${booking.reference}`,
          body: errorText(err),
        });
      }
      return;
    }
    case 'alerts.flush': {
      const pending = await pendingNotifications(db);
      if (pending.length === 0) return;
      const { subject, html } = renderAlertEmail(pending);
      await deps.mailer.send({
        to: deps.alertEmail,
        subject,
        html,
        idempotencyKey: `alerts-${pending.map((a) => `${a.id}.${a.occurrences}`).join('-')}`.slice(0, 256),
      });
      trackService('alert_email_sent', { alerts: pending.length });
      await markNotified(
        db,
        pending.map((a) => a.id),
      );
      return;
    }
    case 'alerts.digest': {
      const { open, resolved } = await digestContent(db);
      const digest = renderDigestEmail(open, resolved);
      if (!digest) return;
      await deps.mailer.send({
        to: deps.alertEmail,
        ...digest,
        idempotencyKey: `digest-${job.id}`,
      });
      trackService('alert_digest_sent', { open: open.length, resolved: resolved.length });
      return;
    }
  }
}

/** Exécute un travail prêt, s'il y en a un. Renvoie false si la file est vide. */
export async function tick(deps: WorkerDeps): Promise<boolean> {
  const job = await claimNext(deps.db);
  if (!job) return false;
  const alertKey = jobAlertKey(job);
  try {
    await runJob(deps, job);
    await markDone(deps.db, job);
    await resolveAlert(deps.db, alertKey);
  } catch (err) {
    const message = errorText(err);
    const outcome = await markFailed(deps.db, job, message);
    trackService(outcome === 'dead' ? 'booking_job_abandoned' : 'booking_job_failed', {
      kind: job.kind,
      attempts: job.attempts,
      booking_id: job.payload.bookingId ?? null,
      error: scrubbed(message),
    });
    deps.log?.('échec de travail', {
      job: job.id,
      kind: job.kind,
      attempts: job.attempts,
      error: message,
    });
    // L'envoi des alertes qui échoue ne s'alerte pas lui-même par e-mail :
    // il reste en file et les journaux le montrent.
    if (job.kind !== 'alerts.flush' && job.attempts >= ALERT_AFTER_ATTEMPTS) {
      const what = await describe(deps, job);
      await raiseAlert(deps.db, {
        key: alertKey,
        severity: outcome === 'dead' ? 'critical' : 'warning',
        subject:
          outcome === 'dead'
            ? `${KIND_LABEL[job.kind] ?? job.kind} a abandonné — ${what}`
            : `${KIND_LABEL[job.kind] ?? job.kind} échoue — ${what}`,
        body:
          outcome === 'dead'
            ? `Abandon après ${job.attempts} essais. Dernière erreur : ${message}\nÀ relancer à la main (POST /v1/admin/jobs/${job.id}/retry) une fois la cause réglée.`
            : `${job.attempts} essais en échec, nouvel essai automatique. Dernière erreur : ${message}`,
      });
    }
  }
  return true;
}

/** Planifie la réconciliation et le récapitulatif quand c'est l'heure. */
export async function schedule(db: Db, now = new Date()): Promise<void> {
  const [last] = await db.query<{ value: { at: string } }>(
    "SELECT value FROM service_state WHERE key = 'scheduler.reconcile'",
  );
  if (!last || now.getTime() - Date.parse(last.value.at) >= RECONCILE_EVERY_MS) {
    await enqueue(db, 'calendar.reconcile', {}, { dedupeKey: 'calendar.reconcile' });
    await db.query(
      `INSERT INTO service_state (key, value) VALUES ('scheduler.reconcile', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
      [JSON.stringify({ at: now.toISOString() })],
    );
  }

  const parisDay = now.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' });
  const parisHour = Number(
    now.toLocaleString('en-GB', {
      timeZone: 'Europe/Paris',
      hour: '2-digit',
      hourCycle: 'h23',
    }),
  );
  if (parisHour >= DIGEST_HOUR_PARIS) {
    const [digest] = await db.query<{ value: { day: string } }>(
      "SELECT value FROM service_state WHERE key = 'scheduler.digest'",
    );
    if (digest?.value.day !== parisDay) {
      await enqueue(db, 'alerts.digest', {}, { dedupeKey: 'alerts.digest' });
      await db.query(
        `INSERT INTO service_state (key, value) VALUES ('scheduler.digest', $1)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [JSON.stringify({ day: parisDay })],
      );
    }
  }

  await db.query(
    `INSERT INTO service_state (key, value) VALUES ('worker.heartbeat', $1)
     ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
    [JSON.stringify({ at: now.toISOString() })],
  );
}

export function startWorker(deps: WorkerDeps): { stop: () => Promise<void> } {
  let running = true;
  let current: Promise<void> = Promise.resolve();

  const loop = async () => {
    await requeueStale(deps.db);
    while (running) {
      try {
        await schedule(deps.db);
        // Vider ce qui est prêt, puis souffler.
        while (running && (await tick(deps))) {}
      } catch (err) {
        deps.log?.('boucle du worker', { error: errorText(err) });
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  };
  current = loop();
  return {
    async stop() {
      running = false;
      await current;
    },
  };
}
