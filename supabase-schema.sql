-- MOLECULINK Pilot Database Schema
-- This version does NOT use Supabase Auth for pilot login.
-- The website uses fixed pilot credentials in app.js, then saves the active
-- learner profile in localStorage and redirects students to student.html.
--
-- Use this database for student identification, class records, progress,
-- assessment responses, badges, certificates, exports, and future sync.

create extension if not exists pgcrypto;

drop function if exists public.verify_student_login(text, text);

create table if not exists schools (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists sections (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references schools(id) on delete cascade,
  name text not null,
  grade_level text,
  created_at timestamptz default now(),
  unique (school_id, name)
);

create table if not exists teachers (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  display_name text not null,
  role text not null default 'teacher',
  school_id uuid references schools(id),
  section_id uuid references sections(id),
  created_at timestamptz default now()
);

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_code text unique not null,
  display_name text not null,
  password_hash text not null,
  school_id uuid references schools(id),
  section_id uuid references sections(id),
  is_active boolean default true,
  created_at timestamptz default now()
);

create table if not exists progress_records (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  activity_key text not null,
  activity_type text not null,
  status text not null,
  score numeric,
  max_score numeric,
  time_spent_seconds integer,
  completed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists assessment_responses (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  assessment_type text not null,
  item_number integer,
  response text,
  correct_answer text,
  is_correct boolean,
  misconception_tag text,
  created_at timestamptz default now()
);

create table if not exists uploads (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  activity_key text not null,
  file_path text not null,
  teacher_note text,
  uploaded_at timestamptz default now()
);

create table if not exists badges (
  id uuid primary key default gen_random_uuid(),
  badge_key text unique not null,
  label text not null,
  description text,
  criteria jsonb,
  created_at timestamptz default now()
);

create table if not exists student_badges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  badge_id uuid references badges(id) on delete cascade,
  awarded_at timestamptz default now(),
  unique(student_id, badge_id)
);

create table if not exists certificates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  certificate_code text unique not null,
  issued_at timestamptz default now(),
  certificate_url text
);

create table if not exists exit_tickets (
  id uuid primary key default gen_random_uuid(),
  student_id uuid references students(id) on delete cascade,
  learned jsonb,
  questions jsonb,
  rating integer check (rating between 1 and 5),
  suggestion text,
  created_at timestamptz default now()
);

create table if not exists audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_role text not null,
  actor_identifier text,
  action text not null,
  details jsonb,
  created_at timestamptz default now()
);

insert into schools (code, name)
values ('PILOT', 'MOLECULINK Pilot School')
on conflict (code) do update set name = excluded.name;

insert into sections (school_id, name, grade_level)
select id, 'Pilot Section', 'SHS'
from schools
where code = 'PILOT'
on conflict (school_id, name) do update set grade_level = excluded.grade_level;

insert into teachers (username, display_name, role, school_id, section_id)
select 'TEACHER', 'Pilot Teacher', 'teacher', schools.id, sections.id
from schools
join sections on sections.school_id = schools.id and sections.name = 'Pilot Section'
where schools.code = 'PILOT'
on conflict (username) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  school_id = excluded.school_id,
  section_id = excluded.section_id;

insert into teachers (username, display_name, role, school_id, section_id)
select 'ADMIN', 'Pilot Administrator', 'admin', schools.id, sections.id
from schools
join sections on sections.school_id = schools.id and sections.name = 'Pilot Section'
where schools.code = 'PILOT'
on conflict (username) do update set
  display_name = excluded.display_name,
  role = excluded.role,
  school_id = excluded.school_id,
  section_id = excluded.section_id;

insert into students (student_code, display_name, password_hash, school_id, section_id)
select
  'ML-STU-' || lpad(series.n::text, 3, '0') as student_code,
  'Learner ' || lpad(series.n::text, 3, '0') as display_name,
  crypt('PILOT' || lpad(series.n::text, 3, '0'), gen_salt('bf')) as password_hash,
  schools.id as school_id,
  sections.id as section_id
from generate_series(1, 100) as series(n)
cross join schools
join sections on sections.school_id = schools.id and sections.name = 'Pilot Section'
where schools.code = 'PILOT'
on conflict (student_code) do update set
  display_name = excluded.display_name,
  password_hash = excluded.password_hash,
  school_id = excluded.school_id,
  section_id = excluded.section_id,
  is_active = true;

insert into audit_logs (actor_role, actor_identifier, action, details)
values (
  'system',
  'schema',
  'pilot_schema_seeded',
  jsonb_build_object(
    'students', 100,
    'teacher_username', 'TEACHER',
    'admin_username', 'ADMIN',
    'auth_mode', 'fixed_pilot_credentials_in_app'
  )
);
