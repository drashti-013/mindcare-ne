# MindCare NE — AI Cognitive Care Platform

## Updated features
- Patient, caregiver and doctor role-based experience
- Stateless role-based authentication using the existing X-User-Id flow
- Patient registration requires selecting a registered doctor
- Doctor receives pending patient requests and can Accept/Deny them
- Patient can add up to 2 caregivers with name, contact, email and gender
- General-purpose browser voice assistant with navigation, date/time, simple actions and natural fallback
- Two progressive cognitive games: Memory Match and Find the Number (maximum Level 4); other game types removed
- Daily Check-up with an individual game signal
- Medicine reminders with browser/in-app notifications plus optional SMTP email and Twilio SMS
- SOS with browser GPS location, Google Maps link and optional email escalation

## Run
1. Copy `server/.env.example` to `server/.env` and set `SUPABASE_URL` and the server-only `SUPABASE_SERVICE_ROLE_KEY`.
2. In `server`: `npm.cmd install` then `npm.cmd run dev`.
3. In `client`: `npm.cmd install` then `npm.cmd run dev`.
4. Open `http://localhost:5173`.

## Supabase database setup
1. Create a Supabase project.
2. Open **SQL Editor** and run `server/db.sql`.
3. In Supabase Project Settings → API, copy the Project URL and the **service role key** into `server/.env` as `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Keep the service role key server-side only.
4. Install server dependencies so `@supabase/supabase-js` is available.
5. Start the server; `/api/health` reports `database: supabase` when the connection is working.

The MongoDB/Mongoose layer has been removed. The existing API/UI behavior is preserved while database queries now use PostgreSQL through Supabase. The CSV in `server/data/cognitive_dataset.csv` remains the synthetic ML training dataset used by the AI engine; it is not application database storage.

## Doctor/patient flow
1. Create a Doctor account first.
2. Create a Patient account and select the Doctor from the dropdown.
3. Patient can add up to two caregiver records. If a caregiver account already exists with the entered email, it is linked automatically.
4. The patient sees a pending message and cannot log in until the selected doctor accepts the request.
5. Doctor opens **My Patients → Pending doctor registration requests** and chooses Accept or Deny.

## Medicine email/SMS
1. Email requires SMTP credentials (Gmail App Password is suitable for a demo).
2. SMS requires a Twilio account/number; there is no reliable way for a web app to send carrier SMS without an SMS provider.
3. Use Medicine & AI → Reminder delivery → Test Email/Test SMS before the demo.

## SOS location
The browser asks the patient for location permission when they request the current location or send SOS. Coordinates are stored with the emergency alert and can be opened in Google Maps.

AI outputs are demonstration decision-support signals, not a diagnosis or prescription.
