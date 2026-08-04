// Les six `select*` sont des fonctions pures extraites du fetcher partagé
// `site-setting`. Elles ne touchent jamais les Map de cache du module, ce qui
// rend leur test sûr — contrairement aux `fetch*` qui, eux, fuiteraient de
// l'état entre cas.
import { describe, expect, it } from 'vitest';
import {
  type SiteSettings,
  selectAnnouncement,
  selectContact,
  selectSiteBusinessInfo,
  selectSocialLinks,
  selectStudioHours,
} from './strapi';

const settings = (fr: object, en: object = fr): SiteSettings =>
  ({ fr, en }) as SiteSettings;

describe('selectSocialLinks', () => {
  it('projette la forme Strapi vers la forme applicative', () => {
    const s = settings({
      socialLinks: [
        { platform: 'instagram', label: 'IG', url: 'https://insta.test' },
      ],
    });
    expect(selectSocialLinks(s)).toEqual([
      { k: 'instagram', label: 'IG', href: 'https://insta.test' },
    ]);
  });

  it('renvoie une liste vide quand le champ est absent', () => {
    expect(selectSocialLinks(settings({}))).toEqual([]);
  });
});

describe('selectContact', () => {
  it('privilégie le composant `address` sur les champs à plat', () => {
    const c = selectContact(
      settings({
        phone: '01 44 04 11 49',
        email: 'contact@e-do.studio',
        street: 'ancienne rue',
        city: 'Ancienne ville',
        postalCode: '00000',
        address: {
          street: '69 boulevard Victor Hugo',
          city: 'Saint-Ouen',
          postalCode: '93400',
        },
      }),
    );
    expect(c.address.street).toBe('69 boulevard Victor Hugo');
    expect(c.address.city).toBe('Saint-Ouen');
  });

  it('retombe sur les champs à plat sans composant `address`', () => {
    const c = selectContact(
      settings({
        phone: '01',
        email: 'a@b.c',
        street: 'rue à plat',
        city: 'Paris',
        postalCode: '75001',
      }),
    );
    expect(c.address.street).toBe('rue à plat');
  });

  it('dérive un lien tel: quand phoneHref manque', () => {
    const c = selectContact(
      settings({ phone: '01 44 04 11 49', email: 'a@b.c' }),
    );
    expect(c.phoneHref).toBe('tel:0144041149');
  });

  it('respecte un phoneHref explicite', () => {
    const c = selectContact(
      settings({ phone: '01 44', phoneHref: 'tel:+33144', email: 'a@b.c' }),
    );
    expect(c.phoneHref).toBe('tel:+33144');
  });

  it('ne fabrique pas de mailto quand l’e-mail est vide', () => {
    expect(selectContact(settings({ phone: '', email: '' })).emailHref).toBe(
      '',
    );
  });
});

describe('selectStudioHours', () => {
  const jour = (dayOfWeek: string, over: object = {}) => ({
    dayOfWeek,
    opensAt: '10:00:00.000',
    closesAt: '18:00:00.000',
    closed: false,
    ...over,
  });

  it('résume une plage identique sur les jours ouvrés', () => {
    const h = selectStudioHours(
      settings({
        openingHours: [
          jour('monday'),
          jour('tuesday'),
          jour('wednesday'),
          jour('thursday'),
          jour('friday'),
        ],
      }),
    );
    expect(h.weekday.fr).toBe('10:00 — 18:00');
  });

  it('annonce « Fermé » quand aucun jour n’est ouvert', () => {
    const h = selectStudioHours(
      settings({ openingHours: [jour('saturday', { closed: true })] }),
    );
    expect(h.weekend.fr).toBe('Fermé');
    expect(h.weekend.en).toBe('Closed');
  });

  it('annonce « Sur rendez-vous » quand le week-end l’exige', () => {
    const h = selectStudioHours(
      settings({
        openingHours: [
          jour('saturday', { byAppointment: true }),
          jour('sunday', { byAppointment: true }),
        ],
      }),
    );
    expect(h.weekend.fr).toBe('Sur rendez-vous');
    expect(h.weekend.en).toBe('By appointment');
  });

  it('retombe sur les champs texte hérités sans openingHours', () => {
    const h = selectStudioHours(
      settings({ hours: '10 h – 18 h' }, { hours: '10am – 6pm' }),
    );
    expect(h.weekday.fr).toContain('10');
    expect(h.weekday.en).toContain('10am');
  });
});

describe('selectAnnouncement', () => {
  it('renvoie les deux langues', () => {
    const a = selectAnnouncement(
      settings(
        { announcement: 'Studio climatisé' },
        { announcement: 'Air-conditioned' },
      ),
    );
    expect(a).toEqual({ fr: 'Studio climatisé', en: 'Air-conditioned' });
  });

  it('renvoie des chaînes vides quand rien n’est publié', () => {
    expect(selectAnnouncement(settings({}))).toEqual({ fr: '', en: '' });
  });
});

describe('selectSiteBusinessInfo', () => {
  it('retient EUR par défaut', () => {
    expect(selectSiteBusinessInfo(settings({})).currency).toBe('EUR');
  });

  it('apparie les fermetures FR et EN par position', () => {
    const b = selectSiteBusinessInfo(
      settings(
        {
          closures: [
            { startsAt: '2026-08-01', endsAt: '2026-08-15', label: 'Août' },
          ],
        },
        {
          closures: [
            { startsAt: '2026-08-01', endsAt: '2026-08-15', label: 'August' },
          ],
        },
      ),
    );
    expect(b.closures).toHaveLength(1);
    expect(b.closures[0].label).toEqual({ fr: 'Août', en: 'August' });
  });

  it('retombe sur le libellé FR quand la traduction manque', () => {
    const b = selectSiteBusinessInfo(
      settings(
        { closures: [{ startsAt: 'a', endsAt: 'b', label: 'Août' }] },
        { closures: [] },
      ),
    );
    expect(b.closures[0].label).toEqual({ fr: 'Août', en: 'Août' });
  });
});
