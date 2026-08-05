import { describe, expect, it } from 'vitest';
import type { SlotState } from '../lib/booking-engine';
import type { ContactState } from './booking-types';
import {
  buildBookingHubspotFields,
  buildCollectedFormFields,
  datesBySlot,
  formatBookingDate,
  plateauKeysOf,
  sumSlotHours,
} from './hubspot-fields';

const contact: ContactState = {
  marque: 'Marque',
  societe: 'Société',
  siren: '123456789',
  adresseFacturation: '1 rue du Studio',
  nom: 'Nom',
  prenom: 'Prénom',
  email: 'a@b.c',
  tel: '0600000000',
  typesArticles: ['pap', 'bijoux'],
  quantiteArticles: '12',
  vuesParArticle: '3',
  autresInfos: 'Note',
  cgvAccepted: true,
};

const args = {
  contact,
  projectType: 'ecom',
  urgency: 'flex',
  plateau: 'live',
  slotIds: ['live#0'],
  slots: { 'live#0': { plateauKey: 'live', hours: 4 } } as Record<
    string,
    SlotState
  >,
  selected: { y: 2026, m: 8, d: 12 },
  arrivalHour: 10,
  rentalHours: 4,
  total: 620,
};

describe('formatBookingDate', () => {
  it('rend une date ISO avec le mois ramené en base 1', () => {
    expect(formatBookingDate({ y: 2026, m: 0, d: 5 })).toBe('2026-01-05');
    expect(formatBookingDate({ y: 2026, m: 11, d: 31 })).toBe('2026-12-31');
  });

  it('rend une chaîne vide sans date', () => {
    expect(formatBookingDate(null)).toBe('');
    expect(formatBookingDate(undefined)).toBe('');
  });
});

describe('sumSlotHours', () => {
  it('compte les heures des plateaux ordinaires', () => {
    expect(
      sumSlotHours(['live#0', 'eclipse#1'], {
        'live#0': { plateauKey: 'live', hours: 4 },
        'eclipse#1': { plateauKey: 'eclipse', hours: 8 },
      }),
    ).toBe(12);
  });

  it('compte le cyclorama en blocs, pas en heures stockées', () => {
    expect(
      sumSlotHours(['c'], {
        c: { plateauKey: 'cyclorama', cycloMode: 'halfH', hours: 99 },
      }),
    ).toBe(5);
    expect(
      sumSlotHours(['c'], {
        c: { plateauKey: 'cyclorama', cycloMode: 'fullH', hours: 99 },
      }),
    ).toBe(10);
  });

  it('compte la visite pour une heure', () => {
    expect(sumSlotHours(['v'], { v: { plateauKey: 'visite', hours: 0 } })).toBe(
      1,
    );
  });

  it('rend 0 sans créneau', () => {
    expect(sumSlotHours([], {})).toBe(0);
  });
});

describe('plateauKeysOf / datesBySlot', () => {
  it('dédoublonne les plateaux en gardant l’ordre', () => {
    expect(
      plateauKeysOf(['live#0', 'live#1', 'eclipse#2'], {
        'live#0': { plateauKey: 'live' },
        'live#1': { plateauKey: 'live' },
        'eclipse#2': { plateauKey: 'eclipse' },
      }),
    ).toEqual(['live', 'eclipse']);
  });

  it("n'indexe que les créneaux datés", () => {
    expect(
      datesBySlot(['a', 'b'], {
        a: { date: { y: 2026, m: 8, d: 12 } },
        b: {},
      }),
    ).toEqual({ a: '2026-09-12' });
  });
});

describe('buildBookingHubspotFields', () => {
  it('aplatit la réservation avec les séparateurs de l’API Forms', () => {
    const fields = buildBookingHubspotFields({
      ...args,
      mode: 'booking',
      reference: 'EDO-123',
    });
    expect(fields.booking_mode).toBe('booking');
    expect(fields.booking_reference).toBe('EDO-123');
    expect(fields.item_types).toBe('pap, bijoux');
    expect(fields.plateaus).toBe('live');
    expect(fields.preferred_date).toBe('2026-09-12');
    expect(fields.arrival_hour).toBe('10');
    expect(fields.cgv_accepted).toBe('true');
    expect(fields.total_ht).toBe('620');
  });

  it('préfère le total d’heures des créneaux au repli rentalHours', () => {
    expect(
      buildBookingHubspotFields({ ...args, mode: 'quote', reference: null })
        .rental_hours,
    ).toBe('4');
    expect(
      buildBookingHubspotFields({
        ...args,
        slotIds: [],
        slots: {},
        rentalHours: 7,
        mode: 'quote',
        reference: null,
      }).rental_hours,
    ).toBe('7');
  });
});

describe('buildCollectedFormFields', () => {
  it('porte le mode de page et joint les listes sans espace', () => {
    const fields = buildCollectedFormFields({
      ...args,
      mode: 'manual',
      omitContact: false,
    });
    expect(fields.mode).toBe('manual');
    expect(fields.item_types).toBe('pap,bijoux');
    expect(fields.booking_reference).toBeUndefined();
    expect(fields.email).toBe('a@b.c');
  });

  it('retire le bloc coordonnées pendant la saisie du formulaire', () => {
    const fields = buildCollectedFormFields({
      ...args,
      mode: 'config',
      omitContact: true,
    });
    expect(fields.email).toBeUndefined();
    expect(fields.cgv_accepted).toBeUndefined();
    // Le contexte de réservation, lui, continue de remonter.
    expect(fields.plateau).toBe('live');
    expect(fields.item_types).toBe('pap,bijoux');
  });
});
