import { describe, expect, it } from 'vitest';
import { outboundTarget } from './outbound';

const SITE = 'e-do.studio';

describe('outboundTarget', () => {
  it('reconnaît le téléphone et l’e-mail', () => {
    expect(outboundTarget('tel:+33144041149', SITE)).toBe('tel');
    expect(outboundTarget('mailto:contact@e-do.studio', SITE)).toBe('email');
  });

  it('réduit un lien sortant à son domaine, sans www', () => {
    expect(
      outboundTarget('https://www.instagram.com/edostudio/?hl=fr', SITE),
    ).toBe('instagram.com');
    expect(outboundTarget('https://www.giggster.com/listing/123', SITE)).toBe(
      'giggster.com',
    );
  });

  it('ignore les liens internes, relatifs ou absolus', () => {
    expect(outboundTarget('/fr/reserver', SITE)).toBeNull();
    expect(outboundTarget('https://e-do.studio/fr/contact', SITE)).toBeNull();
    expect(outboundTarget('https://www.e-do.studio/fr', SITE)).toBeNull();
    expect(outboundTarget('#contenu', SITE)).toBeNull();
  });

  it('ignore les autres protocoles', () => {
    expect(outboundTarget('javascript:void(0)', SITE)).toBeNull();
  });
});
