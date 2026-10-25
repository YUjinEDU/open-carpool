/**
 * Admin + events slice: A creates a KR group, B joins, A proposes a crew, B accepts, A completes
 * today's trip; A opens the dashboard, sees the stats and exports the month CSV (the Blob is
 * captured in the page and checked for the BOM, header row and the completed trip); A creates an
 * event and offers a car, B rides in A's car and leaves again.
 * Run from the repo root: `bun scripts/e2e/admin-events-slice.ts` (needs Java 21+, see JAVA_HOME below).
 */
import { join } from 'node:path';
import { ORIGIN_A, ORIGIN_B, openPage, signInWithEmailLink, startStack, stopStack, type Page, type StepLog } from './harness';

const VIEWPORT = process.env.E2E_VIEWPORT === 'desktop' ? { name: 'desktop', w: 1280, h: 900 } : { name: 'mobile', w: 390, h: 844 };
const OUT = join(import.meta.dir, '..', '..', '.omo', 'qa', 'admin-events', VIEWPORT.name);
const JAVA_HOME = 'C:\\Users\\sdlab\\.cache\\open-carpool-tools\\jdk-21.0.12.1+1-jre';
const PORTS = [5173, 8080, 9099] as const;
const CSV_HEADER = 'date,leg,crew,driver,riders,absent,status,completedBy,completedAt';

const pathKey = Object.keys(process.env).find((k) => k.toLowerCase() === 'path') ?? 'PATH';
process.env[pathKey] = `${JAVA_HOME}\\bin;${process.env[pathKey] ?? ''}`;
process.env.JAVA_HOME = JAVA_HOME;

const log: StepLog[] = [];
async function step(name: string, pages: Page[], run: () => Promise<string>): Promise<void> {
  try {
    const detail = await run();
    const shots = await Promise.all(pages.map((p) => p.shot(name)));
    log.push({ step: name, ok: true, detail, shots });
    console.log(`PASS ${name} - ${detail}`);
  } catch (e) {
    const shots = await Promise.all(pages.map((p) => p.shot(`${name}-FAILED`).catch(() => '')));
    log.push({ step: name, ok: false, detail: String(e), shots });
    console.log(`FAIL ${name} - ${String(e)}`);
    throw e;
  }
}

async function portInUse(port: number): Promise<boolean> {
  try {
    const socket = await Bun.connect({ hostname: '127.0.0.1', port, socket: { data() {} } });
    socket.end();
    return true;
  } catch {
    return false;
  }
}

async function waitPortsFree(timeoutMs: number): Promise<number[]> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const busy = (await Promise.all(PORTS.map(async (p) => ((await portInUse(p)) ? p : null)))).filter((p) => p !== null);
    if (busy.length === 0 || Date.now() > deadline) return busy;
    await Bun.sleep(500);
  }
}

const isKo = async (page: Page): Promise<boolean> => (await page.eval<string>('navigator.language')).toLowerCase().startsWith('ko');
const savedText = async (page: Page): Promise<string> => ((await isKo(page)) ? '저장했어요' : 'Saved');
const activeText = async (page: Page): Promise<string> => ((await isKo(page)) ? '운영 중' : 'Active');

const seoulToday = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
/** A leg time already in the past today (KST) so 운행 완료 is offered during the run: one hour ago, never before 00:00. */
const pastTimeSeoul = (): string => {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
  return hour >= 1 ? `${String(hour - 1).padStart(2, '0')}:${minute}` : '00:00';
};
const undoText = async (page: Page): Promise<string> => ((await isKo(page)) ? '되돌리기' : 'Undo');

async function waitForInText(page: Page, selector: string, needle: string, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const text = await page.text(selector);
    if (text.includes(needle)) return text;
    if (Date.now() > deadline) throw new Error(`"${selector}" never contained "${needle}"; last: "${text}"`);
    await Bun.sleep(200);
  }
}

