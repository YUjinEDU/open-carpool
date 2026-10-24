# open-carpool Design System

Binding contract for every screen in `src/features/**`. Tokens live in `src/index.css`, primitives in `src/shared/ui` (gallery: `npm run dev`, then `/design.html`). A value that is not in this file is not in the product: add it here first, then use it.

Screenshots of the kit and the four composed screens are in `docs/design/` (gallery-desktop.png, gallery-mobile.png, mock-group-home.png, mock-trip-completion.png, mock-crew-ledger.png, mock-sign-in.png, mock-group-home-dark.png).

## 0. Research Log

- Embedded refs: shortlisted `cal.md` (scheduling, grayscale), `wise.md` (friendly, clear, semantic colour), `intercom.md` (warm, 4px geometry). Picked Layer A `taste-skill.md` (operational, trust-first dials: VARIANCE 3, MOTION 3, DENSITY 5) + Layer B `wise.md` because its warm near-black text, tonal "wash + ink" status system, hairline depth and green-as-trust map onto a fairness tool; its billboard type and pill buttons were deliberately not carried over. `layout-skill.md` supplied the bounded scroll-shell contract for the app shell.
- Lazyweb: skipped, this unit had no budget for a network screen-research lane; direction came from the product research in `docs/research/operations-workflow.md` (champion burden, absence-first, evening-before planning).
- StyleGallery: skipped (same reason); the shell pattern is the standard scroll-body-shell: fixed TopBar, scrolling body, fixed BottomNav.
- Imagen drafts: skipped; the kit itself is the reference-fidelity contract and was iterated twice in a real browser (desktop 1280 and mobile 390 captures, live Sheet/Dialog/Toast exercised, dark theme checked).

## Design principles

1. **Tomorrow first.** The one thing a member needs every evening is tomorrow's plan: who drives, who rides, when the cutoff is. It is the first thing on Group Home, in the one dimensional surface of the product (the deep green "evening card"). Everything else sits below it.
2. **Absence is the main verb.** Crews break because of irregular schedules, so "내일 못 가요" and "운전 못 해요" are one tap from Home, never buried in a menu, and always say what happens next (cutoff, who gets told, what the ledger does).
3. **Fair, never blaming.** The ledger shows balance in rides ("+1.5회 더 운전", "-0.5회") on a bar centred on zero. Amber on the negative side means "your turn is coming", not debt. No money appears anywhere in KR.
4. **One accent, one job.** Brand green marks the one or two actions a screen is for, as the control's background. Status is wash + ink + glyph. Nothing decorative carries colour; no coloured side bars or accent outlines, ever.
5. **Thumb-first.** Every target is 44px or taller, primary actions sit in the lower half of phone screens or in a sheet footer, native pickers (time, select) are used instead of custom ones, and nothing requires a hover.
6. **Calm, not a ride-hailing app.** No live map, no pulsing dots, no permanent loops. Motion is short, has a cause, and becomes a cross-fade under reduced motion. Copy is plain 해요체, no exclamation marks.
7. **The captain's relief is visible.** Anything the champion used to do by hand (headcount, rotation, records, the CSV for the institution) is one tap and shows its own state, so the captain never has to ask the chat.

## 1. Atmosphere and identity

A quiet planning board for people who already know each other. Warm off-white canvas, warm near-black text (both carry a faint green undertone), hairlines instead of shadows, and one deep green material reserved for the evening card: a surface you read like the sky before a commute, slightly graded from brand-800 to brand-950. The signature is that card plus the centred ledger bar. The product never shouts; the most intense element on any screen is a single green button.

## Information architecture and navigation

```
/                     signed out: Sign-in (Landing)        signed in: My groups (list + create + join)
/signin, /signin/finish
/join/:code           Invite landing (works signed out; sign-in inline, then Join)
/groups/new           Group create wizard (3 steps)
/g/:gid               Group shell with BottomNav
  Home                /g/:gid                 tomorrow card, this week, my crews
  Crews               /g/:gid/crews           my crews, proposals, Crew detail /g/:gid/crews/:cid (+ /plan weekly, /ledger)
  Events              /g/:gid/events          event ride board, /g/:gid/events/:eid
  Members             /g/:gid/members         list, /g/:gid/members/:uid profile
  More                /g/:gid/more            my profile and schedule, group settings (admins), admin dashboard (admins), account (/me), help, sign out
/me                   Account (name, locale, sign out)
```

- **Shell**: scroll-body-shell. TopBar (56px + safe-area top) is sticky; the page body is the only scroll owner; BottomNav (56px + safe-area bottom) is fixed. Page bodies end with `pb-safe-nav` so the last row clears the tab bar. Modals (Sheet, Dialog) are native `<dialog>` in the top layer; the body scroll is locked while one is open and the sheet body is the only scroller.
- **BottomNav**: five fixed tabs, Home / Crews / Events / Members / More (홈 / 크루 / 이벤트 / 멤버 / 더보기), glyph above a one-word label, every tab always visible, active tab = accent ink + wash pill behind the glyph, `aria-current="page"`. Counts only as badges (pending proposals on Crews, open seats on Events); never a bare dot.
- **TopBar**: names the screen. On Home the title is the group name and a switcher (chevron, opens a Sheet listing my groups with "그룹 만들기 / 초대 코드로 참여"). Sub-pages get a back control and the screen name ("크루 설정", "주간 계획"). At most two trailing IconButtons.
- **Desktop (>= 1024px)**: member screens stay a centred phone column (max-w-md, 448px) with the BottomNav inside that column. Admin dashboard and group settings use `TopBar wide` and a max-w-5xl content area with an intrinsic grid of cards.
- **Deep links**: KakaoTalk share cards point at `/g/:gid` (plan), `/g/:gid/crews/:cid?trip=YYYY-MM-DD_out` (swap request), `/join/:code` (invite). All three render without sign-in as a read-only preview with a sign-in CTA (Group name, date, driver), then continue to the target after sign-in.

