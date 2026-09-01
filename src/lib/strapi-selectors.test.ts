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

  const semaine = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];

  it('groupe les jours consécutifs de même horaire en une rangée', () => {
    const h = selectStudioHours(
      settings({ openingHours: semaine.map((d) => jour(d)) }),
    );
    expect(h.rows).toHaveLength(2);
    expect(h.rows[0].label.fr).toBe('lun — ven');
    expect(h.rows[0].value.fr).toBe('10:00 — 18:00');
    expect(h.rows[0].kind).toBe('hours');
    // Samedi et dimanche absents de la donnée : fermés, et regroupés.
    expect(h.rows[1].label.fr).toBe('sam — dim');
    expect(h.rows[1].value.fr).toBe('Fermé');
    expect(h.rows[1].kind).toBe('status');
  });

  // Le défaut que cette forme corrige : le libellé était écrit en dur.
  it('dérive le libellé de la donnée, sans supposer lundi–vendredi', () => {
    const h = selectStudioHours(
      settings({
        openingHours: [
          jour('monday', { closed: true }),
          ...['tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map(
            (d) => jour(d),
          ),
          jour('sunday', { closed: true }),
        ],
      }),
    );
    expect(h.rows.map((r) => [r.label.fr, r.value.fr])).toEqual([
      ['lun', 'Fermé'],
      ['mar — sam', '10:00 — 18:00'],
      ['dim', 'Fermé'],
    ]);
  });

  it('ne fusionne pas deux groupes de même horaire qui ne se suivent pas', () => {
    const h = selectStudioHours(
      settings({
        openingHours: [
          jour('monday'),
          jour('tuesday'),
          jour('wednesday', { closed: true }),
          jour('thursday'),
          jour('friday'),
        ],
      }),
    );
    expect(h.rows.map((r) => r.label.fr)).toEqual([
      'lun — mar',
      'mer',
      'jeu — ven',
      'sam — dim',
    ]);
  });

  it('distingue un statut d’une plage', () => {
    const h = selectStudioHours(
      settings({
        openingHours: [
          ...semaine.map((d) => jour(d)),
          jour('saturday', { byAppointment: true }),
          jour('sunday', { byAppointment: true }),
        ],
      }),
    );
    const weekend = h.rows[h.rows.length - 1];
    expect(weekend.label.fr).toBe('sam — dim');
    expect(weekend.value.fr).toBe('Sur rendez-vous');
    expect(weekend.value.en).toBe('By appointment');
    expect(weekend.kind).toBe('status');
    expect(weekend.opens).toBeUndefined();
  });

  it('expose des bornes normalisées pour le JSON-LD', () => {
    const h = selectStudioHours(
      settings({ openingHours: [jour('monday', { opensAt: '09:30:00.000' })] }),
    );
    expect(h.rows[0].days).toEqual(['monday']);
    expect(h.rows[0].opens).toBe('09:30');
    expect(h.rows[0].closes).toBe('18:00');
  });

  // La forme héritée porte son libellé dans la phrase : « Lun–Ven 10:00–18:00 ».
  // C'est ce préfixe qu'on lit, au lieu de le jeter pour imprimer « Lun — Ven ».
  it('lit le préfixe de jour de la phrase héritée au lieu de le supposer', () => {
    const h = selectStudioHours(
      settings(
        { hours: 'Mar–Sam 10:00–18:00' },
        { hours: 'Tue–Sat 10:00–18:00' },
      ),
    );
    expect(h.rows).toHaveLength(1);
    expect(h.rows[0].label.fr).toBe('Mar — Sam');
    expect(h.rows[0].label.en).toBe('Tue — Sat');
    expect(h.rows[0].value.fr).toBe('10:00–18:00');
    expect(h.rows[0].kind).toBe('hours');
    // Les jours servent le JSON-LD : mardi à samedi, pas lundi à vendredi.
    expect(h.rows[0].days).toEqual([
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
    ]);
    expect(h.rows[0].opens).toBe('10:00');
    expect(h.rows[0].closes).toBe('18:00');
  });

  it('classe « sur demande » comme un statut, sans bornes', () => {
    const h = selectStudioHours(
      settings({ weekendHours: 'Sam–Dim sur demande' }),
    );
    expect(h.rows[0].label.fr).toBe('Sam — Dim');
    expect(h.rows[0].value.fr).toBe('sur demande');
    expect(h.rows[0].kind).toBe('status');
    expect(h.rows[0].opens).toBeUndefined();
  });

  it('rend la phrase entière quand le préfixe ne nomme pas un jour', () => {
    const h = selectStudioHours(settings({ hours: 'Ouvert en continu' }));
    expect(h.rows).toHaveLength(1);
    expect(h.rows[0].label.fr).toBe('');
    expect(h.rows[0].value.fr).toBe('Ouvert en continu');
  });

  it('ne renvoie aucune rangée quand rien n’est renseigné', () => {
    expect(selectStudioHours(settings({})).rows).toEqual([]);
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
