# MOLECULINK Database Setup

You can upload the current files to GitHub first if you only need the simple pilot access system. It will work with localStorage.

Use Supabase when you want a database copy of student identities, progress, assessments, badges, certificates, and exports. The current website login is fixed pilot-code login, not Supabase Auth.

## Recommended Order

1. Create a Supabase project.
2. Run `supabase-schema.sql` in Supabase SQL Editor.
3. Confirm `students` contains `ML-STU-001` to `ML-STU-100`.
4. Confirm `teachers` contains `TEACHER` and `ADMIN`.
5. Upload the app files to GitHub.
6. Add live sync later only after you decide exactly which progress fields should be written online.

## What the Current Database Stores

- `students`: student identity, student code, hashed password, section, active status.
- `progress_records`: per-student activity progress, score, status, and completion time.
- `assessment_responses`: per-student answers and misconception tags.
- `badges`, `student_badges`, `certificates`, and `exit_tickets`: customized learner outputs.

## Supabase Steps

1. Go to Supabase and create a new project.
2. Open SQL Editor.
3. Paste the full contents of `supabase-schema.sql`.
4. Click Run.
5. Open Table Editor.
6. Check that the `students` table has 100 records.
7. Open the `teachers` table and check that `TEACHER` and `ADMIN` exist.

## Website Login

The website uses fixed pilot credentials from `app.js`:

- Students: `ML-STU-001 / PILOT001` through `ML-STU-100 / PILOT100`
- Teacher: `TEACHER / MOLECULINK2026`
- Admin: `ADMIN / ADMINMOLECULINK2026`

The old `verify_student_login` SECURITY DEFINER function is removed by the schema.

## Important Security Note

Do not share the service role key in GitHub. If you later add live database writes from the browser, use only the publishable key and add strict insert/update rules first.
