import { describe, expect, it } from 'vitest';
import {
  BOOK_PLATEAUX,
  CYCLO_EXTRAS,
  computePriceBreakdown,
  fmtEUR,
  isSessionValid,
  isValidSiren,
  makeBlankSession,
  type QuoteLabels,
  type SlotState,
} from './booking-engine';

// Libellés d'affichage : le moteur est volontairement sans i18n, ils lui sont
// injectés. Des marqueurs suffisent — on teste les montants, pas les textes.
const L: QuoteLabels = {
  cyclo5h: 'cyclo5h',
  cyclo10h: 'cyclo10h',
  cyclo10hEditorial: 'cyclo10hEditorial',
  cycloPaint: 'peinture',
  electricity: 'electricite',
  studioVisit: 'visite',
  halfDay: 'demi-journee',
  proRataDay: 'prorata',
  postProduction: 'postprod',
  images: 'images',
  videoEditing: 'montage',
  onRequest: 'sur-demande',
};

const slot = (over: Partial<SlotState> = {}): SlotState => ({
  slotType: 'hour',
  hours: 1,
  cycloMode: 'halfH',
  paint: false,
  kwh: 0,
  team: {},
  postprod: {},
  ...over,
});

const price = (plateauKey: string, over: Partial<SlotState> = {}) =>
  computePriceBreakdown({
    plateau: plateauKey,
    slotIds: [plateauKey],
    slots: { [plateauKey]: slot({ plateauKey, ...over }) },
    lang: 'fr',
    labels: L,
  });

describe('grille tarifaire', () => {
  // Ces montants sont ceux du CMS (machines.pricingRows, vérifié en prod).
  // Les figer ici fait échouer le test si l'une des deux sources dérive.
  it.each([
    ['live', 185, 620, 1120],
    ['eclipse', 160, 560, 990],
    ['horizontal', 120, 410, 740],
    ['vertical', 120, 410, 740],
  ])(
    '%s facture %i €/h, %i € la demi-journée, %i € la journée',
    (k, h, d, j) => {
      const p = BOOK_PLATEAUX.find((x) => x.k === k);
      expect(p).toBeDefined();
      expect(p?.rates.hour).toBe(h);
      expect(p?.rates.half).toBe(d);
      expect(p?.rates.full).toBe(j);
    },
  );

  it("le cyclorama n'a pas de tarif horaire ni de tarif éditorial", () => {
    const cyclo = BOOK_PLATEAUX.find((x) => x.k === 'cyclorama');
    expect(cyclo?.rates.hour).toBeNull();
    expect(cyclo?.rates.halfH).toBe(650);
    expect(cyclo?.rates.fullH).toBe(880);
    // Le mode éditorial est « sur demande » — aucun montant ne doit traîner ici.
    expect(cyclo?.rates.editorial).toBeUndefined();
  });
});