## 2. Colour

Semantic tokens only; raw hex never appears outside `src/index.css`. Utilities: `bg-canvas`, `bg-surface`, `bg-surface-2`, `text-ink`, `text-ink-2`, `border-line`, `bg-accent`, `text-accent-ink`, `bg-success-wash`, `text-warn-ink` and so on.

| Role | Token | Light | Dark (opt-in `data-theme="dark"`) | Usage |
|---|---|---|---|---|
| Canvas | `--canvas` | #F6F7F5 | #111413 | page background |
| Surface | `--surface` | #FFFFFF | #191D1B | cards, bars, sheets |
| Surface 2 | `--surface-2` | #EEF0ED | #222725 | sunken blocks, secondary buttons, segmented track |
| Surface 3 | `--surface-3` | #E3E6E2 | #2C322F | pressed secondary, skeleton, ledger track |
| Ink | `--ink` | #151916 | #EEF1EE | headings, body |
| Ink 2 | `--ink-2` | #4B514D | #B5BBB7 | secondary text, descriptions |
| Ink 3 | `--ink-3` | #636A65 | #8C938E | captions, placeholders, inactive tabs (4.85:1 on surface-2) |
| Line | `--line` | #E1E5E1 | #2C322F | hairlines, card borders |
| Line strong | `--line-strong` | #C6CCC7 | #3B423E | input borders, grabber, ledger centre tick |
| Scrim | `--scrim` | rgb(21 25 22 / 0.48) | rgb(0 0 0 / 0.6) | dialog backdrop |
| Brand ramp | `--brand-50..950` | 50 #EDF6F1, 100 #D5ECDF, 200 #AEDAC3, 300 #7EC2A1, 400 #4EA57F, 500 #2E8A63, 600 #1F7352, 700 #1A5F44, 800 #174C38, 900 #123E2E, 950 #0A271C | same ramp | the only hue with a ramp |
| Accent | `--accent` / `--on-accent` | brand-600 / #FFFFFF (5.78:1) | brand-400 / brand-950 | primary button fill, active nav |
| Accent hover | `--accent-hover` | brand-700 | brand-300 | hover/pressed fill |
| Accent ink | `--accent-ink` | brand-700 (7.6:1 on white) | brand-300 | links, ghost buttons, active tab label, "+" ledger label |
| Accent wash | `--accent-wash` / `--accent-wash-strong` | brand-50 / brand-100 | #17352A / #1D4536 | selected rows, active tab pill, selected chips |
| Success | `--success-ink` / `--success-wash` | #1F7352 / #D5ECDF (4.65:1) | #8CD1B0 / #17352A | done badge, success banner |
| Warn | `--warn-ink` / `--warn-wash` / `--warn-bar` | #8A4B00 / #FCEFD6 (5.98:1) / #B8791A (3.1:1 on surface-3) | #F2B65A / #3A2A10 / #E0A23A | needs-driver badge, in-app browser banner, negative ledger side (the bar is a graphic: 3:1 against its track) |
| Danger | `--danger-ink` / `--danger-wash` / `--danger-solid` | #B3261E / #FBE4E2 (5.38:1) / #C62D26 (5.52:1 with white) | #F28B84 / #3E1C1A / #D8463F | errors, destructive button |
| Info | `--info-ink` / `--info-wash` | #2B5FB8 / #E1EAF8 (5.05:1) | #8FB4F2 / #17273D | install hint, proposals |
| On-ink glyphs | `--on-ink-success` / `--on-ink-danger` | brand-300 / #F28B84 (both >= 4.5:1 on `--ink`) | brand-600 / #B3261E | toast icons and the toast action label; the only colours used on the toast's ink surface |
| Focus | `--focus` | brand-500 | brand-300 | focus-visible ring only |
| Identity tints | `--tint-1..5-bg/ink` | sage, sand, sky, plum, clay (all >= 7:1) | darker pairs | avatars only, deterministic by name |

Rules
- Success shares the brand hue on purpose: the product's promise is "it went fine". The grammar keeps them apart: solid fill = action, wash + glyph = status. A green badge is never button-shaped.
- Warn is never a solid button (3.19:1 with white text); it is always ink on wash.
- Amber on the ledger means "turn coming", and the label always says so in words.
- The inverse card re-tints its subtree (`.tone-inverse`): children keep using `bg-surface-2`, `text-ink-2`, `bg-accent` and get the inverted values automatically. Primary inside it is white on brand-900.
- Provider sign-in buttons (Kakao, Google) may use the provider's mandated brand button styling; that is the single allowed exception to the one-accent rule and lives only on the Sign-in screen.

## 3. Typography

Font: `"Pretendard Variable", Pretendard, -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", Roboto, "Noto Sans KR", "Malgun Gothic", "Helvetica Neue", Arial, system-ui, sans-serif`. Pretendard Variable is self-hosted: `src/index.css` imports the dynamic subset from the `pretendard` npm package (92 unicode-range slices, `font-display: swap`) and Vite emits the woff2 files under `/assets`, so no font host appears in the CSP (`font-src 'self'`). Deleting that `@import` degrades the stack to the platform Korean font. `font-feature-settings: "calt"`; numbers that are compared or counted down use `tabular-nums`.

| Utility | Size / line-height / weight | Usage |
|---|---|---|
| `text-display` | 28px / 1.2 / 700, -0.02em | wordmark on Sign-in, page hero on empty My groups |
| `text-title-1` | 24px / 1.25 / 700 | the evening card headline ("박서연 님이 운전해요"), Stat value |
| `text-title-2` | 20px / 1.3 / 700 | sheet and dialog titles, section headings |
| `text-title-3` | 17px / 1.4 / 600 | card titles, TopBar title, empty-state title |
| `text-body` | 17px / 1.55 / 400 | body, list titles (font-medium), buttons md/lg |
| `text-sub` | 15px / 1.5 / 400 | descriptions, field labels (font-medium), chips, badges md |
| `text-caption` | 13px / 1.4 / 400 | hints, errors (font-medium), badges sm, legends |
| `text-label` | 12px / 1.3 / 600 | tab bar labels only |
| `text-numeral` | 36px / 1.1 / 700 | big countdown or dashboard numbers |

