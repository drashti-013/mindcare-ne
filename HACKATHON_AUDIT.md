# MindCare NE — Hackathon Audit & Fix List

## Requested changes completed
- Removed Card Memory game.
- Removed Day & Date game.
- Removed other retired game references: Odd One Out, Remember the Words, Number Sequence.
- Kept Memory Match with 3 automatic rounds and an Exit Game button.
- Kept Find the Number and added progressive Levels 1–4.
- Find the Number shows the target briefly, hides it, then asks the patient to find it.
- Game difficulty is capped at Level 4.
- Removed the professional AI Insights navigation entry and its dashboard shortcut.
- Removed the professional AI model/AI-flags dashboard cards.
- Removed the old Total cognitive score /40 display references.
- Daily Check-up game selection now contains only the two available games.
- Fixed a React state-update-during-render pattern in the Daily Check-up attention task.
- Added timer cleanup in the Daily Check-up to prevent stale timers after navigation.
- Fixed local-date handling for browser medicine notification keys.
- Added email delivery diagnostics and Test Email action.
- Added SMS delivery diagnostics and Test SMS action.
- Added Twilio SMS integration with Indian +91 normalization.
- Added SMTP verification for email configuration.
- Scheduled medicine notifications now use APP_TIMEZONE (default Asia/Kolkata).
- Scheduled reminders use a date+time notification key so two doses on the same day are not blocked by one earlier notification.
- Added reminder validation and phone-number requirement when SMS is enabled.
- Improved registration success/error styling.

## Security / architecture checks
- Authentication uses the existing stateless X-User-Id flow, with the user record validated against Supabase on every protected request.
- Patient accounts remain blocked until the selected doctor accepts the registration request.
- Doctor request approval is restricted to the doctor assigned to the patient request.
- SOS acknowledgement is restricted to the patient's assigned doctor/caregiver.
- MongoDB/Mongoose has been removed; Supabase service credentials and SMTP/Twilio secrets are not included in this ZIP.
- Voice calculation does not use eval/Function; it uses a restricted arithmetic parser.

## Static validation performed
- All server `.js` files pass Node syntax checking.
- All client `.jsx` files pass TypeScript JSX syntax transformation checks.
- All local client imports were checked; no missing local imports were found.
- Retired game and removed AI Insights strings were searched across client/server; no references were found.

## Runtime limitation
The audit environment did not have the required installed Node dependencies for a full runtime test. Server source files pass Node syntax validation. A real Supabase end-to-end test requires the project URL/key and an executed `server/db.sql` schema in the target Supabase project.

## Email/SMS requirement
Real email and carrier SMS cannot be sent by browser code alone. The application now contains the actual SMTP and Twilio integrations, but they require valid service credentials in `server/.env`.

For the hackathon demo:
1. Configure Gmail SMTP with a Gmail App Password (or another SMTP provider).
2. Configure Twilio Account SID, Auth Token and Twilio phone number for SMS.
3. Open Medicine & AI → Reminder delivery.
4. Use Test Email and Test SMS before demonstrating scheduled reminders.

## Suggested final manual test order
1. Register a Doctor.
2. Register a Caregiver.
3. Register a Patient, select the Doctor, and enter one or two caregiver records.
4. Confirm Doctor sees the pending request.
5. Accept the patient request and confirm the patient can log in.
6. Send SOS from patient and verify the doctor/caregiver sees the alert and map link after browser location permission is granted.
7. Play Memory Match through all 3 rounds.
8. Play Find the Number at Levels 1 → 4 and confirm it stops at Level 4.
9. Run Daily Check-up and select only Memory Match or Find the Number.
10. Add a medicine with the current default time, then test browser, email and SMS delivery.
11. Mark medicine taken and verify adherence changes.
12. Logout and confirm a protected page returns to login.

## v10 update (2026-09-16)
- Public landing page is now the unauthenticated `/` route; Sign In and Sign Up are separate entry points.
- Memory Match now uses a deterministic round transition with cleanup so Round 2/3 continues automatically instead of getting stuck on the loading message.
- Find the Number now progresses continuously through Levels 1 → 4 in one session and then stops at Level 4.
- Added a third attractive cognitive game: Memory Pattern, with four visual-memory levels.
- Game cards and visual-memory UI received additional CSS polish; games are explicitly framed as exercises rather than exam/semester questions.
- SOS now sends both email and SMS to linked doctor/caregiver accounts and also supports caregiver email/phone entered directly during patient registration.
- SOS professional view displays patient phone/email and direct call/email actions.
- Patient medicine reminders can target both the registered patient email and phone; delivery status/test controls remain available.
- Profile now shows registered email/phone and doctor specialization where applicable.


## v10.1 revision
- Reworked Patient Daily Check-up into AI Memory Check-up activities: Visual Memory, Word Recall, and Number Recall. Removed academic/semester-style check-up tasks (orientation, language naming, and reaction-time test) from the patient flow.
- Daily Check-up now progresses through four levels and sends the current memory-game accuracy into the explainable AI prototype.
- Hardened Memory Match round controller so automatic rounds cannot remain on the round-complete state; round transitions use a dedicated deterministic timer and cleanup.

## v11 database migration
- Replaced MongoDB/Mongoose with Supabase PostgreSQL.
- Added `server/db.sql` with users, assessments, game_results, reminders and emergency_alerts tables, relationships, indexes and RLS.
- Replaced MongoDB queries in auth, games, assessments, reminders, dashboard, emergency and auth middleware with Supabase/PostgreSQL queries.
- Replaced the MongoDB startup connection and medicine-notification queries with Supabase queries.
- Removed Mongoose dependency and model files.
