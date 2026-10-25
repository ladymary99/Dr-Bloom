# Patient portal: setup, behaviour and security notes

## 1. Deploy checklist
1. **Database** – the Supabase project already has the new schema applied (migrations
   `add_availability_and_double_booking_guard` and `complete_patient_portal`, registered in Laravel's
   `migrations` table). On any other environment run `php artisan migrate`; the SQL is idempotent
   (`hms-backend/database/sql/portal_complete.sql`).
2. **Env** – copy the new variables from `hms-backend/.env.example`. Set `APP_TIMEZONE` to the clinic's
   timezone, a real `MAIL_*` provider, and `FRONTEND_URL`.
3. **Scheduler** – `php artisan schedule:work` (dev) or a cron entry running `schedule:run` every minute.
   It sends 24 h and 1 h appointment reminders.
4. **Stripe (optional)** – set `STRIPE_SECRET` and `STRIPE_WEBHOOK_SECRET`, and point a webhook for
   `checkout.session.completed` and `checkout.session.expired` at `POST /api/webhooks/stripe`.
5. **Doctors** – each doctor sets working hours, breaks, slot length, days off, fee and public profile under
   *My Schedule*. Until then they get Mon–Fri 09:00–17:00 (lunch 13:00–14:00), which was back-filled.
6. **Frontend** – `NEXT_PUBLIC_API_URL`, optional `NEXT_PUBLIC_CURRENCY` (default USD).

## 2. How the pieces connect
| Patient portal | Staff side |
|---|---|
| Book / cancel / reschedule | Doctor *My Schedule* (hours, days off) · Reception *Appointments* (same rules, same DB guard) |
| Visit summaries | Doctor consult screen: per-visit toggles for diagnosis / vitals / notes |
| Lab & imaging results | Lab screen: attach file, **Release to patient** (hidden until released) |
| Prescriptions (printable) | Doctor consult → pharmacy dispenses |
| Vaccinations | Patient record → Vaccinations (doctors) |
| Invoices, receipts, claims | Payments → **Manage** (items, record payment, refund, claim) · *Insurance Claims* |
| Messages | Staff *Messages* inbox (doctor-addressed or general front-desk inbox) |
| Documents | Doctor/admin see them on the patient record |
| Notifications bell + centre | Same component and API for staff and patients |
| Settings → Privacy & data | Admin *Privacy Requests* (export / erasure workflow) |

## 3. Rules enforced
* **No double booking**: Postgres exclusion constraint `no_double_booking` (per doctor, active statuses, from
  2026-10-23). Older rows that already overlapped are exempt so they did not need to be altered.
* **Slots** are computed server-side from hours − breaks − days off − existing bookings, with a 30 min lead.
* **Cancel / reschedule cutoff**: setting `cancellation_cutoff_hours` (default 2). Staff are not bound by it.
* Statuses: `scheduled` (shown as *Pending*), `confirmed`, `checked_in`, `completed`, `cancelled`, `no_show`.
  Closed states are final.
* **Invoices** derive paid amount/status from the `payments` ledger: `pending → partial → paid`, `refunded`.
  Numbers (`INV-`, `RCT-`, `MRN-`) come from DB sequences, never from `count()+1`.

## 4. Security & privacy
* **RLS**: every table has RLS on and *no policies*, so the Supabase Data API (anon/authenticated) can read
  nothing; new tables also have all grants revoked. The app talks to Postgres only through the Laravel
  backend role. Patient-scoping is enforced in the API (`$request->user()->patient`), not by RLS policies,
  because the app does not use Supabase Auth.
* Files live on Laravel's private `local` disk and are streamed through authenticated endpoints. There are no
  public URLs and no public buckets.
* Uploads are validated on the server: extension allow-list, real MIME sniffing, magic bytes, size cap,
  double-extension, PDF scripts/launch actions, macros. `scan_status` is `unscanned` unless
  `CLAMAV_ENABLED=true` (then it fails closed).
* Audit log entries for views/changes of patient data, bookings, payments, results and privacy actions.
* Encrypted columns: phone, national id, emergency phone, insurance policy number, 2FA secret.
* Login: per-IP throttle + per-account lockout (5 failures → 15 min); optional TOTP 2FA for every role;
  tokens expire after `SANCTUM_EXPIRATION`; portal idle timeout 14 min + 60 s warning.
* Stripe webhook: HMAC signature + 5 min replay window, idempotent, amount must match.

## 5. Known limits / still to do
* **Telehealth** uses a Jitsi room link (or `telehealth_base_url` setting). Public Jitsi is not a
  HIPAA-grade product; point the setting at a self-hosted or BAA-covered provider for production.
* No separate *nurse* / *receptionist* clinical restrictions beyond existing permissions; documents are limited
  to admin + doctors as before.
* **Backups**: enable Supabase PITR / daily backups in the dashboard (plan-dependent); not configurable from code.
* Field-level encryption does not cover clinical text (diagnosis, notes) - consider it before storing
  highly sensitive categories.
* Azerbaijani/Russian strings cover navigation, statuses and main actions; have a native speaker review them
  and extend `src/lib/i18n.ts` for remaining screens.
* PDF receipts/prescriptions use the browser's *Print → Save as PDF* (no server PDF dependency).