Rules: max two families (one here); body never below 15px on phones and never below 14px on desktop; no weight below 400; headings that would wrap to four lines at 390px are shortened, not shrunk; Korean never breaks inside a word (`word-break: keep-all` on body), long tokens use `wrap-anywhere`.

## 4. Spacing and layout

Base 4px, Tailwind scale. Used steps: 1 (4) glyph gaps, 2 (8) between chips and inline groups, 3 (12) card sm padding, 4 (16) page gutter and card padding, 5 (20) evening-card padding, 6 (24) between sections, 8 (32) between page groups, 10 (40) empty-state vertical.

- Phone column: `max-w-md` (448px) centred, gutter `px-4`. Admin: `max-w-5xl`, cards in `grid-cols-[repeat(auto-fit,minmax(min(16rem,100%),1fr))]`.
- Control heights: 44px (buttons md, inputs 48px, rows 56px min), 52px lg buttons, 36px sm buttons only inside 44px rows.
- Safe areas: `pt-safe` on TopBar, `pb-safe` on BottomNav and sheet footers (`pb-safe-offset`), `pb-safe-nav` on page bodies. index.html must carry `viewport-fit=cover` and must not disable zoom.
- Breakpoints: sm 640, md 768, lg 1024. Layout state names only; no device names.
- Content stress: every list truncates titles to one line, descriptions to two; a 40-character name still fits a ListItem; the ledger bar clamps at |max|; empty states exist for every list.

## 5. Components (`src/shared/ui`)

All copy is passed in as props (i18n lives in the feature). All colours and sizes are the tokens above. `cx` joins classes. `RootProps` (id, className, style, aria-*, data-*) is the passthrough contract; inputs forward refs.

| Component | Variants / props | States | A11y |
|---|---|---|---|
| Button | primary, secondary, ghost, danger; sm 36 / md 44 / lg 52; loading, loadingLabel (defaults to the label text), fullWidth, leading/trailingIcon | hover (fill shift), active scale 0.98, disabled 45% opacity, loading (spinner replaces icon, label stays, aria-busy) | native button, label is text; sm only inside a 44px row (card headers, input rows), never for a verb |
| IconButton | ghost, secondary, primary; md 44 / lg 52; `label` required | same | aria-label + title |
| Card | default (surface + hairline), tonal (surface-2), inverse (evening material); padding none/sm/md/lg; `CardHeader` title/description/action | static | heading level via `as` |
| List / ListItem | inset or bare; leading, title, description, trailing, chevron, href or onClick, selected, disabled | hover surface-2, active surface-3, selected accent-wash (+ check glyph from caller) | li > a/button/div, aria-current |
| Input, TextArea, Select, TimeField | label above (hidden option), hint, error, leading/trailing, optionalLabel; TimeField `icon={false}` drops the clock glyph in two-up grids | focus border + 2px ring at 25% focus, invalid danger border, disabled surface-2 | label htmlFor, aria-describedby error then hint, aria-invalid, native pickers |
| Switch | label + description row, 52x32 track, 26px thumb with check glyph; the whole row is the switch button, so the label is part of the 44px target | on (accent, thumb right + check), off, disabled | role=switch on the row, aria-checked, labelledby/describedby; the track is decorative |
| Checkbox | boxPosition start/end, description | checked (accent fill, white check), focus ring on the drawn box, disabled | native input (sr-only) under a drawn box |
| SegmentedControl | 2-4 options, md/lg, fullWidth | selected = raised surface | radiogroup, arrow keys, roving tabindex |
| Chip / ChipGroup | md 44 / sm 36, selected, showCheck, icon; group single or multiple | selected = wash-strong + accent ink + semibold (+ check) | aria-pressed, group aria-label |
| Badge | neutral, brand, success, warn, danger, info; sm/md; icon | static | text, glyph optional |
| Avatar / AvatarStack | xs 24 to xl 64, tint auto/neutral, marker glyph, src, `initials` override (group names show their first two characters); stack max + "+N" | static | role=img with name(s) |
| TopBar | title, onBack/backLabel, onTitleClick (switcher), leading, trailing, sticky, transparent, wide | static | header, h1 or switcher button with aria-haspopup |
| BottomNav | items (key, label, icon, href, badge count), activeKey, position fixed/absolute | active | nav aria-label, aria-current=page |
| Sheet / SheetPanel | title, description, closeLabel, footer; panel exported for static hosts | open (animate-sheet-in), closing (sheet-out), scrim fade | native dialog: focus trap, Esc, initial focus on panel |
| Dialog | title, description, children, actions, role dialog/alertdialog | open/closing | same; Cancel left, verb right |
| Banner | info, warn, success, danger; title, action, onDismiss | static | role=status (info/success) or alert (warn/danger) |
| EmptyState | icon, title, description, action, compact | static | plain text |
| Skeleton / Spinner | text lines, block, circle; sm/md/lg spinner with label | pulse (static under reduced motion) | aria-hidden / role=status |
| Stat | value, label, hint, md/lg, align | static | text |
| LedgerBar | value, max, label, name, leading, detail, highlight | ahead (brand-500 right), behind (warn-bar left), zero | role=img "name: label" |
| ShareButtons | url, title, text, labels, qr slot, code (node), testIds | copied (label swap 2s) | buttons; share only when navigator.share exists; `copyText` is exported for other share flows |
| QrCode | value, label, size | skeleton while the generator (`qrcode`, lazy chunk) loads | img with alt |
| Toast | showToast(message, kind, { durationMs, action }) returns an id; dismissToast(id); ToastContainer(dismissLabel) | enter animation; info/success auto-dismiss 3s; error stays until dismissed (X); one action (되돌리기) closes the toast when pressed | aria-live=polite region; items are role=status, errors role=alert; the dismiss control is a labelled IconButton |

