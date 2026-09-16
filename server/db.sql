-- MindCare NE: Supabase/PostgreSQL schema replacing MongoDB/Mongoose.
create extension if not exists pgcrypto;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  password text not null,
  role text not null default 'patient' check (role in ('patient','caregiver','doctor')),
  age integer,
  phone text,
  gender text,
  language text default 'English',
  emergency_contact text,
  specialization text,
  doctor_id uuid references public.users(id) on delete set null,
  doctor_request_status text not null default 'not_required' check (doctor_request_status in ('not_required','pending','accepted','denied')),
  doctor_request_at timestamptz,
  doctor_decision_at timestamptz,
  doctor_decision_note text,
  caregiver_id uuid references public.users(id) on delete set null,
  caregivers jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  memory numeric, attention numeric, orientation numeric, language numeric, total numeric,
  game text, game_accuracy numeric, reaction_time_ms numeric,
  ai_risk text check (ai_risk in ('Low','Moderate','High')),
  ai_probability numeric, ai_reasons jsonb not null default '[]'::jsonb,
  ai_recommendation text, ai_action text,
  created_at timestamptz not null default now()
);

create table if not exists public.game_results (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  game text, score numeric, duration numeric, mistakes numeric, level integer, accuracy numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  medicine text, dosage text, time text, frequency text not null default 'Daily',
  taken boolean not null default false, taken_at timestamptz,
  missed_count integer not null default 0, instructions text,
  notify_email boolean not null default true, notify_sms boolean not null default false,
  last_notified_key text, created_at timestamptz not null default now()
);

create table if not exists public.emergency_alerts (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.users(id) on delete cascade,
  message text not null default 'Emergency SOS alert sent by patient.',
  latitude numeric, longitude numeric, accuracy numeric, map_url text,
  status text not null default 'active' check (status in ('active','acknowledged','resolved')),
  created_at timestamptz not null default now(), acknowledged_at timestamptz, resolved_at timestamptz
);

create index if not exists idx_assessments_user_created on public.assessments(user_id, created_at desc);
create index if not exists idx_games_user_created on public.game_results(user_id, created_at desc);
create index if not exists idx_reminders_user_time on public.reminders(user_id, time);
create index if not exists idx_alerts_patient_created on public.emergency_alerts(patient_id, created_at desc);
create index if not exists idx_users_role on public.users(role);
create index if not exists idx_users_doctor on public.users(doctor_id);
create index if not exists idx_users_caregiver on public.users(caregiver_id);

-- Backend uses the service-role key. These policies keep the tables closed to the public/anon key.
alter table public.users enable row level security;
alter table public.assessments enable row level security;
alter table public.game_results enable row level security;
alter table public.reminders enable row level security;
alter table public.emergency_alerts enable row level security;
