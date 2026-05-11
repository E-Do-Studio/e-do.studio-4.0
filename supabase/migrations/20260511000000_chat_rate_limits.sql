create table if not exists chat_rate_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  window_kind text not null check (window_kind in ('short', 'daily')),
  count int not null default 0,
  primary key (ip_hash, window_kind, window_start)
);

create index if not exists chat_rate_limits_lookup_idx
  on chat_rate_limits (ip_hash, window_kind, window_start);

alter table chat_rate_limits enable row level security;
-- No policy: only the edge function (service role) reads/writes this table.