Layout primitives used: stack (flex-col gap), cluster (flex-wrap gap-2), scroll-body-shell (`scroll-shell` / `scroll-body` utilities), overlay via native dialog.

## 6. Motion and interaction

| Type | Duration | Easing | Where |
|---|---|---|---|
| Micro | 150ms | ease-out | button fill, press scale 0.98, chip toggle, switch thumb (200ms, ease-out-quint) |
| Standard | 220ms in / 180ms out | ease-out-quint / ease-in | Sheet (translateY 16px + fade), Dialog (scale 0.97 + fade), Toast (translateY 8px + fade) |
| Ambient | 1.4s loop | ease-in-out | Skeleton pulse only |

Feedback thresholds: a press changes the element in the same frame (scale + fill); async actions disable the control at once and show the spinner inside the button; a skeleton is the first paint of any list; a spinner alone only past about one second; success is shown by the changed state (badge flips to 완료, row leaves the list) and a toast only when the outcome is not visible in place; failure is reported next to the object (field error, banner above the list, danger Banner inside the dialog that triggered it, with the button re-enabled). Undo window: 운행 완료 holds the ledger transaction for 10 s behind an info toast with 되돌리기 (the toast lives exactly as long as the window); once written, a ledger move is never reversed from the UI.

Rules: only transform, opacity and colour animate; no scroll listeners; no permanent loops besides skeleton; nothing moves under a pointer; exit mirrors entry (the dialog hook animates close on Esc, backdrop tap and programmatic close); under `prefers-reduced-motion` every keyframe becomes a cross-fade and press scale is removed (`motion-reduce:`), fades and the spinner stay.

## 7. Depth and surface

Strategy: hairline + tonal, shadows only on floating layers.

| Level | Treatment | Use |
|---|---|---|
| 0 | canvas | page |
| 1 | surface + 1px line | cards, lists, bars (bars at 92% + backdrop blur) |
| 1b | surface-2, no border | tonal blocks inside cards, secondary buttons |
| inverse | `.tone-inverse` gradient brand-800 to brand-950 | the evening card only (one per screen) |
| float | `shadow-float` 0 8px 24px ink/10 + 0 2px 6px ink/6 | dialog, popover |
| sheet | `shadow-sheet` 0 -8px 32px ink/14 | bottom sheet |
| toast | `shadow-toast` 0 6px 20px ink/18 | toast |

Radius: `rounded-control` 12px (buttons, inputs, segmented, toast), `rounded-card` 16px (cards, dialog, banners), `rounded-sheet` 24px (bottom sheet top corners), `rounded-chip` pill (chips, badges, avatars, tab pill). Nested: segmented track 12 with 4px padding holds 8px segments; cards hold 12px controls at 16px padding.

## Screens

Each screen: purpose, layout top to bottom, components, primary action, states, key copy (ko / en). Copy is 해요체, no exclamation marks, outcome verbs on buttons, nouns on tabs. Times are local and relative where it helps ("오늘 21:00 마감", "2시간 14분 남음"); dates are "10월 27일 (화)". No raw ids, enums or ISO strings reach the screen.

### Sign-in (`/`, `/signin`)
- Purpose: get from a KakaoTalk link to a signed-in session in one tap, and escape the in-app browser when needed.
- Layout: wordmark (`text-display`) + one-line promise; in-app browser Banner (warn) when `domain/inapp` detects KakaoTalk or LINE; provider buttons (lg, fullWidth): the first enabled provider is primary (Kakao when `kakaoOidcEnabled`, else Google), the other secondary; hairline divider "또는 이메일로"; email Input (type email, inputMode email, autoComplete email) + secondary lg "로그인 링크 받기"; caption consent line pinned to the bottom.
- Components: Banner, Button, Input, Card (none), TopBar absent.
- Primary action: first provider button.
- States: loading (button loading, others disabled); email sent (Banner success "링크를 보냈어요. 메일함을 확인해 주세요." / "Link sent. Check your inbox."); error inline under the field; in-app browser: Banner title "카카오톡 안에서는 Google 로그인이 되지 않아요" / "Google sign-in does not work inside KakaoTalk", body "오른쪽 위 메뉴의 '다른 브라우저로 열기'를 누르거나 아래 버튼을 눌러 주세요." / "Use 'Open in browser' from the top-right menu or the button below.", action "외부 브라우저로 열기" / "Open in browser" (calls `externalOpenUrl`; Google button hidden while in-app).
- Copy: "카카오로 계속하기" / "Continue with Kakao", "Google로 계속하기" / "Continue with Google", "로그인 링크 받기" / "Email me a sign-in link", hint "링크를 누르면 바로 로그인돼요. 비밀번호는 없어요." / "Tap the link to sign in. No password.", "계속하면 이용약관과 개인정보처리방침에 동의하게 돼요." / "By continuing you agree to the Terms and Privacy Policy."
- `/signin/finish`: full-screen Spinner with "로그인하는 중" / "Signing you in", then redirect; on failure EmptyState "링크가 만료됐어요" / "This link has expired" with action "다시 받기" / "Send a new link".

