import { errors } from '@strapi/utils';

const REQUIRED_COUNT = 3;

type MutationPayload = {
  data?: Record<string, unknown>;
};

function asArray(value: unknown): unknown[] | null {
  if (value == null) return [];
  if (Array.isArray(value)) return value;
  // The admin and the public REST API send the full target array on write
  // (either as `[id, id, ...]` or `[{ id }, ...]`). The relation-style
  // `{ connect, disconnect, set }` payload is theoretically possible via
  // custom callers — we cannot tell the resulting count from the patch
  // alone, so skip those (return null) rather than guess.
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>;
    if (Array.isArray(v.set)) return v.set;
  }
  return null;
}

function countField(data: Record<string, unknown>, key: string): number | null {
  if (!(key in data)) return 0;
  const list = asArray(data[key]);
  return list == null ? null : list.length;
}

function assertTotalThree(data: Record<string, unknown> | undefined) {
  if (!data || !('media' in data || 'embeds' in data)) return;
  const mediaCount = countField(data, 'media');
  const embedCount = countField(data, 'embeds');
  // A relation-style patch (`{ connect, … }`) yields null — we can't infer the
  // resulting count from the patch alone, so skip rather than guess.
  if (mediaCount == null || embedCount == null) return;
  const total = mediaCount + embedCount;
  if (total !== REQUIRED_COUNT) {
    throw new errors.ValidationError(
      `gallery-project doit contenir exactement ${REQUIRED_COUNT} contenus au total (media + embeds), reçu : ${total}. Ajoutez ou retirez des fichiers ou des liens iframe.`,
    );
  }
}

export default {
  beforeCreate(event: { params: MutationPayload }) {
    assertTotalThree(event.params.data);
  },
  beforeUpdate(event: { params: MutationPayload }) {
    assertTotalThree(event.params.data);
  },
};
