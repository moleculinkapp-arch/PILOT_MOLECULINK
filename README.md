# MOLECULINK Learning Ecosystem

This folder contains the multi-portal shell for the MOLECULINK Learning Ecosystem with a simple pilot access system.

## Preserved Student Portal

The full Student Portal is included in this package as `moleculink_refined.html`.

After a successful student login, the app redirects to the full student portal:

`moleculink_refined.html`

## Portal Structure

- Landing page: three animated cards for Student Learning Portal, Teacher Companion Portal, and Administrator Portal.
- Student login: Student ID and password.
- Teacher access: teacher username and password.
- Administrator access: administrator username and password.
- Teacher Companion Portal: functions as a teacher library with Start Here, Teaching Approach, Our Profile, Curriculum Map, Assessment Kit, Mission Guides, Differentiation Toolkit, Mission Clearance, References, and Printables.
- Administrator Portal: manages schools, teachers, student accounts, activities, certificates, badges, the research dashboard, exports, and backup tasks.

## Files Modified

- `index.html`: Reorganized the app into landing, separate login pages, preserved student link, teacher portal, administrator portal, and ecosystem footer.
- `styles.css`: Added responsive landing cards, login panels, handbook cards, admin/teacher tabs, rubric tables, and a more coherent footer.
- `app.js`: Added reusable rendering helpers, login routing, teacher library content, admin content, reset analytics views, rubrics, printables, and CSV/ID helpers.
- `pilot-data.js`: Starts with empty pilot records so progress reports and analytics reflect collected data only.
- `README.md`: Updated documentation to match the MOLECULINK Learning Ecosystem architecture.

## Pilot Access

Students:
`ML-STU-001 / PILOT001` through `ML-STU-100 / PILOT100`

Teacher:
`TEACHER / MOLECULINK2026`

Administrator:
`ADMIN / ADMINMOLECULINK2026`

After student login, the active learner profile is saved in localStorage as:

`moleculink_active_learner_profile`

The administrator portal includes a "Reset Pilot Data" button. It clears local pilot data on the current device only.

## Pilot Package Contents

For GitHub Pages, upload this folder with:

- `index.html`
- `moleculink_refined.html`
- mission video files and image assets used by the student portal
- `styles.css`
- `app.js`
- `pilot-data.js`
- `supabase-schema.sql`
- `DATABASE_SETUP.md`
- `README.md`

Do not keep the file named `index (1).html` for GitHub Pages. This fixed package uses `index.html`.

## Pilot Testing Checklist

Before school testing:

1. Open `moleculink-v2/index.html`.
2. Test Student login using `ML-STU-001 / PILOT001`.
3. Confirm the student route redirects to `moleculink_refined.html`.
4. Test Teacher login using `TEACHER / MOLECULINK2026`.
5. Test Administrator login using `ADMIN / ADMINMOLECULINK2026`.
6. In Admin Portal, generate the 100 fixed student accounts.
7. In Admin Portal, confirm the "Reset Pilot Data" button appears only after admin login.
6. Confirm the device has internet access for CDN-based fonts/icons/Tailwind, or prepare an offline build later.
7. Confirm videos load smoothly on the target school devices.
8. Use the Teacher Companion to record common misconceptions and feedback during implementation.

## Data Privacy Notes

MOLECULINK uses access codes during pilot testing to reduce unnecessary personal data collection. Learner, teacher, and pilot implementation data are used only for secure access, progress monitoring, feedback, certification, classroom support, and authorized research reporting.

The planned database should avoid collecting unnecessary personal information such as birthday, home address, phone number, or personal student email unless required by an approved school process.

## Database Configuration Later

1. Create a Supabase project.
2. Run `supabase-schema.sql` in the Supabase SQL editor.
3. Confirm the `students` table contains `ML-STU-001` to `ML-STU-100`.
4. Confirm the `teachers` table contains `TEACHER` and `ADMIN`.
5. Upload the website files to GitHub.
6. Add sync code and stricter policies later only when you are ready to store live progress online.