### Invite landing (`/join/:code`)
- Purpose: turn a shared link into membership with the least reading.
- Layout: TopBar (title "초대" / "Invitation", no back); Card: group name (title-1), type + member count (sub), "초대한 사람: 박서연" when known; if signed out, the Sign-in block inline below the card; if signed in, primary lg "참여하기" / "Join"; caption about email-domain approval when `allowedEmailDomains` is set ("회사 이메일(@daon.kr)로 로그인하면 바로 승인돼요" / "Signing in with a @daon.kr address approves you automatically").
- States: loading Skeleton card; invalid code EmptyState "초대 링크가 맞지 않아요" / "This invite link is not valid" + "코드 직접 입력" / "Enter a code"; already a member: Banner info "이미 멤버예요" / "You are already a member" + "그룹으로 가기" / "Go to group"; domain mismatch: Banner danger "이 그룹은 @daon.kr 이메일만 받아요" / "This group only accepts @daon.kr addresses".
- Primary action: 참여하기.

### Group create wizard (`/groups/new`)
- Purpose: a captain sets up a group in under a minute; defaults do the policy work.
- Layout: TopBar back + title "새 그룹" / "New group"; step indicator as caption "1/3 기본 정보" (no numbered eyebrows elsewhere); Step 1 Input 그룹 이름, Select 유형 (회사/대학/동호회/학부모 모임/교회/기타), Select 국가 (default from locale); Step 2 destination search Input (MapProvider) with result List, optional ("나중에"); Step 3 policy summary as a read-only List (비용: 교대 운전만 / 실비, 마감: 전날 21:00, 부제: 없음) with Switch rows only where editable, KR legal Banner info ("한국에서는 돈이 오가지 않는 교대 운전만 지원해요." / "In Korea the app supports driving turns only; no money changes hands."); footer: secondary "이전" + primary "다음" / "그룹 만들기".
- Components: TopBar, Input, Select, List, Switch, Banner, Button.
- Primary action: 다음 / 그룹 만들기 (loading state on submit).
- States: validation inline (name required "그룹 이름을 적어 주세요" / "Enter a group name"); geocode loading Skeleton rows; no results EmptyState compact "주소를 찾지 못했어요" / "No results" + "직접 입력" / "Type it manually"; create failure Banner danger above the footer.
- After create: route to Group Home with the first-time captain onboarding (below).

### Group home (`/g/:gid`)
- Purpose: tonight's answer in one glance; the two absence verbs one tap away.
- Layout: TopBar group switcher + share IconButton; **Evening card** (Card inverse, padding lg): label "내일 아침" / "Tomorrow morning" (or "오늘 저녁 퇴근" for the back leg, "오늘 아침" before departure), date + time, driver Avatar lg with marker + headline "박서연 님이 운전해요" / "Seoyeon drives", pickup line with MapPin, rider AvatarStack + names in a wash row, cutoff countdown ("변경 마감까지 2시간 14분 (오늘 21:00 마감)" / "2h 14m until changes close (21:00 today)"), then a 2-column button row: rider view = secondary "내일 못 가요" + ghost "크루 보기"; driver view = secondary "운전 못 해요" + ghost "크루 보기"; after departure time the driver view shows primary "운행 완료" / "Mark trip done" instead. **This week** Card: CardHeader "이번 주" + ghost "주간 계획"; List of the next 5 trips (leading day cell with wash on the next trip, title "박서연 운전", description "07:40 출발", trailing status Badge). **My crews** Card: one ListItem per crew (AvatarStack, name, members + captain, status Badge, chevron). Members of no crew see the crew EmptyState instead.
- Components: TopBar, Card inverse, Avatar, AvatarStack, Badge, Button, List, ListItem, EmptyState, BottomNav.
- Primary action: whichever absence verb applies now. 운행 완료 is offered only from the leg's departure time on the trip date (all day for a leg without a time); from then the driver sees secondary 운전 못 해요 and primary 운행 완료 side by side, with 크루 보기 as a centred ghost link below. After 못 가요 / 운전 넘기기 / 운전할게요, a success Banner states what happened and offers 크루에 알리기 (Web Share, copy fallback) because nothing is pushed to the crew.
- States: loading = inverse card skeleton (title line + two rows) and list skeletons; no crew = evening card replaced by Card tonal "아직 크루가 없어요. 멤버를 보고 첫 크루를 제안해 보세요." + primary "크루 제안하기" / "Propose a crew"; no trip tomorrow = inverse card says "내일은 운행이 없어요" / "No trip tomorrow" with the next planned date in sub; needs driver = card header Badge warn "운전자 필요" and headline "운전할 사람이 필요해요" / "Nobody is driving yet", primary "제가 운전할게요" / "I will drive"; past cutoff = buttons replaced by caption "변경 마감이 지났어요. 급하면 크루에 직접 알려 주세요." / "Changes are closed. Tell your crew directly if it is urgent."; offline = Banner warn at the top "오프라인이에요. 마지막으로 본 계획을 보여 드려요." / "You are offline; showing the last plan."
- Copy: "내일 못 가요" / "Can't go tomorrow", "운전 못 해요" / "Can't drive", "운행 완료" / "Trip done", "주간 계획" / "Weekly plan", "크루 보기" / "View crew".

### Weekly plan (`/g/:gid/crews/:cid/plan`)
- Purpose: see and adjust the next two weeks of a crew at once.
- Layout: TopBar back + crew name; SegmentedControl 출근 / 퇴근 / 왕복 (hidden when the crew has one leg); week header row with ChipGroup single-select (이번 주 / 다음 주); List of day rows: leading day cell, title driver or "운전자 필요", description riders (names, "나" marked) and absences ("이하은 결석"), trailing Badge; tapping a row opens the Absence/swap Sheet for that date.
- Components: SegmentedControl, ChipGroup, List, ListItem, Badge, Sheet.
- Primary action: none at page level; row tap.
- States: loading Skeleton rows; no template EmptyState "주간 템플릿이 없어요" / "No weekly template yet" + "템플릿 만들기" / "Create template" (captain) or "캡틴에게 요청" (member); done rows show the success Badge and are not editable.

