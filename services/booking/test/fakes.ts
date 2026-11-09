import type { Db } from '../src/db.ts';
import type { CalendarApi, GoogleEvent } from '../src/google.ts';
import type { Mailer, OutgoingEmail } from '../src/mailer.ts';
import type { CreateBookingInput } from '../src/quote.ts';
import { tick, type WorkerDeps } from '../src/worker.ts';

/** Agenda Google en mémoire ; `failing` fait échouer chaque appel. */
export class FakeCalendar implements CalendarApi {
  events = new Map<string, GoogleEvent>();
  calls: string[] = [];
  failing = false;

  async upsert(event: GoogleEvent) {
    this.calls.push(`upsert ${event.id}`);
    if (this.failing) throw new Error('Google 503 : backend error');
    this.events.set(event.id, structuredClone(event));
  }

  async remove(eventId: string) {
    this.calls.push(`remove ${eventId}`);
    if (this.failing) throw new Error('Google 503 : backend error');
    return this.events.delete(eventId) ? ('deleted' as const) : ('gone' as const);
  }

  async list() {
    this.calls.push('list');
    if (this.failing) throw new Error('Google 503 : backend error');
    return [...this.events.values()].map((e) => structuredClone(e));
  }
}

export class FakeMailer implements Mailer {
  sent: OutgoingEmail[] = [];
  failing = false;
  async send(email: OutgoingEmail) {
    if (this.failing) throw new Error('Resend 500');
    this.sent.push(email);
  }
}

export function deps(db: Db, calendar: FakeCalendar, mailer: FakeMailer): WorkerDeps {
  return {
    db,
    calendar,
    mailer,
    studioEmail: 'contact@e-do.studio',
    alertEmail: 'alertes@e-do.studio',
  };
}

/** Exécute tout ce qui est prêt dans la file (sans attendre les reprises). */
export async function drain(d: WorkerDeps, max = 200): Promise<number> {
  let n = 0;
  while (n < max && (await tick(d))) n += 1;
  return n;
}

/** Rend immédiatement prêts les travaux en attente de reprise. */
export async function fastForward(db: Db): Promise<void> {
  await db.query(`UPDATE jobs SET run_at = now() WHERE status = 'queued'`);
}

/** Une date future en Y/M(0-11)/D, à `days` jours d'aujourd'hui. */
export function futureYmd(days: number) {
  const d = new Date(Date.now() + days * 86_400_000);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate() };
}

export function isoOf(ymd: { y: number; m: number; d: number }) {
  return `${ymd.y}-${String(ymd.m + 1).padStart(2, '0')}-${String(ymd.d).padStart(2, '0')}`;
}

export function websiteInput(
  sessions: { plateauKey: string; days: number; hour: number; hours: number }[],
  email = 'camille@marque.fr',
): CreateBookingInput {
  return {
    mode: 'booking',
    contact: {
      nom: 'Durand',
      prenom: 'Camille',
      email,
      tel: '06 12 34 56 78',
      societe: 'Marque',
      siren: '',
      adresseFacturation: '',
      marque: '',
      autresInfos: '',
    },
    projectType: 'packshot',
    urgency: null,
    sessions: sessions.map((s) => ({
      plateauKey: s.plateauKey,
      slotType: 'hour',
      hours: s.hours,
      date: futureYmd(s.days),
      arrivalHour: s.hour,
      cycloMode: null,
      productType: null,
      method: null,
      submethod: null,
      media: [],
      views: [],
      viewsCount: 0,
      quantity: 1,
      postprodEnabled: false,
      postprodVideo: false,
    })),
    quote: { rows: [], total: 0 },
    preferredDate: futureYmd(sessions[0]?.days ?? 1),
    arrivalHour: sessions[0]?.hour ?? null,
  };
}

export async function jobs(db: Db) {
  return db.query<{ kind: string; status: string; attempts: number }>(
    'SELECT kind, status, attempts FROM jobs ORDER BY id',
  );
}
