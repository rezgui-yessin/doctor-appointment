# Chartwell — Angular frontend for the Doctor Appointment System

An Angular 18 (standalone components, signals) frontend for the Spring Boot
Doctor Appointment API. Patients book visits, doctors manage their day,
admins run the roster.

## Design concept

The whole UI is built around the idea of a **physician's day ledger** —
ruled paper, index-card records, and a stamped-confirmation moment when a
booking goes through. The signature piece is the booking screen: instead of
a generic button grid, available times are rendered as a vertical ruled
"day sheet," with booked slots crossed out and open ones ready to be
selected. See `src/styles.scss` for the shared design tokens (colors, type,
spacing) and `src/app/features/appointments/booking/` for the ledger picker.

The palette is a calming health & wellness green (deep pine `--ink`, sage
`--sage`, warm amber `--amber` for calls to action) rather than a clinical
blue — see the `:root` block at the top of `src/styles.scss` to retune it.

Login, register, and the doctor roster use real photography (free-license,
sourced from Unsplash — no attribution required, but credit: photos by
Vitaly Gariev) instead of illustrations or initials-only avatars. Since the
API doesn't store a doctor photo, the roster cycles through two portrait
photos as placeholders — see `avatarPhotos` in `doctor-list.component.ts`
if you'd rather wire up a real `photoUrl` field once the backend has one.

## Requirements

- Node.js 18+ and npm
- The Spring Boot backend running (see the project's own README) — by
  default at `http://localhost:8083`

## Install & run

```bash
npm install
npm start
```

This serves the app at `http://localhost:4200` and proxies any request to
`/api/*` through to `http://localhost:8083` (see `proxy.conf.json`), so the
Angular dev server and the Spring Boot API can run side by side without a
CORS dance.

## Production build

```bash
npm run build
```

Output goes to `dist/doctor-appointment-frontend`. If you serve this build
from a different origin than the API, make sure the Spring Boot backend's
CORS configuration allows that origin — the dev proxy only applies to
`ng serve`.

## Structure

```
src/app/
  core/
    models/        request & response interfaces (auth, doctor, patient, appointment)
    services/       AuthService, DoctorService, PatientService, AppointmentService, ToastService
    interceptors/   attaches the JWT, surfaces 401/403/409/500 as toasts
    guards/         authGuard (must be logged in), roleGuard (role allow-list per route)
  shared/components/  navbar, toast, spinner, confirm dialog — used across features
  features/
    auth/            login, register (role picker: patient / doctor / admin)
    dashboard/        role-aware landing page with next-action cards
    doctors/          searchable roster (doctor-list), create/edit form (admin only)
    patients/         self-service profile page
    appointments/
      booking/        the day-ledger slot picker (patients)
      appointment-list/ patient's own visits, or a doctor/admin schedule view with
                        confirm / complete / cancel actions and pagination
```

## A note on identity vs. records

The API's JWT identifies a **login account** (email + role), while doctors
and patients are separate resources with their own numeric IDs. Since the
README doesn't describe an endpoint that resolves "my patient record" or
"my doctor record" from the token, this frontend remembers a local pointer
per browser:

- A patient fills in their profile once (`/my-profile`); the resulting
  `patientId` is remembered and used for booking and viewing appointments.
- A doctor picks their own listing the first time they open
  `/appointments`; that `doctorId` is remembered for future visits.

If your backend adds a `/api/auth/me`-style endpoint or embeds the record ID
in the JWT, swap the `getMyPatientId`/`getMyDoctorId` helpers in
`patient.service.ts` / `doctor.service.ts` for a real lookup — everything
else in the app already reads from those two methods, so it's a one-place
change.

## Assumed response shapes

The backend README documents endpoints and query params but not every exact
JSON shape. Two spots where this frontend had to assume a structure:

- `GET /api/appointments/available-slots` → expected to return
  `{ startTime, endTime, available }[]` (see `TimeSlot` in
  `core/models/appointment.model.ts`).
- `GET /api/appointments/doctor/{id}?page&size` → expected to return a
  Spring Data `Page<Appointment>` (`{ content, totalElements, totalPages,
  number, size }`, see `Page<T>` in the same file).

If your controller returns something shaped differently, those two spots —
`AppointmentService.availableSlots()` and `AppointmentService.forDoctor()`
in `core/services/appointment.service.ts` — are the only places to adjust.

## Role behavior

| Role | Can do |
|---|---|
| PATIENT | Book visits, view/cancel their own appointments, edit their profile |
| DOCTOR | View their schedule, confirm/complete/cancel appointments |
| ADMIN | Add/edit/remove doctors, view any doctor's schedule, confirm/complete/cancel appointments |

Route access is enforced client-side via `roleGuard`, but the real
authorization boundary is (and should be) the Spring Boot backend's
ownership checks — this frontend just hides actions the person can't take
so no one hits an avoidable 403.