### Crew detail (`/g/:gid/crews/:cid`)
- Purpose: who is in this crew, who is ahead or behind, and the kickoff facts.
- Layout: TopBar back + crew name + IconButton 설정 (captain/admin); Card "운전 장부" with the ledger (spec below) and legend caption; Card with three Stats (이번 달 운행, 참여율, 멤버); Card "멤버" List (Avatar, name, canDrive + seats, Badge 캡틴 / 예비 운전자); Card tonal kickoff facts (픽업 지점, 출발 시각, 대기 한도 10분) as a bare List; footer-less; captain sees ghost "크루 일시정지" at the bottom (opens an alertdialog).
- Components: LedgerBar, Stat, List, Avatar, Badge, Dialog, Card.
- Primary action: none; the ledger is the content.
- States: proposed crew = Banner info at top "제안된 크루예요. 전원이 수락하면 시작돼요." / "Proposed crew. It starts when everyone accepts." with primary "수락" / "Accept" and ghost "거절" / "Decline"; paused = Badge neutral "일시정지" in TopBar area and ledger greyed; no trips yet = ledger bars all zero with detail "아직 기록이 없어요" / "No trips yet".

### Trip completion (Sheet from Home or Crew)
- Purpose: one tap to record the trip; the roster is pre-checked.
- Layout: SheetPanel title "운행 완료" / "Trip done", description "탑승하지 않은 사람은 체크를 해제하세요." / "Uncheck anyone who did not ride."; summary row (driver Avatar + "운전 박서연" + date/time, trailing "탑승 3명"); roster List: Avatar + Checkbox (boxPosition end, checked by default, the absent members pre-unchecked and listed last with description "결석"); optional TextArea 메모 for actual-cost groups only (금액 Input, currency from policy); footer: primary lg fullWidth "완료 기록" / "Record trip" + caption "기록하면 장부가 바로 갱신돼요." / "The ledger updates right away."
- Primary action: 완료 기록 closes the sheet at once and shows the info toast "운행 완료를 기록해요. 10초 안에 되돌릴 수 있어요." with 되돌리기; the ledger transaction runs when the toast expires, then the card shows Badge success 완료 (toast "운행을 기록했어요" only if the user is not looking at the card). 되돌리기 cancels before anything is written.
- States: already recorded = Sheet body says "이미 기록된 운행이에요" with the recorded roster read-only; failure = Banner danger inside the sheet above the footer, button re-enabled.

### Absence / swap (Sheet)
- Purpose: say "not tomorrow" in two taps and know what happens next.
- Layout: SheetPanel title "내일 못 가요" / "Can't go tomorrow" (or "운전 못 해요" / "Can't drive tomorrow" for the driver), description with the date and leg; explanation body ("마감 전이라 크루원에게 바로 알리고, 운전 순번은 그대로 유지돼요." / "Before the cutoff your crew is told right away and the rotation stays as it is."); for the driver: the suggested replacement as a ListItem (Avatar, name, "다음 순번" Badge brand) and the fallback note ("아무도 운전할 수 없으면 '운전자 필요'로 표시돼요." / "If nobody can drive, the trip is marked 'needs driver'."); optional TextArea 한마디; footer: secondary "취소" + primary "빠지기" / "Mark me absent" (driver: "운전 넘기기" / "Hand over driving").
- States: past cutoff = body swaps to the closed message and the primary becomes "크루에 알리기" / "Notify crew" (sends the share card); success closes the sheet; Home row updates to Badge "결석" for me.
- Needs-driver claim: from the warn card, Dialog (alertdialog) title "내일 운전할까요?" / "Drive tomorrow?", description "장부에 +0.75회가 기록돼요." / "+0.75 rides go on your ledger.", actions secondary "취소" + primary "운전할게요" / "I will drive".

### Members (`/g/:gid/members`)
- Purpose: find a person; admins manage roles.
- Layout: TopBar title "멤버" + IconButton 초대 (opens the invite Sheet with ShareButtons); search Input (labelHidden, leading Search) when more than 8 members; List: Avatar, name, description "분당 · 운전 가능 · 좌석 3" (area label only, never an address), trailing Badge for 관리자 / 캡틴, chevron.
- States: loading skeleton rows; empty (only me) EmptyState "아직 혼자예요" / "It is just you so far" + primary "초대 링크 공유" / "Share invite link"; search no results compact EmptyState.

### Member profile and weekly schedule editor (`/g/:gid/profile`, `/g/:gid/members/:uid`)
- Purpose: the two things crews are built from: area and schedule.
- Layout: TopBar back + "내 프로필" / "My profile"; Avatar xl + Input 표시 이름; Card "출발 지역": search Input with result List (stores rounded coordinates + label), caption "정확한 주소는 다른 멤버에게 보이지 않아요. 동·구 이름과 약 100m 단위 위치만 저장돼요." / "Your exact address is never shown to others; only the district name and a location rounded to about 100 m are stored." (the chosen address is reduced to its administrative units by `coarseLabel` before it is shown or stored: "대전광역시 유성구 대학로 99" becomes "대전광역시 유성구"); Card "운전": Switch "운전할 수 있어요" / "I can drive", Input 좌석 (numeric) and Input 차량 번호 끝자리 (numeric, only when plateRotation is on); Card "평소 일정": ChipGroup weekdays (multiple, no check glyph), then per selected day a row with two TimeFields 출발 / 복귀 and a ghost "모든 평일 같게" / "Same for all weekdays" shortcut; footer primary "저장" / "Save" (sticky above BottomNav).
- Components: Input, Switch, ChipGroup, TimeField, List, Avatar, Button.
- States: unsaved changes guard Dialog on back ("저장하지 않은 변경이 있어요" / "You have unsaved changes", actions "계속 수정" / "나가기"); save loading; validation ("출근 요일을 하나 이상 고르세요" / "Pick at least one day").
- Viewing another member shows the same layout read-only without the exact area (label only) and with their crews listed.

