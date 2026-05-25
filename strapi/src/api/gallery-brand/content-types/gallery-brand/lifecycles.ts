type MutationPayload = {
  data?: Record<string, unknown>;
};

function normalizeName(data: Record<string, unknown> | undefined) {
  if (!data || typeof data.name !== 'string') return;
  data.name = data.name.toUpperCase();
}

export default {
  beforeCreate(event: { params: MutationPayload }) {
    normalizeName(event.params.data);
  },
  beforeUpdate(event: { params: MutationPayload }) {
    normalizeName(event.params.data);
  },
};