async function waitForValue<T>(page: Page, js: string, timeoutMs = 20_000): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const value = await page.eval<T | null>(js);
    if (value !== null && value !== undefined) return value;
    if (Date.now() > deadline) throw new Error(`timed out waiting for ${js}`);
    await Bun.sleep(200);
  }
}

/** In-app navigation (no reload): full reloads in the WebView leak Firestore connections until requests stall. */
async function spaGo(page: Page, path: string): Promise<void> {
  await page.eval(`(() => { history.pushState({}, '', ${JSON.stringify(path)}); dispatchEvent(new PopStateEvent('popstate')); })()`);
}

async function waitGone(page: Page, selector: string, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (await page.eval<boolean>(`!!document.querySelector(${JSON.stringify(selector)})`)) {
    if (Date.now() > deadline) throw new Error(`${selector} still present; page: ${(await page.text()).slice(0, 600)}`);
    await Bun.sleep(200);
  }
}

async function saveProfile(page: Page, gid: string, opts: { name: string; drives: boolean }): Promise<void> {
  await spaGo(page, `/g/${gid}/profile`);
  await page.waitFor('[data-testid="profile-display-name"]');
  await page.fill('[data-testid="profile-display-name"]', opts.name);
  const drives = await page.eval<boolean>(`document.querySelector('[data-testid="profile-can-drive"]').getAttribute('aria-checked') === 'true'`);
  if (drives !== opts.drives) await page.click('[data-testid="profile-can-drive"]');
  const monday = await page.eval<boolean>(`document.querySelector('[data-testid="profile-day-1"]').getAttribute('aria-pressed') === 'true'`);
  if (!monday) await page.click('[data-testid="profile-day-1"]');
  await page.fill('[data-testid="profile-out-1"]', '08:00');
  await page.click('[data-testid="profile-save"]');
  await page.waitForText(await savedText(page));
}

