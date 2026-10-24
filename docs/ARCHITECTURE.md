# Architecture

## Overview
- **Client**: React 19 + TypeScript + Vite PWA, Tailwind 4, react-router, i18next (ko/en).
- **Backend**: Firebase Authentication (Google, email link, optional Kakao OIDC) and Cloud Firestore. No custom server; all access control lives in `firestore.rules`.
- **Serverless**: `api/naver/geocode.ts`, `reverse-geocode.ts` proxy NAVER Cloud Maps so the client secret never ships to browsers. Exact-match origin allowlist (`ALLOWED_ORIGINS`).

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
  crews/{cid}                       fixed crew: memberIds (2-6), captain, days/times, scores (ledger)
    trips/{YYYY-MM-DD_leg}          planned/needs_driver/done; applied=true once counted in the ledger
  events/{eid}                      one-off event ride board
    cars/{driverUid}                seats + riderIds
```

## Fair rotation
Fagin & Williams (1983): on a trip with k participants the driver gains 60*(k-1)/k units and each rider loses 60/k. Absent members are untouched. The next driver is the present, eligible member with the lowest score (ties: drove longest ago). Integer units (U = 60) keep the ledger exact for crews of up to 6. Completing a trip runs one Firestore transaction that marks the trip `applied` and updates the crew's scores, so a trip can never be counted twice.

## Security model (summary)
- Users read/write only their own `users` doc.
- Group data is readable only by **active** members. Joining requires the group's **current** invite code (and a verified email in an allowed domain if the group restricts domains). Members who left re-join only with the current code, as plain members; members removed by an admin cannot re-activate themselves.
- Members cannot change their own role; admins cannot create owners or change the owner.
- Only crew members (or admins) write a crew's trips. Applied trips are frozen except for their cost.
- **Accepted residual risk**: crew members can technically edit their crew document (including the `scores` map) directly. Rules cannot verify that a score change matches a trip. This is acceptable for closed groups of people who know each other; all changes are attributable via the trips' `completedBy`. A server-side function could enforce it later.