### Group settings (`/g/:gid/settings`, admins)
- Layout: TopBar back + "그룹 설정"; Card "기본": Inputs 이름, Select 유형, 국가 read-only; Card "초대": ShareButtons (copy, share, QR slot, code), ghost "코드 바꾸기" / "Rotate code" (alertdialog: "지금 코드로는 더 참여할 수 없게 돼요" / "The current code will stop working"); Card "이메일 도메인": ChipGroup-style list of domains with an add Input (inputMode email) and remove IconButtons; Card "정책": Switch rows and Selects (마감 시각 Select 18-23, 부제 Select 없음/홀짝/5부제, 비용 방식 shown read-only "교대 운전만" in KR with the legal caption); danger zone at the bottom: ghost danger-ink "그룹 나가기" and, for the owner, "그룹 삭제" (alertdialog with the name typed as confirmation).
- States: save per card ("저장됨" shown as a Badge success next to the card title for 2 s), failure Banner danger in the card.

### Admin dashboard (`/g/:gid/admin`, admins; `TopBar wide`)
- Purpose: the numbers the institution asks for, exportable.
- Layout: TopBar wide, title "대시보드"; SegmentedControl 이번 달 / 지난 달 / 올해; Stat grid (참여율, 운행 수, 좌석 활용, 절감 km with hint "추정값", CO2 with hint "추정값"); Card "크루" List with per-crew Stats inline (운행 수, 참여율, churn Badge warn "출석 감소" when `domain/churn` flags); Card "내보내기": description of the CSV columns and primary "CSV 내보내기" / "Export CSV" (secondary "월간 리포트" when available).
- States: loading skeleton stats; empty (no trips) EmptyState "아직 기록된 운행이 없어요" / "No trips recorded yet"; export loading button state, then Badge success "내려받았어요".

### Event ride board (`/g/:gid/events`, `/g/:gid/events/:eid`)
- Purpose: one-off trips (workshops, matches) without a fixed crew.
- Layout list: TopBar "이벤트" + IconButton 추가 (admins/captains); List of events (title, date + time + place, trailing "좌석 2 남음" Badge success or "꽉 찼어요" neutral); detail: Card with event facts; Card "차" List: each car = driver Avatar, "좌석 3 · 2명 탑승", riders AvatarStack, trailing primary sm "타기" / "Ride" or Badge "탑승 중"; footer primary "차 등록" / "Offer a car" for drivers.
- States: no events EmptyState "예정된 이벤트가 없어요" / "No upcoming events" + "이벤트 만들기" (admins); event full = board header Banner info; leaving a car = ghost "내리기" / "Leave" with no dialog (undoable in place).

### Onboarding for a first-time captain (after group create)
- A Sheet, not a tour: title "그룹을 만들었어요" / "Your group is ready", three ListItems with check glyphs as they complete: "초대 링크 보내기" (opens ShareButtons), "내 일정 적기" (profile), "첫 크루 제안하기" (crews); footer primary "초대 링크 보내기" / "Send invite link" and ghost "나중에" / "Later". The same three items reappear as a tonal Card on Home until done, with a dismiss IconButton after the first item is done. No numbered steps, no welcome splash.

### Empty and error states (global)
- Every list has an EmptyState that names what is missing and the next action; compact variant inside cards.
- Load failure of a page: EmptyState icon AlertCircle, "불러오지 못했어요" / "Could not load", description with cause when known ("네트워크 연결을 확인해 주세요"), action "다시 시도" / "Try again".
- Route not found: EmptyState "이 페이지가 없어요" / "This page does not exist" + "홈으로" / "Go home".
- Permission: "볼 수 없는 페이지예요" / "You cannot view this page" + "그룹으로 가기".
- Form errors live under the field; action failures live in a Banner next to the thing that failed; toasts only for outcomes not visible in place ("초대 링크를 복사했어요").
- Loading: Skeletons shaped like the final layout for lists and cards; a Spinner only inside buttons and for the sign-in finish page.

## Ledger visualisation spec (LedgerBar)

- Input: Fagin-Williams score in units (`domain/rotation`, UNIT 60) converted with `scoreInRides` to rides; positive = drove more than fair share, negative = rode more.
- Row anatomy: Avatar (marker glyph Car on the member who drives next) | name (semibold when highlighted) and formatted label right-aligned | 10px track centred on zero with a 1px tick | detail caption.
- Bar: width = min(|value| / max, 1) x 50% of the track; positive fills right in brand-500, negative fills left in warn-bar. `max` = the crew's largest |value| rounded up, never below 1, so bars are comparable within a crew.
- Labels: "+1.5회 더 운전" / "+1.5 rides driven", "-0.5회" / "-0.5 rides", "0회" / "0 rides"; one decimal, trailing .0 dropped. Detail: "다음 운전 차례" / "Drives next", "이번 달 6회 운전" / "Drove 6 times this month", "운전하지 않아요" / "Does not drive".
- Legend caption under the list: "+ 는 자기 몫보다 더 운전했다는 뜻이고, - 는 더 탑승했다는 뜻이에요." / "+ means they drove more than their share, - means they rode more."
- Sorting: by value descending (most ahead first); the next driver is highlighted wherever it sits. Members who cannot drive still appear (they only accumulate negative balance) with the detail "운전하지 않아요".
- Accessibility: the bar is `role="img"` named "name: label"; colour is never the only carrier (sign, label, marker).

## 8. Accessibility constraints and accepted debt