async function main(): Promise<void> {
  const busy = await waitPortsFree(0);
  if (busy.length > 0) throw new Error(`ports already in use: ${busy.join(', ')}`);
  await startStack();
  const a = openPage('A', VIEWPORT.w, VIEWPORT.h, OUT);
  const b = openPage('B', VIEWPORT.w, VIEWPORT.h, OUT);
  const today = seoulToday();
  const todayCard = `[data-testid="trip-card-${today}_out"]`;
  let gid = '';
  let inviteCode = '';
  let cid = '';
  let eid = '';
  let uidA = '';
  let uidB = '';
  try {
    await step('a-create-group', [a], async () => {
      await signInWithEmailLink(a, ORIGIN_A, 'alice@example.com', '/groups/new', 'Alice');
      await a.waitFor('[data-testid="group-name"]', 30_000);
      await a.fill('[data-testid="group-name"]', 'Slice Co');
      await a.fill('[data-testid="group-country"]', 'KR');
      await a.click('[data-testid="group-next"]');
      await a.click('[data-testid="group-next"]');
      await a.click('[data-testid="group-create-submit"]');
      await a.waitFor('[data-testid="invite-code"]', 20_000);
      gid = (await a.eval<string>('location.pathname')).split('/')[2] ?? '';
      inviteCode = (await a.text('[data-testid="invite-code"]')).trim();
      await saveProfile(a, gid, { name: 'Alice', drives: true });
      return `gid=${gid} invite=${inviteCode}`;
    });
    await step('b-join', [b], async () => {
      await signInWithEmailLink(b, ORIGIN_B, 'bob@example.com', `/join/${inviteCode}`, 'Bob');
      await b.click('[data-testid="join-submit"]');
      await b.waitFor('[data-testid="profile-display-name"]', 20_000);
      await saveProfile(b, gid, { name: 'Bob', drives: false });
      return 'Bob joined as rider';
    });
    await step('crew-and-trip', [a, b], async () => {
      await spaGo(a, `/g/${gid}/crews`);
      await a.click('[data-testid="crew-new"]:not([disabled])');
      await a.waitFor('[data-testid="crew-form"]');
      await a.waitFor('input[data-testid^="crew-member-"]:not([disabled])');
      const ids = await a.eval<{ me: string; other: string }>(`(() => {
        const boxes = [...document.querySelectorAll('input[data-testid^="crew-member-"]')];
        const id = (el) => el.dataset.testid.slice('crew-member-'.length);
        return { me: id(boxes.find((el) => el.disabled)), other: id(boxes.find((el) => !el.disabled)) };
      })()`);
      uidA = ids.me;
      uidB = ids.other;
      await a.click(`[data-testid="crew-member-${uidB}"]`);
      await a.fill('[data-testid="crew-name"]', 'Morning run');
      for (const d of [6, 7]) await a.click(`[data-testid="crew-day-${d}"]`);
      await a.fill('[data-testid="crew-out-time"]', pastTimeSeoul());
      await a.click('[data-testid="crew-create-submit"]');
      await waitGone(a, '[data-testid="crew-form"]');
      cid = await a.eval<string>(`document.querySelector('li[data-testid^="crew-card-"]').dataset.testid.slice('crew-card-'.length)`);
      await spaGo(b, `/g/${gid}/crews`);
      await b.click(`[data-testid="crew-card-${cid}"] [data-testid="crew-accept"]`);
      await waitForInText(b, `[data-testid="crew-card-${cid}"] [data-testid="crew-card-status"]`, await activeText(b));
      await spaGo(a, `/g/${gid}/crews/${cid}`);
      await waitForInText(a, `${todayCard} [data-testid="trip-driver"]`, 'Alice', 30_000);
      await a.click(`${todayCard} [data-testid="trip-done"]`);
      await a.waitFor(`${todayCard} [data-testid="trip-done-rider-${uidB}"]`);
      await a.click(`${todayCard} [data-testid="trip-done-confirm"]`);
      await a.waitForText(await undoText(a), 10_000);
      await a.waitFor(`${todayCard} [data-testid="trip-completed"]`, 30_000);
      return `cid=${cid} A=${uidA} B=${uidB}, trip ${today}_out done after the undo window`;
    });
    await step('a-admin-stats', [a], async () => {
      await spaGo(a, `/g/${gid}/admin`);
      await a.waitFor('[data-testid="admin-stats"]', 20_000);
      await a.waitFor(`[data-testid="admin-crew-${cid}"]`);
      const stats = (await a.text('[data-testid="admin-stats"]')).replace(/\s+/g, ' ');
      // participation 100%, 1 trip, seats 0 % (Alice offers 0 seats by default), 2 members, 1 crew
      if (!stats.includes('100%')) throw new Error(`participation is not 100%: ${stats}`);
      if (!/(^| )1 (운행 수|Trips)/.test(stats)) throw new Error(`trip count is not 1: ${stats}`);
      return stats;
    });
    await step('a-admin-csv', [a], async () => {
      // Capture the Blob handed to URL.createObjectURL and the anchor's file name instead of downloading.
      await a.eval(`(() => {
        window.__csv = null; window.__csvName = null;
        const create = URL.createObjectURL.bind(URL);
        URL.createObjectURL = (blob) => { blob.arrayBuffer().then((buf) => { window.__csv = Array.from(new Uint8Array(buf)); }); return create(blob); };
        HTMLAnchorElement.prototype.click = function () { window.__csvName = this.download; };
      })()`);
      await a.click('[data-testid="admin-csv"]');
      const bytes = await waitForValue<number[]>(a, 'window.__csv');
      const name = await waitForValue<string>(a, 'window.__csvName');
      const bom = bytes.slice(0, 3).join(',') === '239,187,191';
      const text = new TextDecoder().decode(new Uint8Array(bytes));
      const lines = text.split('\r\n');
      if (!bom) throw new Error('CSV has no UTF-8 BOM');
      if (lines[0] !== CSV_HEADER) throw new Error(`unexpected header: ${lines[0]}`);
      // Leg and status columns carry the screen's words (trip.leg.out / trip.status.done), not the stored enums.
      const [legOut, done] = (await isKo(a)) ? ['출발', '완료'] : ['Leave', 'Done'];
      const row = lines.find((l) => l.startsWith(`${today},${legOut},Morning run,Alice,Bob,,${done},Alice,`));
      if (!row) throw new Error(`completed trip row missing: ${text}`);
      const expectedName = `open-carpool-Slice-Co-${today.slice(0, 7)}.csv`;
      if (name !== expectedName) throw new Error(`file name ${name}, expected ${expectedName}`);
      await a.waitFor('[data-testid="admin-csv"]:not([disabled])');
      return `${name}: BOM ok, ${lines.filter(Boolean).length - 1} rows; "${row}"`;
    });
    await step('a-create-event', [a], async () => {
      await spaGo(a, `/g/${gid}/events`);
      await a.click('[data-testid="event-new"]');
      await a.fill('[data-testid="event-title"]', 'Team workshop');
      await a.fill('[data-testid="event-date"]', today);
      await a.fill('[data-testid="event-time"]', '18:30');
      await a.fill('[data-testid="event-place"]', 'Daejeon Convention Center');
      await a.click('[data-testid="event-create-submit"]');
      await a.waitFor('[data-testid="event-detail-title"]', 20_000);
      eid = (await a.eval<string>('location.pathname')).split('/')[4] ?? '';
      return `eid=${eid}`;
    });
    await step('a-offer-car', [a], async () => {
      await a.click('[data-testid="car-offer"]');
      await a.fill('[data-testid="car-seats"]', '3');
      await a.fill('[data-testid="car-note"]', 'Main gate 18:00');
      await a.click('[data-testid="car-offer-submit"]');
      await a.waitFor(`[data-testid="car-${uidA}"]`, 20_000);
      return (await a.text('[data-testid="event-cars"]')).replace(/\s+/g, ' ');
    });
    await step('b-join-car', [b], async () => {
      await spaGo(b, `/g/${gid}/events`);
      await b.click(`[data-testid="event-card-${eid}"]`);
      await b.click(`[data-testid="car-join-${uidA}"]`);
      await b.waitFor(`[data-testid="car-leave-${uidA}"]`, 20_000);
      const cars = (await b.text('[data-testid="event-cars"]')).replace(/\s+/g, ' ');
      if (!/(1명 탑승|1 riding)/.test(cars)) throw new Error(`rider count not 1: ${cars}`);
      return cars;
    });
    await step('b-leave-car', [b], async () => {
      await b.click(`[data-testid="car-leave-${uidA}"]`);
      await b.waitFor(`[data-testid="car-join-${uidA}"]`, 20_000);
      const cars = (await b.text('[data-testid="event-cars"]')).replace(/\s+/g, ' ');
      await b.click(`[data-testid="car-join-${uidA}"]`);
      await b.waitFor(`[data-testid="car-leave-${uidA}"]`, 20_000);
      return `after leave: ${cars}; joined again`;
    });
    await step('board-seats', [a, b], async () => {
      await spaGo(a, `/g/${gid}/events`);
      // B rides again, so A's car has 2 of 3 seats left on the board list
      const card = await waitForInText(a, `li:has([data-testid="event-card-${eid}"])`, '2');
      return card.replace(/\s+/g, ' ');
    });
  } finally {
    a.close();
    b.close();
  }
}

let failed = false;
try {
  await main();
} catch (e) {
  failed = true;
  console.error(e);
} finally {
  await stopStack();
  const busy = await waitPortsFree(20_000);
  console.log(busy.length === 0 ? `ports ${PORTS.join('/')} free` : `PORTS STILL IN USE: ${busy.join(', ')}`);
  await Bun.write(join(OUT, 'steps.json'), JSON.stringify(log, null, 2));
  console.log(`steps: ${log.filter((s) => s.ok).length}/${log.length} passed`);
  if (failed || busy.length > 0) process.exitCode = 1;
}
