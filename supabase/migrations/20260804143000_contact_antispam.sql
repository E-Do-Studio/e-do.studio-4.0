-- Anti-spam for the public contact form.
--
-- Until now a contact submission left no trace in Postgres: it existed only in
-- Resend and HubSpot. Persisting every submission — delivered or rejected —
-- makes the filter auditable, so a wrongly blocked human is recoverable.

create table if not exists contact_submissions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  nom text not null,
  email text not null,
  telephone text not null,
  societe text not null,
  message text not null,
  ip_hash text,
  spam_score int not null default 0,
  spam_reason text[] not null default '{}',
  delivered boolean not null default false
);

create index if not exists contact_submissions_created_at_idx
  on contact_submissions (created_at desc);
create index if not exists contact_submissions_email_idx
  on contact_submissions (email);

alter table contact_submissions enable row level security;
-- No policy: only the edge function (service role) reads/writes this table.

-- Mirrors chat_rate_limits. A separate table keeps the contact form's budget
-- independent from the chatbot's.
create table if not exists contact_rate_limits (
  ip_hash text not null,
  window_start timestamptz not null,
  window_kind text not null check (window_kind in ('short', 'daily')),
  count int not null default 0,
  primary key (ip_hash, window_kind, window_start)
);

alter table contact_rate_limits enable row level security;
-- No policy: only the edge function (service role) reads/writes this table.