Constraints (WCAG 2.2 AA)
- Contrast: body 4.5:1 and large text 3:1 in both themes; all token pairs in Section 2 were measured (minimum in use: success ink on success wash 4.65:1; ink-3 on surface-2 4.85:1). Warn is never a solid fill with white text.
- Targets: 44x44px minimum for every control, 8px between neighbours; rows are 56px; chips 44px; sm buttons only inside 44px rows.
- Focus: 2px `--focus` ring with 2px offset on every interactive element (global `:focus-visible`), inputs show border + 25% ring; focus order equals reading order; modals focus their panel first so Enter never activates a button by accident.
- Keyboard: Esc closes the top modal; segmented controls and chip groups use arrow keys or Tab; every gesture (sheet swipe) has a visible close control.
- Screen readers: every input has a label, icon-only buttons require `label`, avatars and bars are named images, toasts live in a polite live region (error toasts are `role="alert"` and stay until dismissed), banners are status or alert by severity, error text is a plain sentence in the UI language (never SDK text), and the Home switcher keeps the group name in the page's h1.
- Motion: every animation has a reduced-motion path (cross-fade); no autoplay media; skeleton is static under reduced motion.
- Language: `<html lang>` follows the active locale so `:lang(ko)` word-break rules and screen-reader voices apply.
- Zoom: index.html must allow user scaling (remove `maximum-scale=1.0, user-scalable=no`) and add `viewport-fit=cover`.

Accepted debt
| Item | Location | Why accepted | Owner / exit |
|---|---|---|---|
| Dark theme follows the OS by default (`system`), with a system / light / dark control under 내 계정 (`src/app/theme.ts`, stored in localStorage) | src/index.css, src/app/theme.ts | Home and Crew detail were QA'd in dark (docs/screenshots/*-dark.png); the remaining screens share the same tokens but were only reviewed in light | Review the rest in dark during the next visual QA round |
| A proposed crew cannot be edited in place (name, days, times); the captain withdraws and proposes again | src/features/crews/CrewPage.tsx | Rules already allow the captain's settings edit (`isCrewSettingsEdit`); the edit form is UI work with no new data path | Add a crew edit sheet (UX review U-04 follow-up) |
| The owner cannot leave or delete a group (no danger zone on Group settings) | src/features/groups/SettingsPage.tsx, firestore.rules | Ownership transfer and a cascading delete need new rules and a reviewed data path; the current rules deny both on purpose (S-06) | Rules + UI in one reviewed change (UX review U-11) |
| Sheet has no drag-to-dismiss gesture | src/shared/ui/Sheet.tsx | Close control, backdrop tap and Esc cover dismissal | Add gesture later if users expect it |
| Native `<input type="time">` renders AM/PM in ko on some browsers | TimeField | Platform behaviour; values stay HH:MM | None planned |
| Legacy token aliases (`primary-container`, `on-surface`, ...) remain in index.css | src/index.css | src/screens still uses them | Delete with src/screens (U3) |

## Implementation status (screens as built)

The screens follow the specs above with these deliberate differences, each visible in `docs/screenshots/`:

- **Shell**: each page renders its own `TopBar` and a `PageBody` (`src/app/shell/PageBody.tsx`, `nav` adds `pb-safe-nav`); `GroupLayout` adds the fixed `BottomNav` and the More sheet (profile, settings and admin for admins, account, my groups, leave group). The document is the only scroll owner; `ScrollReset` scrolls new screens to the top. More is a sheet, not a route.
- **New crew** is a page mode of `/g/:gid/crews` (TopBar back), not a sheet: the member list, weekday chips and two time fields are too long for a sheet on a phone.
- **Trip rows** on Crew detail carry their verbs inline as md (44px) buttons (못 가요 / 갈게요, 운전 못 해요, 제가 운전할게요, 운행 완료); the absence, hand-over and volunteer verbs confirm in an `alertdialog` (`TripActionBar`) instead of the absence Sheet, and completion opens the roster Sheet (`CompleteSheet`) from both Home and Crew detail.
- **Group create** replaces the wizard in history and lands on Home with the "그룹을 만들었어요" invite sheet open (QR, code, copy, share), so the back arrow never returns to an empty wizard; Home shows the three getting-started items as a tonal card for an owner who is still alone, and every "propose a crew" entry (Home card, Crews empty state, the + in the Crews TopBar) opens the invite link until the group has two active members.
- **Evening digest** is a dismissable info Banner on Home from 18:00 (group zone) when tomorrow has trips, mirrored by one local Notification per day for members who opted in under 내 계정 (`src/app/notifications.ts`); background push needs a server and is stated in the opt-in copy.
- **Churn** shows the captain a warn Banner on Crew detail when `domain/churn` reports declining or stalled, with the at-risk names and a link to the crews page.
- **Plate rule**: a trip row shows the info Badge 부제 적용 when the group's plate rotation excluded a driver that day (names in the title attribute).
- `/join/:code` works signed out: the shared link carries the group name (`?name=`, display only, verified after sign-in), the Sign-in block renders inline under the invite card, and a first-time email-link user is asked for a name (`NameForm`) before 참여하기, so the placeholder "멤버" never reaches a member document. Inside an in-app browser (KakaoTalk, LINE, ...) 외부 브라우저로 열기 is the lg primary action. Already-member and removed states render as Banners on the page. The first-time captain Sheet is the post-create invite sheet above.

## Implementation notes for workers

- Import from `src/shared/ui` (barrel). Never write a raw hex, an arbitrary px font size or a one-off radius; if a screen needs something new, add the token here and in `src/index.css` in the same commit.
- Strings: every user-facing string comes through `t()` and is passed as a prop; the kit has no built-in copy.
- Status mapping: trip planned = Badge neutral "예정"; needs_driver = warn + AlertTriangle "운전자 필요"; done = success + Check "완료"; cancelled = neutral "취소"; absent member = neutral + UserX "결석"; crew proposed = info "제안됨", active = success + Check "활동 중", paused = neutral "일시정지".
- Routing: BottomNav and ListItem take `href`; call `event.preventDefault()` and `navigate(href)` in `onSelect`/`onClick` with react-router, so links stay real links.
- Modals: keep `open` in state and let `onClose` set it false; the hook animates the exit for Esc, backdrop and programmatic close alike.
- Shell: page bodies are `scroll-body` children of a `scroll-shell` with TopBar and BottomNav as the fixed rows; never nest a second vertical scroller.
