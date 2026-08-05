import type { TFunction } from 'i18next';
import { describe, expect, it } from 'vitest';
import type { BookingSession } from '../../lib/booking-engine';
import { makeBlankSession } from '../../lib/booking-engine';
import {
  CASCADES,
  buildQuestions,
  isMediaVisible,
  isPackshotSized,
  openQuestionKeys,
} from './configurator-questions';

const t = ((key: string) => key) as unknown as TFunction;

const session = (patch: Partial<BookingSession> = {}): BookingSession => ({
  ...makeBlankSession(),
  ...patch,
});

const keys = (s: BookingSession) => buildQuestions(s, t).map((q) => q.key);

describe('buildQuestions', () => {
  it('ne pose que le type de projet sur une session vierge', () => {
    expect(keys(session())).toEqual(['projectType']);
  });

  it('le cyclorama ne demande rien de plus', () => {
    expect(keys(session({ projectType: 'cyclorama' }))).toEqual([
      'projectType',
    ]);
  });

  it('déplie produit puis méthode pour le prêt-à-porter', () => {
    expect(keys(session({ projectType: 'ecom' }))).toEqual([
      'projectType',
      'product',
    ]);
    expect(keys(session({ projectType: 'ecom', product: 'pap' }))).toEqual([
      'projectType',
      'product',
      'method',
    ]);
  });

  it('le packshot demande un sous-type, puis quantité et vues', () => {
    const s = session({
      projectType: 'ecom',
      product: 'pap',
      method: 'packshot',
      submethod: 'ghost',
    });
    expect(keys(s)).toEqual([
      'projectType',
      'product',
      'method',
      'submethod',
      'quantity',
      'views',
    ]);
  });

  it('le porté demande un média puis un couple quantité × vues', () => {
    const s = session({
      projectType: 'ecom',
      product: 'pap',
      method: 'onmodel',
      media: ['photo'],
    });
    expect(keys(s)).toContain('media');
    expect(keys(s)).toContain('qtyViews');
    expect(keys(s)).not.toContain('views');
  });

  it("l'accessoire passe par un sous-type, pas par une méthode", () => {
    const s = session({
      projectType: 'ecom',
      product: 'accessoires',
      submethod: 'chaussure',
    });
    expect(keys(s)).toEqual(['projectType', 'product', 'submethod', 'media']);
  });

  it('les produits directs sautent méthode et sous-type', () => {
    const s = session({ projectType: 'ecom', product: 'bijoux' });
    expect(keys(s)).toEqual(['projectType', 'product', 'media']);
  });

  it('« détail » seul ne répond pas à la question des vues', () => {
    const base = {
      projectType: 'ecom',
      product: 'pap',
      method: 'packshot',
      submethod: 'ghost',
    };
    const only = buildQuestions(
      session({ ...base, views: ['detail'] }),
      t,
    ).find((q) => q.key === 'views');
    expect(only?.answered).toBe(false);
    const withFace = buildQuestions(
      session({ ...base, views: ['detail', 'face'] }),
      t,
    ).find((q) => q.key === 'views');
    expect(withFace?.answered).toBe(true);
  });

  it('la post-prod n’apparaît qu’une fois la session complète, et est toujours répondue', () => {
    const incomplete = session({
      projectType: 'ecom',
      product: 'bijoux',
      media: ['photo'],
    });
    expect(keys(incomplete)).not.toContain('postprod');
    const complete = session({
      ...incomplete,
      quantity: '10',
      viewsCount: '3',
    });
    const pp = buildQuestions(complete, t).find((q) => q.key === 'postprod');
    expect(pp?.answered).toBe(true);
  });

  it('numérote la question média selon le chemin suivi', () => {
    const num = (s: BookingSession) =>
      buildQuestions(s, t).find((q) => q.key === 'media')?.num;
    expect(
      num(session({ projectType: 'ecom', product: 'pap', method: 'onmodel' })),
    ).toBe('03');
    expect(num(session({ projectType: 'ecom', product: 'bijoux' }))).toBe('02');
  });
});

describe('isMediaVisible / isPackshotSized', () => {
  it("l'accessoire n'ouvre le média qu'une fois son sous-type choisi", () => {
    expect(isMediaVisible(session({ product: 'accessoires' }))).toBe(false);
    expect(
      isMediaVisible(session({ product: 'accessoires', submethod: 'textile' })),
    ).toBe(true);
  });

  it('le packshot n’est dimensionné qu’avec son sous-type', () => {
    expect(
      isPackshotSized(session({ product: 'pap', method: 'packshot' })),
    ).toBe(false);
    expect(
      isPackshotSized(
        session({ product: 'pap', method: 'packshot', submethod: 'flat' }),
      ),
    ).toBe(true);
  });
});

describe('CASCADES', () => {
  it('changer de type de projet efface tout l’aval', () => {
    expect(CASCADES.projectType).toMatchObject({
      product: null,
      method: null,
      submethod: null,
      quantity: '',
    });
  });

  it('changer de média ne touche pas au produit ni à la méthode', () => {
    expect(CASCADES.media).not.toHaveProperty('product');
    expect(CASCADES.media).not.toHaveProperty('method');
    expect(CASCADES.media).toMatchObject({ quantity: '', viewsCount: '' });
  });
});

describe('openQuestionKeys', () => {
  const qs = (answered: boolean[]) =>
    answered.map((a, i) => ({
      key: `q${i}`,
      num: String(i),
      label: `q${i}`,
      answered: a,
      summary: '',
    }));

  it('ouvre la première sans réponse', () => {
    const open = openQuestionKeys(
      qs([true, true, false, false]),
      null,
      new Set(),
    );
    expect(open.has('q2')).toBe(true);
    expect(open.has('q3')).toBe(false);
  });

  it('garde la précédente ouverte tant que la courante n’est pas touchée', () => {
    const open = openQuestionKeys(qs([true, false]), null, new Set());
    expect(open.has('q0')).toBe(true);
    const touched = openQuestionKeys(qs([true, false]), null, new Set(['q1']));
    expect(touched.has('q0')).toBe(false);
  });

  it('ouvre la suivante dès que la courante est répondue et touchée', () => {
    const open = openQuestionKeys(
      qs([true, true, false]),
      'q1',
      new Set(['q1']),
    );
    expect(open.has('q1')).toBe(true);
    expect(open.has('q2')).toBe(true);
  });

  it('retombe sur la dernière quand tout est répondu', () => {
    const open = openQuestionKeys(qs([true, true, true]), null, new Set());
    expect(open.has('q2')).toBe(true);
  });

  it('respecte la question rouverte à la main', () => {
    const open = openQuestionKeys(qs([true, true, false]), 'q0', new Set());
    expect(open.has('q0')).toBe(true);
    expect(open.has('q2')).toBe(false);
  });

  it('ne rend rien sans question', () => {
    expect(openQuestionKeys([], null, new Set()).size).toBe(0);
  });
});
