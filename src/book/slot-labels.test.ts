import { describe, expect, it } from 'vitest';
import type { SlotState } from '../lib/booking-engine';
import { buildSlotLabels } from './slot-labels';

const slots = (entries: Record<string, SlotState>) => entries;

describe('buildSlotLabels', () => {
  it('rend le nom du plateau nu quand il est unique', () => {
    const labels = buildSlotLabels(
      ['live#0'],
      slots({ 'live#0': { plateauKey: 'live' } }),
      'fr',
    );
    expect(labels).toHaveLength(1);
    expect(labels[0].label).toBe('Live');
    expect(labels[0].duplicated).toBe(false);
    expect(labels[0].occurrence).toBe(1);
  });

  it('suffixe les créneaux qui partagent un plateau', () => {
    const labels = buildSlotLabels(
      ['live#0', 'live#1'],
      slots({
        'live#0': { plateauKey: 'live' },
        'live#1': { plateauKey: 'live' },
      }),
      'fr',
    );
    expect(labels.map((l) => l.label)).toEqual(['Live 01', 'Live 02']);
    expect(labels.every((l) => l.duplicated)).toBe(true);
  });

  it('compte le rang par plateau, pas par position dans la liste', () => {
    const labels = buildSlotLabels(
      ['live#0', 'eclipse#1', 'live#2'],
      slots({
        'live#0': { plateauKey: 'live' },
        'eclipse#1': { plateauKey: 'eclipse' },
        'live#2': { plateauKey: 'live' },
      }),
      'fr',
    );
    expect(labels.map((l) => l.label)).toEqual([
      'Live 01',
      'Eclipse',
      'Live 02',
    ]);
    expect(labels[1].duplicated).toBe(false);
  });

  it("retombe sur l'identifiant quand il sert directement de clé de plateau", () => {
    const labels = buildSlotLabels(['cyclorama'], slots({}), 'fr');
    expect(labels[0].plateauKey).toBe('cyclorama');
    expect(labels[0].plateau?.isCyclo).toBe(true);
  });

  it('suit la langue demandée', () => {
    const fr = buildSlotLabels(['visite'], slots({}), 'fr')[0].name;
    const en = buildSlotLabels(['visite'], slots({}), 'en')[0].name;
    expect(fr).not.toBe(en);
  });

  it('laisse `plateau` indéfini pour une clé inconnue et garde la clé comme nom', () => {
    const labels = buildSlotLabels(['inconnu'], slots({}), 'fr');
    expect(labels[0].plateau).toBeUndefined();
    expect(labels[0].label).toBe('inconnu');
  });
});