describe('computePriceBreakdown', () => {
  it('facture les heures au tarif horaire du plateau', () => {
    expect(price('eclipse', { slotType: 'hour', hours: 3 }).total).toBe(480);
  });

  it('applique le forfait demi-journée à 4h, moins cher que 4 × le tarif horaire', () => {
    const forfait = price('eclipse', { slotType: 'half', hours: 4 }).total;
    expect(forfait).toBe(560);
    expect(forfait).toBeLessThan(4 * 160);
  });

  it('proratise la demi-journée au-delà de 4h', () => {
    // 5h de demi-journée = 560 × 5/4
    expect(price('eclipse', { slotType: 'half', hours: 5 }).total).toBe(700);
  });

  it('plafonne la demi-journée à 7h', () => {
    const sept = price('eclipse', { slotType: 'half', hours: 7 }).total;
    const dix = price('eclipse', { slotType: 'half', hours: 10 }).total;
    expect(dix).toBe(sept);
  });

  it('applique le forfait journée à 8h, moins cher que 8 × le tarif horaire', () => {
    const forfait = price('eclipse', { slotType: 'full', hours: 8 }).total;
    expect(forfait).toBe(990);
    expect(forfait).toBeLessThan(8 * 160);
  });

  it('facture deux journées pleines puis le reliquat au prorata', () => {
    // 20h = 2 journées (2 × 990) + 4h au prorata (990/8 × 4)
    const b = price('eclipse', { slotType: 'full', hours: 20 });
    expect(b.total).toBeCloseTo(2 * 990 + (990 / 8) * 4, 2);
  });

  it('la visite est gratuite', () => {
    expect(price('visite').total).toBe(0);
  });

  it('le mode éditorial du cyclorama ne facture rien et sort « sur demande »', () => {
    const b = price('cyclorama', { slotType: null, cycloMode: 'editorial' });
    expect(b.total).toBe(0);
    expect(b.rows.some((r) => r.onReq)).toBe(true);
  });

  it('la peinture fraîche du cyclo ajoute son forfait', () => {
    const sans = price('cyclorama', {
      slotType: null,
      cycloMode: 'halfH',
    }).total;
    const avec = price('cyclorama', {
      slotType: null,
      cycloMode: 'halfH',
      paint: true,
    }).total;
    expect(avec - sans).toBe(CYCLO_EXTRAS.paint);
  });

  it("l'électricité additionnelle est facturée au kWh", () => {
    const sans = price('cyclorama', {
      slotType: null,
      cycloMode: 'halfH',
    }).total;
    const avec = price('cyclorama', {
      slotType: null,
      cycloMode: 'halfH',
      kwh: 50,
    }).total;
    expect(avec - sans).toBeCloseTo(50 * CYCLO_EXTRAS.kwh, 5);
  });

  it('additionne plusieurs plateaux dans un même devis', () => {
    const b = computePriceBreakdown({
      plateau: 'eclipse',
      slotIds: ['eclipse', 'live'],
      slots: {
        eclipse: slot({ plateauKey: 'eclipse', slotType: 'full', hours: 8 }),
        live: slot({ plateauKey: 'live', slotType: 'full', hours: 8 }),
      },
      lang: 'fr',
      labels: L,
    });
    expect(b.total).toBe(990 + 1120);
    expect(b.groups).toHaveLength(2);
  });

  it('ne produit ni total négatif ni NaN sur un créneau vide', () => {
    const b = computePriceBreakdown({
      plateau: null,
      slotIds: [],
      slots: {},
      lang: 'fr',
      labels: L,
    });
    expect(b.total).toBe(0);
    expect(Number.isNaN(b.total)).toBe(false);
  });
});

describe('isValidSiren', () => {
  it('accepte un SIREN dont la clé de Luhn est correcte', () => {
    expect(isValidSiren('732829320')).toBe(true);
    expect(isValidSiren('732 829 320')).toBe(true); // espaces tolérés
  });

  it('rejette une suite de 9 chiffres qui ne passe pas Luhn', () => {
    // Piège classique : la forme est bonne, la clé non.
    expect(isValidSiren('123456789')).toBe(false);
  });

  it('rejette les longueurs invalides', () => {
    expect(isValidSiren('73282932')).toBe(false);
    expect(isValidSiren('')).toBe(false);
    expect(isValidSiren('abcdefghi')).toBe(false);
  });
});

describe('fmtEUR', () => {
  it('omet les décimales sur un entier', () => {
    expect(fmtEUR(990)).toBe('990');
  });

  it('tronque au centime plutôt que d’arrondir', () => {
    expect(fmtEUR(10.999)).toBe('10,99');
  });

  it('retombe sur « 0 » pour une entrée non numérique', () => {
    expect(fmtEUR(null)).toBe('0');
    expect(fmtEUR(undefined)).toBe('0');
    expect(fmtEUR('abc')).toBe('0');
  });
});

describe('isSessionValid', () => {
  it('rejette une session vierge', () => {
    expect(isSessionValid(makeBlankSession())).toBe(false);
  });

  it('accepte le cyclorama sans autre précision', () => {
    expect(
      isSessionValid({ ...makeBlankSession(), projectType: 'cyclorama' }),
    ).toBe(true);
  });

  it('exige un produit pour un projet e-commerce', () => {
    const s = { ...makeBlankSession(), projectType: 'ecom' };
    expect(isSessionValid(s)).toBe(false);
  });
});
