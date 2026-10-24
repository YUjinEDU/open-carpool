# Architecture

## Overview
- **Client**: React 19 + TypeScript + Vite PWA, Tailwind 4, react-router, i18next (ko/en).
- **Backend**: Firebase Authentication (Google, email link, optional Kakao OIDC) and Cloud Firestore. No custom server; all access control lives in `firestore.rules`.
- **Serverless**: `api/naver/geocode.ts`, `reverse-geocode.ts` proxy NAVER Cloud Maps so the client secret never ships to browsers. Every call needs a Firebase ID token (`Authorization: Bearer`), verified against Google's public securetoken keys (`api/naver/_auth.ts`); the exact-match origin allowlist (`ALLOWED_ORIGINS`) is only a convenience filter.

## Code layout
| Path | Role |
|---|---|
| `src/domain` | Pure logic, no Firebase: types, Fagin-Williams rotation, trip planning, policies (country cost mode, plate rotation), cost split, crew suggestions, churn detection, deep links, in-app browser detection, CSV |
| `src/data` | Firestore repositories (one module per collection) |
| `src/features` | UI features (auth, groups, crews, trips, admin, events, profile, map) |
| `src/shared` | config, i18n, UI kit |
| `tests/rules` | security-rules tests on the Firestore emulator |

## Data model
```
users/{uid}                         private profile (self only)
inviteCodes/{code}                  { groupId, groupName } lookup for invite links (get, never list)
groups/{gid}                        group settings + policy (members only)
  members/{uid}                     role, status, schedule, coarse area, driving info
  crews/{cid}                       fixed crew: memberIds (2-6), captain, days/times, scores (ledger), ledgerTripId
    trips/{YYYY-MM-DD_leg}          planned/needs_driver/done; applied=true once counted in the ledger
  events/{eid}                      one-off event ride board
    cars/{driverUid}                seats + riderIds
```

## Fair rotation
Fagin & Williams (1983): on a trip with k participants the driver gains 60*(k-1)/k units and each rider loses 60/k. Absent members are untouched. The next driver is the present, eligible member with the lowest score (ties: drove longest ago). Integer units (U = 60) keep the ledger exact for crews of up to 6. Completing a trip runs one Firestore transaction that marks the trip `applied` and updates the crew's scores, so a trip can never be counted twice.

## Security model (summary)
Review: `.omo/reviews/security-r1.md` (finding ids S-xx). Rules tests in `tests/rules` are the executable spec.
- Users read/write only their own `users` doc.
- Group data is readable only by **active** members. Joining requires the group's **current** invite code (and a verified email in an allowed domain if the group restricts domains). Members who left re-join only with the current code, as plain members; members removed by an admin cannot re-activate themselves.
- Invite codes must match the generator alphabet and length (8 of `ABCDEFGHJKMNPQRSTUVWXYZ23456789`), for the group field and the `inviteCodes` doc id.
- Members cannot change their own role; the owner cannot leave. Admins change only another non-owner member's role (`member` <-> `admin`) and removal, never profile fields; nobody can create owners or change the owner.
- Crews: a member accepts only for themselves and the crew turns `active` only when every member accepted. Settings and captain handover (to a crew member) are captain/admin only; changing `memberIds` (2-6) is captain/admin only and restarts acceptance.
- **Ledger binding**: `scores`/`lastDroveOn` change only together with `ledgerTripId`, naming a trip of the same crew that flips `applied` false -> true in the same transaction, and only by the exact Fagin-Williams shares for that trip's driver and riders. The trip side requires the crew's post-write `ledgerTripId` to name it. `completeTrip` writes both in one transaction.
- Trips are created unsettled (`planned`/`needs_driver`, `applied: false`) under the id `<date>_<leg>`; applied trips are frozen except for a bounded cost (0 <= amount < 10,000,000, 3-letter currency).
- Event cars start empty; riders add or remove only themselves; drivers can drop riders but never enroll anyone, and seats never drop below the riders. Event `createdBy` is immutable.
- Every writable document has a shape check (known keys only, bounded strings and lists, enums).
- Default display name for new accounts is a neutral placeholder, never the email local part.
- HTTP: `vercel.json` sends a Content-Security-Policy (`frame-ancestors 'none'`, no inline scripts), `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` and `Permissions-Policy` (see `docs/SELF_HOSTING.md`).

Remaining items:
- **S-12 (recommended)**: enable Firebase App Check (reCAPTCHA Enterprise) and enforce it for Firestore; set a budget alert. Signed-in users can still create unbounded groups/docs within the shape limits.
- **S-13 (pending)**: the Pretendard font is `@import`ed from jsDelivr pinned to a git tag (no SRI). To be self-hosted with the UI work; the CSP allows `cdn.jsdelivr.net` for styles and fonts until then.
- **S-04**: `areaLabel` stores the geocoder's full address; tracked separately (product + data change).
- **S-16 / S-17 (info)**: Kakao OIDC `email_verified` depends on provider claims (keep "one account per email address"); the invite-code oracle is infeasible for small installs, see the review for many-group instances.
- The Naver proxy has no per-user rate limit yet; a valid account can still spend quota.
