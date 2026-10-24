# Contributing to open-carpool

Thanks for helping. Issues and pull requests are welcome in Korean or English.

## Setup

- Node.js 20+ and npm
- Java 21+ for the Firebase emulators (security-rules tests and local runs without a Firebase project)

```bash
npm install
cp .env.example .env.local      # Firebase web app config, see docs/SELF_HOSTING.md
npm run dev                      # or: npm run emulators + VITE_USE_FIREBASE_EMULATOR=true npm run dev
```

Work on a branch from `develop`; `main` holds releases.

## Code map

- `src/domain`: pure logic (rotation ledger, planning, policies, suggestions, CSV). No Firebase, no React. Every module has a `*.test.ts` next to it.
- `src/data`: Firestore reads and writes. `firestore.rules` is the security boundary, so every write path needs a rule.
- `src/features/<feature>`: pages and hooks. Keep aggregation in a pure `.ts` file with tests and keep components thin.
- `src/shared/ui`: the component kit. Build screens from it and follow [docs/DESIGN.md](docs/DESIGN.md) for tokens, copy and states.
- `src/shared/i18n`: every user-facing string goes through `t()` with keys in both `ko` and `en` files (a test checks parity).

## Tests

```bash
npm run lint         # tsc --noEmit (strict)
npm test             # unit tests (vitest)
npm run test:rules   # Firestore security rules against the emulator; needs Java 21+ on PATH
npm run build
```

`test:rules` starts the Firestore and Auth emulators through `firebase emulators:exec`. If Java is not on your PATH, set `JAVA_HOME` and prepend `$JAVA_HOME/bin` before running it.

Real-browser slices live in `scripts/e2e/` (`bun scripts/e2e/crew-slice.ts`, `bun scripts/e2e/admin-events-slice.ts`). They start the emulators and Vite on ports 5173, 8080 and 9099, drive two signed-in users through Bun.WebView, save screenshots under `.omo/qa/` and stop everything at the end.

## Commit style

Conventional commits, summary in Korean or English, matching the history:

```
feat(crews): crews list with suggestions, new-crew form, accept
fix(rules): 강제 탈퇴 복구·재가입 우회와 운행 기록 사후 수정 차단
docs: 자체 호스팅 가이드와 아키텍처·보안 모델 문서
```

Types: `feat`, `fix`, `refactor`, `perf`, `test`, `docs`, `build`, `chore`, `security`. Scope is the feature or layer (`domain`, `data`, `rules`, `ui`, `crews`, `trips`, ...). One logical change per commit.

## Pull request checklist

- [ ] `npm run lint`, `npm test` and `npm run build` pass
- [ ] `npm run test:rules` passes when `firestore.rules` or `src/data` changed, and new write paths have rule tests
- [ ] New domain logic has unit tests; UI changes were checked in a browser on a phone-width screen
- [ ] New strings exist in both Korean and English
- [ ] Screens use `src/shared/ui` and follow docs/DESIGN.md (no raw colours, no coloured side bars)
- [ ] No money features turned on for KR groups; nothing that matches strangers
- [ ] Docs updated when setup, environment variables or behaviour changed

By contributing you agree that your contribution is licensed under AGPL-3.0.
