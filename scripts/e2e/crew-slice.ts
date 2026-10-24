/**
 * Crew slice: A creates a KR group, B joins by invite, A proposes a crew, B accepts, both see the
 * planned driver, the driver completes today's trip and the ledger moves to +0.5 / -0.5 rides.
 * Run from the repo root: `bun scripts/e2e/crew-slice.ts` (needs Java 21+, see JAVA_HOME below).
 */
import { join } from 'node:path';
import {
  ORIGIN_A,
  ORIGIN_B,
  openPage,
  signInWithEmailLink,
  startStack,
  stopStack,
  type Page,
  type StepLog,
} from './harness';

const OUT = join(import.meta.dir, '..', '..', '.omo', 'qa', 'crew-slice');
const JAVA_HOME = 'C:\\Users\\sdlab\\.cache\\open-carpool-tools\\jdk-21.0.12.1+1-jre';
const PORTS = [5173, 8080, 9099] as const;

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

/** UI strings depend on the browser language (ko or en). */
const isKo = async (page: Page): Promise<boolean> => (await page.eval<string>('navigator.language')).toLowerCase().startsWith('ko');
const savedText = async (page: Page): Promise<string> => ((await isKo(page)) ? '저장했습니다' : 'Saved');
const activeText = async (page: Page): Promise<string> => ((await isKo(page)) ? '운영 중' : 'Active');
const zeroRidesText = async (page: Page): Promise<string> => ((await isKo(page)) ? ' 0회' : ' 0 rides');

const seoulToday = (): string =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

async function waitForInText(page: Page, selector: string, needle: string, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const text = await page.text(selector);
    if (text.includes(needle)) return text;
    if (Date.now() > deadline) throw new Error(`"${selector}" never contained "${needle}"; last: "${text}"`);
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
  const drives = await page.eval<boolean>(`document.querySelector('[data-testid="profile-can-drive"]').checked`);
  if (drives !== opts.drives) await page.click('[data-testid="profile-can-drive"]');
  const monday = await page.eval<boolean>(`document.querySelector('[data-testid="profile-day-1"]').checked`);
  if (!monday) await page.click('[data-testid="profile-day-1"]');
  await page.fill('[data-testid="profile-out-1"]', '08:00');
  await page.click('[data-testid="profile-save"]');
  await page.waitForText(await savedText(page));
}

async function main(): Promise<void> {
  const busy = await waitPortsFree(0);
  if (busy.length > 0) throw new Error(`ports already in use: ${busy.join(', ')}`);
  await startStack();
  const a = openPage('A', 430, 1400, OUT);
  const b = openPage('B', 430, 1400, OUT);
  const today = seoulToday();
  const todayCard = `[data-testid="trip-card-${today}_out"]`;
  let gid = '';
  let inviteCode = '';
  let cid = '';
  let uidA = '';
  let uidB = '';
  try {
    await step('a-signin', [a], async () => {
      await signInWithEmailLink(a, ORIGIN_A, 'alice@example.com', '/groups/new');
      await a.waitFor('[data-testid="group-name"]', 30_000);
      return 'signed in, on create-group';
    });
    await step('a-create-group', [a], async () => {
      await a.fill('[data-testid="group-name"]', 'Slice Co');
      await a.fill('[data-testid="group-country"]', 'KR');
      await a.click('[data-testid="group-create-submit"]');
      await a.waitFor('[data-testid="invite-code"]', 20_000);
      gid = (await a.eval<string>('location.pathname')).split('/')[2] ?? '';
      inviteCode = (await a.text('[data-testid="invite-code"]')).trim();
      return `gid=${gid} invite=${inviteCode}`;
    });
    await step('a-profile', [a], async () => {
      await saveProfile(a, gid, { name: 'Alice', drives: true });
      return 'Alice can drive, Mon 08:00';
    });
    await step('b-join', [b], async () => {
      await signInWithEmailLink(b, ORIGIN_B, 'bob@example.com', `/join/${inviteCode}`);
      await b.click('[data-testid="join-submit"]');
      await b.waitFor('[data-testid="profile-display-name"]', 20_000);
      await saveProfile(b, gid, { name: 'Bob', drives: false });
      return 'Bob joined, rider, Mon 08:00';
    });
    await step('a-create-crew', [a], async () => {
      await spaGo(a, `/g/${gid}/crews`);
      await a.click('[data-testid="crew-new"]');
      await a.waitFor('[data-testid="crew-form"]');
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
      await a.fill('[data-testid="crew-out-time"]', '08:00');
      await a.click('[data-testid="crew-create-submit"]');
      // the form closes only after the server acknowledged the write (a rules rejection keeps it open)
      await waitGone(a, '[data-testid="crew-form"]');
      cid = (await a.eval<string>(
        `document.querySelector('li[data-testid^="crew-card-"]').dataset.testid.slice('crew-card-'.length)`,
      ));
      return `cid=${cid} A=${uidA} B=${uidB}`;
    });
    await step('b-accept', [b], async () => {
      await spaGo(b, `/g/${gid}/crews`);
      await b.click(`[data-testid="crew-card-${cid}"] [data-testid="crew-accept"]`);
      const status = await waitForInText(b, `[data-testid="crew-card-${cid}"] [data-testid="crew-card-status"]`, await activeText(b));
      return `crew status: ${status}`;
    });
    await step('both-see-driver', [a, b], async () => {
      await spaGo(a, `/g/${gid}/crews/${cid}`);
      await a.waitFor('[data-testid="crew-title"]', 20_000);
      await spaGo(b, `/g/${gid}/crews/${cid}`);
      const [da, db] = await Promise.all(
        [a, b].map((p) => waitForInText(p, `${todayCard} [data-testid="trip-driver"]`, 'Alice', 30_000)),
      );
      const [la, lb] = await Promise.all([a.text(`[data-testid="ledger-row-${uidA}"]`), b.text(`[data-testid="ledger-row-${uidB}"]`)]);
      if (!la.includes(await zeroRidesText(a)) || !lb.includes(await zeroRidesText(b))) throw new Error(`ledger not zero: "${la}" / "${lb}"`);
      return `driver on ${today}: A sees "${da}", B sees "${db}"; ledger "${la}" / "${lb}"`;
    });
    await step('a-complete-trip', [a, b], async () => {
      await a.click(`${todayCard} [data-testid="trip-done"]`);
      await a.waitFor(`${todayCard} [data-testid="trip-done-rider-${uidB}"]`);
      const preChecked = await a.eval<boolean>(
        `document.querySelector('${todayCard} [data-testid="trip-done-rider-${uidB}"]').checked`,
      );
      if (!preChecked) throw new Error('rider B was not pre-checked');
      await a.click(`${todayCard} [data-testid="trip-done-confirm"]`);
      await a.waitFor(`${todayCard} [data-testid="trip-completed"]`, 20_000);
      return 'trip done with B pre-checked';
    });
    await step('ledger-updated', [a, b], async () => {
      // one evaluate() at a time per WebView
      const rows: string[] = [];
      for (const [page, uid, rides] of [[a, uidA, '+0.5'], [a, uidB, '-0.5'], [b, uidA, '+0.5'], [b, uidB, '-0.5']] as const) {
        rows.push(await waitForInText(page, `[data-testid="ledger-row-${uid}"]`, rides));
      }
      return rows.join(' | ');
    });
    await step('b-home-next-trip', [b], async () => {
      await spaGo(b, `/g/${gid}`);
      const card = await waitForInText(b, '[data-testid="next-trip-card"]', 'Alice', 20_000);
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
