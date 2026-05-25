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

function assertExactlyThree(data: Record<string, unknown> | undefined) {
  if (!data || !('media' in data)) return;
  const list = asArray(data.media);
  if (list == null) return;
  if (list.length !== REQUIRED_COUNT) {
    throw new errors.ValidationError(
      `gallery-project.media doit contenir exactement ${REQUIRED_COUNT} fichiers (reçu : ${list.length}). Ajoutez ou retirez des médias.`,
    );
  }
}

export default {
  beforeCreate(event: { params: MutationPayload }) {
    assertExactlyThree(event.params.data);
  },
  beforeUpdate(event: { params: MutationPayload }) {
    assertExactlyThree(event.params.data);
  },
};
