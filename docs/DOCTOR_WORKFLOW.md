# Doctor dashboard: what changed after the review

## 1. Deploy checklist
1. **Database**: already applied to the Supabase project (`doctor_clinical_workflow`, `ward_workflow`, `seed_common_icd10_codes`,
   `data_cleanup_doctor_review`) and registered in Laravel's `migrations` table. Elsewhere run `php artisan migrate`.
2. **Full ICD-10 list** (optional): `php artisan icd10:import`. The database ships with ~150 common diagnoses so search works
   immediately. The bundled file is an *older* ICD-10-CM vintage; for current billing codes import the annual CMS release instead
   (`php artisan icd10:import my-file.csv`, columns `code,description`).
3. **Frontend**: `pnpm install && pnpm dev` (no new packages this round).
4. **Doctors**: set the licence number under *Profile* (printed on prescriptions and letters) and review *My schedule*.

## 2. The clinical workflow (review section 1)
`My queue` / dashboard / appointments → **Start visit** → encounter screen:

| Block | Notes |
|---|---|
| Patient safety header | allergies, chronic conditions, current medications, always visible |
| Vitals | BP, pulse, temp, SpO₂, resp. rate, weight, height (BMI calculated) with range checks |
| SOAP notes | Subjective / Objective / Assessment / Plan |
| Diagnosis | ICD-10 type-ahead search + free text |
| Prescription | dose, frequency, duration; **allergy warning** if a medicine matches a recorded allergy; print / save as PDF |
| Lab & imaging orders | results show in the visit; doctor marks reviewed; critical values raise an alert |
| Letters | sick note, referral letter (printable; patient can print them from the portal too) |
| Follow-up | days + note, and optionally **books the next appointment** on completion |
| Services & billing | become invoice lines on completion (added to the booking invoice if one exists) |
| Complete & sign | locks the note, completes the appointment, bills, publishes to the patient |

* **Autosave** every few seconds; a snapshot of the previous content is kept (at most one per 5 minutes of editing and always on signing).
* **Signed notes are locked.** Corrections are append-only **addenda**; sharing toggles can still change.
* Patients only ever see **signed** visits, and only the parts the doctor shares (diagnosis / vitals / notes).

## 3. Access control and security (review section 5)
* One rule, `App\Services\PatientAccess`: a doctor may open a patient only with a **care relationship** (a live appointment, a visit or an
  admission under their name; cancelled / no-show do not count). It now guards the patient record, chart, history, visits, lab orders and
  results, vaccinations, documents and staff messaging. Previously only the patient controller enforced it.
* **Break the glass**: a doctor can open any other record with a written reason (≥ 15 characters). Access lasts 4 hours, is audited, notifies
  admins and appears in **Admin → Emergency Access** for review (appropriate / inappropriate).
* "Find any patient" returns only name, MRN and date of birth. Searches are logged (the search term is not).
* Idle **lock screen** after 10 min (password to unlock, survives refresh) and sign-out after 30 min. Ctrl+Shift+L locks immediately.
* Session list with per-device sign-out; optional 2FA is available on the Profile page.
* Test: `tests/Feature/PatientAccessTest.php` (needs PostgreSQL; skipped on the default SQLite config).

## 4. Fixes from the review's bug list
| Finding | Cause / fix |
|---|---|
| Past appointments still "Scheduled" | 161 of 163 were open: new *Needs update* tab, row actions, and a front-desk bulk action (never touches appointments with an unsigned note) |
| 59 vs 58 appointments | 51 rows had a department different from their doctor's and 2 had none, and the portal booking code never set it. Data corrected, code fixed |
| Pediatrics doctor in Cardiology | her profile was misassigned: corrected |
| Double bookings / weekends / breaks / 12:29 | old seed data from before the guard. New bookings, including staff bookings and reschedules, are validated on the server and by the database; only front desk/admin can override, with a logged reason |
| "Good evening, Dr." | greeting used the first word of the name |
| Chart dipping below zero | switched to monotone interpolation |
| "▲ 0%" green, "100%" for 1 vs 0 | flat is neutral grey; tiny bases show "+1" instead of a percentage |
| Cut-off department labels | horizontal bars with full names, values and a scale |
| Raw activity log text | readable, linked, de-duplicated ("You viewed Ava King's record ×8") |
| Lowercase names | names typed all-lower/upper are tidied on save (mixed case such as "McDonald" is left alone); 3 existing rows corrected |
| Mixed date formats | one house format (`26 Oct 2026`, 24 h) via shared helpers |
| Doctor sees hospital revenue | removed from the doctor's dashboard payload and screen |
| Role vs Position duplicated | Position is hidden when it just repeats the role |
| Specialization vs department | *specialization* = what the doctor treats; *department* = the unit they work in; the department is hidden where it only repeats the specialty |
| Inconsistent page widths | working screens fill one capped container; forms are left-aligned |
| Orange dot with 0 maintenance beds | legend entries with zero beds are hidden |
| Gender/name "mismatches" | random fake test data; intentionally not changed |

## 5. Not done (needs product decisions or new data models)
* **Visit types with different lengths** (consultation 30 min, follow-up 15 min), recurring leave and public holidays.
* **On-call roster, referral workflow between doctors, department announcements** (My Department now shows colleagues' availability only).
* Ward extras: **isolation flag UI, nursing notes**. Discharge summary, transfer, expected discharge, length of stay and cleaning status *are* done.
* Message **attachments**; read-receipts beyond "read".
* Signature/stamp image on prescriptions (licence number is printed instead).
* Dedicated tablet/phone layout work for the encounter screen (it is responsive, but has not been tested on real devices).
* **Not verified here**: the Laravel API could not be started in the build sandbox (PHP 8.3 vs the PHP 8.4 your lockfile needs). PHP syntax, routes,
  relations and the pure logic (slots, buffers, caps, name tidying, TOTP, uploads, Stripe signatures) are checked; the database SQL was run on
  PostgreSQL; the frontend passes lint and a production build. Run the feature test and click through the flows once on your machine.
